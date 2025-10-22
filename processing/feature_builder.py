import os, argparse
import pandas as pd
import numpy as np
import boto3
from datetime import timedelta, datetime

# --- Constants & AWS Clients ---
LOCAL_INPUT_PATH = "/opt/ml/processing/input/raw-data"
LOCAL_OUTPUT_PATH = "/opt/ml/processing/output"
REGION = os.environ.get("AWS_REGION", "us-east-1")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table("TradingCopilot") 

def read_news_metrics_from_dynamodb(symbol, date_iso):
    """
    Fetches detailed processed news metrics from DynamoDB.
    """
    try:
        pk = f"{symbol}_{date_iso}"
        response = table.get_item(
            Key={'ticker_date': pk, 'datatype': 'news_metrics'}
        )

        if 'Item' in response:
            item = response['Item']
            metrics = {
                'avg_sentiment_24h': float(item.get('avg_sentiment_24h', '0.0')),
                'news_count_24h': int(item.get('count_24h', 0)),
                'positive_count_24h': int(item.get('positive_count_24h', 0)), # New
                'negative_count_24h': int(item.get('negative_count_24h', 0)), # New
                'sentiment_std_24h': float(item.get('sentiment_std_24h', '0.0')) # New
            }
            return metrics
        else:
            # Return defaults for all metrics if item not found
            return {
                'avg_sentiment_24h': 0.0, 'news_count_24h': 0,
                'positive_count_24h': 0, 'negative_count_24h': 0,
                'sentiment_std_24h': 0.0
            }
    except Exception as e:
        return {
            'avg_sentiment_24h': 0.0, 'news_count_24h': 0,
            'positive_count_24h': 0, 'negative_count_24h': 0,
            'sentiment_std_24h': 0.0
        }

def create_features(symbol):
    """
    Reads price data, computes features, enriches with detailed news metrics,
    calculates rolling sentiment, and filters for the most recent three years.
    """
    file_path = os.path.join(LOCAL_INPUT_PATH, f"{symbol}.csv")
    if not os.path.exists(file_path): return None

    df = pd.read_csv(file_path)
    df.columns = df.columns.str.lower()
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values("date")

    # --- 1. Price/Volume/Time Features ---
    df["ret_1d"] = df["close"].pct_change(1)
    df["mom_5d"] = df["close"].pct_change(5)
    delta = df["close"].diff()
    gain = np.where(delta > 0, delta, 0.0)
    loss = np.where(delta < 0, -delta, 0.0)
    avg_gain = pd.Series(gain).rolling(14, min_periods=1).mean()
    avg_loss = pd.Series(loss).rolling(14, min_periods=1).mean().replace(0, 1e-9)
    rs = avg_gain / avg_loss
    df["rsi_14"] = 100 - (100 / (1 + rs))
    df["abn_volume"] = df["volume"] / df["volume"].rolling(30, min_periods=1).mean()
    df['symbol'] = symbol
    df['ret_lag_1d'] = df['ret_1d'].shift(1)
    df['volatility_20d'] = df['ret_1d'].rolling(20, min_periods=1).std()
    df['ma_50d'] = df['close'].rolling(50, min_periods=1).mean()
    df['ma_200d'] = df['close'].rolling(200, min_periods=1).mean()
    df['ma_trend_signal'] = (df['ma_50d'] > df['ma_200d']).astype(int)
    df['day_of_week'] = df['date'].dt.dayofweek
    df['month_of_year'] = df['date'].dt.month
    if 'abn_volume' in df.columns: df['return_x_volume'] = df['ret_1d'] * df['abn_volume']
    else: df['return_x_volume'] = 0.0

    # --- 2. Enrich with Detailed News Metrics from DynamoDB ---
    print(f"Enriching {symbol} data with detailed news metrics from DynamoDB...")
    df['date_iso'] = df['date'].dt.strftime('%Y-%m-%d')
    news_data = df.apply(lambda row: read_news_metrics_from_dynamodb(symbol, row['date_iso']), axis=1)
    news_df = pd.json_normalize(news_data) # Creates columns for all metrics

    df = pd.concat([df.reset_index(drop=True), news_df], axis=1)
    df = df.drop(columns=['date_iso'])

    # --- CHANGE 2: Ensure ALL new columns exist and fill NaNs (mostly handled by defaults) ---
    news_cols = ['avg_sentiment_24h', 'news_count_24h', 'positive_count_24h', 'negative_count_24h', 'sentiment_std_24h']
    for col in news_cols:
        if col not in df.columns:
            df[col] = 0.0 if 'sentiment' in col else 0 # Default sentiment to 0.0, counts to 0
        else:
            # Fill any potential NaNs from merge issues, although defaults should prevent this
             df[col] = df[col].fillna(0.0 if 'sentiment' in col else 0)

    # Convert counts to integer
    for col in ['news_count_24h', 'positive_count_24h', 'negative_count_24h']:
         df[col] = df[col].astype(int)

    # --- CHANGE 3: Calculate Rolling Sentiment Average ---
    # Calculate rolling average AFTER fetching daily data
    df['avg_sentiment_3d'] = df['avg_sentiment_24h'].rolling(3, min_periods=1).mean()


    # --- 3. Filter for the last 3 years ---
    end_date = df['date'].max()
    start_date = end_date - timedelta(days=365 * 3)
    final_df = df[df['date'] >= start_date].copy()

    # --- 4. Drop NaNs AFTER filtering ---
    # Update list to include new potential NaNs from rolling/lags
    features_to_dropna = [
        'ret_1d', 'mom_5d', 'rsi_14', 'abn_volume', 'ret_lag_1d', 'volatility_20d',
        'ma_50d', 'ma_200d', 'return_x_volume', 'avg_sentiment_3d' # Add new rolling feature
        ]
    # Keep only features that actually exist in the dataframe before dropping
    features_to_dropna = [f for f in features_to_dropna if f in final_df.columns]
    final_df = final_df.dropna(subset=features_to_dropna)

    print(f"Generated {len(final_df.columns)} columns for {symbol}. Shape after NaN drop: {final_df.shape}")
    return final_df

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--symbols", required=True)
    args = ap.parse_args()

    syms = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    os.makedirs(LOCAL_OUTPUT_PATH, exist_ok=True)

    for sym in syms:
        try:
            features_df = create_features(sym)
            if features_df is not None and not features_df.empty:
                output_file = os.path.join(LOCAL_OUTPUT_PATH, f"{sym}_features.csv")
                features_df.to_csv(output_file, index=False)
                print(f"Wrote 3-year feature set for {sym} to {output_file}")
        except Exception as e:
            print(f"[error] processing {sym} -> {e}")

if __name__ == "__main__":
    main()