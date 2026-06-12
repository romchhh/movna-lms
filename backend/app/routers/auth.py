from urllib.parse import urlencode, quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from datetime import timedelta

from app.models.user import User, UserRole
from app.schemas import LoginRequest, RefreshRequest, TokenResponse, RegisterRequest, UserOut
from app.services.auth_flow import (
    verify_optimate_for_user,
    sync_user_from_optimate,
    get_or_create_user_from_optimate,
)
from app.services.optimate import get_optimate_client

router = APIRouter()


def _redirect_login_error(message: str) -> RedirectResponse:
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/login?error={quote(message)}")


def _redirect_after_login(access_token: str, refresh_token: str, role: str) -> RedirectResponse:
    params = urlencode({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "role": role,
    })
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/google/callback?{params}")


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        role=body.role,
    )
    db.add(user)
    await db.flush()

    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
        role=user.role,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Невірний email або пароль")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Обліковий запис неактивний")

    contact = await verify_optimate_for_user(user)
    await sync_user_from_optimate(user, contact)

    access_ttl = (
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        if body.remember_me
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=create_access_token(
            user.id,
            user.role.value,
            user.optimeit_id or None,
            expires_delta=access_ttl,
        ),
        refresh_token=create_refresh_token(user.id),
        role=user.role,
    )


@router.get("/google/login")
async def google_login():
    if not settings.google_oauth_configured:
        raise HTTPException(status_code=503, detail="Google OAuth не налаштовано")

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
    }
    return RedirectResponse(
        "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    )


@router.get("/google/callback")
async def google_callback(code: str | None = None, error: str | None = None, db: AsyncSession = Depends(get_db)):
    if error:
        return _redirect_login_error("Авторизацію через Google скасовано")
    if not code:
        return _redirect_login_error("Google не повернув код авторизації")
    if not settings.google_oauth_configured:
        return _redirect_login_error("Google OAuth не налаштовано")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                return _redirect_login_error("Не вдалося авторизуватися через Google")

            tokens = token_resp.json()
            google_access = tokens.get("access_token")
            if not google_access:
                return _redirect_login_error("Google не повернув access token")

            profile_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {google_access}"},
            )
            if profile_resp.status_code != 200:
                return _redirect_login_error("Не вдалося отримати профіль Google")

            profile = profile_resp.json()

        email = (profile.get("email") or "").strip().lower()
        if not email:
            return _redirect_login_error("Google акаунт без email")

        if profile.get("email_verified") is False:
            return _redirect_login_error("Email Google не підтверджено")

        optimate = get_optimate_client()
        role_str, contact = await optimate.resolve_role_by_email(email)
        if not role_str or not contact:
            return _redirect_login_error(
                "Цей Google акаунт не знайдено серед учнів або викладачів Movna в Optimate"
            )

        role = UserRole.STUDENT if role_str == "student" else UserRole.TEACHER
        user = await get_or_create_user_from_optimate(db, email, role, contact)

        jwt_access = create_access_token(user.id, user.role.value, user.optimeit_id or None)
        jwt_refresh = create_refresh_token(user.id)
        return _redirect_after_login(jwt_access, jwt_refresh, user.role.value)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else "Помилка входу через Google"
        return _redirect_login_error(detail)
    except Exception:
        return _redirect_login_error("Помилка входу через Google")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Not a refresh token")
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(
            user.id,
            user.role.value,
            user.optimeit_id or None,
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ),
        refresh_token=create_refresh_token(user.id),
        role=user.role,
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/webhook/optimeite", status_code=200)
async def optimeite_webhook(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Optimeite sends: { event: "user.created", data: { id, email, name, role } }
    We create or update the user in LMS.
    """
    event = payload.get("event")
    data = payload.get("data", {})

    if event == "user.created":
        existing = await db.execute(select(User).where(User.email == data["email"]))
        if not existing.scalar_one_or_none():
            parts = data.get("name", "").split(" ", 1)
            user = User(
                email=data["email"],
                hashed_password=hash_password(data.get("id", "temp")),
                first_name=parts[0] if parts else "",
                last_name=parts[1] if len(parts) > 1 else "",
                optimeit_id=str(data.get("id", "")),
                role=data.get("role", "student"),
            )
            db.add(user)

    return {"ok": True}
