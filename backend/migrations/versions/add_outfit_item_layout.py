"""Add spatial layout columns to outfit_items for the drag-and-drop builder.

Revision ID: b7f2a1c9d3e5
Revises: c1a2b3d4e5f6
Create Date: 2026-07-23
"""

import sqlalchemy as sa
from alembic import op

revision: str = "b7f2a1c9d3e5"
down_revision: str | None = "c1a2b3d4e5f6"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "outfit_items",
        sa.Column("pos_x", sa.Float(), nullable=True),
    )
    op.add_column(
        "outfit_items",
        sa.Column("pos_y", sa.Float(), nullable=True),
    )
    op.add_column(
        "outfit_items",
        sa.Column(
            "scale",
            sa.Float(),
            nullable=False,
            server_default="1.0",
        ),
    )
    op.add_column(
        "outfit_items",
        sa.Column(
            "rotation",
            sa.Float(),
            nullable=False,
            server_default="0.0",
        ),
    )
    op.add_column(
        "outfit_items",
        sa.Column(
            "z_index",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("outfit_items", "z_index")
    op.drop_column("outfit_items", "rotation")
    op.drop_column("outfit_items", "scale")
    op.drop_column("outfit_items", "pos_y")
    op.drop_column("outfit_items", "pos_x")
