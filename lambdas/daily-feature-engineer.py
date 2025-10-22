import os
import io
import json
import boto3
import pandas as pd
import numpy as np
from datetime import timedelta, datetime, date
import urllib.parse
from botocore.exceptions import ClientError

# --- Environment Variables ---
RAW_BUCKET = os.environ['RAW_BUCKET']
CURATED_BUCKET = os.environ['CURATED_BUCKET']
DDB_TABLE = os.environ['DDB_TABLE']
REGION = "us-east-1"
FEATURE_S3_PREFIX = os.environ.get('FEATURE_S3_PREFIX', "features/daily_inference/")

# --- Constants ---
PRICE_S3_PREFIX = "stooq/daily/"
NEWS_S3_PREFIX = "gdelt/news/"
LOOKBACK_DAYS_PRICE = 250 # History needed for price features
LOOKBACK_DAYS_NEWS_ROLLING = 5 # History needed for rolling news features

# --- AWS Clients ---
s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(DDB_TABLE)
comprehend = boto3.client("comprehend", region_name=REGION)

# --- Helper: Get Sentiment ---
def get_sentiment_score(text):
    """Analyzes text using Amazon Comprehend"""
    if not text or not isinstance(text, str): return 0.0
    try:
        truncated_text = text[:4900]
        response = comprehend.detect_sentiment(Text=truncated_text, LanguageCode='en')
        sentiment = response['Sentiment']
        if sentiment == 'POSITIVE': return 1.0
        elif sentiment == 'NEGATIVE': return -1.0
        else: return 0.0 # NEUTRAL or MIXED
    except ClientError as e: return 0.0 # Treat Comprehend errors as neutral
    except Exception as e: return 0.0 # Treat other errors as neutral

# --- Helper: Read HISTORICAL PROCESSED News Metrics from DDB ---
def read_historical_news_metrics(symbol, date_iso):
    """Fetches PREVIOUSLY PROCESSED avg_sentiment_24h from DynamoDB for rolling calculation."""
    try:
        pk = f"{symbol}_{date_iso}"
        response = table.get_item(Key={'ticker_date': pk, 'datatype': 'news_metrics'})
        if 'Item' in response:
            item = response['Item']
            # Only return the average needed for the rolling feature
            return {'avg_sentiment_24h': float(item.get('avg_sentiment_24h', '0.0'))}
        else: return {'avg_sentiment_24h': 0.0}
    except Exception: return {'avg_sentiment_24h': 0.0}

# --- Function to Process CURRENT DAY Raw News ---
def process_current_day_news(ticker, target_date_iso):
    """
    Reads the raw news JSON from S3 for the target day, runs Comprehend,
    and returns calculated metrics for THAT day. Handles unexpected list format.
    """
    raw_news_key = f"{NEWS_S3_PREFIX}{target_date_iso}/{ticker}.json"
    print(f"  - Reading raw news for target day: s3://{RAW_BUCKET}/{raw_news_key}")
    current_day_metrics = { # Defaults
        'avg_sentiment_24h': 0.0, 'news_count_24h': 0,
        'positive_count_24h': 0, 'negative_count_24h': 0,
        'sentiment_std_24h': 0.0
    }
    articles = [] # Initialize articles as empty list

    try:
        obj = s3_client.get_object(Bucket=RAW_BUCKET, Key=raw_news_key)
        news_data = json.loads(obj['Body'].read().decode('utf-8'))

        # --- Check data type before accessing ---
        if isinstance(news_data, dict) and "articles" in news_data:
            articles = news_data.get("articles", [])
        elif isinstance(news_data, list):
            # If the whole file was just a list of articles
            print(f"    - WARN: Raw news file {raw_news_key} contained a list directly, not a dict. Processing list.")
            articles = news_data # Use the list directly
        else:
             print(f"    - WARN: Unexpected JSON format (not a dict with 'articles' or a list) in {raw_news_key}. Using defaults.")

        if articles: # Proceed only if articles list is not empty
            sentiment_scores = []
            pos_count, neg_count = 0, 0
            for article in articles: # Ensure 'article' is expected dict format here
                 if isinstance(article, dict) and article.get("lang") == "English": # Added type check
                    title = article.get("title", "")
                    if title and isinstance(title, str):
                        score = get_sentiment_score(title)
                        sentiment_scores.append(score)
                        if score > 0: pos_count += 1
                        elif score < 0: neg_count += 1

            # Calculate metrics for THIS day
            avg_sent = np.mean(sentiment_scores) if sentiment_scores else 0.0
            sent_std = np.std(sentiment_scores) if len(sentiment_scores) >= 2 else 0.0
            current_day_metrics = {
                'avg_sentiment_24h': avg_sent,
                'news_count_24h': len(articles), # Count still reflects total articles found
                'positive_count_24h': pos_count,
                'negative_count_24h': neg_count,
                'sentiment_std_24h': sent_std
            }
            print(f"    - Calculated metrics for {target_date_iso}: Sent={avg_sent:.2f}, Count={len(articles)}")
        # If articles list was empty from the start, defaults are kept

    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            print(f"    - Raw news file not found for {target_date_iso}. Using defaults.")
        else:
            print(f"    - WARN: S3 Error reading raw news s3://{RAW_BUCKET}/{raw_news_key}: {e}")
    except json.JSONDecodeError:
         print(f"    - WARN: Invalid JSON in {raw_news_key}. Using defaults.")
    except Exception as e:
        print(f"    - WARN: Error processing raw news for {target_date_iso}: {e}") # Catch other potential errors

    return current_day_metrics


