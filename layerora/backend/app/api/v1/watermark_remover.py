import uuid
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, AuthProvider
from app.models.watermark_remover import WatermarkJob
from app.schemas.watermark_remover import WatermarkJobOut, WatermarkJobUpdate
from app.services.storage import StorageService
from app.services.credit_service import CreditService

router = APIRouter(prefix="/watermark-remover", tags=["Watermark Remover"])

@router.post("/upload")
async def upload_watermark_image(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user is None:
        guest_identifier = request.cookies.get("guest_identifier")
        if guest_identifier:
            result = await db.execute(select(User).where(User.guest_identifier == guest_identifier))
            current_user = result.scalar_one_or_none()

        if current_user is None:
            guest_identifier = str(uuid.uuid4())
            current_user = User(
                id=str(uuid.uuid4()),
                email=None,
                name="Guest",
                auth_provider=AuthProvider.EMAIL,
                hashed_password=None,
                is_active=True,
                is_admin=False,
                guest_identifier=guest_identifier,
            )
            db.add(current_user)
            await db.commit()
            await db.refresh(current_user)
            response.set_cookie(
                key="guest_identifier",
                value=guest_identifier,
                max_age=60 * 60 * 24 * 365,
                httponly=True,
                samesite="lax",
            )

    balance = await CreditService(db).get_balance(current_user.id)
    if balance["total_balance"] < 1:
        raise HTTPException(status_code=403, detail="No free extractions remaining. Please purchase credits.")

    allowed_types = {"image/png", "image/jpeg", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported image type. Use PNG, JPG, JPEG or WebP.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    original_key = f"watermark-remover/{current_user.id}/{uuid.uuid4()}.png"
    await StorageService().upload_file(original_key, image_bytes)

    job = WatermarkJob(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        original_key=original_key,
        status="uploaded",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    return {
        "id": job.id,
        "user_id": job.user_id,
        "original_key": job.original_key,
        "filename": file.filename,
        "content_type": file.content_type,
        "status": job.status,
    }

@router.get("/{job_id}", response_model=WatermarkJobOut)
async def get_watermark_job(
    job_id: str,
    request: Request,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user is None:
        guest_identifier = request.cookies.get("guest_identifier")
        if not guest_identifier:
            raise HTTPException(status_code=404, detail="Job not found")

        result = await db.execute(select(User).where(User.guest_identifier == guest_identifier))
        current_user = result.scalar_one_or_none()
        if current_user is None:
            raise HTTPException(status_code=404, detail="Job not found")

    result = await db.execute(
        select(WatermarkJob).where(
            WatermarkJob.id == job_id,
            WatermarkJob.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "id": job.id,
        "user_id": job.user_id,
        "original_key": job.original_key,
        "original_url": StorageService().generate_presigned_url(job.original_key),
        "mask_key": job.mask_key,
        "result_key": job.result_key,
        "mode": job.mode,
        "text": job.text,
        "selection": job.selection,
        "status": job.status,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }

@router.patch("/{job_id}", response_model=WatermarkJobOut)
async def update_watermark_job(
    job_id: str,
    data: WatermarkJobUpdate,
    request: Request,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user is None:
        guest_identifier = request.cookies.get("guest_identifier")
        if not guest_identifier:
            raise HTTPException(status_code=404, detail="Job not found")

        result = await db.execute(select(User).where(User.guest_identifier == guest_identifier))
        current_user = result.scalar_one_or_none()
        if current_user is None:
            raise HTTPException(status_code=404, detail="Job not found")

    result = await db.execute(
        select(WatermarkJob).where(
            WatermarkJob.id == job_id,
            WatermarkJob.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "uploaded":
        raise HTTPException(status_code=400, detail="Job cannot be modified")

    if data.mode in {"logo", "custom"} and not data.selection:
        raise HTTPException(status_code=400, detail="Selection is required for this mode")

    if data.mode == "text" and not data.text:
        raise HTTPException(status_code=400, detail="Text is required for text mode")

    job.mode = data.mode
    job.text = data.text
    job.selection = data.selection
    await db.commit()
    await db.refresh(job)

    return {
        "id": job.id,
        "user_id": job.user_id,
        "original_key": job.original_key,
        "original_url": StorageService().generate_presigned_url(job.original_key),
        "mask_key": job.mask_key,
        "result_key": job.result_key,
        "mode": job.mode,
        "text": job.text,
        "selection": job.selection,
        "status": job.status,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }