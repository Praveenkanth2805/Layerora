import asyncio
import logging
import uuid
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models.watermark_remover import WatermarkJob
from app.services.storage import StorageService
from app.services.watermark_remover import WatermarkRemoverService
from app.tasks.celery_app import app

logger = logging.getLogger(__name__)


async def _run_watermark_processing(
    job_id: str,
    user_id: str,
    image_key: str,
    strokes: list,
):
    settings = get_settings()
    logger.info("CELERY CWD: %s", os.getcwd())
    logger.info("CELERY DATABASE URL: %s", settings.DATABASE_URL.get_secret_value())
    engine = create_async_engine(
        settings.DATABASE_URL.get_secret_value(),
        echo=False,
    )

    async_session = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        async with async_session() as session:
            result = await session.execute(
                select(WatermarkJob).where(
                    WatermarkJob.id == job_id,
                    WatermarkJob.user_id == user_id,
                )
            )

            job = result.scalar_one_or_none()

            if not job:
                raise ValueError(f"Watermark job not found: {job_id}")

            job.status = "processing"
            await session.commit()

        storage = StorageService()
        image_bytes = await storage.download(image_key)

        remover = WatermarkRemoverService()

        result_bytes = remover.remove(
            image_bytes,
            strokes,
        )

        result_key = (
            f"watermark-remover/"
            f"{user_id}/"
            f"{job_id}/"
            f"result.png"
        )

        await storage.upload_file(
            result_key,
            result_bytes,
        )
        logger.info("RESULT UPLOADED: %s", result_key)
        async with async_session() as session:
            result = await session.execute(
                select(WatermarkJob).where(
                    WatermarkJob.id == job_id,
                    WatermarkJob.user_id == user_id,
                )
            )

            job = result.scalar_one_or_none()

            if not job:
                raise ValueError(f"Watermark job not found: {job_id}")

            job.result_key = result_key
            job.status = "completed"

            await session.commit()
            await session.refresh(job)

            logger.info(
                "DB AFTER COMMIT: job=%s result_key=%s status=%s",
                job.id,
                job.result_key,
                job.status,
            )

    except Exception:
        async with async_session() as session:
            result = await session.execute(
                select(WatermarkJob).where(
                    WatermarkJob.id == job_id,
                    WatermarkJob.user_id == user_id,
                )
            )

            job = result.scalar_one_or_none()

            if job:
                job.status = "failed"
                await session.commit()

        raise

    finally:
        await engine.dispose()


@app.task(bind=True, max_retries=2)
def process_watermark(
    self,
    job_id: str,
    user_id: str,
    image_key: str,
    strokes: list,
):
    try:
        asyncio.run(
            _run_watermark_processing(
                job_id,
                user_id,
                image_key,
                strokes,
            )
        )
    except Exception as exc:
        logger.exception(
            "Watermark processing failed for job %s",
            job_id,
        )

        if self.request.retries < self.max_retries:
            raise self.retry(
                exc=exc,
                countdown=60 * (self.request.retries + 1),
            )

        raise