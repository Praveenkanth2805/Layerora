import asyncio
import uuid
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.config import get_settings
from app.services.ai.provider_factory import get_ai_provider
from app.services.storage import StorageService
from app.services.credit_service import CreditService
from app.models.design import Design
from app.models.layer import Layer
from app.models.credit import CreditTransaction, CreditTransactionType
from app.tasks.celery_app import app  # ✅ import the shared Celery app

logger = logging.getLogger(__name__)

# ---------- async core logic ----------
async def _run_processing(design_id: str, user_id: str, image_key: str):
    settings = get_settings()
    engine = create_async_engine(str(settings.DATABASE_URL), echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    # 1. Reserve credit
    credit_service = CreditService(None)  # we'll pass session later
    # We'll implement a simple reservation using a transaction table.

    async with async_session() as session:
        # Check and reserve free credit
        from datetime import date
        today = date.today()
        # Count free usage today
        stmt = select(CreditTransaction).where(
            CreditTransaction.user_id == user_id,
            CreditTransaction.type == CreditTransactionType.FREE_DAILY,
            CreditTransaction.created_at >= today  # simplified
        )
        result = await session.execute(stmt)
        free_used = len(result.scalars().all())
        daily_limit = settings.DAILY_FREE_EXTRACTIONS
        free_remaining = max(0, daily_limit - free_used)

        if free_remaining > 0:
            # Use free credit
            tx = CreditTransaction(
                id=str(uuid.uuid4()),
                user_id=user_id,
                amount=-1,
                type=CreditTransactionType.FREE_DAILY,
                description="Daily free extraction",
                reference_id=design_id,
            )
            session.add(tx)
            await session.commit()
            credit_type = "free"
        else:
            # Check purchased balance (simplified – we'll assume enough)
            # In a real implementation, sum purchased and subtract consumed.
            # For now, we'll just proceed; if not enough, raise error.
            # We'll implement a placeholder check.
            # TODO: proper balance check
            pass

        # 2. Get image from storage
        storage = StorageService()
        image_bytes = await storage.download(image_key)

        # 3. AI processing
        ai = get_ai_provider()
        objects = await ai.detect_objects(image_bytes)
        texts = await ai.extract_text(image_bytes)
        masks = []
        for obj in objects:
            mask_img = await ai.segment_objects(image_bytes, [obj])
            masks.append(mask_img[0])
        background = await ai.reconstruct_background(image_bytes, masks)

        # 4. Upload layers to S3
        layer_keys = []
        for i, obj in enumerate(objects):
            key = f"designs/{design_id}/layer_{i}.png"
            await storage.upload_png(key, masks[i])
            layer_keys.append(key)

        bg_key = f"designs/{design_id}/background.png"
        await storage.upload_png(bg_key, background)

        # 5. Save layers to DB
        async with async_session() as session:
            design = await session.get(Design, design_id)
            if not design:
                raise ValueError("Design not found")

            for idx, (obj, key) in enumerate(zip(objects, layer_keys)):
                layer = Layer(
                    id=str(uuid.uuid4()),
                    design_id=design_id,
                    layer_type=obj.get("type", "object"),
                    name=obj.get("name", f"Object {idx+1}"),
                    properties={
                        "left": obj.get("bbox", [0,0,100,100])[0],
                        "top": obj.get("bbox")[1],
                        "width": obj.get("bbox")[2] - obj.get("bbox")[0],
                        "height": obj.get("bbox")[3] - obj.get("bbox")[1],
                        "scaleX": 1,
                        "scaleY": 1,
                    },
                    object_key=key,
                )
                session.add(layer)

            # Background layer
            bg_layer = Layer(
                id=str(uuid.uuid4()),
                design_id=design_id,
                layer_type="background",
                name="Background",
                properties={"left": 0, "top": 0, "width": design.canvas_width, "height": design.canvas_height},
                object_key=bg_key,
            )
            session.add(bg_layer)

            design.status = "completed"
            await session.commit()

# ---------- Celery task ----------
@app.task(bind=True, max_retries=2)
def process_design(self, design_id: str, user_id: str, image_key: str):
    """Celery task entry point – runs the async processing."""
    try:
        asyncio.run(_run_processing(design_id, user_id, image_key))
    except Exception as e:
        logger.exception("Processing failed for design %s", design_id)
        # Retry if transient error
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        else:
            # Mark design as failed and refund credit (handled in _run_processing? we can improve)
            # For now, we log and raise.
            raise