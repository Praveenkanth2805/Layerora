import io

from typing import Any, Dict, List

from PIL import Image

from app.services.ai.base import AIProvider


class MockAIProvider(AIProvider):
    """Local mock provider for testing the Layerora processing pipeline."""

    async def analyze_image(self, image_bytes: bytes) -> Dict[str, Any]:
        return {
            "description": "A dummy scene with a person and a product."
        }

    async def detect_objects(self, image_bytes: bytes) -> List[Dict]:
        image = Image.open(io.BytesIO(image_bytes))
        width, height = image.size

        return [
            {
                "type": "person",
                "name": "Person",
                "bbox": (
                    int(width * 0.1),
                    int(height * 0.2),
                    int(width * 0.4),
                    int(height * 0.7),
                ),
                "confidence": 0.95,
            },
            {
                "type": "object",
                "name": "Product",
                "bbox": (
                    int(width * 0.4),
                    int(height * 0.3),
                    int(width * 0.7),
                    int(height * 0.7),
                ),
                "confidence": 0.92,
            },
        ]

    async def extract_text(self, image_bytes: bytes) -> List[Dict]:
        return [
            {
                "text": "Hello World",
                "bbox": (50, 50, 250, 100),
                "font": "Arial",
                "size": 24,
                "color": "#000000",
            }
        ]

    async def segment_objects(
        self,
        image_bytes: bytes,
        bboxes: List[Dict],
    ) -> List[Image.Image]:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        layers = []

        for obj in bboxes:
            left, top, right, bottom = map(int, obj.get("bbox", [0, 0, 100, 100]))

            left = max(0, left)
            top = max(0, top)
            right = min(image.width, right)
            bottom = min(image.height, bottom)

            if right <= left or bottom <= top:
                layers.append(
                    Image.new("RGBA", (1, 1), (0, 0, 0, 0))
                )
                continue

            layers.append(image.crop((left, top, right, bottom)))

        return layers

    async def reconstruct_background(
        self,
        image_bytes: bytes,
        masks: List[Image.Image],
    ) -> Image.Image:
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")