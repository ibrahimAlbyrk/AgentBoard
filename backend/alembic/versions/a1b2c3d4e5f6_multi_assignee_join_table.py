"""multi_assignee_join_table

Revision ID: a1b2c3d4e5f6
Revises: 13783ce73251
Create Date: 2026-02-08 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '13783ce73251'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    # Create task_assignees table if it doesn't exist yet
    if 'task_assignees' not in existing_tables:
        op.create_table(
            'task_assignees',
            sa.Column('id', sa.Uuid(), nullable=False),
            sa.Column('task_id', sa.Uuid(), nullable=False),
            sa.Column('user_id', sa.Uuid(), nullable=True),
            sa.Column('agent_id', sa.Uuid(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('task_id', 'user_id', name='uq_task_assignee_user'),
            sa.UniqueConstraint('task_id', 'agent_id', name='uq_task_assignee_agent'),
        )

    # Check if old columns still exist (init_db may have already recreated without them)
    task_columns = [c['name'] for c in inspector.get_columns('tasks')]
    has_old_columns = 'assignee_id' in task_columns

    if has_old_columns:
        # Migrate existing single-assignee data into the join table
        op.execute("""
            INSERT INTO task_assignees (id, task_id, user_id, created_at)
            SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
                   id, assignee_id, created_at
            FROM tasks WHERE assignee_id IS NOT NULL
        """)
        op.execute("""
            INSERT INTO task_assignees (id, task_id, agent_id, created_at)
            SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
                   id, agent_assignee_id, created_at
            FROM tasks WHERE agent_assignee_id IS NOT NULL
        """)

        # Drop old columns using batch_op for SQLite compatibility
        with op.batch_alter_table('tasks') as batch_op:
            batch_op.drop_column('assignee_id')
            batch_op.drop_column('agent_assignee_id')


def downgrade() -> None:
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.add_column(sa.Column('assignee_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('agent_assignee_id', sa.Uuid(), nullable=True))

    op.execute("""
        UPDATE tasks SET assignee_id = (
            SELECT user_id FROM task_assignees
            WHERE task_assignees.task_id = tasks.id AND user_id IS NOT NULL
            LIMIT 1
        )
    """)
    op.execute("""
        UPDATE tasks SET agent_assignee_id = (
            SELECT agent_id FROM task_assignees
            WHERE task_assignees.task_id = tasks.id AND agent_id IS NOT NULL
            LIMIT 1
        )
    """)

    op.drop_table('task_assignees')
