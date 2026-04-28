"""add cover_image_position to events

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-25 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column(
            "cover_image_position",
            sa.String(20),
            nullable=False,
            server_default="50% 50%",
        ),
    )


def downgrade() -> None:
    op.drop_column("events", "cover_image_position")
