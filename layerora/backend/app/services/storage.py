from pathlib import Path
import io

from PIL import Image

from app.core.config import get_settings


class StorageService:
    def __init__(self):
        settings = get_settings()

        self.base_dir = Path(settings.BASE_DIR) / "uploads"
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def upload_file(
        self,
        key: str,
        data: bytes,
        content_type: str = "image/png",
    ):
        file_path = self.base_dir / key
        file_path.parent.mkdir(parents=True, exist_ok=True)

        file_path.write_bytes(data)

        return key

    async def upload_png(self, key: str, image: Image.Image):
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")

        return await self.upload_file(
            key,
            buffer.getvalue(),
            content_type="image/png",
        )

    async def download(self, key: str) -> bytes:
        file_path = self.base_dir / key

        if not file_path.exists():
            raise FileNotFoundError(f"File {key} not found")

        return file_path.read_bytes()

    def generate_presigned_url(
        self,
        key: str,
        expires: int = 3600,
    ) -> str:
        settings = get_settings()

        return f"{settings.BACKEND_URL}/uploads/{key}"