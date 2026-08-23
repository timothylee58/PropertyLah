from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import voice_webhook, leads, calendar, market, dashboard
from app.config import settings

app = FastAPI(title="Ejen — Voice AI Property Agent")

app.add_middleware(
    CORSMiddleware,
    # explicit allowlist, not "*" — the dashboard endpoints carry lead PII, so a
    # wildcard origin would let any website script-fetch it cross-origin. Set
    # FRONTEND_ORIGINS in the environment to the real staff dashboard URL(s).
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Api-Key"],
)

app.include_router(voice_webhook.router, tags=["voice"])
app.include_router(leads.router, tags=["leads"])
app.include_router(calendar.router, tags=["calendar"])
app.include_router(market.router, tags=["market"])
app.include_router(dashboard.router, tags=["dashboard"])


@app.get("/health")
async def health():
    return {"status": "ok"}
