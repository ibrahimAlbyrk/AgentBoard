"""multi_project_agents

Revision ID: 401b15316ee5
Revises: ee033413dd02
Create Date: 2026-02-13 20:21:41.667429

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '401b15316ee5'
down_revision: Union[str, None] = 'ee033413dd02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create agent_projects join table
    op.create_table(
        'agent_projects',
        sa.Column('id', sa.CHAR(32), primary_key=True),
        sa.Column('agent_id', sa.CHAR(32), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', sa.CHAR(32), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('agent_id', 'project_id', name='uq_agent_project'),
    )

    # 2. Migrate existing data: for each agent, create an agent_projects row
    conn = op.get_bind()
    agents = conn.execute(sa.text("SELECT id, project_id FROM agents WHERE project_id IS NOT NULL")).fetchall()
    for agent_id, project_id in agents:
        import uuid
        conn.execute(
            sa.text(
                "INSERT INTO agent_projects (id, agent_id, project_id, joined_at) "
                "VALUES (:id, :agent_id, :project_id, datetime('now'))"
            ),
            {"id": uuid.uuid4().hex, "agent_id": agent_id, "project_id": project_id},
        )

    # 3. Drop project_id from agents (SQLite batch mode)
    with op.batch_alter_table('agents') as batch_op:
        batch_op.drop_constraint('uq_agents_project_name', type_='unique')
        batch_op.drop_column('project_id')


def downgrade() -> None:
    # Re-add project_id column
    with op.batch_alter_table('agents') as batch_op:
        batch_op.add_column(sa.Column('project_id', sa.CHAR(32), nullable=True))

    # Migrate data back: pick first project per agent
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        "SELECT agent_id, project_id FROM agent_projects "
        "GROUP BY agent_id"
    )).fetchall()
    for agent_id, project_id in rows:
        conn.execute(
            sa.text("UPDATE agents SET project_id = :pid WHERE id = :aid"),
            {"pid": project_id, "aid": agent_id},
        )

    with op.batch_alter_table('agents') as batch_op:
        batch_op.create_foreign_key(
            'fk_agents_project_id', 'projects', ['project_id'], ['id'], ondelete='CASCADE'
        )
        batch_op.create_unique_constraint('uq_agents_project_name', ['project_id', 'name'])

    op.drop_table('agent_projects')
