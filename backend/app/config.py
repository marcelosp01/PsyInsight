from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    secret_key: str = "dev-secret-key-change-me"
    access_token_expire_minutes: int = 60 * 24
    database_path: Path = REPO_ROOT / "backend" / "data" / "psyinsight.db"
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
