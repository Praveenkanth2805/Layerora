from app.core.config import get_settings
from app.services.ai.base import AIProvider
from app.services.ai.vision import OpenAIVisionProvider, GoogleVisionProvider
from app.services.ai.segmentation import ReplicateSegmentationProvider
from app.services.ai.ocr import GoogleOCRProvider
from app.services.ai.mock import MockAIProvider

def get_ai_provider() -> AIProvider:
    settings = get_settings()
    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()

    if provider_name == "openai":
        return OpenAIVisionProvider()
    elif provider_name == "google":
        return GoogleVisionProvider()
    elif provider_name == "replicate":
        return ReplicateSegmentationProvider()
    elif provider_name == "google_ocr":   # if you want a dedicated OCR provider
        return GoogleOCRProvider()
    elif provider_name == "mock":
        return MockAIProvider()
    else:
        raise ValueError(f"Unknown AI provider: {provider_name}")