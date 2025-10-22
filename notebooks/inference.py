import joblib
import os
import json
import pandas as pd
import xgboost as xgb # Required for XGBoost model

# Global variable for model assets
LOADED_MODEL_ASSETS = None

# Called once when the container starts
def model_fn(model_dir):
    """Loads the XGBoost model."""
    global LOADED_MODEL_ASSETS
    if LOADED_MODEL_ASSETS:
        print("Using cached model assets.")
        return LOADED_MODEL_ASSETS

    # Check for .pkl 
    model_path_pkl = os.path.join(model_dir, "model.pkl")
    model_path_xgb = os.path.join(model_dir, "xgboost-model") 

    model = None
    if os.path.exists(model_path_pkl):
        print(f"Loading model from {model_path_pkl} using joblib")
        model = joblib.load(model_path_pkl)
    elif os.path.exists(model_path_xgb):
         print(f"Loading model from {model_path_xgb} using XGBoost Booster.load_model")
         model = xgb.Booster()
         model.load_model(model_path_xgb)
    else:
        raise FileNotFoundError(f"Could not find model.pkl or xgboost-model in {model_dir}")

    print("Model loaded successfully.")

    # --- Define Expected Features ---
    expected_features = [ 
        'ret_1d', 'mom_5d', 'rsi_14', 'abn_volume', 'ret_lag_1d', 'volatility_20d',
        'ma_50d', 'ma_200d', 'ma_trend_signal', 'day_of_week', 'month_of_year',
        'return_x_volume', 'avg_sentiment_24h', 'news_count_24h',
        'positive_count_24h', 'negative_count_24h', 'sentiment_std_24h',
        'avg_sentiment_3d'
     ]
    print(f"Model expects {len(expected_features)} features.")
    LOADED_MODEL_ASSETS = (model, expected_features)
    return LOADED_MODEL_ASSETS

# Input parsing (remains the same - handles JSON)
def input_fn(request_body, request_content_type):
    """Parses input JSON: {"features": {"feat1": val1, ...}}"""
    print(f"Received request_content_type: {request_content_type}")
    if request_content_type == 'application/json':
        try:
            input_data = json.loads(request_body)
            if "features" not in input_data or not isinstance(input_data["features"], dict):
                 raise ValueError("Input JSON must contain a 'features' key with a dictionary value.")
            return input_data["features"]
        except Exception as e:
            raise ValueError(f"Failed to parse JSON input: {e}")
    else:
        raise ValueError(f"Unsupported content type: {request_content_type}. Use application/json.")

# Prediction function for XGBoost
def predict_fn(input_features_dict, model_assets):
    """Generates predictions using the loaded XGBoost model."""
    model, expected_features = model_assets
    print(f"Received features for prediction: {input_features_dict}")

    try:
        # Create DataFrame and align features
        X = pd.DataFrame([input_features_dict]).reindex(columns=expected_features)
        if X.isnull().values.any():
             missing_cols = X.columns[X.isnull().any()].tolist()
             print(f"Warning: Features missing/NaN: {missing_cols}. Filling with 0.")
             X = X.fillna(0)
        X = X.astype(float)
        print(f"Input DataFrame shape for prediction: {X.shape}")

    except Exception as e:
         raise ValueError(f"Error creating DataFrame from input features: {e}")

    # Make prediction based on model type
    print("Predicting probabilities...")
    if isinstance(model, xgb.Booster):
        # Booster needs DMatrix
        print("Using Booster.predict()")
        xgb_input = xgb.DMatrix(X, feature_names=expected_features)
        prob_class_1 = model.predict(xgb_input)[0] # Gives prob of positive class
        prob_class_0 = 1.0 - prob_class_1
        prediction_output = [prob_class_0, prob_class_1]
    elif hasattr(model, 'predict_proba'): # Check if it's the sklearn wrapper
        print("Using sklearn wrapper predict_proba()")
        prediction_output = model.predict_proba(X)[0] # Gives [prob_0, prob_1]
    else:
        raise TypeError("Loaded model is not a recognized XGBoost Booster or sklearn wrapper.")

    return prediction_output

# Output formatting (remains the same - handles JSON conversion)
def output_fn(prediction_output, accept):
    """Formats the prediction output probability array into JSON."""
    import numpy as np # Need numpy for float conversion check
    print(f"Formatting prediction for accept type: {accept}")
    if accept == "application/json":
        try:
            # Convert numpy floats to standard Python floats
            prob_class_0 = float(prediction_output[0])
            prob_class_1 = float(prediction_output[1])

            prediction = 1 if prob_class_1 >= 0.5 else 0
            direction = "Up" if prediction == 1 else "Down"
            confidence = prob_class_1 if direction == "Up" else prob_class_0

            response_body = {
                "prediction": direction,
                "confidence": confidence,
                "probability_up": prob_class_1
            }
            return json.dumps(response_body), accept
        except Exception as e:
             error_body = json.dumps({"error": "Failed to format prediction output", "details": str(e)})
             return error_body, "application/json"
    raise ValueError(f"Unsupported accept type: {accept}. Use application/json.")