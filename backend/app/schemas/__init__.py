from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = True


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.STUDENT


class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    first_name: str
    last_name: str
    phone: str
    avatar_url: str
    language_level: str
    is_active: bool
    optimeit_id: str
    created_at: datetime

    model_config = {"from_attributes": True}
