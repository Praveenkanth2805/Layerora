from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict  # minimal user info

class UserOut(BaseModel):
    id: str
    email: str
    name: str | None
    avatar_url: str | None
    is_admin: bool