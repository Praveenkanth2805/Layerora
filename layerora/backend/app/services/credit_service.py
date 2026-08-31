from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.credit import CreditTransaction, CreditTransactionType
from app.models.design import Design
from app.core.config import get_settings
import uuid
from datetime import date

class CreditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_balance(self, user_id: str) -> dict:
        # Sum purchases, daily free, and subtract consumptions
        # Simplified: implement with SQL aggregations
        from sqlalchemy import select, func
        # Purchased balance
        purchased = await self.db.execute(
            select(func.sum(CreditTransaction.amount))
            .where(CreditTransaction.user_id == user_id)
            .where(CreditTransaction.type.in_([CreditTransactionType.PURCHASED, CreditTransactionType.ADMIN_ADJUST]))
        )
        purchased_total = purchased.scalar() or 0
        consumed = await self.db.execute(
            select(func.sum(CreditTransaction.amount))
            .where(CreditTransaction.user_id == user_id)
            .where(CreditTransaction.type == CreditTransactionType.CONSUMPTION)
        )
        consumed_total = abs(consumed.scalar() or 0)
        purchased_balance = purchased_total - consumed_total

        # Daily free: count today's free consumptions
        today = date.today()
        free_used = await self.db.execute(
            select(func.count(CreditTransaction.id))
            .where(CreditTransaction.user_id == user_id)
            .where(CreditTransaction.type == CreditTransactionType.FREE_DAILY)
            .where(func.date(CreditTransaction.created_at) == today)
        )
        free_used_count = free_used.scalar() or 0
        daily_limit = get_settings().DAILY_FREE_EXTRACTIONS
        free_remaining = max(0, daily_limit - free_used_count)

        return {
            "user_id": user_id,
            "free_daily_remaining": free_remaining,
            "purchased_balance": purchased_balance,
            "total_balance": free_remaining + purchased_balance,
        }

    async def reserve_credit(self, user_id: str, amount: int, reference: str) -> str:
        # Check if user has sufficient (free or purchased)
        balance = await self.get_balance(user_id)
        if balance["total_balance"] < amount:
            raise InsufficientCreditsError()
        # Create a reservation record (we can use a temporary transaction with status)
        # For simplicity, we just deduct immediately but with a rollback flag?
        # Better: use a reservation table. We'll implement a simpler approach:
        # Deduct from free first, then purchased, but keep a reservation ID.
        # We'll store a transaction with type "RESERVED" later.
        # For MVP, we'll just consume on success, and refund on failure.
        reservation_id = str(uuid.uuid4())
        # store in redis or a reservation table
        # We'll store in memory for now (not safe). Use a separate reservation table.
        # For production, create a Reservation model.
        return reservation_id

    async def confirm_reservation(self, reservation_id: str):
        # Move reserved to consumed
        pass

    async def refund_reservation(self, reservation_id: str):
        # Refund
        pass

    async def consume_free_daily(self, user_id: str, reference: str):
        # Add a free daily transaction
        tx = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=-1,
            type=CreditTransactionType.FREE_DAILY,
            description="Daily free extraction",
            reference_id=reference,
        )
        self.db.add(tx)
        await self.db.commit()