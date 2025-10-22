import json
from handler import lambda_handler

# --- Updated Test Event ---
# This mimics a DynamoDB Stream event for a 'prediction' item insertion.
# The handler.py code is built to parse this structure.

TICKER = "AAPL"
ASOF_DATE = "2025-10-19" # The date the prediction is for
DATA_DATE = "2025-10-15" # The date of the features used for the prediction

event = {
  "Records": [
    {
      "eventName": "INSERT",
      "dynamodb": {
        "Keys": {
          "ticker_date": { "S": f"{TICKER}_{ASOF_DATE}" },
          "datatype": { "S": "prediction" }
        },
        "NewImage": {
          # --- These are the fields your handler code will parse ---
          "ticker_date": { "S": f"{TICKER}_{ASOF_DATE}" },
          "datatype": { "S": "prediction" },
          "data_found_for": { "S": f"{DATA_DATE}" },
          
          # --- Other fields that might be in the prediction item (for context) ---
          "metrics": {
            "M": {
              "prob": { "N": "0.68" },
              "pred": { "S": "up" }
            }
          },
          "ingested_at": { "S": "2025-10-03T18:00:00Z" }
        },
        "StreamViewType": "NEW_IMAGE"
      },
      "eventSourceARN": "arn:aws:dynamodb:us-east-1:005716754528:table/TradingCopilot/stream/2025-10-03T01:52:30.016"
    }
  ]
}

print(f"--- Running test for a '{TICKER}_{ASOF_DATE}' prediction event ---")

result = lambda_handler(event, None)

print("--- Lambda Function Result ---")

# Your new handler returns an API Gateway-style response from *within*
# the stream loop. We can parse the 'body' just like before.
try:
    if result and 'body' in result:
        result['body'] = json.loads(result['body'])
except TypeError:
    print("[ERROR] Handler did not return a valid dictionary. Result was:")
    print(result)
except json.JSONDecodeError:
    print("[ERROR] Handler 'body' was not valid JSON. Result body was:")
    print(result.get('body'))

print(json.dumps(result, indent=2))