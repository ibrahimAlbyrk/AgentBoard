"""agent_soft_delete

Revision ID: ee033413dd02
Revises: e1f377b28c8b
Create Date: 2026-02-13 20:19:21.179973

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee033413dd02'
down_revision: Union[str, None] = 'e1f377b28c8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('agents', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('agents', 'deleted_at')
