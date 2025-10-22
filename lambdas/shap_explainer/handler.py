import xgboost as xgb
import joblib, shap, os, io, json, boto3, tarfile
import pandas as pd
from datetime import datetime, timedelta
import tempfile 
from boto3.dynamodb.types import TypeDeserializer # <-- NEW IMPORT

# --- Config ---
S3_BUCKET = os.getenv("S3_BUCKET", "ai-trading-copilot-curated") # For features
DDB_TABLE = os.getenv("DDB_TABLE", "TradingCopilot")
REGION = os.getenv("AWS_REGION", "us-east-1")

# --- Specific path for the SageMaker model ---
MODEL_S3_BUCKET = "sagemaker-us-east-1-005716754528" 
MODEL_S3_KEY = "stock-model-tuning/stock-xgb-tuning-251018-0001-005-a1482f12/output/model.tar.gz"

# --- AWS Clients ---
s3 = boto3.client("s3", region_name=REGION)
ddb = boto3.resource("dynamodb", region_name=REGION)
table = ddb.Table(DDB_TABLE)

# --- Helper: read CSV from S3 (Unchanged) ---
def read_csv_from_s3(bucket, key):
    obj = s3.get_object(Bucket=bucket, Key=key)
    return pd.read_csv(io.BytesIO(obj["Body"].read()))

# --- Helper: universal model loader from S3 (Unchanged) ---
def load_model_safely(s3_client, bucket, key):
    """
    Load a model from a .tar.gz archive (SageMaker output) from S3.
    Extracts the archive to the OS's temp directory and loads the model file.
    """
    temp_dir = tempfile.gettempdir()
    local_tar_path = os.path.join(temp_dir, "model.tar.gz")
    local_extract_dir = os.path.join(temp_dir, "model_extracted")
    
    print(f"[DEBUG] Using temp download path: {local_tar_path}")
    print(f"[DEBUG] Using temp extract path: {local_extract_dir}")
    
    try:
        # 1. Download the tarball
        print(f"[INFO] Downloading model archive from s3://{bucket}/{key}")
        s3_client.download_file(bucket, key, local_tar_path)
        
        # 2. Extract the tarball
        print(f"[INFO] Extracting {local_tar_path} to {local_extract_dir}")
        os.makedirs(local_extract_dir, exist_ok=True)
        with tarfile.open(local_tar_path, "r:gz") as tar:
            tar.extractall(path=local_extract_dir)
            
        print(f"[INFO] Extracted files: {os.listdir(local_extract_dir)}")

        # 3. Try loading the native XGBoost model (SageMaker default)
        model_path = os.path.join(local_extract_dir, "xgboost-model")
        if os.path.exists(model_path):
            print("[INFO] Loading 'xgboost-model' (XGBoost booster format)")
            booster = xgb.Booster()
            booster.load_model(model_path)
            return booster, "json" 

        # 4. Try loading a .json model
        model_path = os.path.join(local_extract_dir, "model.json")
        if os.path.exists(model_path):
            print("[INFO] Loading 'model.json' (XGBoost booster format)")
            booster = xgb.Booster()
            booster.load_model(model_path)
            return booster, "json"

        # 5. Try loading a .joblib model (SKLearn wrapper)
        model_path = os.path.join(local_extract_dir, "model.joblib")
        if os.path.exists(model_path):
            print("[INFO] Loading 'model.joblib' (pickled sklearn wrapper)")
            model = joblib.load(model_path)
            return model, "joblib"
            
        # 6. Try loading a .pkl model (generic pickle)
        model_path = os.path.join(local_extract_dir, "model.pkl")
        if os.path.exists(model_path):
            print("[INFO] Loading 'model.pkl' (pickled file)")
            model = joblib.load(model_path) # Use joblib to load pickle
            return model, "joblib" # Treat as joblib type for SHAP
            
        raise FileNotFoundError(f"No valid model file (xgboost-model, model.json, model.joblib, or model.pkl) found in archive.")

    except s3_client.exceptions.ClientError as e:
        print(f"[ERROR] Could not download model from S3: {e}")
        raise FileNotFoundError(f"Model not found at s3://{bucket}/{key}")
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        raise

