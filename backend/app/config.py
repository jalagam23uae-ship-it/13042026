from pydantic_settings import BaseSettings


_INSECURE_SECRET_KEYS = {
    "",
    "supersecretkey_change_in_production",
    "change_this_to_a_very_long_random_secret_key",
}


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()

if settings.SECRET_KEY.strip() in _INSECURE_SECRET_KEYS or len(settings.SECRET_KEY) < 32:
    raise RuntimeError(
        "SECRET_KEY is missing, a known placeholder, or shorter than 32 chars. "
        "Set a strong random value in the SECRET_KEY environment variable."
    )
