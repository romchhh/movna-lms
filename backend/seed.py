"""
Run: python seed.py
Creates test portal users for local login (when OPTIMATE_VERIFY_ON_LOGIN=false).
"""
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, init_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services.password_vault import encrypt_login_password


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == "admin@movna.ua"))
        if existing.scalar_one_or_none():
            print("Seed already applied — skipping")
            return

        users = [
            User(
                email="admin@movna.ua",
                hashed_password=hash_password("admin123"),
                login_password_enc=encrypt_login_password("admin123"),
                first_name="Адміністратор",
                last_name="",
                role=UserRole.ADMIN,
                is_active=True,
            ),
            User(
                email="teacher@movna.ua",
                hashed_password=hash_password("teacher123"),
                login_password_enc=encrypt_login_password("teacher123"),
                first_name="Марія",
                last_name="Іваненко",
                role=UserRole.TEACHER,
                is_active=True,
            ),
            User(
                email="student@movna.ua",
                hashed_password=hash_password("student123"),
                login_password_enc=encrypt_login_password("student123"),
                first_name="Олена",
                last_name="Коваль",
                role=UserRole.STUDENT,
                language_level="B1",
                is_active=True,
            ),
        ]
        db.add_all(users)
        await db.commit()
        print("✅ Seed complete!")
        print("   admin@movna.ua   / admin123")
        print("   teacher@movna.ua / teacher123")
        print("   student@movna.ua / student123")


if __name__ == "__main__":
    asyncio.run(seed())