# --- Main Feature Calculation Logic ---
def calculate_single_day_features(ticker, target_date_iso, df_price_history):
    """
    Calculates features for target_date_iso using price history,
    processing RAW news for target_date_iso,
    and fetching historical news metrics from DDB for rolling averages.
    """
    target_date = datetime.strptime(target_date_iso, "%Y-%m-%d").date()
    start_hist_news_lookback_date = target_date - timedelta(days=LOOKBACK_DAYS_NEWS_ROLLING)

    # --- 1. Process THIS Day's Raw News ---
    current_day_metrics = process_current_day_news(ticker, target_date_iso)

    # --- 2. Prepare Price Data ---
    df = df_price_history.copy().sort_values("date")

    # --- 3. Fetch HISTORICAL News Metrics (Avg Sentiment Only) for Rolling Calculation ---
    historical_avg_sentiments = []
    current_loop_date = start_hist_news_lookback_date
    while current_loop_date < target_date: # Fetch history UP TO target date
        date_iso_loop = current_loop_date.strftime("%Y-%m-%d")
        hist_metrics = read_historical_news_metrics(ticker, date_iso_loop) # Reads DDB
        hist_metrics['date_iso'] = date_iso_loop
        historical_avg_sentiments.append(hist_metrics)
        current_loop_date += timedelta(days=1)

    df_hist_news = pd.DataFrame(historical_avg_sentiments)
    if not df_hist_news.empty:
        df_hist_news['date'] = pd.to_datetime(df_hist_news['date_iso'])
        df = pd.merge(df, df_hist_news[['date', 'avg_sentiment_24h']], on='date', how='left', suffixes=('', '_hist'))

    # Add CURRENT day's calculated sentiment BEFORE calculating rolling avg
    target_date_dt = pd.to_datetime(target_date_iso)
    df.loc[df['date'] == target_date_dt, 'avg_sentiment_24h'] = current_day_metrics['avg_sentiment_24h']
    df['avg_sentiment_24h'] = df['avg_sentiment_24h'].fillna(0.0) # Fill missing history

    # --- 4. Calculate ALL Features (Price + Combined News) ---
    # Price Features
    df["ret_1d"] = df["close"].pct_change(1); df["mom_5d"] = df["close"].pct_change(5)
    delta = df["close"].diff(); gain = np.where(delta > 0, delta, 0.0); loss = np.where(delta < 0, -delta, 0.0)
    avg_gain = pd.Series(gain).rolling(14, min_periods=1).mean(); avg_loss = pd.Series(loss).rolling(14, min_periods=1).mean().replace(0, 1e-9)
    rs = avg_gain / avg_loss; df["rsi_14"] = 100 - (100 / (1 + rs))
    df["abn_volume"] = df["volume"] / df["volume"].rolling(30, min_periods=1).mean()
    df['ret_lag_1d'] = df['ret_1d'].shift(1); df['volatility_20d'] = df['ret_1d'].rolling(20, min_periods=1).std()
    df['ma_50d'] = df['close'].rolling(50, min_periods=1).mean(); df['ma_200d'] = df['close'].rolling(200, min_periods=1).mean()
    df['ma_trend_signal'] = (df['ma_50d'] > df['ma_200d']).astype(int)
    df['day_of_week'] = df['date'].dt.dayofweek; df['month_of_year'] = df['date'].dt.month
    if 'abn_volume' in df.columns and df['abn_volume'].notna().any(): df['return_x_volume'] = df['ret_1d'] * df['abn_volume']
    else: df['return_x_volume'] = 0.0
    # Rolling News Feature (uses historical + current avg_sentiment_24h)
    df['avg_sentiment_3d'] = df['avg_sentiment_24h'].rolling(3, min_periods=1).mean()

    # --- 5. Select Target Row and Add Current Day's Specific News Metrics ---
    latest_features_row = df[df['date'].dt.strftime('%Y-%m-%d') == target_date_iso].copy()
    if latest_features_row.empty: return None

    # Add the non-rolling news features calculated in step 1
    latest_features_row['news_count_24h'] = current_day_metrics['news_count_24h']
    latest_features_row['positive_count_24h'] = current_day_metrics['positive_count_24h']
    latest_features_row['negative_count_24h'] = current_day_metrics['negative_count_24h']
    latest_features_row['sentiment_std_24h'] = current_day_metrics['sentiment_std_24h']
    latest_features_row['symbol'] = ticker

    # --- 6. Final Checks & Return ---
    expected_features_for_model = [
        'ret_1d', 'mom_5d', 'rsi_14', 'abn_volume', 'ret_lag_1d', 'volatility_20d',
        'ma_50d', 'ma_200d', 'ma_trend_signal', 'day_of_week', 'month_of_year',
        'return_x_volume', 'avg_sentiment_24h', 'news_count_24h',
        'positive_count_24h', 'negative_count_24h', 'sentiment_std_24h',
        'avg_sentiment_3d'
    ]
    # Check if any expected feature is NaN in the final row
    if latest_features_row[expected_features_for_model].isnull().values.any():
        print(f"  - WARN: Final feature row for {target_date_iso} contains NaNs after calculation. Filling with 0.")
        print(latest_features_row[expected_features_for_model].isnull().sum())
        latest_features_row = latest_features_row.fillna(0) # Simple imputation

    return latest_features_row


