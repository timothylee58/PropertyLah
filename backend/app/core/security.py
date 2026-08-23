"""Vapi server-webhook authentication.

Vapi has no single fixed scheme: with `serverUrlSecret` set it sends the secret
verbatim in `X-Vapi-Secret`, and HMAC credentials instead sign the raw body into
`X-Vapi-Signature`. Both are accepted so the deployment can switch without a
code change; anything else is rejected.
"""

import hashlib
import hmac

from fastapi import HTTPException, Request

from app.config import settings

SECRET_HEADER = "x-vapi-secret"
SIGNATURE_HEADER = "x-vapi-signature"

DASHBOARD_API_KEY_HEADER = "x-api-key"


def _matches(provided: str, expected: str) -> bool:
    # compare_digest rejects str inputs holding non-ASCII, so compare bytes
    return hmac.compare_digest(provided.encode("utf-8", "surrogateescape"), expected.encode())


def _signature_matches(raw_body: bytes, provided: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    # some HMAC credential configs prefix the digest, e.g. "sha256=<hex>"
    candidate = provided.split("=", 1)[1] if provided.startswith("sha256=") else provided
    return _matches(candidate.strip().lower(), expected)


def verify_vapi_request(request: Request, raw_body: bytes) -> None:
    """Raise 401 unless the request carries a valid secret or body signature."""
    if not settings.VAPI_VERIFY_WEBHOOK:
        return

    secret = settings.VAPI_WEBHOOK_SECRET
    if not secret:
        raise HTTPException(
            status_code=500,
            detail="VAPI_WEBHOOK_SECRET is not set — set it, or set VAPI_VERIFY_WEBHOOK=false locally",
        )

    provided_secret = request.headers.get(SECRET_HEADER)
    if provided_secret and _matches(provided_secret, secret):
        return

    signature = request.headers.get(SIGNATURE_HEADER)
    if signature and _signature_matches(raw_body, signature, secret):
        return

    raise HTTPException(status_code=401, detail="invalid Vapi webhook credentials")


def require_dashboard_auth(request: Request) -> None:
    """Gate the internal ops dashboard (`/api/*`, `/leads`, `/calls`) behind a shared key.

    This is a stopgap, not staff-level auth — every operator shares one key, and
    the frontend (which has no login of its own) currently sends it from a
    NEXT_PUBLIC_ env var, so it is visible to anyone who loads the dashboard
    bundle. It stops opportunistic scraping/CORS abuse from the open internet;
    replace with real per-operator sessions before this holds real customer PII
    at scale.
    """
    if not settings.DASHBOARD_REQUIRE_AUTH:
        return
    if not settings.DASHBOARD_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="DASHBOARD_API_KEY is not set — set it, or set DASHBOARD_REQUIRE_AUTH=false locally",
        )

    provided = request.headers.get(DASHBOARD_API_KEY_HEADER)
    auth_header = request.headers.get("authorization", "")
    if not provided and auth_header.lower().startswith("bearer "):
        provided = auth_header[7:]

    if not provided or not _matches(provided, settings.DASHBOARD_API_KEY):
        raise HTTPException(status_code=401, detail="missing or invalid dashboard API key")
