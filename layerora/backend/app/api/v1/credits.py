from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.credit_service import CreditService
from app.schemas.credit import CreditBalance, PurchaseRequest, PurchaseResponse, CreditPackageOut
from app.models.credit_package import CreditPackage
from app.core.config import get_settings
import uuid

router = APIRouter(prefix="/credits", tags=["credits"])

@router.get("/balance", response_model=CreditBalance)
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CreditService(db)
    return await service.get_balance(current_user.id)

@router.get("/packages", response_model=list[CreditPackageOut])
async def list_packages(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(CreditPackage).where(CreditPackage.active == True))
    return result.scalars().all()

@router.post("/purchase", response_model=PurchaseResponse)
async def purchase(
    req: PurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get package
    from sqlalchemy import select
    pkg = await db.get(CreditPackage, req.package_id)
    if not pkg or not pkg.active:
        raise HTTPException(404, "Package not available")
    # Create Razorpay order (simplified)
    # In real integration, create order with Razorpay SDK
    import razorpay
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    order_data = {
        "amount": int(pkg.price * 100),  # paise
        "currency": pkg.currency.upper(),
        "receipt": f"order_{uuid.uuid4()}",
    }
    order = client.order.create(data=order_data)
    # Save purchase record? (implement later)
    return PurchaseResponse(
        order_id=order["id"],
        amount=pkg.price,
        currency=pkg.currency,
        key=settings.RAZORPAY_KEY_ID,
    )