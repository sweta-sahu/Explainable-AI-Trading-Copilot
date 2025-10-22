import os
import json
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Attr # We need Attr for filtering

# --- Environment Variables (Set in Lambda Configuration) ---
# DDB_TABLE: Your DynamoDB table name (e.g., StockCopilotTable)
DDB_TABLE = os.environ['DDB_TABLE'] 
REGION = os.environ.get('AWS_REGION', 'us-east-1')

# --- AWS Clients ---
dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(DDB_TABLE)

# --- Helper to convert DynamoDB's Decimal to JSON-safe float/int ---
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            if o % 1 == 0:
                return int(o)
            else:
                return float(o)
        return super(DecimalEncoder, self).default(o)

# --- Lambda Handler ---
def lambda_handler(event, context):
    """
    Handles API Gateway requests to get all PREDICTION history for a ticker
    using an inefficient, but functional, DynamoDB SCAN.
    
    1. Parses ticker from the path.
    2. Scans the *entire* table.
    3. Filters for items where 'ticker_date' starts with the ticker 
       AND 'datatype' is 'prediction'.
    4. Returns the items as a JSON array.
    """
    print("Received API Gateway event:", json.dumps(event))

    # --- 1. Parse Ticker from Path ---
    try:
        ticker = event['pathParameters']['ticker'].upper()
        print(f"Request Parsed - Ticker: {ticker}")
        
    except (KeyError, TypeError) as e:
        print(f"ERROR: Invalid input format: {e}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({"error": "Invalid input. Provide ticker in path (e.g., /get-history/AAPL)."})
        }

    # --- 2. Scan the Table (Warning: Inefficient) ---
    try:
        # --- THIS IS THE MODIFIED PART ---
        
        # Filter 1: 'ticker_date' (PK) string must begin with "TICKER_"
        filter_ticker = Attr('ticker_date').begins_with(f"{ticker}_")
        
        # Filter 2: 'datatype' string must be exactly "prediction"
        filter_datatype = Attr('datatype').eq('prediction')
        
        # Combine the filters: Both must be true
        combined_filter = filter_ticker & filter_datatype

        # --- END OF MODIFICATION ---

        scan_args = {
            'FilterExpression': combined_filter
        }
        
        items = []
        
        # Handle pagination (Scan can only return 1MB at a time)
        while True:
            response = table.scan(**scan_args)
            items.extend(response.get('Items', []))
            
            if 'LastEvaluatedKey' not in response:
                break # Exit the loop if all items have been fetched
            
            scan_args['ExclusiveStartKey'] = response['LastEvaluatedKey']

        print(f"Scan complete: Found {len(items)} PREDICTION items for {ticker}")

        # --- 3. Return API Response ---
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(items, cls=DecimalEncoder)
        }

    except Exception as e:
        print(f"ERROR: DynamoDB scan failed: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({"error": f"Internal server error: {e}"})
        }
