"""agent_auth

Revision ID: ca0addd2be8e
Revises: 401b15316ee5
Create Date: 2026-02-13 20:24:29.643026

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca0addd2be8e'
down_revision: Union[str, None] = '401b15316ee5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('api_keys') as batch_op:
        batch_op.add_column(sa.Column('agent_id', sa.CHAR(32), nullable=True))
        batch_op.create_foreign_key(
            'fk_api_keys_agent_id', 'agents', ['agent_id'], ['id'], ondelete='SET NULL'
        )


def downgrade() -> None:
    with op.batch_alter_table('api_keys') as batch_op:
        batch_op.drop_constraint('fk_api_keys_agent_id', type_='foreignkey')
        batch_op.drop_column('agent_id')
