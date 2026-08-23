from fastapi import APIRouter, Query

from app.services import comps_service

router = APIRouter(prefix="/market")


@router.get("/comps")
async def get_comps(
    area: str = Query(..., description="Scheme, taman, or area name"),
    budget_range: str | None = None,
    property_type: str | None = None,
    limit: int = Query(3, ge=1, le=20),
) -> dict:
    """The same NAPIC lookup the voice agent uses, for the dashboard and manual checks."""
    return comps_service.find_comps(area, budget_range, property_type, limit)
