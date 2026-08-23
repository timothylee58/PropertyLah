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

    OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY", "")
    OPENCLAW_BASE_URL = os.getenv("OPENCLAW_BASE_URL", "")

    CALENDAR_SERVICE_ACCOUNT_JSON = os.getenv("CALENDAR_SERVICE_ACCOUNT_JSON", "")
    CALENDAR_ID = os.getenv("CALENDAR_ID", "primary")


settings = Settings()
