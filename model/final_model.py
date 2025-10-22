import pandas as pd
import xgboost as xgb
import joblib
import os
import argparse
from sklearn.metrics import accuracy_score

def train_model(feature_path, model_output_path, **hyperparameters):
    
    feature_files = [os.path.join(feature_path, f) for f in os.listdir(feature_path) if f.endswith('_features.csv')]
    all_features_df = pd.concat((pd.read_csv(f) for f in feature_files), ignore_index=True)
    all_features_df['date'] = pd.to_datetime(all_features_df['date'])
    all_features_df = all_features_df.sort_values(by=['date', 'symbol']).reset_index(drop=True)

    all_features_df['target'] = (all_features_df.groupby('symbol')['close'].shift(-1) > all_features_df['close']).astype(int)
    
    features = [col for col in all_features_df.columns if col not in ['date', 'open', 'high', 'low', 'close', 'volume', 'symbol', 'asof', 'target']]
    final_df = all_features_df.dropna(subset=features + ['target'])
    
    X = final_df[features]
    y = final_df['target']

    split_index = int(len(final_df) * 0.8)
    X_train, X_test = X[:split_index], X[split_index:]
    y_train, y_test = y[:split_index], y[split_index:]

    print(f"Training with hyperparameters: {hyperparameters}")
    
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='auc', # The tuner will look for this metric
        use_label_encoder=False,
        **hyperparameters # Pass the tuner's hyperparameters here
    )
    
    # Provide an evaluation set for the tuner to monitor
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    preds = model.predict(X_test)
    accuracy = accuracy_score(y_test, preds)
    print(f"Final Accuracy for this run: {accuracy:.4f}")

    model_filename = os.path.join(model_output_path, "model.pkl")
    joblib.dump(model, model_filename)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    
    # Arguments for SageMaker paths
    parser.add_argument('--model-dir', type=str, default=os.environ.get('SM_MODEL_DIR'))
    parser.add_argument('--train', type=str, default=os.environ.get('SM_CHANNEL_TRAIN'))

    # Arguments for Hyperparameters from the tuner
    parser.add_argument('--max_depth', type=int, default=5)
    parser.add_argument('--eta', type=float, default=0.2)
    parser.add_argument('--min_child_weight', type=int, default=1)
    parser.add_argument('--subsample', type=float, default=0.8)
    parser.add_argument('--colsample_bytree', type=float, default=0.8)

    args = parser.parse_args()

    hyperparams = {
        'max_depth': args.max_depth,
        'eta': args.eta,
        'min_child_weight': args.min_child_weight,
        'subsample': args.subsample,
        'colsample_bytree': args.colsample_bytree,
    }
    
    train_model(feature_path=args.train, model_output_path=args.model_dir, **hyperparams)