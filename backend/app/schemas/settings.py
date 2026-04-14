from typing import Optional

from pydantic import BaseModel, ConfigDict


class SettingsUpdate(BaseModel):
    """Body for PUT /settings/.

    Unknown keys are ignored (matches the prior `body.items()` + `DEFAULTS`
    filter behavior).
    """

    model_config = ConfigDict(extra="ignore")

    ai_enabled: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_model: Optional[str] = None
    llm_max_tokens: Optional[str] = None
    llm_temperature: Optional[str] = None
    chatbot_welcome_message: Optional[str] = None
    chatbot_name: Optional[str] = None
