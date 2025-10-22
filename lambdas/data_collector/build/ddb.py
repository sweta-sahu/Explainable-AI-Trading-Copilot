import boto3
import os

_ddb = boto3.resource("dynamodb", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))

def put_news_summary(table_name: str, item: dict):
    table = _ddb.Table(table_name)
    table.put_item(Item=item)
    print(f"Saved news summary for {item['ticker_date']} to {table_name}")
