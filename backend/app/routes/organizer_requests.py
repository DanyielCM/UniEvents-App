from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.config import settings
from app.crud.organizer_request import (
    create_organizer_request,
    get_request_by_id,
    has_pending_request_for_email,
    list_requests,
    mark_approved,
    mark_rejected,
)
from app.crud.user import (
    create_organizer_with_hashed_password,
    get_user_by_email,
)
from app.database import get_db
from app.email_service import (
    send_new_request_to_admin,
    send_request_approved,
    send_request_received_to_applicant,
    send_request_rejected,
)
from app.models.organizer_request import OrganizerRequestStatus
from app.models.user import User, UserRole
from app.schemas.organizer_request import (
    OrganizerRequestCreate,
    OrganizerRequestReject,
    OrganizerRequestResponse,
)

router = APIRouter(prefix="/api/v1/organizer-requests", tags=["organizer-requests"])

DB = Annotated[AsyncSession, Depends(get_db)]
AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]


@router.post(
    "", response_model=OrganizerRequestResponse, status_code=status.HTTP_201_CREATED
)
async def submit_request(
    data: OrganizerRequestCreate,
    background: BackgroundTasks,
    db: DB,
):
    existing_user = await get_user_by_email(db, data.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Există deja un cont cu această adresă de email.",
        )

    if await has_pending_request_for_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Există deja o cerere în așteptare pentru această adresă.",
        )

    req = await create_organizer_request(db, data)

    background.add_task(
        send_request_received_to_applicant, to=req.email, first_name=req.first_name
    )
    if settings.ADMIN_SEED_EMAIL:
        background.add_task(
            send_new_request_to_admin,
            to=settings.ADMIN_SEED_EMAIL,
            request_id=req.id,
            applicant_email=req.email,
            organization=req.organization,
        )

    return req


@router.get("", response_model=list[OrganizerRequestResponse])
async def list_all(
    _admin: AdminUser,
    db: DB,
    status_filter: OrganizerRequestStatus | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = 50,
):
    return await list_requests(db, status=status_filter, skip=skip, limit=limit)


@router.get("/{req_id}", response_model=OrganizerRequestResponse)
async def get_one(req_id: int, _admin: AdminUser, db: DB):
    req = await get_request_by_id(db, req_id)
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cerere inexistentă"
        )
    return req


@router.post("/{req_id}/approve", response_model=OrganizerRequestResponse)
async def approve_request(
    req_id: int,
    admin: AdminUser,
    background: BackgroundTasks,
    db: DB,
):
    req = await get_request_by_id(db, req_id)
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cerere inexistentă"
        )
    if req.status != OrganizerRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cererea a fost deja procesată.",
        )

    existing = await get_user_by_email(db, req.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Există deja un cont cu această adresă de email.",
        )

    await create_organizer_with_hashed_password(
        db,
        email=req.email,
        hashed_password=req.hashed_password,
        first_name=req.first_name,
        last_name=req.last_name,
    )
    req = await mark_approved(db, req, admin_id=admin.id)

    background.add_task(
        send_request_approved, to=req.email, first_name=req.first_name
    )
    return req


@router.post("/{req_id}/reject", response_model=OrganizerRequestResponse)
async def reject_request(
    req_id: int,
    body: OrganizerRequestReject,
    admin: AdminUser,
    background: BackgroundTasks,
    db: DB,
):
    req = await get_request_by_id(db, req_id)
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cerere inexistentă"
        )
    if req.status != OrganizerRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cererea a fost deja procesată.",
        )

    req = await mark_rejected(
        db, req, admin_id=admin.id, reason=body.rejection_reason
    )
    background.add_task(
        send_request_rejected,
        to=req.email,
        first_name=req.first_name,
        reason=body.rejection_reason,
    )
    return req
