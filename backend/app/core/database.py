from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def init_db():
    async with engine.begin() as conn:
        # Import all models so Base knows about them
        from app.models import user, lesson_request, event_homework, teacher_curriculum, student_curriculum, faq  # noqa
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_user_columns)


def _ensure_user_columns(connection):
    if "sqlite" not in settings.DATABASE_URL:
        return
    from sqlalchemy import text

    rows = connection.execute(text("PRAGMA table_info(users)")).fetchall()
    columns = {row[1] for row in rows}
    if "login_password_enc" not in columns:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN login_password_enc VARCHAR(512) DEFAULT ''")
        )
    if "zoom_url" not in columns:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN zoom_url VARCHAR(500) DEFAULT ''")
        )
    if "miro_url" not in columns:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN miro_url VARCHAR(500) DEFAULT ''")
        )
    if "notify_homework" not in columns:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN notify_homework BOOLEAN DEFAULT 1")
        )
    if "notify_lesson_reminder" not in columns:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN notify_lesson_reminder BOOLEAN DEFAULT 1")
        )
    if "about_me" not in columns:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN about_me TEXT DEFAULT ''")
        )


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
