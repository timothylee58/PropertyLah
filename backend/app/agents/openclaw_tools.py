import httpx
from app.config import settings

# Fill in the actual OpenClaw endpoint/schema from their hackathon docs — this
# stub assumes a REST agent-task API; adjust to whatever they hand out on the day.


async def verify_listing(property_reference: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                f"{settings.OPENCLAW_BASE_URL}/tasks",
                headers={"Authorization": f"Bearer {settings.OPENCLAW_API_KEY}"},
                json={
                    "task": f"Look up this Malaysian property listing and confirm it "
                            f"is real and currently active: {property_reference}. "
                            f"Return price, availability, and listing URL if found.",
                },
            )
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, ValueError) as e:
            # verification failing should never crash the call — the agent
            # is told to fall back to "let a human follow up" on failure
            return {"verified": False, "error": str(e)}


async def get_comps(area: str, budget_range: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                f"{settings.OPENCLAW_BASE_URL}/tasks",
                headers={"Authorization": f"Bearer {settings.OPENCLAW_API_KEY}"},
                json={
                    "task": f"Find 3 comparable property listings in {area} "
                            f"within {budget_range}.",
                },
            )
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, ValueError) as e:
            # mid-call comps lookups must degrade, never take the call down
            return {"comps": [], "error": str(e)}
