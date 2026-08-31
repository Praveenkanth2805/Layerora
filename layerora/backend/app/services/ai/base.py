from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from PIL import Image
from pydantic import BaseModel

class LayerCandidate(BaseModel):
    type: str  # "background", "person", "object", "logo", "text", "shape", "decoration"
    bbox: Optional[tuple[int, int, int, int]] = None  # x1,y1,x2,y2
    mask: Optional[Any] = None  # binary mask (numpy or PIL)
    text: Optional[str] = None
    font_properties: Optional[Dict] = None
    confidence: float = 0.0

class AIProvider(ABC):
    @abstractmethod
    async def analyze_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """Return high‑level scene description."""
        pass

    @abstractmethod
    async def detect_objects(self, image_bytes: bytes) -> List[Dict]:
        """Return bounding boxes and labels."""
        pass

    @abstractmethod
    async def extract_text(self, image_bytes: bytes) -> List[Dict]:
        """Return text blocks with bounding boxes and font hints."""
        pass

    @abstractmethod
    async def segment_objects(self, image_bytes: bytes, bboxes: List[Dict]) -> List[Image.Image]:
        """Return transparent PNG for each detected object."""
        pass

    @abstractmethod
    async def reconstruct_background(self, image_bytes: bytes, masks: List[Image.Image]) -> Image.Image:
        """Remove foreground and reconstruct background."""
        pass