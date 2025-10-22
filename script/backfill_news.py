import os
import json
import boto3
import datetime
import time
import requests
from botocore.exceptions import ClientError

# --- Configuration ---
S3_BUCKET = "ai-trading-copilot-raw"
S3_NEWS_PATH = "gdelt/daily/"
WATCHLIST = ["AAPL", "MSFT", "AMZN"]
DAYS_TO_BACKFILL = 365 * 3

# --- AWS Client ---
s3_client = boto3.client("s3")

# --- Function to check if file exists in S3 ---
def file_exists_in_s3(bucket, key):
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        else:
            raise

# --- Self-Contained Fetcher Function (with User-Agent fix) ---
def fetch_gdelt_articles(keyword: str, date_obj: datetime.date, max_records: int = 250):
    start_datetime = date_obj.strftime("%Y%m%d000000")
    end_datetime = date_obj.strftime("%Y%m%d235959")
    url = (
        "https://api.gdeltproject.org/api/v2/doc/doc?query="
        f"{keyword}&mode=ArtList&format=json"
        f"&maxrecords={max_records}"
        f"&startdatetime={start_datetime}&enddatetime={end_datetime}"
    )
    
    # Define a common browser User-Agent header
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    }
    
    try:
        # Pass the headers with the request
        response = requests.get(url, timeout=30, headers=headers)
        
        if response.status_code != 200 or not response.text:
            return []

        try:
            data = response.json()
        except requests.exceptions.JSONDecodeError:
            print(f"    - JSON DECODE ERROR for {keyword} on {date_obj}. Treating as no data.")
            return []

        articles = data.get("articles", [])
        
        cleaned = [
            {"tone": art.get("tone"), "title": art.get("title"), "url": art.get("url")}
            for art in articles
        ]
        return cleaned
    except requests.exceptions.RequestException as e:
        print(f"    - NETWORK ERROR for {keyword} on {date_obj}: {e}")
        return []

# --- Main Execution Logic ---
if __name__ == "__main__":
    
    def daterange(start_date, end_date):
        for n in range(int((end_date - start_date).days) + 1):
            yield start_date + datetime.timedelta(n)

    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=DAYS_TO_BACKFILL)

    print(f"Starting FINAL backfill for {WATCHLIST} from {start_date} to {end_date}...")

    for single_date in daterange(start_date, end_date):
        date_str = single_date.strftime("%Y-%m-%d")
        for ticker in WATCHLIST:
            s3_key = f"{S3_NEWS_PATH}{date_str}/{ticker}.json"
            if file_exists_in_s3(S3_BUCKET, s3_key):
                print(f"  - ✅ File for {ticker} on {date_str} already exists. Skipping.")
                continue

            print(f"  - Fetching news for {ticker} on {date_str}...")
            news_articles = fetch_gdelt_articles(ticker, single_date)
            
            if not news_articles:
                print(f"    - No articles found. Skipping S3 upload.")
            else:
                try:
                    file_content = json.dumps({"articles": news_articles}).encode('utf-8')
                    s3_client.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=file_content)
                    print(f"    - Success! Uploaded {len(news_articles)} articles.")
                except Exception as e:
                    print(f"    - 🛑 UPLOAD ERROR for {ticker} on {date_str}: {e}")

            time.sleep(5) 

    print("Backfill complete!")