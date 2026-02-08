"""add agents table and agent fields

Revision ID: 361e4d7144e3
Revises: 8957dee2b55e
Create Date: 2026-02-08 21:35:06.717226

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '361e4d7144e3'
down_revision: Union[str, None] = '8957dee2b55e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create agents table if not exists (init_db may have already created it)
    op.create_table(
        'agents',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'name', name='uq_agents_project_name'),
        if_not_exists=True,
    )

    # SQLite requires batch mode for adding FK columns
    with op.batch_alter_table('activity_logs') as batch_op:
        batch_op.add_column(sa.Column('agent_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_activity_logs_agent_id', 'agents', ['agent_id'], ['id'], ondelete='SET NULL'
        )

    with op.batch_alter_table('comments') as batch_op:
        batch_op.add_column(sa.Column('agent_creator_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_comments_agent_creator_id', 'agents', ['agent_creator_id'], ['id'], ondelete='SET NULL'
        )

    with op.batch_alter_table('tasks') as batch_op:
        batch_op.add_column(sa.Column('agent_assignee_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('agent_creator_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_tasks_agent_creator_id', 'agents', ['agent_creator_id'], ['id'], ondelete='SET NULL'
        )
        batch_op.create_foreign_key(
            'fk_tasks_agent_assignee_id', 'agents', ['agent_assignee_id'], ['id'], ondelete='SET NULL'
        )


def downgrade() -> None:
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.drop_constraint('fk_tasks_agent_assignee_id', type_='foreignkey')
        batch_op.drop_constraint('fk_tasks_agent_creator_id', type_='foreignkey')
        batch_op.drop_column('agent_creator_id')
        batch_op.drop_column('agent_assignee_id')

    with op.batch_alter_table('comments') as batch_op:
        batch_op.drop_constraint('fk_comments_agent_creator_id', type_='foreignkey')
        batch_op.drop_column('agent_creator_id')

    with op.batch_alter_table('activity_logs') as batch_op:
        batch_op.drop_constraint('fk_activity_logs_agent_id', type_='foreignkey')
        batch_op.drop_column('agent_id')

    op.drop_table('agents')
