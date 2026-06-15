from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from pwdlib import PasswordHash

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate

password_hash = PasswordHash.recommended()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_google_id(db: AsyncSession, google_id: str) -> User | None:
    result = await db.execute(select(User).where(User.google_id == google_id))
    return result.scalar_one_or_none()


async def get_organizers_public(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.ORGANIZER, User.is_active.is_(True))
        .order_by(User.last_name, User.first_name)
    )
    return list(result.scalars().all())


def _user_filters(
    role: UserRole | None = None,
    q: str | None = None,
    is_active: bool | None = None,
):
    conditions = []
    if role is not None:
        conditions.append(User.role == role)
    if is_active is not None:
        conditions.append(User.is_active.is_(is_active))
    if q:
        pat = f"%{q}%"
        conditions.append(
            or_(User.email.ilike(pat), User.first_name.ilike(pat), User.last_name.ilike(pat))
        )
    return conditions


async def get_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    role: UserRole | None = None,
    q: str | None = None,
    is_active: bool | None = None,
) -> list[User]:
    conditions = _user_filters(role, q, is_active)
    result = await db.execute(
        select(User)
        .where(*conditions)
        .order_by(User.last_name, User.first_name)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def count_users(
    db: AsyncSession,
    role: UserRole | None = None,
    q: str | None = None,
    is_active: bool | None = None,
) -> int:
    conditions = _user_filters(role, q, is_active)
    result = await db.execute(select(func.count(User.id)).where(*conditions))
    return result.scalar_one()


async def set_user_role(db: AsyncSession, user: User, role: UserRole) -> User:
    user.role = role
    await db.commit()
    await db.refresh(user)
    return user


async def set_user_active(db: AsyncSession, user: User, is_active: bool) -> User:
    user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return user


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    hashed = password_hash.hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        role=UserRole.ORGANIZER,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def create_organizer_with_hashed_password(
    db: AsyncSession,
    email: str,
    hashed_password: str,
    first_name: str,
    last_name: str,
    organization: str | None = None,
) -> User:
    user = User(
        email=email,
        hashed_password=hashed_password,
        first_name=first_name,
        last_name=last_name,
        organization=organization,
        role=UserRole.ORGANIZER,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def create_organizer_with_plain_password(
    db: AsyncSession,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    organization: str | None = None,
) -> User:
    return await create_organizer_with_hashed_password(
        db,
        email=email,
        hashed_password=password_hash.hash(password),
        first_name=first_name,
        last_name=last_name,
        organization=organization,
    )


async def create_student_from_google(
    db: AsyncSession,
    email: str,
    google_id: str,
    first_name: str,
    last_name: str,
) -> User:
    user = User(
        email=email,
        google_id=google_id,
        first_name=first_name,
        last_name=last_name,
        role=UserRole.STUDENT,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User | None:
    user = await get_user_by_email(db, email)
    if user is None or user.hashed_password is None:
        return None
    if not password_hash.verify(password, user.hashed_password):
        return None
    return user


async def update_user(db: AsyncSession, user: User, user_in: UserUpdate) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


async def deactivate_user(db: AsyncSession, user: User) -> User:
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return user
