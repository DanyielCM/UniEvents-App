from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.user import password_hash
from app.models.organizer_request import (
    OrganizerRequest,
    OrganizerRequestStatus,
)
from app.schemas.organizer_request import OrganizerRequestCreate


async def create_organizer_request(
    db: AsyncSession, data: OrganizerRequestCreate
) -> OrganizerRequest:
    req = OrganizerRequest(
        email=data.email,
        hashed_password=password_hash.hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        organization=data.organization,
        organizer_type=data.organizer_type,
        motivation=data.motivation,
        status=OrganizerRequestStatus.PENDING,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


async def get_request_by_id(
    db: AsyncSession, req_id: int
) -> OrganizerRequest | None:
    result = await db.execute(
        select(OrganizerRequest).where(OrganizerRequest.id == req_id)
    )
    return result.scalar_one_or_none()


async def list_requests(
    db: AsyncSession,
    status: OrganizerRequestStatus | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[OrganizerRequest]:
    stmt = select(OrganizerRequest).order_by(OrganizerRequest.created_at.desc())
    if status is not None:
        stmt = stmt.where(OrganizerRequest.status == status)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def has_pending_request_for_email(db: AsyncSession, email: str) -> bool:
    result = await db.execute(
        select(OrganizerRequest.id).where(
            OrganizerRequest.email == email,
            OrganizerRequest.status == OrganizerRequestStatus.PENDING,
        )
    )
    return result.first() is not None


async def mark_approved(
    db: AsyncSession, req: OrganizerRequest, admin_id: int
) -> OrganizerRequest:
    req.status = OrganizerRequestStatus.APPROVED
    req.reviewed_by_id = admin_id
    req.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    return req


async def mark_rejected(
    db: AsyncSession,
    req: OrganizerRequest,
    admin_id: int,
    reason: str,
) -> OrganizerRequest:
    req.status = OrganizerRequestStatus.REJECTED
    req.rejection_reason = reason
    req.reviewed_by_id = admin_id
    req.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    return req
