import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, AuthProvider
from app.models.design import Design, DesignStatus
from app.schemas.design import DesignOut
from app.services.storage import StorageService
from app.services.credit_service import CreditService
from app.tasks.processing import process_design
from app.core.config import get_settings


router = APIRouter(prefix="/designs", tags=["Designs"])


@router.post("/upload", response_model=DesignOut)
async def upload_image(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()

    # ---------------------------------------------------------
    # 1. Get existing logged-in user or create/find guest user
    # ---------------------------------------------------------

    if current_user is None:
        guest_identifier = request.cookies.get("guest_identifier")

        if guest_identifier:
            result = await db.execute(
                select(User).where(
                    User.guest_identifier == guest_identifier
                )
            )
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

    # ---------------------------------------------------------
    # 2. Check credit
    # ---------------------------------------------------------

    credit_service = CreditService(db)

    balance = await credit_service.get_balance(current_user.id)

    if balance["total_balance"] < 1:
        raise HTTPException(
            status_code=403,
            detail="No free extractions remaining. Please purchase credits.",
        )

    # ---------------------------------------------------------
    # 3. Upload original image
    # ---------------------------------------------------------

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Empty file",
        )

    original_key = f"uploads/{uuid.uuid4()}.png"

    storage = StorageService()

    await storage.upload_file(
        original_key,
        image_bytes,
    )

    # ---------------------------------------------------------
    # 4. Create design
    # ---------------------------------------------------------

    design = Design(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=file.filename or "Untitled",
        status=DesignStatus.PROCESSING,
    )

    db.add(design)
    await db.commit()
    await db.refresh(design)

    # ---------------------------------------------------------
    # 5. Queue processing
    # ---------------------------------------------------------

    process_design.delay(
        design.id,
        current_user.id,
        original_key,
    )

    return design