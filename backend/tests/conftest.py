import os

# config.py reads the environment at import time, so this must run before any
# `app.*` import — pytest loads conftest.py first, which is what makes it work.
os.environ.setdefault("QWEN_API_KEY", "test-qwen-key")
os.environ.setdefault("VAPI_WEBHOOK_SECRET", "test-secret")
os.environ.setdefault("CAL_API_KEY", "cal_test_key")
os.environ.setdefault("CAL_EVENT_TYPE_ID", "42")
os.environ.setdefault("CAL_TIMEZONE", "Asia/Kuala_Lumpur")
os.environ.setdefault("CAL_FALLBACK_ATTENDEE_EMAIL", "leads@example.com")
os.environ.setdefault("DASHBOARD_API_KEY", "test-dashboard-key")
# the rate limiter is exercised by its own unit tests; disable it everywhere
# else so unrelated tests don't trip it when run together
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
