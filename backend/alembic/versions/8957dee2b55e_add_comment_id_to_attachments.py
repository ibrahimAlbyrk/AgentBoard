"""add comment_id to attachments

Revision ID: 8957dee2b55e
Revises: 6f4752221d6e
Create Date: 2026-02-08 20:52:34.688675

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8957dee2b55e'
down_revision: Union[str, None] = '6f4752221d6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('attachments') as batch_op:
        batch_op.add_column(sa.Column('comment_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_attachments_comment_id', 'comments', ['comment_id'], ['id'], ondelete='CASCADE'
        )


def downgrade() -> None:
    with op.batch_alter_table('attachments') as batch_op:
        batch_op.drop_constraint('fk_attachments_comment_id', type_='foreignkey')
        batch_op.drop_column('comment_id')
