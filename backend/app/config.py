import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")
    QWEN_BASE_URL = os.getenv("QWEN_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
    QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen-plus")

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

    VAPI_WEBHOOK_SECRET = os.getenv("VAPI_WEBHOOK_SECRET", "")
    # set to "false" only for local testing without a secret configured in Vapi
    VAPI_VERIFY_WEBHOOK = os.getenv("VAPI_VERIFY_WEBHOOK", "true").lower() != "false"
    # the custom-LLM URL is only authenticated when a credential is attached to
    # model.url in Vapi, so verification there is opt-in
    VAPI_VERIFY_LLM_ENDPOINT = os.getenv("VAPI_VERIFY_LLM_ENDPOINT", "false").lower() == "true"

    OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY", "")
    OPENCLAW_BASE_URL = os.getenv("OPENCLAW_BASE_URL", "")

    # Cal.com — booking backend for viewings/appointments
    CAL_API_KEY = os.getenv("CAL_API_KEY", "")
    CAL_BASE_URL = os.getenv("CAL_BASE_URL", "https://api.cal.com/v2")
    CAL_EVENT_TYPE_ID = os.getenv("CAL_EVENT_TYPE_ID", "")
    CAL_TIMEZONE = os.getenv("CAL_TIMEZONE", "Asia/Kuala_Lumpur")
    CAL_SLOT_DAYS_AHEAD = int(os.getenv("CAL_SLOT_DAYS_AHEAD", "7"))
    CAL_SLOTS_TO_OFFER = int(os.getenv("CAL_SLOTS_TO_OFFER", "3"))
    # attendee email is mandatory on Cal.com bookings; phone callers rarely give one
    CAL_FALLBACK_ATTENDEE_EMAIL = os.getenv("CAL_FALLBACK_ATTENDEE_EMAIL", "")
    # API versions are pinned per endpoint — Cal.com defaults to older behaviour otherwise
    CAL_SLOTS_API_VERSION = os.getenv("CAL_SLOTS_API_VERSION", "2024-09-04")
    CAL_BOOKINGS_API_VERSION = os.getenv("CAL_BOOKINGS_API_VERSION", "2024-08-13")


settings = Settings()
