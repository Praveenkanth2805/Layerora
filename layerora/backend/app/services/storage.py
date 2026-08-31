import boto3
from botocore.exceptions import ClientError
from app.core.config import get_settings
from PIL import Image
import io

class StorageService:
    def __init__(self):
        settings = get_settings()
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.S3_ACCESS_KEY.get_secret_value(),
            aws_secret_access_key=settings.S3_SECRET_KEY.get_secret_value(),
            endpoint_url=settings.S3_ENDPOINT_URL,
            region_name=settings.S3_REGION,
        )
        self.bucket = settings.S3_BUCKET

    async def upload_file(self, key: str, data: bytes, content_type: str = "image/png"):
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)
        return key

    async def upload_png(self, key: str, image: Image.Image):
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        await self.upload_file(key, buffer.getvalue(), content_type="image/png")

    async def download(self, key: str) -> bytes:
        try:
            resp = self.s3.get_object(Bucket=self.bucket, Key=key)
            return resp["Body"].read()
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                raise FileNotFoundError(f"Key {key} not found")
            raise

    def generate_presigned_url(self, key: str, expires: int = 3600) -> str:
        return self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )