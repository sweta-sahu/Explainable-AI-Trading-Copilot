import boto3
import os

_s3 = boto3.client("s3", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))

def upload_filelike_to_s3(bucket: str, key: str, file_bytes: bytes):
    _s3.put_object(Bucket=bucket, Key=key, Body=file_bytes)
    print(f"✅ Uploaded to s3://{bucket}/{key}")
