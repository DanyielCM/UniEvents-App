import httpx
from fastapi import HTTPException, status

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


async def verify_google_access_token(access_token: str) -> dict:
    """Exchange a Google OAuth2 access token for the authenticated user's profile.

    Uses Google's userinfo endpoint, which only accepts tokens issued for the
    OAuth client our app is configured with. A valid response confirms the
    token's authenticity and provides identifying fields (sub, email, name).
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    payload = resp.json()
    if not payload.get("email") or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google response missing required fields",
        )
    if not payload.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google email not verified",
        )
    return payload
