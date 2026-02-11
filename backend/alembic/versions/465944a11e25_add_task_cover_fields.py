"""add task cover fields

Revision ID: 465944a11e25
Revises: a1b2c3d4e5f6
Create Date: 2026-02-11 22:45:34.314651

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '465944a11e25'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.add_column(sa.Column('cover_type', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('cover_value', sa.String(500), nullable=True))
        batch_op.add_column(sa.Column('cover_size', sa.String(10), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.drop_column('cover_size')
        batch_op.drop_column('cover_value')
        batch_op.drop_column('cover_type')
