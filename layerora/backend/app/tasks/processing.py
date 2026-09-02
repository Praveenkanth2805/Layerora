import asyncio
import logging
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models.credit import CreditTransaction, CreditTransactionType
from app.models.design import Design
from app.models.layer import Layer
from app.services.ai.provider_factory import get_ai_provider
from app.services.storage import StorageService
from app.tasks.celery_app import app

logger = logging.getLogger(__name__)


async def _run_processing(design_id: str, user_id: str, image_key: str):
    settings = get_settings()
    engine = create_async_engine(
        settings.DATABASE_URL.get_secret_value(),
        echo=False,
    )
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with async_session() as session:
            today = date.today()
            stmt = select(CreditTransaction).where(
                CreditTransaction.user_id == user_id,
                CreditTransaction.type == CreditTransactionType.FREE_DAILY,
                CreditTransaction.created_at >= today,
            )
            result = await session.execute(stmt)
            free_used = len(result.scalars().all())

            if free_used < settings.DAILY_FREE_EXTRACTIONS:
                session.add(
                    CreditTransaction(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        amount=-1,
                        type=CreditTransactionType.FREE_DAILY,
                        description="Daily free extraction",
                        reference_id=design_id,
                    )
                )
                await session.commit()

        storage = StorageService()
        image_bytes = await storage.download(image_key)
        ai = get_ai_provider()

        objects = await ai.detect_objects(image_bytes)
        texts = await ai.extract_text(image_bytes)

        masks = []
        for obj in objects:
            result = await ai.segment_objects(image_bytes, [obj])
            masks.append(result[0])

        background = await ai.reconstruct_background(image_bytes, masks)

        layer_keys = []
        for i, mask in enumerate(masks):
            key = f"designs/{design_id}/layer_{i}.png"
            await storage.upload_png(key, mask)
            layer_keys.append(key)

        bg_key = f"designs/{design_id}/background.png"
        await storage.upload_png(bg_key, background)

        async with async_session() as session:
            design = await session.get(Design, design_id)

            if not design:
                raise ValueError(f"Design not found: {design_id}")

            for idx, (obj, key) in enumerate(zip(objects, layer_keys)):
                bbox = obj.get("bbox", [0, 0, 100, 100])

                session.add(
                    Layer(
                        id=str(uuid.uuid4()),
                        design_id=design_id,
                        layer_type=obj.get("type", "object"),
                        name=obj.get("name", f"Object {idx + 1}"),
                        properties={
                            "left": bbox[0],
                            "top": bbox[1],
                            "width": bbox[2] - bbox[0],
                            "height": bbox[3] - bbox[1],
                            "scaleX": 1,
                            "scaleY": 1,
                        },
                        object_key=key,
                    )
                )

            session.add(
                Layer(
                    id=str(uuid.uuid4()),
                    design_id=design_id,
                    layer_type="background",
                    name="Background",
                    properties={
                        "left": 0,
                        "top": 0,
                        "width": design.canvas_width,
                        "height": design.canvas_height,
                    },
                    object_key=bg_key,
                )
            )

            design.status = "completed"
            await session.commit()

    finally:
        await engine.dispose()


@app.task(bind=True, max_retries=2)
def process_design(self, design_id: str, user_id: str, image_key: str):
    try:
        asyncio.run(_run_processing(design_id, user_id, image_key))
    except Exception as e:
        logger.exception("Processing failed for design %s", design_id)

        if self.request.retries < self.max_retries:
            raise self.retry(
                exc=e,
                countdown=60 * (self.request.retries + 1),
            )

        raise