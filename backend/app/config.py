from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./gigs.db"
    initial_password: str = ""
    muse_api_token: str = ""
    reminder_api_token: str = ""
    frontend_origins: str = "http://localhost:5173"
    firebase_service_account_path: str = ""
    app_timezone: str = "Asia/Kolkata"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def settings():
    return Settings()
