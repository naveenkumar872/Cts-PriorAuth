# Prior Authorization Triage & Policy Companion

FastAPI + SQLAlchemy 2.0 (async) + MySQL backend for the Prior Authorization Triage and Policy Companion system.

## Stack
- **Framework:** FastAPI 0.111
- **ORM:** SQLAlchemy 2.0 (async)
- **Database:** MySQL (prototype) → TiDB (production)
- **Migrations:** Alembic 1.13
- **Driver:** asyncmy

## Setup

```bash
# 1. Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
source .venv/bin/activate  # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy environment file and configure
cp .env.example .env   # edit DATABASE_URL

# 4. Run migrations
alembic upgrade head

# 5. Seed the database (optional)
python -m backend.core.seed

# 6. Start the server
uvicorn backend.main:app --reload
```

## Project Structure
```
insuretech/
├── alembic/            # Database migrations
├── backend/
│   ├── core/           # Config, DB engine, seed
│   └── models/         # SQLAlchemy ORM models
└── requirements.txt
```

## API
- `GET /health` — Health check
