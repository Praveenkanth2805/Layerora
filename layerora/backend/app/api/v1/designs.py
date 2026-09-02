import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, AuthProvider
from app.models.design import Design, DesignStatus
from app.schemas.design import DesignOut, LayerOut
from app.services.storage import StorageService
from app.services.credit_service import CreditService
from app.tasks.processing import process_design

router = APIRouter(prefix="/designs", tags=["Designs"])


@router.post("/upload", response_model=DesignOut)
async def upload_image(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user is None:
        guest_identifier = request.cookies.get("guest_identifier")

        if guest_identifier:
            result = await db.execute(
                select(User).where(User.guest_identifier == guest_identifier)
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

    balance = await CreditService(db).get_balance(current_user.id)

    if balance["total_balance"] < 1:
        raise HTTPException(
            status_code=403,
            detail="No free extractions remaining. Please purchase credits.",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    original_key = f"uploads/{uuid.uuid4()}.png"

    await StorageService().upload_file(
        original_key,
        image_bytes,
    )

    design = Design(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=file.filename or "Untitled",
        status=DesignStatus.PROCESSING,
    )

    db.add(design)
    await db.commit()

    result = await db.execute(
        select(Design)
        .options(selectinload(Design.layers))
        .where(Design.id == design.id)
    )

    design = result.scalar_one()

    process_design.delay(
        design.id,
        current_user.id,
        original_key,
    )

    return design


@router.get("/{design_id}", response_model=DesignOut)
async def get_design(
    design_id: str,
    request: Request,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user is None:
        guest_identifier = request.cookies.get("guest_identifier")

        if not guest_identifier:
            raise HTTPException(
                status_code=404,
                detail="Design not found",
            )

        result = await db.execute(
            select(User).where(
                User.guest_identifier == guest_identifier
            )
        )

        current_user = result.scalar_one_or_none()

        if current_user is None:
            raise HTTPException(
                status_code=404,
                detail="Design not found",
            )

    result = await db.execute(
        select(Design)
        .options(selectinload(Design.layers))
        .where(
            Design.id == design_id,
            Design.user_id == current_user.id,
        )
    )

    design = result.scalar_one_or_none()

    if design is None:
        raise HTTPException(
            status_code=404,
            detail="Design not found",
        )

    storage = StorageService()

    layers = []

    for layer in design.layers:
        layer_data = {
            "id": layer.id,
            "design_id": layer.design_id,
            "layer_type": layer.layer_type,
            "name": layer.name,
            "properties": layer.properties,
            "object_key": layer.object_key,
            "object_url": (
                storage.generate_presigned_url(layer.object_key)
                if layer.object_key
                else None
            ),
            "text_content": layer.text_content,
            "font_family": layer.font_family,
            "font_size": layer.font_size,
            "color": layer.color,
        }

        layers.append(layer_data)

    return {
        "id": design.id,
        "user_id": design.user_id,
        "name": design.name,
        "canvas_width": design.canvas_width,
        "canvas_height": design.canvas_height,
        "status": design.status,
        "thumbnail_key": design.thumbnail_key,
        "layers": layers,
        "created_at": design.created_at,
        "updated_at": design.updated_at,
    }