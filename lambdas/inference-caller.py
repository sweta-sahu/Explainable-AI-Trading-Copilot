import os
import io
import json
import boto3
import pandas as pd
from datetime import datetime, timedelta, date
from botocore.exceptions import ClientError
# --- New Import ---
import time 

# --- Environment Variables ---
CURATED_BUCKET = os.environ['CURATED_BUCKET']
DDB_TABLE = os.environ['DDB_TABLE']          
REGION = "us-east-1"           
FEATURE_S3_PREFIX = os.environ.get('FEATURE_S3_PREFIX', "features/daily_inference/") 
SAGEMAKER_ENDPOINT_NAME = os.environ['SAGEMAKER_ENDPOINT_NAME'] # Name of deployed endpoint
MODEL_VERSION_TAG = os.environ.get('MODEL_VERSION_TAG', 'best-tuned') # Identifier for the deployed model

# --- AWS Clients ---
s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(DDB_TABLE)
# Use boto3 sagemaker-runtime client to invoke endpoint
sagemaker_runtime = boto3.client('sagemaker-runtime', region_name=REGION)

# --- Lambda Handler ---
def lambda_handler(event, context):
    """
    Handles API Gateway requests to get a prediction.
    1. Parses ticker/date from event.
    2. Reads pre-calculated daily features from S3.
    3. Invokes SageMaker endpoint.
    4. Parses prediction response.
    5. Saves prediction to DynamoDB (triggers SHAP/Explanation).
    6. WAITS, then QUERIES DDB for SHAP/Explanation data.
    7. Returns prediction + explanation via API Gateway.
    """
    print("Received API Gateway event:", json.dumps(event))

    # --- 1. Parse Input from API Gateway ---
    try:
        ticker = event['pathParameters']['ticker'].upper()

        query_params = event.get('queryStringParameters')
        if query_params and 'date' in query_params:
            target_date_iso = query_params['date']
            datetime.strptime(target_date_iso, "%Y-%m-%d")
        else:
            target_date_iso = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')

        print(f"Request Parsed - Ticker: {ticker}, Date: {target_date_iso}")

    except (KeyError, TypeError, ValueError) as e:
        print(f"ERROR: Invalid input format: {e}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({"error": "Invalid input. Provide ticker in path (e.g., /predict/AAPL). Optional date query param (YYYY-MM-DD)."})
        }

    # --- 2. Read Pre-Calculated Daily Features from S3 ---
    feature_s3_key = f"{FEATURE_S3_PREFIX.rstrip('/')}/{target_date_iso}/{ticker}_features.csv"
    print(f"Attempting to read features from: s3://{CURATED_BUCKET}/{feature_s3_key}")
    try:
        obj = s3_client.get_object(Bucket=CURATED_BUCKET, Key=feature_s3_key)
        df_features = pd.read_csv(io.BytesIO(obj['Body'].read()))

        if df_features.empty:
            raise ValueError("Feature file is empty.")
        if len(df_features) > 1:
            print(f"WARN: Feature file contains multiple rows ({len(df_features)}). Using the first row only.")

        # Prepare payload for SageMaker endpoint 
        # Exclude header, get first row as comma-separated string
        feature_payload_string = df_features.to_csv(header=False, index=False).splitlines()[0]

        features_dict_for_ddb = df_features.iloc[0].to_dict()

        payload = {"features": features_dict_for_ddb}
        payload_json = json.dumps(payload) # Convert dictionary to JSON string


    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            print(f"ERROR: Feature file not found: {feature_s3_key}")
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"error": f"Features not found for {ticker} on {target_date_iso}. Ensure daily feature job has run successfully."})
            }
        else:
            print(f"ERROR reading S3 object {feature_s3_key}: {e}")
            return {'statusCode': 500, 'body': json.dumps({"error": f"S3 Read Error: {e}"})}
    except Exception as e:
        print(f"ERROR processing S3 file {feature_s3_key}: {e}")
        return {'statusCode': 500, 'body': json.dumps({"error": f"Feature Processing Error: {e}"})}

    # --- 3. Invoke SageMaker Endpoint ---
    print(f"Invoking SageMaker endpoint: {SAGEMAKER_ENDPOINT_NAME}")
    try:
        response = sagemaker_runtime.invoke_endpoint(
            EndpointName=SAGEMAKER_ENDPOINT_NAME,
            ContentType='application/json',
            Accept='application/json', 
            Body=payload_json
        )
        result_body = response['Body'].read().decode('utf-8')
        # Parse the JSON response from the endpoint's output_fn
        prediction_result = json.loads(result_body)

        direction = prediction_result['prediction']
        confidence = prediction_result['confidence']
        prob_up = prediction_result['probability_up'] 

        print(f"Prediction Received - Direction: {direction}, Confidence: {confidence:.2%}")

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        error_message = e.response.get("Error", {}).get("Message")
        print(f"ERROR invoking SageMaker endpoint: {e}")
        status_code = 400 if error_code == 'ValidationError' else 500
        return {'statusCode': status_code, 'body': json.dumps({"error": f"SageMaker Invocation Error: {error_message or str(e)}"}) }
    except Exception as e:
        print(f"ERROR parsing SageMaker response or other invocation error: {e}")
        return {'statusCode': 500, 'body': json.dumps({"error": f"SageMaker Invocation Error: {e}"})}

    # --- 4. Save Prediction to DynamoDB (Triggers Downstream) ---
    ddb_pk = f"{ticker}_{target_date_iso}"
    print(f"Saving prediction to DynamoDB (Key: {ddb_pk})...")
    try:
        item_to_write = {
            'ticker_date': ddb_pk,# Partition Key
            'datatype': 'prediction',# Sort Key 
            'prediction': direction,
            'confidence': f"{confidence:.4f}",       
            'probability_up': f"{prob_up:.4f}",      
            'model_version': MODEL_VERSION_TAG,
            'features_s3_path': f"s3://{CURATED_BUCKET}/{feature_s3_key}", 
            'ingested_at': datetime.utcnow().isoformat() + "Z",
            'data_found_for': target_date_iso 
        }
        table.put_item(Item=item_to_write)
        print("Prediction saved successfully to DynamoDB.")
    except Exception as e:
        print(f"ERROR saving prediction to DynamoDB for {ddb_pk}: {e}")

    # --- 5. Retrieve SHAP and Explanation Data ---
    
    WAIT_TIME_SECONDS = 3 
    MAX_RETRIES = 5
    
    print(f"Waiting for {WAIT_TIME_SECONDS} seconds for downstream processes (SHAP/Bedrock) to run...")
    time.sleep(WAIT_TIME_SECONDS) 

    shap_metrics = {}
    explanation_text = "Explanation not yet available."

    for attempt in range(MAX_RETRIES):
        print(f"Attempt {attempt + 1}: Querying DynamoDB for SHAP and Explanation data...")
        try:
            response = table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('ticker_date').eq(ddb_pk)
            )
            
            for item in response.get('Items', []):
                
                # Check for SHAP item and read top-level fields
                if item.get('datatype') == 'shap':
                    top_features = item.get('top_features')
                    values = item.get('values')
                    
                    if top_features and values:
                        # Build the shap_metrics object manually
                        shap_metrics = {
                            "top_features": top_features,
                            "values": values
                        }
                        print("[INFO] Found SHAP data.")

                elif item.get('datatype') == 'explanation' and 'explanation_text' in item:
                    explanation_text = item.get('explanation_text', 'No explanation text found.')
                    print("[INFO] Found Explanation text.")
            
            if shap_metrics and explanation_text != "Explanation not yet available.":
                print("Found both SHAP metrics and Explanation text.")
                break 
            
        except Exception as e:
            print(f"ERROR querying DynamoDB for SHAP/Explanation: {e}")

        if attempt < MAX_RETRIES - 1:
            time.sleep(1) 
        else:
            print("Failed to retrieve both SHAP and Explanation after max retries.")

    # --- 6. Return API Response ---
    api_response = {
        "ticker": ticker,
        "prediction_for_date": target_date_iso,
        "prediction": direction,
        "confidence": confidence,
        "probability_up": prob_up,
        "model_explanation": explanation_text,
        "shap_metrics": shap_metrics 
    }
    print("Returning API response with explanation and SHAP:", json.dumps(api_response))

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
        },
        'body': json.dumps(api_response)
    }