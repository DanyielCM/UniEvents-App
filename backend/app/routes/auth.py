from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import (
    create_token_pair,
    decode_token,
    get_current_user,
)
from app.auth.google import verify_google_access_token
from app.config import settings
from app.crud.user import (
    authenticate_user,
    create_student_from_google,
    get_user_by_email,
    get_user_by_google_id,
)
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    GoogleAuthRequest,
    LoginRequest,
    TokenPair,
    TokenRefreshRequest,
    UserResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/google", response_model=TokenPair)
async def google_auth(
    body: GoogleAuthRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    google_user = await verify_google_access_token(body.access_token)

    email: str = google_user["email"]
    domain = email.split("@")[1]
    if domain != settings.ALLOWED_EMAIL_DOMAIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Autentificarea cu Google este rezervată adreselor @{settings.ALLOWED_EMAIL_DOMAIN}.",
        )

    user = await get_user_by_google_id(db, google_user["sub"])
    if user is None:
        user = await get_user_by_email(db, email)
    if user is None:
        user = await create_student_from_google(
            db,
            email=email,
            google_id=google_user["sub"],
            first_name=google_user.get("given_name", ""),
            last_name=google_user.get("family_name", ""),
        )
    elif user.google_id is None:
        user.google_id = google_user["sub"]
        await db.commit()
        await db.refresh(user)

    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Autentificarea cu Google este disponibilă doar pentru studenți.",
        )

    return create_token_pair(user.id, user.role.value)


@router.post("/login", response_model=TokenPair)
async def login(
    credentials: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email sau parolă incorecte.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.role not in (UserRole.ORGANIZER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Autentificarea cu parolă este disponibilă doar pentru organizatori și administratori.",
        )
    return create_token_pair(user.id, user.role.value)


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    body: TokenRefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from app.crud.user import get_user_by_id

    payload = decode_token(body.refresh_token, expected_type="refresh")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    user = await get_user_by_id(db, int(user_id))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return create_token_pair(user.id, user.role.value)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    # With stateless JWTs, logout is handled client-side by removing the token.
    # A token blacklist could be added here for stricter invalidation.
    return


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user
