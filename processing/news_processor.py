import os
import json
import argparse
import pandas as pd
import numpy as np 
import boto3
from datetime import date, timedelta, datetime
from botocore.exceptions import ClientError

# --- Constants & AWS Clients ---
LOCAL_INPUT_PATH = "/opt/ml/processing/input/raw-news"
REGION = os.environ.get("AWS_REGION", "us-east-1")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
comprehend = boto3.client("comprehend", region_name=REGION)
table = dynamodb.Table("TradingCopilot") 

def get_sentiment_score(text):
    """
    Analyzes text using Amazon Comprehend and returns a numerical sentiment score.
    Positive -> 1, Negative -> -1, Neutral/Mixed -> 0
    """
    if not text or not isinstance(text, str): 
        return 0.0
    try:
        # Limit text length for Comprehend 
        truncated_text = text[:4900] # Comprehend has a 5KB limit
        response = comprehend.detect_sentiment(Text=truncated_text, LanguageCode='en')
        sentiment = response['Sentiment']
        if sentiment == 'POSITIVE': return 1.0
        elif sentiment == 'NEGATIVE': return -1.0
        else: return 0.0 # NEUTRAL or MIXED
    except ClientError as e:
        if e.response['Error']['Code'] == 'TextSizeLimitExceededException':
             print(f"    - Comprehend Text Size Limit Exceeded even after truncation for title starting with: {text[:50]}...")
        return 0.0
    except Exception as e:
        return 0.0

def process_news_file(symbol, date_iso):
    """
    Reads raw JSON, calculates detailed metrics using Comprehend, writes to DynamoDB.
    """
    local_file_path = os.path.join(LOCAL_INPUT_PATH, f"{date_iso}/{symbol}.json")
    if not os.path.exists(local_file_path):
        return # Skip if file wasn't downloaded

    try:
        with open(local_file_path, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"  - Error reading file {local_file_path}: {e}")
        return

    articles = data.get("articles", [])
    if not articles: return # Skip if no articles in JSON

    # --- Calculate Sentiment & Counts ---
    sentiment_scores = []
    positive_count = 0
    negative_count = 0
    for article in articles:
        if article.get("lang") == "English":
            title = article.get("title", "")
            if title:
                score = get_sentiment_score(title)
                sentiment_scores.append(score)
                if score > 0: positive_count += 1
                elif score < 0: negative_count += 1

    # --- Calculate Final Metrics ---
    avg_sentiment = np.mean(sentiment_scores) if sentiment_scores else 0.0
    # Calculate standard deviation only if there are 2+ scores
    sentiment_std = np.std(sentiment_scores) if len(sentiment_scores) >= 2 else 0.0
    total_article_count = len(articles)

    # --- Prepare and write item to DynamoDB ---
    pk = f"{symbol}_{date_iso}"
    item_to_write = {
        'ticker_date': pk,            # Partition Key
        'datatype': 'news_metrics',   # Sort Key (overwriting previous metrics)
        'avg_sentiment_24h': f"{avg_sentiment:.4f}",
        'count_24h': total_article_count,
        'positive_count_24h': positive_count,
        'negative_count_24h': negative_count,
        'sentiment_std_24h': f"{sentiment_std:.4f}" # Store std dev
    }

    try:
        table.put_item(Item=item_to_write)
        # print(f" Wrote detailed metrics for {symbol} on {date_iso}.") # Reduce log noise
    except Exception as e:
        print(f" ERROR writing to DynamoDB for {symbol} on {date_iso}: {e}")

# --- Main function remains the same ---
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbols", required=True)
    parser.add_argument("--date-from", required=True, help="Start date in YYYY-MM-DD format")
    parser.add_argument("--date-to", required=True, help="End date in YYYY-MM-DD format")
    args = parser.parse_args()

    symbols = [s.strip().upper() for s in args.symbols.split(",")]
    try:
        start_date = datetime.strptime(args.date_from, "%Y-%m-%d").date()
        end_date = datetime.strptime(args.date_to, "%Y-%m-%d").date()
    except ValueError:
        print(" ERROR: Invalid date format. Please use YYYY-MM-DD.")
        return

    print(f"Processing news for {symbols} from {start_date} to {end_date} (detailed metrics)")

    current_date = start_date
    processed_count = 0
    while current_date <= end_date:
        date_iso = current_date.strftime("%Y-%m-%d")
        for symbol in symbols:
            process_news_file(symbol, date_iso)
            processed_count +=1
            if processed_count % 100 == 0:
                 print(f"  Processed {processed_count} potential files (Date: {date_iso}, Symbol: {symbol})...")
        current_date += timedelta(days=1)

    print(f"News processing complete. Checked {processed_count} potential files.")

if __name__ == "__main__":
    main()