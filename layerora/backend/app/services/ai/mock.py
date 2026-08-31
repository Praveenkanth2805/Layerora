from app.services.ai.base import AIProvider
from typing import Dict, Any, List
from PIL import Image
import random

class MockAIProvider(AIProvider):
    """Mock provider that returns fake data – useful for testing without API costs."""

    async def analyze_image(self, image_bytes: bytes) -> Dict[str, Any]:
        return {"description": "A dummy scene with a person and a product."}

    async def detect_objects(self, image_bytes: bytes) -> List[Dict]:
        return [
            {"type": "person", "name": "Person", "bbox": (100, 200, 300, 500), "confidence": 0.95},
            {"type": "object", "name": "Product", "bbox": (400, 300, 600, 600), "confidence": 0.92},
        ]

    async def extract_text(self, image_bytes: bytes) -> List[Dict]:
        return [
            {"text": "Hello World", "bbox": (50, 50, 250, 100), "font": "Arial", "size": 24, "color": "#000000"}
        ]

    async def segment_objects(self, image_bytes: bytes, bboxes: List[Dict]) -> List[Image.Image]:
        # Return a dummy transparent image for each bbox
        return [Image.new("RGBA", (200, 200), (0, 0, 0, 0)) for _ in bboxes]

    async def reconstruct_background(self, image_bytes: bytes, masks: List[Image.Image]) -> Image.Image:
        # Return a grey background
        return Image.new("RGB", (1024, 1024), (200, 200, 200))