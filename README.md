# MOVNA LMS

Портал школи MOVNA: кабінети учня, викладача та адміна. Дані розкладу, балансів і профілів — з **Optimate CRM**; локальна БД — користувачі порталу, домашні завдання, навчальні програми викладачів та запити на перенесення/скасування уроків.

## Стек

| Частина | Технологія |
|---|---|
| Frontend | Next.js 15 · TypeScript · App Router |
| Backend | Python 3.12 · FastAPI · SQLAlchemy async |
| БД | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (access + refresh, «Запамʼятати мене») |
| CRM | Optimate API (кеш на бекенді) |
| Програми Movna | Google Sheets (кеш на бекенді) |

## Швидкий старт

### Backend

```bash
cd backend
cp .env.example .env          # SECRET_KEY, OPTIMATE_* (див. нижче)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py                # тестові акаунти (локально)
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000  
- Swagger: http://localhost:8000/docs  
- Продакшн: `./run.sh` (nohup uvicorn)

Таблиці створюються автоматично при старті (`init_db`).

### Frontend

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Відкрий http://localhost:3000

**Важливо для продакшну:** `NEXT_PUBLIC_API_URL` задається на етапі **збірки** (`npm run build`).

## Тестові акаунти (після `seed.py`)

Працюють, якщо `OPTIMATE_VERIFY_ON_LOGIN=false` у `.env` бекенду.

| Роль | Email | Пароль |
|---|---|---|
| Адмін | admin@movna.ua | admin123 |
| Викладач | teacher@movna.ua | teacher123 |
| Учень | student@movna.ua | student123 |

## Структура

```
movna-lms/
├── backend/app/
│   ├── core/              # config, database, security
│   ├── models/            # User, LessonRequest, EventHomework, TeacherCurriculum
│   ├── routers/           # auth, optimate, curricula, homework, lesson_requests
│   ├── schemas/
│   └── services/          # Optimate, Google Sheets, file storage
├── frontend/
│   ├── app/               # student/, teacher/, admin/, auth/
│   ├── components/
│   └── lib/
└── docker-compose.yml
```

## API (активні маршрути)

| Prefix | Опис |
|---|---|
| `/api/auth/*` | Вхід, refresh, профіль порталу |
| `/api/student/optimate/*` | Баланси, події, транзакції, профіль учня |
| `/api/teacher/optimate/*` | Учні, групи, розклад, події викладача |
| `/api/admin/optimate/*` | KPI, користувачі CRM, календар усіх уроків |
| `/api/admin/curricula` | Програми Movna з Google Sheets |
| `/api/teacher/curricula` | Програми Movna + власні програми викладача |
| `/api/homework/*` | Домашні завдання до уроків Optimate |
| `/api/lesson-requests/*` | Запити скасування / перенесення уроків |
| `/api/health` | Health check |

## Optimate

У `backend/.env`:

- `OPTIMATE_BASE_URL`, `OPTIMATE_API_KEY` — доступ до CRM  
- `OPTIMATE_VERIFY_ON_LOGIN=true` — логін лише для email з Optimate  
- `OPTIMATE_VERIFY_ON_LOGIN=false` — локальні seed-акаунти  

## Google Sheets (програми Movna)

У `backend/.env`:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_CREDENTIALS_JSON` або `GOOGLE_SHEETS_CREDENTIALS_PATH`
