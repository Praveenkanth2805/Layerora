import asyncio
import logging
from datetime import datetime, timedelta

from celery import shared_task
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.services.storage import StorageService

logger = logging.getLogger(__name__)


async def _cleanup_old_watermark_jobs():
    settings = get_settings()

    engine = create_async_engine(
        settings.DATABASE_URL.get_secret_value(),
        echo=False,
    )

    async_session = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    cutoff = datetime.utcnow() - timedelta(hours=24)

    try:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT id, original_key, result_key
                    FROM watermark_jobs
                    WHERE created_at < :cutoff
                    """
                ),
                {"cutoff": cutoff},
            )

            jobs = result.mappings().all()

            if not jobs:
                logger.info("No expired watermark jobs found.")
                return

            storage = StorageService()
            deleted_count = 0

            for job in jobs:
                try:
                    await storage.delete(job["original_key"])
                    await storage.delete(job["result_key"])

                    await session.execute(
                        text(
                            """
                            DELETE FROM watermark_jobs
                            WHERE id = :job_id
                            """
                        ),
                        {"job_id": job["id"]},
                    )

                    deleted_count += 1

                    logger.info(
                        "Deleted expired watermark job: %s",
                        job["id"],
                    )

                except Exception:
                    logger.exception(
                        "Failed to cleanup watermark job: %s",
                        job["id"],
                    )

            await session.commit()

            logger.info(
                "Watermark cleanup completed. Deleted jobs: %s",
                deleted_count,
            )

    finally:
        await engine.dispose()


@shared_task(name="watermark.cleanup_expired")
def cleanup_expired_watermark_jobs():
    asyncio.run(_cleanup_old_watermark_jobs())


def run_manual_cleanup():
    asyncio.run(_cleanup_old_watermark_jobs())