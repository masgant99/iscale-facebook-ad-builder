"""Add mutation_audits table for the agentic optimization engine.

Idempotent: on fresh create_all installs the table already exists (the
baseline migration imports app.models, which now includes MutationAudit),
so guard with an inspector check and early-return.

Revision ID: d4e5f6a7b8c9
Revises: a1d2e3f4b5c6
Create Date: 2026-09-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'a1d2e3f4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("mutation_audits"):
        return  # fresh create_all DB already has the table

    op.create_table(
        "mutation_audits",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("account_id", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("campaign_id", sa.String(), nullable=True),
        sa.Column("payload_hash", sa.String(), nullable=False),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("verdict_reason", sa.String(), nullable=True),
        sa.Column("executed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("metrics", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_mutation_audits_created_at", "mutation_audits", ["created_at"])
    op.create_index("ix_mutation_audits_provider_account", "mutation_audits", ["provider", "account_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("mutation_audits"):
        return
    op.drop_index("ix_mutation_audits_provider_account", table_name="mutation_audits")
    op.drop_index("ix_mutation_audits_created_at", table_name="mutation_audits")
    op.drop_table("mutation_audits")
