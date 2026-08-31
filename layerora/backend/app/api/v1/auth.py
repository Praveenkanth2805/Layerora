from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import authenticate_user, create_access_token, get_password_hash
from app.models.user import User, AuthProvider
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
import uuid
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(login_data.email, login_data.password, db)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "user": UserOut.model_validate(user).dict(),
    }

@router.post("/register", response_model=TokenResponse)
async def register(register_data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check existing
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.email == register_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = get_password_hash(register_data.password)
    user = User(
        id=str(uuid.uuid4()),
        email=register_data.email,
        name=register_data.name,
        auth_provider=AuthProvider.EMAIL,
        hashed_password=hashed,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "user": UserOut.model_validate(user).dict(),
    }