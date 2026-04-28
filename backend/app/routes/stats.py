from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user, require_role
from app.crud.event import get_event_by_id_raw
from app.database import get_db
from app.models.event import Event, EventStatus
from app.models.feedback import Feedback
from app.models.registration import Registration, RegistrationStatus
from app.models.user import User, UserRole
from app.schemas.event import OrganizerBrief
from app.schemas.stats import (
    EventStats,
    MonthlyReport,
    MonthlyReportItem,
    OrganizerReportItem,
    PlatformOverview,
)

router = APIRouter(tags=["statistics"])

DB = Annotated[AsyncSession, Depends(get_db)]
AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]
CurrentUser = Annotated[User, Depends(get_current_user)]

MONTH_NAMES = [
    "", "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
]


# ── Organizer event stats ─────────────────────────────────────────────────────

@router.get("/api/v1/events/{event_id}/stats", response_model=EventStats)
async def get_event_stats(event_id: int, current_user: CurrentUser, db: DB):
    event = await get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if current_user.role != UserRole.ADMIN and event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    # Registration counts per status
    reg_rows = await db.execute(
        select(Registration.status, func.count(Registration.id))
        .where(Registration.event_id == event_id)
        .group_by(Registration.status)
    )
    counts: dict[str, int] = {str(row[0].value): row[1] for row in reg_rows}

    confirmed  = counts.get("confirmed", 0)
    attended   = counts.get("attended", 0)
    cancelled  = counts.get("cancelled", 0)
    waitlisted = counts.get("waitlisted", 0)
    total = confirmed + attended + cancelled + waitlisted

    show_up_rate = None
    if (confirmed + attended) > 0:
        show_up_rate = round(attended / (confirmed + attended) * 100, 1)

    occupancy_rate = None
    if event.capacity and (confirmed + attended) > 0:
        occupancy_rate = round((confirmed + attended) / event.capacity * 100, 1)

    # Feedback stats
    fb_row = (
        await db.execute(
            select(func.avg(Feedback.rating), func.count(Feedback.id))
            .where(Feedback.event_id == event_id)
        )
    ).one()
    avg_raw, fb_count = fb_row

    dist_rows = await db.execute(
        select(Feedback.rating, func.count(Feedback.id))
        .where(Feedback.event_id == event_id)
        .group_by(Feedback.rating)
    )
    distribution = {int(r): c for r, c in dist_rows}

    return EventStats(
        total_registrations=total,
        confirmed=confirmed,
        attended=attended,
        cancelled=cancelled,
        waitlisted=waitlisted,
        show_up_rate=show_up_rate,
        avg_rating=round(float(avg_raw), 2) if avg_raw else None,
        feedback_count=fb_count,
        rating_distribution=distribution,
        capacity=event.capacity,
        occupancy_rate=occupancy_rate,
    )


# ── Admin reports ─────────────────────────────────────────────────────────────

@router.get("/api/v1/admin/reports/overview", response_model=PlatformOverview)
async def get_overview(_admin: AdminUser, db: DB):
    total_events = (await db.execute(select(func.count(Event.id)))).scalar_one()
    approved = (await db.execute(
        select(func.count(Event.id)).where(Event.status == EventStatus.APPROVED)
    )).scalar_one()
    pending = (await db.execute(
        select(func.count(Event.id)).where(Event.status == EventStatus.PENDING)
    )).scalar_one()
    total_regs = (await db.execute(select(func.count(Registration.id)))).scalar_one()
    total_fb = (await db.execute(select(func.count(Feedback.id)))).scalar_one()

    avg_row = (await db.execute(select(func.avg(Feedback.rating)))).scalar_one()

    total_org = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.ORGANIZER, User.is_active.is_(True))
    )).scalar_one()
    total_stu = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.STUDENT, User.is_active.is_(True))
    )).scalar_one()

    return PlatformOverview(
        total_events=total_events,
        approved_events=approved,
        pending_events=pending,
        total_registrations=total_regs,
        total_feedback=total_fb,
        avg_rating=round(float(avg_row), 2) if avg_row else None,
        total_organizers=total_org,
        total_students=total_stu,
    )


@router.get("/api/v1/admin/reports/monthly", response_model=MonthlyReport)
async def get_monthly_report(_admin: AdminUser, db: DB, year: int = 0):
    if not year:
        year = datetime.now().year

    # Events per month
    ev_rows = await db.execute(
        select(
            extract("month", Event.starts_at).label("month"),
            func.count(Event.id).label("count"),
        )
        .where(
            extract("year", Event.starts_at) == year,
            Event.status.in_([EventStatus.APPROVED, EventStatus.COMPLETED]),
        )
        .group_by("month")
        .order_by("month")
    )
    events_by_month: dict[int, int] = {int(row.month): row.count for row in ev_rows}

    # Registrations per month (via event start date)
    reg_rows = await db.execute(
        select(
            extract("month", Event.starts_at).label("month"),
            func.count(Registration.id).label("count"),
        )
        .join(Event, Registration.event_id == Event.id)
        .where(
            extract("year", Event.starts_at) == year,
            Registration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.ATTENDED]),
        )
        .group_by("month")
        .order_by("month")
    )
    regs_by_month: dict[int, int] = {int(row.month): row.count for row in reg_rows}

    months = []
    for m in range(1, 13):
        ev_count = events_by_month.get(m, 0)
        reg_count = regs_by_month.get(m, 0)
        months.append(
            MonthlyReportItem(
                month=m,
                month_name=MONTH_NAMES[m],
                events_count=ev_count,
                total_registrations=reg_count,
                avg_registrations=round(reg_count / ev_count, 1) if ev_count else None,
            )
        )

    return MonthlyReport(year=year, months=months)


@router.get("/api/v1/admin/reports/organizers", response_model=list[OrganizerReportItem])
async def get_organizer_report(_admin: AdminUser, db: DB):
    # Events count + avg rating + total participants per organizer
    rows = await db.execute(
        select(
            Event.organizer_id,
            func.count(Event.id.distinct()).label("events_count"),
            func.avg(Feedback.rating).label("avg_rating"),
            func.count(Registration.id.distinct()).label("total_participants"),
        )
        .outerjoin(Feedback, Feedback.event_id == Event.id)
        .outerjoin(
            Registration,
            and_(
                Registration.event_id == Event.id,
                Registration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.ATTENDED]),
            ),
        )
        .where(Event.status.in_([EventStatus.APPROVED, EventStatus.COMPLETED]))
        .group_by(Event.organizer_id)
        .order_by(func.count(Event.id.distinct()).desc())
    )

    results = []
    for row in rows:
        user = (await db.execute(select(User).where(User.id == row.organizer_id))).scalar_one_or_none()
        if not user:
            continue
        results.append(
            OrganizerReportItem(
                organizer=OrganizerBrief.model_validate(user),
                events_count=row.events_count,
                avg_rating=round(float(row.avg_rating), 2) if row.avg_rating else None,
                total_participants=row.total_participants,
            )
        )
    return results
