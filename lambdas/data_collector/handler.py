import os
import json
import datetime
from fetchers import fetch_prices_stooq_csv, fetch_gdelt_articles
from s3io import upload_filelike_to_s3
from ddb import put_news_summary

def lambda_handler(event, context):
    # --- Configuration ---
    today = datetime.date.today().strftime("%Y-%m-%d")
    bucket = os.environ["S3_BUCKET"]
    table = os.environ["DDB_TABLE"]
    watchlist = os.environ.get("WATCHLIST", "AAPL,MSFT,AMZN").split(",")
    max_records = int(os.environ.get("GDELT_MAX_RECORDS", "25"))
    price_path = os.getenv("S3_PRICE_PATH", "stooq/daily/")
    news_path = os.getenv("S3_NEWS_PATH", "gdelt/news/")

    results, errors = [], []

    # --- For each stock ticker ---
    for ticker in watchlist:
        try:
            # 1️⃣ Fetch price CSV from Stooq
            csv_bytes = fetch_prices_stooq_csv(ticker)
            s3_price_key = f"{price_path}{today}/{ticker}.csv"
            upload_filelike_to_s3(bucket, s3_price_key, csv_bytes)

            # 2️⃣ Fetch news articles from GDELT
            news_articles = fetch_gdelt_articles(ticker, max_records)
            s3_news_key = f"{news_path}{today}/{ticker}.json"
            upload_filelike_to_s3(bucket, s3_news_key, json.dumps(news_articles).encode())

            # 3️⃣ Save news summary to DynamoDB
            item = {
                "ticker_date": f"{ticker}_{today}",
                "datatype": "news",
                "source": "GDELT",
                "count_24h": len(news_articles),
                "articles": news_articles,
                "ingested_at": datetime.datetime.utcnow().isoformat() + "Z",
            }
            put_news_summary(table, item)

            results.append({
                "ticker": ticker,
                "price_key": s3_price_key,
                "news_count": len(news_articles)
            })

        except Exception as e:
            errors.append({"ticker": ticker, "error": str(e)})

    return {
        "statusCode": 200,
        "body": json.dumps({
            "asof": today,
            "tickers": results,
            "errors": errors
        })
    }
