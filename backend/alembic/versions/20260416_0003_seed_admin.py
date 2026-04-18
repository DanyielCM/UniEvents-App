"""seed admin user (no-op; handled by app.scripts.seed_admin)

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-16 00:00:01.000000

The admin user is now seeded by a dedicated Python script that reads
ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD from the environment:

    docker compose exec backend python -m app.scripts.seed_admin

This migration is kept as a no-op so alembic_version stays consistent
for environments where the original revision was already applied.
"""
from typing import Sequence, Union

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