# --- Main Lambda handler (--- COMPLETELY REWRITTEN ---) ---
def lambda_handler(event, context):
    
    print(f"[INFO] Received {len(event.get('Records', []))} records from DDB stream.")
    
    # --- NEW: Helper to deserialize DDB stream records ---
    ddb_deserializer = TypeDeserializer()

    # 1️⃣ Load model from S3 (once per invocation)
    try:
        model, mtype = load_model_safely(s3, MODEL_S3_BUCKET, MODEL_S3_KEY)
        print("[INFO] Model loaded successfully.")
    except Exception as e:
        print(f"[FATAL] Could not load model. Stopping invocation. Error: {e}")
        return {"statusCode": 500, "body": "Failed to load model"}

    processed_count = 0
    
    # --- NEW: Process each record from the stream ---
    for record in event.get("Records", []):
        
        # 1.1 Check if it's a new item
        if record.get("eventName") not in ("INSERT", "MODIFY"):
            continue
        
        new_image = record.get("dynamodb", {}).get("NewImage")
        if not new_image:
            continue
            
        # 1.2 Convert DDB-JSON to a Python dict
        item = {k: ddb_deserializer.deserialize(v) for k, v in new_image.items()}
        
        # 1.3 --- FILTER: Only run if the trigger was a 'prediction' item ---
        if item.get("datatype") != "prediction":
            print(f"[INFO] Skipping item, not 'prediction' datatype.")
            continue

        try:
            # 1.4 Get Ticker and Date from the prediction item
            ticker_date_key = item["ticker_date"]
            ticker, asof = ticker_date_key.split("_", 1)
            
            # 1.5 Get the *exact* date the prediction used
            # This assumes your prediction lambda saves this field
            data_found_for = item.get("data_found_for") 
            if not data_found_for:
                 print(f"[WARNING] 'data_found_for' not in prediction item for {ticker_date_key}. Falling back to 'asof' date: {asof}")
                 data_found_for = asof

            print(f"[INFO] Processing prediction for {ticker_date_key}. Using features from {data_found_for}.")
            
        except (KeyError, ValueError, TypeError) as e:
            print(f"[ERROR] Failed to parse prediction record: {e}. Record: {item}")
            continue # Skip this broken record

        # 2️⃣ Load feature data from S3 (--- NO LOOKBACK ---)
        # We load the *exact* file the prediction was based on.
        # NOTE: Make sure this S3 path matches your feature pipeline!
        key = f"features/symbol={ticker}/date={data_found_for}/features.csv"
        
        try:
            df = read_csv_from_s3(S3_BUCKET, key)
            print(f"[INFO] Success: Loaded from S3: s3://{S3_BUCKET}/{key}")
        except Exception as e:
            # If we can't get the features, we can't run SHAP.
            print(f"[ERROR] Could not load features for {ticker_date_key} from {key}: {e}")
            continue # Skip this record

        # 3️⃣ Clean + align features (Same as before)
        drop_cols = ["target_up", "symbol", "asof", "date"]
        df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors="ignore")

        if mtype == "joblib":
            try:
                expected = model.get_booster().feature_names
            except Exception:
                try:
                    expected = model.feature_names_in_
                except AttributeError:
                    print("[WARNING] Could not automatically get model feature names. Using columns from data.")
                    expected = list(df.columns)
        else:  # booster JSON model
            expected = model.feature_names
            if expected is None or len(expected) == 0:
                expected = list(df.columns)

        X = df[[f for f in expected if f in df.columns]].astype(float)
        
        missing_in_df = set(expected) - set(X.columns)
        if missing_in_df:
            print(f"[WARNING] Model expected features not in data: {missing_in_df}")
            X = X.reindex(columns=expected) # Fill missing with NaN

        print(f"[DEBUG] X shape after re-aligning: {X.shape}")

        # 4️⃣ Compute SHAP (Same as before)
        if mtype == "json":
            explainer = shap.Explainer(model)
        else:
            if isinstance(model, (xgb.XGBClassifier, xgb.XGBRegressor)):
                 explainer = shap.TreeExplainer(model)
            else:
                print("[INFO] 'joblib' model is not a standard XGB wrapper. Using shap.Explainer (may be slower).")
                explainer = shap.Explainer(model.predict, X) 

        shap_values = explainer(X)
        
        shap_vals_data = shap_values.values
        if isinstance(shap_vals_data, list) and len(shap_vals_data) > 1:
            print("[INFO] Classifier model detected, using SHAP values for the positive class.")
            shap_vals_data = shap_vals_data[1] 

        mean_abs = dict(zip(X.columns, abs(shap_vals_data).mean(axis=0)))
        top_features = sorted(mean_abs.items(), key=lambda x: x[1], reverse=True)[:5]

        print(f"[RESULT] Top SHAP features: {top_features}")

        # 5️⃣ Save to DynamoDB (Same as before)
        # This saves the *new* 'shap' item
        item = {
            "ticker_date": f"{ticker}_{asof}", # Use the original 'asof' date for the key
            "datatype": "shap",
            "top_features": [f[0] for f in top_features], 
            "values": [str(f[1]) for f in top_features],
            "data_found_for": data_found_for, # Record which day's features we used
            "ingested_at": datetime.utcnow().isoformat() + "Z"
        }
        table.put_item(Item=item)
        print(f"[INFO] Saved SHAP explanation to DynamoDB for {ticker}_{asof}")
        processed_count += 1

        json_top_factors = [[feature, float(value)] for feature, value in top_features]

        # 6️⃣ Return result
        return {
            "statusCode": 200,
            "headers": {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            "body": json.dumps({
                "ticker": ticker,
                "asof": asof, # The date the user requested
                "data_found_for": data_found_for, # The date data was actually found for
                "top_factors": json_top_factors # <-- HERE ARE THE RESULTS
            })
        }