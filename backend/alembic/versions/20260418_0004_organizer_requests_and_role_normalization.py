"""organizer_requests table + normalize users.role to lowercase

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-18 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = LOWER(role)")

    op.create_table(
        "organizer_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("organization", sa.String(length=255), nullable=False),
        sa.Column("organizer_type", sa.String(length=50), nullable=False),
        sa.Column("motivation", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column(
            "reviewed_by_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_organizer_requests_email"),
        "organizer_requests",
        ["email"],
    )
    op.create_index(
        op.f("ix_organizer_requests_status"),
        "organizer_requests",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_organizer_requests_status"), table_name="organizer_requests")
    op.drop_index(op.f("ix_organizer_requests_email"), table_name="organizer_requests")
    op.drop_table("organizer_requests")
