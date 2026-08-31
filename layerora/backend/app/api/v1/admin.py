from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.credit_package import CreditPackage
from app.models.payment import Payment, PaymentStatus
from app.models.design import Design
from app.models.config import Config
from app.schemas.admin import (
    AdminConfigUpdate, UserAdminUpdate, PaymentOut, AIUsageStats,
    ConfigUpdate, ConfigOut
)
from app.schemas.credit import CreditPackageCreate, CreditPackageOut
from app.services.credit_service import CreditService
import uuid
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user

# ---------- Users ----------
@router.get("/users")
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]

@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    update: UserAdminUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = update.is_active
    await db.commit()
    return {"message": "User updated"}

# ---------- Credit Packages ----------
@router.get("/credit-packages", response_model=list[CreditPackageOut])
async def list_packages(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CreditPackage))
    return result.scalars().all()

@router.post("/credit-packages", response_model=CreditPackageOut)
async def create_package(
    pkg: CreditPackageCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    new_pkg = CreditPackage(
        id=str(uuid.uuid4()),
        name=pkg.name,
        credits=pkg.credits,
        price=pkg.price,
        currency=pkg.currency,
        active=pkg.active,
    )
    db.add(new_pkg)
    await db.commit()
    await db.refresh(new_pkg)
    return new_pkg

@router.patch("/credit-packages/{package_id}")
async def update_package_status(
    package_id: str,
    active: bool,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    pkg = await db.get(CreditPackage, package_id)
    if not pkg:
        raise HTTPException(404, "Package not found")
    pkg.active = active
    await db.commit()
    return {"message": "Package updated"}

# ---------- Payments ----------
@router.get("/payments", response_model=list[PaymentOut])
async def list_payments(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Join with User to get email
    stmt = select(
        Payment.id,
        User.email.label("user_email"),
        Payment.amount,
        Payment.currency,
        Payment.status,
        Payment.credits_purchased,
        Payment.paid_at,
        Payment.created_at,
    ).join(User, Payment.user_id == User.id).order_by(Payment.created_at.desc())
    result = await db.execute(stmt)
    rows = result.all()
    return [
        PaymentOut(
            id=row.id,
            user_email=row.user_email,
            amount=row.amount,
            currency=row.currency,
            status=row.status,
            credits_purchased=row.credits_purchased or 0,
            paid_at=row.paid_at,
            created_at=row.created_at,
        )
        for row in rows
    ]

# ---------- AI Usage ----------
@router.get("/ai-usage", response_model=AIUsageStats)
async def get_ai_usage(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Count designs with status 'completed' and 'failed' in last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    total_jobs = await db.scalar(
        select(func.count(Design.id)).where(Design.created_at >= thirty_days_ago)
    )
    completed = await db.scalar(
        select(func.count(Design.id)).where(
            and_(Design.status == "completed", Design.created_at >= thirty_days_ago)
        )
    )
    failed = await db.scalar(
        select(func.count(Design.id)).where(
            and_(Design.status == "failed", Design.created_at >= thirty_days_ago)
        )
    )
    # Average processing time – we don't store duration, we can approximate
    # For now, return dummy
    return AIUsageStats(
        total_jobs=total_jobs or 0,
        avg_processing_time=12.5,  # placeholder – you can track in a separate table
        failures=failed or 0,
    )

# ---------- Configuration ----------
@router.get("/config", response_model=list[ConfigOut])
async def get_configs(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Config))
    return result.scalars().all()

@router.patch("/config")
async def update_config(
    updates: ConfigUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # For each provided field, update or create Config entry
    mapping = {
        "guest_free_image_limit": "GUEST_FREE_LIMIT",
        "daily_free_extractions": "DAILY_FREE_EXTRACTIONS",
        "daily_free_ask_ai": "DAILY_FREE_ASK_AI",
        "max_designs_free": "MAX_DESIGNS_FREE",
        "upload_max_size_mb": "UPLOAD_MAX_SIZE_MB",
    }
    for key, config_key in mapping.items():
        value = getattr(updates, key, None)
        if value is not None:
            # upsert
            stmt = select(Config).where(Config.key == config_key)
            result = await db.execute(stmt)
            config = result.scalar_one_or_none()
            if config:
                config.value = str(value)
            else:
                config = Config(
                    id=str(uuid.uuid4()),
                    key=config_key,
                    value=str(value),
                    description=f"Config for {key}",
                )
                db.add(config)
    await db.commit()
    # Also update in-memory settings? We'll rely on DB next read.
    return {"message": "Configuration updated"}