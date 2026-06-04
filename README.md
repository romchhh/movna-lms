# MOVNA LMS

Навчальна платформа для школи MOVNA. Three-panel system: Student / Teacher / Admin.

## Технологічний стек

| Частина | Технологія |
|---|---|
| Frontend | Next.js 15 · TypeScript · App Router |
| Backend | Python 3.12 · FastAPI · SQLAlchemy async |
| База даних | SQLite (dev) → PostgreSQL (prod) |
| Auth | JWT (access + refresh tokens) |
| Зберігання файлів | Local (dev) → S3/Cloudflare R2 (prod) |

## Швидкий старт (без Docker)

### 1. Backend

```bash
cd backend
cp .env.example .env        # відредагуй SECRET_KEY
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed.py              # створює тестові дані
uvicorn app.main:app --reload --port 8000
```

API доступне на http://localhost:8000
Swagger docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Відкрий http://localhost:3000

## Тестові акаунти (після seed.py)

| Роль | Email | Пароль |
|---|---|---|
| Адмін | admin@movna.ua | admin123 |
| Викладач | teacher@movna.ua | teacher123 |
| Студент | student@movna.ua | student123 |

## Запуск через Docker

```bash
docker-compose up --build
```

## Структура проєкту

```
movna-lms/
├── backend/
│   ├── app/
│   │   ├── core/           # config, database, security (JWT)
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── routers/        # FastAPI route handlers
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── main.py
│   ├── seed.py             # тестові дані
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── (auth)/         # login page
    │   ├── student/        # кабінет учня
    │   ├── teacher/        # кабінет викладача
    │   └── admin/          # адмін-панель
    ├── components/
    │   └── shared/         # Sidebar, UI components
    ├── lib/
    │   ├── api.ts          # API client
    │   └── auth.ts         # JWT helpers
    └── middleware.ts       # role-based routing
```

## API ендпоінти

| Method | Path | Роль | Опис |
|---|---|---|---|
| POST | /api/auth/login | public | Вхід, повертає JWT |
| POST | /api/auth/register | public | Реєстрація |
| GET | /api/users/me | all | Поточний користувач |
| GET | /api/courses | all | Список курсів |
| GET | /api/courses/{id}/progress | student | Курс з прогресом |
| POST | /api/courses/{id}/lessons/{id}/complete | student | Завершити урок |
| GET | /api/homework/my | student | Мої завдання |
| POST | /api/homework/submit | student | Здати завдання |
| GET | /api/homework/to-review | teacher | Черга перевірки |
| POST | /api/homework/{id}/review | teacher | Перевірити, виставити оцінку |
| GET | /api/schedule/my | all | Розклад |
| GET | /api/schedule/balance | student | Баланс уроків |
| GET | /api/admin/stats | admin | KPI школи |
| GET | /api/admin/users | admin | Список користувачів |
| POST | /api/sync/optimeite/pull | admin | Синхронізація з Оптімейт |
| POST | /api/sync/sheets/pull | admin | Синхронізація Google Sheets |
| POST | /api/auth/webhook/optimeite | system | Webhook нового учня |

## Наступні кроки для масштабування

1. **Оптімейт інтеграція** — заповни `OPTIMEIT_BASE_URL` + `OPTIMEIT_API_KEY` в `.env`, реалізуй `sync.py`
2. **Google Sheets sync** — додай `credentials.json`, реалізуй парсинг в `sync.py`
3. **File uploads** → змін `STORAGE_BACKEND=s3` та заповни S3 credentials
4. **PostgreSQL** → змін `DATABASE_URL=postgresql+asyncpg://...`
5. **Email нотифікації** → додай `fastapi-mail` в `requirements.txt`
6. **Redis кеш** → для Sheets sync та сесій
