from supabase import create_client, Client
from app.config import settings

_client: Client | None = None


def get_db() -> Client:
    global _client
    # lazy init — avoids failing app startup if env vars aren't set yet during early dev
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client
