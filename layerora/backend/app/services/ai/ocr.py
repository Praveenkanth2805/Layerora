from app.services.ai.base import AIProvider
from typing import List, Dict
from PIL import Image

class GoogleOCRProvider(AIProvider):
    """Stub for Google Cloud Vision OCR."""

    async def analyze_image(self, image_bytes: bytes) -> Dict:
        raise NotImplementedError("OCR provider does not support image analysis.")

    async def detect_objects(self, image_bytes: bytes) -> List[Dict]:
        raise NotImplementedError("OCR provider does not support object detection.")

    async def extract_text(self, image_bytes: bytes) -> List[Dict]:
        # Dummy text detection
        return [
            {"text": "Sample Text", "bbox": (10, 10, 200, 50), "font": "Arial", "size": 20, "color": "#000000"}
        ]

    async def segment_objects(self, image_bytes: bytes, bboxes: List[Dict]) -> List[Image.Image]:
        raise NotImplementedError("OCR provider does not support segmentation.")

    async def reconstruct_background(self, image_bytes: bytes, masks: List[Image.Image]) -> Image.Image:
        raise NotImplementedError("OCR provider does not support background reconstruction.")