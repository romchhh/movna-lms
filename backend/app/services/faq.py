from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.faq import FaqAudience, FaqItem
from app.models.user import UserRole

DEFAULT_FAQ_ITEMS: list[dict] = [
    {
        "question": "Як увійти в портал MOVNA?",
        "answer_md": (
            "Використовуйте email і пароль, які вам надіслала адміністрація. "
            "Якщо пароль не підходить — зверніться до технічної підтримки в Telegram."
        ),
        "audience": FaqAudience.ALL,
    },
    {
        "question": "Де подивитись розклад занять?",
        "answer_md": (
            "Учні: розділ **Розклад** у меню зліва.\n\n"
            "Викладачі: **Розклад** або **Дашборд** → блок «Найближчі уроки»."
        ),
        "audience": FaqAudience.ALL,
    },
    {
        "question": "Як перевірити залишок уроків?",
        "answer_md": "Перейдіть у розділ **Баланс уроків** — там показано продукти та залишок з Optimate.",
        "audience": FaqAudience.STUDENT,
    },
    {
        "question": "Де знайти домашні завдання?",
        "answer_md": (
            "Розділ **Домашні завдання** у меню. "
            "Нові завдання з’являються після уроку; після здачі викладач може залишити відгук."
        ),
        "audience": FaqAudience.STUDENT,
    },
    {
        "question": "Як змінити фото профілю?",
        "answer_md": (
            "Відкрийте **Налаштування** → блок з аватаром → **Додати фото** або **Змінити фото**. "
            "Після вибору зображення можна обрізати його перед збереженням."
        ),
        "audience": FaqAudience.ALL,
    },
    {
        "question": "Як скасувати або перенести урок?",
        "answer_md": (
            "Учень може подати запит у картці уроку в календарі (кнопки скасування / перенесення). "
            "Запити обробляються адміністрацією."
        ),
        "audience": FaqAudience.STUDENT,
    },
    {
        "question": "Де переглянути список учнів?",
        "answer_md": "Розділ **Мої учні** — пошук, фільтри за статусом і детальна картка учня з Optimate.",
        "audience": FaqAudience.TEACHER,
    },
    {
        "question": "Як зв’язатись з підтримкою?",
        "answer_md": (
            "Напишіть у Telegram: [@Natalka_technical_support](https://t.me/Natalka_technical_support). "
            "Опишіть проблему та вкажіть email, під яким ви входите в портал."
        ),
        "audience": FaqAudience.ALL,
    },
]


def _audience_for_role(role: UserRole) -> set[FaqAudience]:
    if role == UserRole.ADMIN:
        return {FaqAudience.ALL, FaqAudience.STUDENT, FaqAudience.TEACHER}
    if role == UserRole.TEACHER:
        return {FaqAudience.ALL, FaqAudience.TEACHER}
    return {FaqAudience.ALL, FaqAudience.STUDENT}


async def ensure_default_faq(db: AsyncSession) -> None:
    count = await db.scalar(select(FaqItem.id).limit(1))
    if count is not None:
        return
    for index, row in enumerate(DEFAULT_FAQ_ITEMS):
        db.add(
            FaqItem(
                question=row["question"],
                answer_md=row["answer_md"],
                audience=row["audience"],
                sort_order=index,
                is_published=True,
            )
        )
    await db.flush()


async def list_faq_for_role(db: AsyncSession, role: UserRole, *, published_only: bool) -> list[FaqItem]:
    await ensure_default_faq(db)
    audiences = _audience_for_role(role)
    query = (
        select(FaqItem)
        .where(FaqItem.audience.in_(audiences))
        .order_by(FaqItem.sort_order.asc(), FaqItem.id.asc())
    )
    if published_only:
        query = query.where(FaqItem.is_published.is_(True))
    result = await db.execute(query)
    return list(result.scalars().all())


async def list_all_faq(db: AsyncSession) -> list[FaqItem]:
    await ensure_default_faq(db)
    result = await db.execute(
        select(FaqItem).order_by(FaqItem.sort_order.asc(), FaqItem.id.asc())
    )
    return list(result.scalars().all())


async def get_faq_item(db: AsyncSession, item_id: int) -> FaqItem | None:
    result = await db.execute(select(FaqItem).where(FaqItem.id == item_id))
    return result.scalar_one_or_none()


async def reorder_faq(db: AsyncSession, ids: list[int]) -> list[FaqItem]:
    items = await list_all_faq(db)
    by_id = {item.id: item for item in items}
    for index, item_id in enumerate(ids):
        item = by_id.get(item_id)
        if item:
            item.sort_order = index
    await db.flush()
    return await list_all_faq(db)
