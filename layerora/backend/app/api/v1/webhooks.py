from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import get_settings
from app.services.credit_service import CreditService
import hmac
import hashlib
import json

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/razorpay")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    secret = settings.RAZORPAY_WEBHOOK_SECRET.get_secret_value()
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(403, "Invalid signature")
    payload = json.loads(body)
    event = payload.get("event")
    if event == "payment.captured":
        # Extract order_id, payment_id, and amount
        # Add credits to user
        # (Implementation depends on your payment flow)
        # For now, mock:
        pass
    return {"status": "ok"}

from app.models.payment import Payment, PaymentStatus
from app.models.credit_package import CreditPackage

@router.post("/razorpay")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    # ... verify signature ...
    payload = json.loads(body)
    event = payload.get("event")
    if event == "payment.captured":
        order_id = payload["payload"]["payment"]["entity"]["order_id"]
        payment_id = payload["payload"]["payment"]["entity"]["id"]
        amount = payload["payload"]["payment"]["entity"]["amount"] / 100  # paise to rupees
        # Find the payment record by order_id – we should have created it earlier
        # Or we can create a new Payment record
        # For simplicity, we'll create a new record with user_id from order receipt
        receipt = payload["payload"]["payment"]["entity"]["receipt"]
        # receipt contains user_id or we can store in metadata
        # We'll assume we stored user_id in receipt
        # ... create Payment entry ...
        payment = Payment(
            id=str(uuid.uuid4()),
            user_id=user_id,  # extract from receipt
            order_id=order_id,
            payment_id=payment_id,
            amount=amount,
            status=PaymentStatus.COMPLETED,
            paid_at=datetime.utcnow(),
        )
        db.add(payment)
        # Also add credits to user (call CreditService)
        await db.commit()
    return {"status": "ok"}