from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    secret_key: str = "dev-secret-key-change-me"
    access_token_expire_minutes: int = 60 * 24
    database_path: Path = REPO_ROOT / "backend" / "data" / "psyinsight.db"
    cors_origins: list[str] = ["http://localhost:5173"]

    gemini_api_key: str = Field(
        default="", validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY")
    )
    # Aliases "-latest" (em vez de fixar ex.: "gemini-2.5-pro") para resistir às
    # trocas/depreciações frequentes de modelo da Google sem precisar de redeploy.
    gemini_chat_model: str = "gemini-pro-latest"
    gemini_extraction_model: str = "gemini-flash-latest"


settings = Settings()
