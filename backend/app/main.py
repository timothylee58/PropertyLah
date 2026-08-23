from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import voice_webhook, leads, calendar, market

app = FastAPI(title="Ejen — Voice AI Property Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before any real deploy
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_webhook.router, tags=["voice"])
app.include_router(leads.router, tags=["leads"])
app.include_router(calendar.router, tags=["calendar"])
app.include_router(market.router, tags=["market"])


@app.get("/health")
async def health():
    return {"status": "ok"}
