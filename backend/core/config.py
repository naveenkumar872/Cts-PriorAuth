from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List

_REPO_ROOT = Path(__file__).parent.parent.parent


class Settings(BaseSettings):
    # API
    API_SECRET_KEY: str = "priorauth-ai-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS — includes Vite dev server (5173) and legacy ports
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
    ]

    # Database — TiDB / MySQL (override via .env)
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:4000/prior_auth"
    DB_HOST: str = ""
    DB_PORT: int = 4000
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_NAME: str = ""

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"



    # File uploads
    UPLOAD_DIR: str = "uploads"

    # OCR — Tesseract executable path (optional override via .env)
    TESSERACT_CMD: str = ""

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "medical_policies"

    # Weaviate — policy document vector store (RAG evidence for rule decisions)
    WEAVIATE_URL: str = ""
    WEAVIATE_API_KEY: str = ""
    WEAVIATE_COLLECTION: str = "PolicyDocument"
    POLICY_CHUNK_SIZE: int = 1200
    POLICY_CHUNK_OVERLAP: int = 200

    # LlamaIndex
    LLAMA_INDEX_CHUNK_SIZE: int = 512
    LLAMA_INDEX_CHUNK_OVERLAP: int = 64
    TOP_K_RESULTS: int = 5

    class Config:
        env_file = str(_REPO_ROOT / ".env")
        case_sensitive = False
        extra = "ignore"



settings = Settings()
