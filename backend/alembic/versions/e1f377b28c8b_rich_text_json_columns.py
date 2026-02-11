"""rich text json columns

Revision ID: e1f377b28c8b
Revises: 77e4ecdbed6d
Create Date: 2026-02-11 23:26:35.388034

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f377b28c8b'
down_revision: Union[str, None] = '77e4ecdbed6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _text_to_tiptap_json(text: str | None) -> str | None:
    """Convert plain text to Tiptap JSON doc string."""
    if not text:
        return None
    lines = text.split("\n")
    content = []
    for line in lines:
        if line.strip():
            content.append({"type": "paragraph", "content": [{"type": "text", "text": line}]})
        else:
            content.append({"type": "paragraph"})
    return json.dumps({"type": "doc", "content": content})


def upgrade() -> None:
    # Add new columns first
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.add_column(sa.Column('description_text', sa.Text(), nullable=True))

    with op.batch_alter_table('comments') as batch_op:
        batch_op.add_column(sa.Column('content_text', sa.Text(), nullable=False, server_default=''))

    # Migrate existing data: copy text to _text columns, convert text to JSON
    conn = op.get_bind()

    # Tasks: copy description -> description_text, convert description to JSON
    tasks = conn.execute(sa.text("SELECT id, description FROM tasks WHERE description IS NOT NULL"))
    for row in tasks:
        task_id, desc = row
        if desc:
            # desc might already be JSON (if re-running), try to parse
            try:
                parsed = json.loads(desc) if isinstance(desc, str) else desc
                if isinstance(parsed, dict) and parsed.get("type") == "doc":
                    # Already JSON, just set description_text
                    plain = _extract_plain(parsed)
                    conn.execute(
                        sa.text("UPDATE tasks SET description_text = :text WHERE id = :id"),
                        {"text": plain, "id": task_id},
                    )
                    continue
            except (json.JSONDecodeError, TypeError):
                pass

            # Plain text: convert to JSON and set _text
            json_doc = _text_to_tiptap_json(desc)
            conn.execute(
                sa.text("UPDATE tasks SET description = :doc, description_text = :text WHERE id = :id"),
                {"doc": json_doc, "text": desc, "id": task_id},
            )

    # Comments: copy content -> content_text, convert content to JSON
    comments = conn.execute(sa.text("SELECT id, content FROM comments"))
    for row in comments:
        comment_id, content = row
        if content:
            try:
                parsed = json.loads(content) if isinstance(content, str) else content
                if isinstance(parsed, dict) and parsed.get("type") == "doc":
                    plain = _extract_plain(parsed)
                    conn.execute(
                        sa.text("UPDATE comments SET content_text = :text WHERE id = :id"),
                        {"text": plain, "id": comment_id},
                    )
                    continue
            except (json.JSONDecodeError, TypeError):
                pass

            json_doc = _text_to_tiptap_json(content)
            conn.execute(
                sa.text("UPDATE comments SET content = :doc, content_text = :text WHERE id = :id"),
                {"doc": json_doc, "text": content, "id": comment_id},
            )


def _extract_plain(doc: dict) -> str:
    """Simple plain-text extraction for migration."""
    parts = []
    def walk(node):
        if node.get("type") == "text":
            parts.append(node.get("text", ""))
        elif node.get("type") == "mention":
            parts.append(node.get("attrs", {}).get("label", ""))
        for child in node.get("content", []):
            walk(child)
    walk(doc)
    return " ".join(parts).strip()


def downgrade() -> None:
    # Convert JSON back to text
    conn = op.get_bind()

    tasks = conn.execute(sa.text("SELECT id, description, description_text FROM tasks WHERE description IS NOT NULL"))
    for row in tasks:
        task_id, desc, desc_text = row
        if desc_text:
            conn.execute(
                sa.text("UPDATE tasks SET description = :text WHERE id = :id"),
                {"text": desc_text, "id": task_id},
            )

    comments = conn.execute(sa.text("SELECT id, content, content_text FROM comments"))
    for row in comments:
        comment_id, content, content_text = row
        if content_text:
            conn.execute(
                sa.text("UPDATE comments SET content = :text WHERE id = :id"),
                {"text": content_text, "id": comment_id},
            )

    with op.batch_alter_table('tasks') as batch_op:
        batch_op.drop_column('description_text')

    with op.batch_alter_table('comments') as batch_op:
        batch_op.drop_column('content_text')
