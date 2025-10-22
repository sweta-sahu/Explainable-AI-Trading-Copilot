import os
import json
import math
from decimal import Decimal
import boto3
import botocore
from datetime import datetime
from typing import Dict, Any, List
from boto3.dynamodb.types import TypeDeserializer

# --- Env vars ---
REGION = os.getenv("AWS_REGION", "us-east-1")
TABLE_NAME = os.getenv("TABLE_NAME", "TradingCopilot")

MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")

FALLBACK_MODEL_ID = os.getenv("BEDROCK_FALLBACK_MODEL_ID", "amazon.titan-text-premier-v1:0")

MAX_TOKENS = int(os.getenv("MAX_TOKENS", "250"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.2"))
ALLOW_FALLBACK = os.getenv("ALLOW_FALLBACK", "true").lower() == "true"

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)
bedrock  = boto3.client("bedrock-runtime", region_name=REGION)

# --- DynamoDB Stream Utilities ---
ddb_deserializer = TypeDeserializer()

SYSTEM_PROMPT = (
    "You explain machine learning stock predictions succinctly and responsibly. "
    "Use the provided SHAP-like signals and basic metrics to write 2–3 sentences "
    "that a non-ML user can understand. Be specific about positive/negative drivers. "
    "Avoid financial advice language or guarantees."
)

# --- JSON converter for Decimal objects ---
def _json_decimal_converter(o):
    """Converts Decimal objects to float for json.dumps."""
    if isinstance(o, Decimal):
        return float(o)
    raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")

def _build_prompt(ticker: str, date_str: str, shap_dict: Dict[str, Any], metrics: Dict[str, Any]) -> str:
    """
    Builds the prompt for the Bedrock model.
    UPDATED to handle Decimal types from DynamoDB.
    """
    return (
        f"Ticker: {ticker}\nDate: {date_str}\n\n"
        f"Signals (SHAP-style, value = contribution score):\n"
        # Use the custom converter to handle Decimals from DDB
        f"{json.dumps(shap_dict, ensure_ascii=False, indent=2, default=_json_decimal_converter)}\n\n"
        f"Metrics (e.g., probability, predicted direction):\n"
        f"{json.dumps(metrics, ensure_ascii=False, indent=2, default=_json_decimal_converter)}\n\n"
        "Task: In 2-3 sentences, explain why the model predicts UP or DOWN. "
        "Name the most influential positive and negative factors. Keep it concise."
    )

# ---------- Utilities: convert to DynamoDB-safe types ----------

def _to_dynamo(value):
    """
    Recursively convert floats to Decimal for DynamoDB.
    Also string-ify NaN/Inf to avoid DynamoDB rejection.
    """
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return str(value)  # store as string if not a finite number
        return Decimal(str(value))
    if isinstance(value, (int, bool, str)) or value is None:
        return value
    if isinstance(value, dict):
        return {k: _to_dynamo(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_dynamo(v) for v in value]
    # Fallback: stringify unknown types
    return str(value)

# ---------- Bedrock invokers (Unchanged) ----------

def _invoke_nova_converse(prompt: str, model_id: str) -> Dict[str, Any]:
    resp = bedrock.converse(
        modelId=model_id,
        system=[{"text": SYSTEM_PROMPT}],
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": MAX_TOKENS, "temperature": TEMPERATURE},
    )
    text = resp["output"]["message"]["content"][0]["text"]
    return {"text": text, "raw": resp}

def _invoke_anthropic_claude(prompt: str, model_id: str) -> Dict[str, Any]:
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": MAX_TOKENS,
        "temperature": TEMPERATURE,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    }
    resp = bedrock.invoke_model(
        modelId=model_id,
        body=json.dumps(body).encode("utf-8"),
        accept="application/json",
        contentType="application/json",
    )
    payload = json.loads(resp["body"].read())
    text = "".join(part.get("text", "") for part in payload.get("content", []))
    return {"text": text, "raw": payload}

def _invoke_amazon_titan(prompt: str, model_id: str) -> Dict[str, Any]:
    body = {
        "inputText": prompt,
        "textGenerationConfig": {"temperature": TEMPERATURE, "maxTokenCount": MAX_TOKENS},
        "system": SYSTEM_PROMPT,
    }
    resp = bedrock.invoke_model(
        modelId=model_id,
        body=json.dumps(body).encode("utf-8"),
        accept="application/json",
        contentType="application/json",
    )
    payload = json.loads(resp["body"].read())
    text = (payload.get("results") or [{}])[0].get("outputText", "")
    return {"text": text, "raw": payload}

def _dispatch_model(prompt: str, model_id: str) -> Dict[str, Any]:
    mid = model_id.lower()
    if mid.startswith("amazon.nova-"):
        return _invoke_nova_converse(prompt, model_id)
    if "anthropic" in mid or "claude" in mid:
        return _invoke_anthropic_claude(prompt, model_id)
    if "titan" in mid or "amazon.titan" in mid:
        return _invoke_amazon_titan(prompt, model_id)
    return _invoke_nova_converse(prompt, model_id)

def _safe_invoke(prompt: str) -> Dict[str, Any]:
    try:
        out = _dispatch_model(prompt, MODEL_ID)
        if out.get("text", "").strip():
            out["model_used"] = MODEL_ID
            return out
        raise RuntimeError("Empty model response")
    except botocore.exceptions.ClientError as e:
        msg = str(e).lower()
        access_blockers = (
            "use case details",
            "access denied",
            "throttlingexception",
            "throughput",
            "provisionedthroughputexceeded",
            "invocation of model id",
            "resourcenotfoundexception",
            "model not found",
        )
        if ALLOW_FALLBACK and any(tok in msg for tok in access_blockers):
            out = _dispatch_model(prompt, FALLBACK_MODEL_ID)
            out["model_used"] = FALLBACK_MODEL_ID
            return out
        raise

# ---------- Storage ----------

def _put_explanation_item(
    ticker: str,
    date_str: str,
    explanation: str,
    shap_dict: Dict[str, Any],
    metrics: Dict[str, Any],
    model_id: str,
    raw: Dict[str, Any],
) -> Dict[str, Any]:
    key = f"{ticker}_{date_str}"
    item = {
        "ticker_date": key,
        "datatype": "explanation",
        "explanation_text": explanation.strip(),
        # Convert here to ensure no floats leak into DynamoDB
        "signals": _to_dynamo(shap_dict),
        "metrics": _to_dynamo(metrics),
        "model_id": model_id,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "trace": {
            "provider": "bedrock",
            "token_note": f"max_tokens={MAX_TOKENS}, temp={TEMPERATURE}"
        },
    }
    table.put_item(Item=item)
    return item

# ---------- DynamoDB Stream Helpers ----------

def _deserialize_ddb_item(ddb_item: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a DynamoDB 'NewImage' into a regular Python dict."""
    return {k: ddb_deserializer.deserialize(v) for k, v in ddb_item.items()}


def _get_prediction_metrics(ticker_date_key: str) -> Dict[str, Any]:
    """
    Fetches the corresponding prediction metrics for the same ticker and date.
    
    UPDATED:
    1. First, looks for a 'metrics' map.
    2. If not found, manually builds the metrics dict from top-level
       fields ('prediction', 'probability_up', 'confidence').
    """
    try:
        resp = table.get_item(
            Key={"ticker_date": ticker_date_key, "datatype": "prediction"}
        )
        
        if "Item" in resp:
            item = resp["Item"]
            
            # 1. Check if 'metrics' map exists
            if "metrics" in item and isinstance(item["metrics"], dict):
                print(f"[INFO] Found 'metrics' map for {ticker_date_key}")
                return item["metrics"]
                
            # 2. If not, build metrics from top-level fields
            print(f"[INFO] No 'metrics' map. Building from top-level fields for {ticker_date_key}.")
            metrics = {}
            if "prediction" in item:
                metrics["pred"] = item["prediction"]
            if "probability_up" in item:
                metrics["prob_up"] = item["probability_up"]
            if "confidence" in item:
                metrics["confidence"] = item["confidence"]
            
            if metrics:
                return metrics
            
        print(f"[WARN] No 'prediction' item or metrics found for {ticker_date_key}")
        return {}
        
    except Exception as e:
        print(f"[ERROR] Could not fetch metrics for {ticker_date_key}: {e}")
        return {}

# ---------- Handler ----------

def lambda_handler(event, context):
    """
    Triggered by a DynamoDB Stream from the 'TradingCopilot' table.
    It processes new 'shap' items, fetches their corresponding 'prediction'
    data, generates an explanation, and saves it back to the table.
    """
    print(f"[INFO] Received {len(event.get('Records', []))} records from DDB stream.")
    processed: List[Dict[str, Any]] = []

    for record in event.get("Records", []):
        # 1. Check if it's a new 'shap' item
        if record.get("eventName") not in ("INSERT", "MODIFY"):
            continue
        
        new_image = record.get("dynamodb", {}).get("NewImage")
        if not new_image:
            continue
            
        # Convert DDB-JSON to a Python dict
        item = _deserialize_ddb_item(new_image)
        
        if item.get("datatype") != "shap":
            print(f"[INFO] Skipping record, not 'shap' datatype.")
            continue

        # 2. Extract data from the 'shap' item
        try:
            ticker_date_key = item["ticker_date"]
            ticker, date_str = ticker_date_key.split("_", 1)
            
            # Reconstruct the shap_dict from the lists
            top_features = item.get("top_features", [])
            values = item.get("values", []) # These are saved as strings
            
            # Convert to float for prompting
            shap_dict = {f: float(v) for f, v in zip(top_features, values) if f and v}
            
            if not shap_dict:
                print(f"[WARN] Skipping {ticker_date_key}, 'shap' item has no features.")
                continue
                
        except (KeyError, ValueError, TypeError) as e:
            print(f"[ERROR] Failed to parse SHAP record: {e}. Record: {item}")
            continue
            
        print(f"[INFO] Processing SHAP data for {ticker_date_key}")

        # 3. Fetch corresponding prediction metrics
        metrics = _get_prediction_metrics(ticker_date_key)
        if not metrics:
            print(f"[WARN] Proceeding without metrics for {ticker_date_key}")

        # 4. Build prompt and invoke Bedrock
        prompt = _build_prompt(ticker, date_str, shap_dict, metrics)

        try:
            bedrock_out = _safe_invoke(prompt)
            explanation = bedrock_out.get("text", "").strip()
            model_used  = bedrock_out.get("model_used", MODEL_ID)
        except Exception as e:
            print(f"[ERROR] Bedrock invocation failed for {ticker_date_key}: {e}")
            explanation = (
                "Explanation currently unavailable. Key drivers were: "
                + ", ".join(f"{k} ({v:+.2f})" for k, v in shap_dict.items())
                + "."
            )
            model_used = f"{MODEL_ID} (errored)"
            bedrock_out = {"raw": {"error": str(e)}}

        if not explanation:
            explanation = (
                "Explanation currently unavailable. Key drivers were: "
                + ", ".join(f"{k} ({v:+.2f})" for k, v in shap_dict.items())
                + "."
            )

        # 5. Save the new explanation item
        try:
            _put_explanation_item(
                ticker, date_str, explanation, shap_dict, metrics, model_used, bedrock_out.get("raw", {})
            )
            print(f"[INFO] Successfully saved explanation for {ticker_date_key}")
            processed.append({
                "ticker_date": ticker_date_key,
                "status": "ok",
                "model_used": model_used,
                "explanation": explanation
            })
        except Exception as e:
            print(f"[ERROR] Failed to save explanation for {ticker_date_key}: {e}")

    return {
        "status": "ok",
        "processed_count": len(processed),
        "processed_items": processed
    }