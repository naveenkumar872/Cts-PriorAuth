from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    DATABASE_URL: str = "mysql+asyncmy://root:password@localhost:3306/prior_auth_db"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
