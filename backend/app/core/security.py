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