# --- Lambda Handler ---
def lambda_handler(event, context):
    print("Received S3 event:", json.dumps(event))
    success_count, error_count = 0, 0

    for record in event.get('Records', []):
        try:
            # 1. Parse S3 Event for Price CSV
            s3_data = record['s3']
            bucket_name = s3_data['bucket']['name']
            object_key = urllib.parse.unquote_plus(s3_data['object']['key'])

            parts = object_key.split('/')
            if len(parts) < 4 or not parts[-1].endswith('.csv') or 'stooq' not in parts[0]: # Added check for stooq
                print(f"WARN: Skipping key not matching stooq/daily format: {object_key}")
                continue

            target_date_iso = parts[-2]
            ticker = parts[-1].replace('.csv', '').upper()
            print(f"Processing trigger: Ticker={ticker}, Date={target_date_iso}, File={object_key}")

            # 2. Read Triggering Price CSV (provides history)
            obj = s3_client.get_object(Bucket=bucket_name, Key=object_key)
            df_price_full = pd.read_csv(io.BytesIO(obj["Body"].read()))
            df_price_full.columns = df_price_full.columns.str.lower()
            df_price_full['date'] = pd.to_datetime(df_price_full['date'])

            # Filter necessary historical window
            min_hist_date = datetime.strptime(target_date_iso, "%Y-%m-%d").date() - timedelta(days=LOOKBACK_DAYS_PRICE)
            df_price_hist = df_price_full[df_price_full['date'].dt.date >= min_hist_date].copy()

            if df_price_hist.empty:
                print(f"ERROR: No price data found in historical window for {object_key}")
                error_count += 1; continue

            # 3. Calculate Features for Target Day
            features_df = calculate_single_day_features(ticker, target_date_iso, df_price_hist)

            if features_df is None or features_df.empty:
                print(f"ERROR: Feature calculation failed for {ticker} on {target_date_iso}.")
                error_count += 1; continue

            # 4. Save Curated Features to S3
            output_key = f"{FEATURE_S3_PREFIX.rstrip('/')}/{target_date_iso}/{ticker}_features.csv"
            print(f"Saving features to: s3://{CURATED_BUCKET}/{output_key}")
            csv_buffer = io.StringIO()
            features_df.to_csv(csv_buffer, index=False)
            s3_client.put_object(Bucket=CURATED_BUCKET, Key=output_key, Body=csv_buffer.getvalue())
            success_count += 1
            print("  - Save successful.")

        except Exception as e:
            print(f"FATAL ERROR processing record {record.get('eventID', 'N/A')}: {e}")
            error_count += 1

    summary = f"Processed {success_count} S3 events, encountered {error_count} errors."
    print(summary)
    return {'statusCode': 200 if error_count == 0 else 207, 'body': json.dumps({"message": summary})}