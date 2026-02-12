# 05 — Voting & Reactions System

> Unified emoji reaction + voting system for tasks and comments.

---

## 1. Overview

### Summary

Add emoji reactions to tasks and comments, and reuse the thumbs-up reaction as the voting/prioritization mechanism. A single `Reaction` model serves both purposes — no separate Vote table needed (DRY).

### User Stories

- As a user, I can react to a task or comment with an emoji to express sentiment.
- As a user, I can see who reacted with each emoji via hover tooltip.
- As a user, I can toggle my reaction on/off with a single click.
- As a user, I can add multiple different reactions to the same entity.
- As a user, I can vote on a task by clicking a dedicated Vote button (shortcut for thumbs-up).
- As a user, I can sort/filter tasks by vote count on the board.
- As a user, I receive a notification when someone reacts to my task or comment.
- As an agent, I can react to tasks/comments via API (`X-API-Key` auth).

### Why Unified

The thumbs-up reaction on a task IS the vote. `vote_count = count of thumbs-up reactions`. This avoids a second model/table/API and keeps the data model simple. A prominent "Vote" button in the UI is just a styled shortcut for toggling the thumbs-up reaction.

---

## 2. Data Model

### `Reaction` table

```
Table: reactions

id              UUID        PK, default uuid4
entity_type     String(20)  NOT NULL  — "task" | "comment"
entity_id       UUID        NOT NULL  — FK to tasks.id or comments.id (logical, not enforced FK)
emoji           String(32)  NOT NULL  — emoji character (e.g., "👍") or shortcode
user_id         UUID        FK -> users.id, CASCADE, nullable
agent_id        UUID        FK -> agents.id, CASCADE, nullable
created_at      DateTime    NOT NULL, default utcnow
```

### Constraints

```sql
-- One reaction per emoji per user per entity
UniqueConstraint('entity_type', 'entity_id', 'emoji', 'user_id',
                 name='uq_reaction_entity_emoji_user')

-- One reaction per emoji per agent per entity
UniqueConstraint('entity_type', 'entity_id', 'emoji', 'agent_id',
                 name='uq_reaction_entity_emoji_agent')

-- Fast lookups: all reactions for an entity
Index('ix_reactions_entity', 'entity_type', 'entity_id')
```

### Relationships

```python
user  = relationship("User", foreign_keys=[user_id])
agent = relationship("Agent", foreign_keys=[agent_id])
```

### Why no FK to tasks/comments?

`entity_id` is a polymorphic reference — it points to either `tasks.id` or `comments.id` depending on `entity_type`. Using a single column avoids duplicating the model. Orphan cleanup on task/comment deletion is handled via cascade in the application layer (delete reactions when deleting tasks/comments) or via a DB trigger. Since tasks already cascade-delete their comments and attachments in SQLAlchemy, we add the same pattern for reactions.

### SQLAlchemy Model

```python
# backend/app/models/reaction.py

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint(
            "entity_type", "entity_id", "emoji", "user_id",
            name="uq_reaction_entity_emoji_user",
        ),
        UniqueConstraint(
            "entity_type", "entity_id", "emoji", "agent_id",
            name="uq_reaction_entity_emoji_agent",
        ),
        Index("ix_reactions_entity", "entity_type", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(20))  # "task" | "comment"
    entity_id: Mapped[uuid.UUID] = mapped_column()
    emoji: Mapped[str] = mapped_column(String(32))
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    user = relationship("User", foreign_keys=[user_id])
    agent = relationship("Agent", foreign_keys=[agent_id])
```

---

## 3. Database Migration

### Alembic migration file

Create via `alembic revision --autogenerate -m "add reactions table"` after adding the model and registering it in `models/__init__.py`.

**Manual migration** (pattern matching `13783ce73251_add_task_watchers_table.py`):

```python
# backend/alembic/versions/XXXX_add_reactions_table.py

def upgrade() -> None:
    op.create_table(
        'reactions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('entity_type', sa.String(20), nullable=False),
        sa.Column('entity_id', sa.Uuid(), nullable=False),
        sa.Column('emoji', sa.String(32), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=True),
        sa.Column('agent_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'entity_type', 'entity_id', 'emoji', 'user_id',
            name='uq_reaction_entity_emoji_user',
        ),
        sa.UniqueConstraint(
            'entity_type', 'entity_id', 'emoji', 'agent_id',
            name='uq_reaction_entity_emoji_agent',
        ),
    )
    op.create_index(
        'ix_reactions_entity', 'reactions',
        ['entity_type', 'entity_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_reactions_entity', table_name='reactions')
    op.drop_table('reactions')
```

### Registration

Add to `backend/app/models/__init__.py`:

```python
from app.models.reaction import Reaction
# Add "Reaction" to __all__
```

---

## 4. Backend API

All reaction endpoints live in a new route module `backend/app/api/v1/reactions.py`.

### Task Reactions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/projects/{project_id}/boards/{board_id}/tasks/{task_id}/reactions` | board access | Add reaction to task |
| `DELETE` | `/projects/{project_id}/boards/{board_id}/tasks/{task_id}/reactions/{emoji}` | board access | Remove your reaction from task |
| `GET` | `/projects/{project_id}/boards/{board_id}/tasks/{task_id}/reactions` | board access | Get grouped reactions for task |

### Comment Reactions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}/reactions` | board access | Add reaction to comment |
| `DELETE` | `/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}/reactions/{emoji}` | board access | Remove your reaction from comment |
| `GET` | `/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}/reactions` | board access | Get grouped reactions for comment |

### Toggle Endpoint (convenience)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `.../{entity}/reactions/toggle` | board access | Toggle reaction (add if absent, remove if present). Returns the new state. |

This is a convenience for the frontend's toggle behavior — avoids needing to know current state before deciding POST vs DELETE.

### Request/Response Schemas

```python
# backend/app/schemas/reaction.py

class ReactionCreate(BaseModel):
    emoji: str = Field(min_length=1, max_length=32)
    agent_id: UUID | None = None  # for agent-authored reactions

class ReactionToggle(BaseModel):
    emoji: str = Field(min_length=1, max_length=32)
    agent_id: UUID | None = None

class ReactorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user: UserBrief | None = None
    agent: AgentBrief | None = None

class ReactionGroup(BaseModel):
    """One emoji group: the emoji, its count, whether current user reacted, and who reacted."""
    emoji: str
    count: int
    reacted_by_me: bool = False
    reactors: list[ReactorBrief] = []

class ReactionSummary(BaseModel):
    """All reactions for an entity, grouped by emoji."""
    groups: list[ReactionGroup] = []
    total: int = 0

class ToggleResult(BaseModel):
    action: str  # "added" | "removed"
    emoji: str
    summary: ReactionSummary
```

### Route Implementation Pattern

```python
# backend/app/api/v1/reactions.py

task_router = APIRouter(
    prefix="/projects/{project_id}/boards/{board_id}/tasks/{task_id}/reactions",
    tags=["Reactions"],
)

comment_router = APIRouter(
    prefix="/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}/reactions",
    tags=["Reactions"],
)

@task_router.post("/toggle", response_model=ResponseBase[ToggleResult])
async def toggle_task_reaction(
    task_id: UUID,
    body: ReactionToggle,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    result = await ReactionService.toggle_reaction(
        db,
        entity_type="task",
        entity_id=task_id,
        emoji=body.emoji,
        user_id=current_user.id,
        agent_id=body.agent_id,
    )
    # Broadcast via WebSocket
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "reaction.updated",
        "entity_type": "task",
        "entity_id": str(task_id),
        "data": result.summary.model_dump(mode="json"),
        "user": {"id": str(current_user.id), "username": current_user.username},
    })
    # Notify task owner if reaction was added (not removed)
    if result.action == "added":
        await ReactionService.notify_reaction(
            db, entity_type="task", entity_id=task_id,
            emoji=body.emoji, actor_id=current_user.id,
            project_id=board.project_id, board_id=board.id,
        )
    return ResponseBase(data=result)
```

### Router Registration

In `backend/app/main.py`:

```python
from app.api.v1 import reactions
# ...
app.include_router(reactions.task_router, prefix="/api/v1")
app.include_router(reactions.comment_router, prefix="/api/v1")
```

---

## 5. Service Layer

### `ReactionService` — `backend/app/services/reaction_service.py`

```python
class ReactionService:

    @staticmethod
    async def toggle_reaction(
        db: AsyncSession,
        entity_type: str,
        entity_id: UUID,
        emoji: str,
        user_id: UUID,
        agent_id: UUID | None = None,
    ) -> ToggleResult:
        """Add reaction if absent, remove if present. Returns action + updated summary."""
        existing = await crud_reaction.find_reaction(
            db, entity_type, entity_id, emoji,
            user_id=user_id if not agent_id else None,
            agent_id=agent_id,
        )
        if existing:
            await db.delete(existing)
            await db.flush()
            action = "removed"
        else:
            reaction = Reaction(
                entity_type=entity_type,
                entity_id=entity_id,
                emoji=emoji,
                user_id=user_id if not agent_id else None,
                agent_id=agent_id,
            )
            db.add(reaction)
            await db.flush()
            action = "added"

        summary = await crud_reaction.get_summary(
            db, entity_type, entity_id, current_user_id=user_id
        )
        return ToggleResult(action=action, emoji=emoji, summary=summary)

    @staticmethod
    async def get_summary(
        db: AsyncSession,
        entity_type: str,
        entity_id: UUID,
        current_user_id: UUID | None = None,
    ) -> ReactionSummary:
        return await crud_reaction.get_summary(
            db, entity_type, entity_id, current_user_id
        )

    @staticmethod
    async def notify_reaction(
        db: AsyncSession,
        entity_type: str,
        entity_id: UUID,
        emoji: str,
        actor_id: UUID,
        project_id: UUID,
        board_id: UUID,
    ) -> None:
        """Notify the task creator or comment author when someone reacts."""
        if entity_type == "task":
            task = await crud_task.get(db, entity_id)
            if not task or task.creator_id == actor_id:
                return
            actor = await crud_user.get(db, actor_id)
            actor_name = (actor.full_name or actor.username) if actor else "Someone"
            await NotificationService.create_notification(
                db,
                user_id=task.creator_id,
                actor_id=actor_id,
                project_id=project_id,
                type="task_reaction",
                title="Reaction on Task",
                message=f'{actor_name} reacted {emoji} to "{task.title}"',
                data={"task_id": str(entity_id), "board_id": str(board_id)},
            )
        elif entity_type == "comment":
            comment = await crud_comment.get(db, entity_id)
            if not comment or comment.user_id == actor_id:
                return
            actor = await crud_user.get(db, actor_id)
            actor_name = (actor.full_name or actor.username) if actor else "Someone"
            preview = comment.content[:50] + ("..." if len(comment.content) > 50 else "")
            await NotificationService.create_notification(
                db,
                user_id=comment.user_id,
                actor_id=actor_id,
                project_id=project_id,
                type="task_reaction",
                title="Reaction on Comment",
                message=f'{actor_name} reacted {emoji} to your comment: "{preview}"',
                data={"task_id": str(comment.task_id), "board_id": str(board_id)},
            )

    @staticmethod
    async def delete_reactions_for_entity(
        db: AsyncSession, entity_type: str, entity_id: UUID
    ) -> None:
        """Bulk-delete all reactions for a deleted task or comment."""
        await crud_reaction.delete_by_entity(db, entity_type, entity_id)
```

### `CRUDReaction` — `backend/app/crud/reaction.py`

```python
class CRUDReaction(CRUDBase[Reaction, ReactionCreate, ReactionCreate]):

    async def find_reaction(
        self, db, entity_type, entity_id, emoji,
        user_id=None, agent_id=None,
    ) -> Reaction | None:
        """Find existing reaction by exact match."""
        q = select(Reaction).where(
            Reaction.entity_type == entity_type,
            Reaction.entity_id == entity_id,
            Reaction.emoji == emoji,
        )
        if user_id:
            q = q.where(Reaction.user_id == user_id)
        if agent_id:
            q = q.where(Reaction.agent_id == agent_id)
        result = await db.execute(q)
        return result.scalar_one_or_none()

    async def get_by_entity(
        self, db, entity_type: str, entity_id: UUID
    ) -> list[Reaction]:
        """All reactions for an entity, with user/agent loaded."""
        q = (
            select(Reaction)
            .options(selectinload(Reaction.user), selectinload(Reaction.agent))
            .where(
                Reaction.entity_type == entity_type,
                Reaction.entity_id == entity_id,
            )
            .order_by(Reaction.created_at)
        )
        result = await db.execute(q)
        return list(result.scalars().all())

    async def get_summary(
        self, db, entity_type: str, entity_id: UUID,
        current_user_id: UUID | None = None,
    ) -> ReactionSummary:
        """Group reactions by emoji with counts and reactor info."""
        reactions = await self.get_by_entity(db, entity_type, entity_id)
        groups: dict[str, ReactionGroup] = {}
        for r in reactions:
            if r.emoji not in groups:
                groups[r.emoji] = ReactionGroup(emoji=r.emoji, count=0)
            g = groups[r.emoji]
            g.count += 1
            g.reactors.append(ReactorBrief(
                user=UserBrief.model_validate(r.user) if r.user else None,
                agent=AgentBrief.model_validate(r.agent) if r.agent else None,
            ))
            if current_user_id and r.user_id == current_user_id:
                g.reacted_by_me = True

        return ReactionSummary(
            groups=sorted(groups.values(), key=lambda g: g.count, reverse=True),
            total=sum(g.count for g in groups.values()),
        )

    async def get_summaries_batch(
        self, db, entity_type: str, entity_ids: list[UUID],
        current_user_id: UUID | None = None,
    ) -> dict[UUID, ReactionSummary]:
        """Batch-load reaction summaries for multiple entities (avoids N+1)."""
        q = (
            select(Reaction)
            .options(selectinload(Reaction.user), selectinload(Reaction.agent))
            .where(
                Reaction.entity_type == entity_type,
                Reaction.entity_id.in_(entity_ids),
            )
            .order_by(Reaction.created_at)
        )
        result = await db.execute(q)
        reactions = list(result.scalars().all())

        # Group by entity_id, then by emoji
        by_entity: dict[UUID, list[Reaction]] = {}
        for r in reactions:
            by_entity.setdefault(r.entity_id, []).append(r)

        summaries = {}
        for eid in entity_ids:
            entity_reactions = by_entity.get(eid, [])
            groups: dict[str, ReactionGroup] = {}
            for r in entity_reactions:
                if r.emoji not in groups:
                    groups[r.emoji] = ReactionGroup(emoji=r.emoji, count=0)
                g = groups[r.emoji]
                g.count += 1
                g.reactors.append(ReactorBrief(
                    user=UserBrief.model_validate(r.user) if r.user else None,
                    agent=AgentBrief.model_validate(r.agent) if r.agent else None,
                ))
                if current_user_id and r.user_id == current_user_id:
                    g.reacted_by_me = True
            summaries[eid] = ReactionSummary(
                groups=sorted(groups.values(), key=lambda g: g.count, reverse=True),
                total=sum(g.count for g in groups.values()),
            )
        return summaries

    async def delete_by_entity(
        self, db, entity_type: str, entity_id: UUID
    ) -> None:
        """Delete all reactions for an entity (used on task/comment deletion)."""
        q = delete(Reaction).where(
            Reaction.entity_type == entity_type,
            Reaction.entity_id == entity_id,
        )
        await db.execute(q)
        await db.flush()

    async def count_emoji_for_entity(
        self, db, entity_type: str, entity_id: UUID, emoji: str
    ) -> int:
        """Count reactions of a specific emoji (used for vote count)."""
        q = select(func.count()).where(
            Reaction.entity_type == entity_type,
            Reaction.entity_id == entity_id,
            Reaction.emoji == emoji,
        )
        result = await db.execute(q)
        return result.scalar_one()


crud_reaction = CRUDReaction(Reaction)
```

### Reaction Cleanup on Deletion

In `task_service.py` `delete_task` flow and `comments.py` `delete_comment` handler, call:

```python
await ReactionService.delete_reactions_for_entity(db, "task", task_id)
# or
await ReactionService.delete_reactions_for_entity(db, "comment", comment_id)
```

### Notification Preference Integration

Add `task_reaction: bool = True` to `NotificationPreferences` in `backend/app/schemas/notification.py`. This lets users disable reaction notifications independently.

### Vote Count Helper

For sorting/filtering tasks by votes, add to `CRUDReaction`:

```python
async def get_vote_counts(
    self, db, task_ids: list[UUID]
) -> dict[UUID, int]:
    """Get thumbs-up counts for multiple tasks (for sort/filter)."""
    q = (
        select(Reaction.entity_id, func.count())
        .where(
            Reaction.entity_type == "task",
            Reaction.entity_id.in_(task_ids),
            Reaction.emoji == "\U0001f44d",  # thumbs-up
        )
        .group_by(Reaction.entity_id)
    )
    result = await db.execute(q)
    return dict(result.all())
```

---

## 6. Frontend Types

### `frontend/src/types/reaction.ts`

```typescript
import type { UserBrief } from './user'
import type { AgentBrief } from './agent'

export interface ReactorBrief {
  user: UserBrief | null
  agent: AgentBrief | null
}

export interface ReactionGroup {
  emoji: string
  count: number
  reacted_by_me: boolean
  reactors: ReactorBrief[]
}

export interface ReactionSummary {
  groups: ReactionGroup[]
  total: number
}

export interface ToggleResult {
  action: 'added' | 'removed'
  emoji: string
  summary: ReactionSummary
}
```

### Update `frontend/src/types/task.ts`

Add to the `Task` interface:

```typescript
export interface Task {
  // ... existing fields ...
  reactions?: ReactionSummary
}
```

### Update `frontend/src/types/task.ts`

Add to the `Comment` interface:

```typescript
export interface Comment {
  // ... existing fields ...
  reactions?: ReactionSummary
}
```

### Re-export from `frontend/src/types/index.ts`

```typescript
export type * from './reaction'
```

---

## 7. Frontend Hooks

### `frontend/src/hooks/useReactions.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { ReactionSummary, ToggleResult } from '@/types'

// Query: fetch reaction summary for a task
export function useTaskReactions(
  projectId: string, boardId: string, taskId: string
) {
  return useQuery({
    queryKey: ['reactions', 'task', taskId],
    queryFn: () => api.getTaskReactions(projectId, boardId, taskId),
    enabled: !!projectId && !!boardId && !!taskId,
  })
}

// Query: fetch reaction summary for a comment
export function useCommentReactions(
  projectId: string, boardId: string, taskId: string, commentId: string
) {
  return useQuery({
    queryKey: ['reactions', 'comment', commentId],
    queryFn: () => api.getCommentReactions(projectId, boardId, taskId, commentId),
    enabled: !!commentId,
  })
}

// Mutation: toggle reaction on task (optimistic)
export function useToggleTaskReaction(
  projectId: string, boardId: string, taskId: string
) {
  const qc = useQueryClient()
  const queryKey = ['reactions', 'task', taskId]

  return useMutation({
    mutationFn: (emoji: string) =>
      api.toggleTaskReaction(projectId, boardId, taskId, { emoji }),

    // Optimistic update
    onMutate: async (emoji: string) => {
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<{ data: ReactionSummary }>(queryKey)

      if (prev?.data) {
        const groups = [...prev.data.groups]
        const idx = groups.findIndex(g => g.emoji === emoji)
        if (idx >= 0) {
          const g = { ...groups[idx] }
          if (g.reacted_by_me) {
            g.count -= 1
            g.reacted_by_me = false
            if (g.count <= 0) {
              groups.splice(idx, 1)
            } else {
              groups[idx] = g
            }
          } else {
            g.count += 1
            g.reacted_by_me = true
            groups[idx] = g
          }
        } else {
          groups.push({ emoji, count: 1, reacted_by_me: true, reactors: [] })
        }

        qc.setQueryData(queryKey, {
          ...prev,
          data: {
            groups,
            total: groups.reduce((s, g) => s + g.count, 0),
          },
        })
      }

      return { prev }
    },

    onError: (_err, _emoji, context) => {
      if (context?.prev) qc.setQueryData(queryKey, context.prev)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey })
    },
  })
}

// Mutation: toggle reaction on comment (optimistic)
export function useToggleCommentReaction(
  projectId: string, boardId: string, taskId: string, commentId: string
) {
  const qc = useQueryClient()
  const queryKey = ['reactions', 'comment', commentId]

  return useMutation({
    mutationFn: (emoji: string) =>
      api.toggleCommentReaction(projectId, boardId, taskId, commentId, { emoji }),

    onMutate: async (emoji: string) => {
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<{ data: ReactionSummary }>(queryKey)
      // Same optimistic logic as task toggle above
      // (extract to shared helper to avoid duplication)
      return { prev }
    },

    onError: (_err, _emoji, context) => {
      if (context?.prev) qc.setQueryData(queryKey, context.prev)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey })
    },
  })
}
```

### API Client Additions

Add to `frontend/src/lib/api-client.ts`:

```typescript
// Reactions — Tasks
async getTaskReactions(projectId: string, boardId: string, taskId: string) {
  return this.request<APIResponse<ReactionSummary>>(
    `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/reactions`
  )
}

async toggleTaskReaction(
  projectId: string, boardId: string, taskId: string,
  data: { emoji: string; agent_id?: string }
) {
  return this.request<APIResponse<ToggleResult>>(
    `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/reactions/toggle`,
    { method: 'POST', body: JSON.stringify(data) }
  )
}

// Reactions — Comments
async getCommentReactions(
  projectId: string, boardId: string, taskId: string, commentId: string
) {
  return this.request<APIResponse<ReactionSummary>>(
    `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments/${commentId}/reactions`
  )
}

async toggleCommentReaction(
  projectId: string, boardId: string, taskId: string, commentId: string,
  data: { emoji: string; agent_id?: string }
) {
  return this.request<APIResponse<ToggleResult>>(
    `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments/${commentId}/reactions/toggle`,
    { method: 'POST', body: JSON.stringify(data) }
  )
}
```

---

## 8. ReactionBar Component

### `frontend/src/components/reactions/ReactionBar.tsx`

Reusable for both tasks and comments.

### Props

```typescript
interface ReactionBarProps {
  entityType: 'task' | 'comment'
  entityId: string
  projectId: string
  boardId: string
  taskId: string        // needed for URL construction
  commentId?: string    // only for comment reactions
  compact?: boolean     // smaller chips for TaskCard
}
```

### Internal State

- Fetches reactions via `useTaskReactions` or `useCommentReactions`
- Uses `useToggleTaskReaction` or `useToggleCommentReaction` for toggle
- Manages emoji picker open/closed state

### Visual Structure

```
[existing-reactions]  [+ button]

Where each existing reaction is:
  [ emoji count ]   ← chip, highlighted if reacted_by_me
```

### Interaction Flow

1. **Click existing chip** -> calls `toggleReaction.mutate(emoji)` -> optimistic update
2. **Click "+"** -> opens EmojiPicker popup
3. **Select emoji from picker** -> calls `toggleReaction.mutate(selectedEmoji)` -> closes picker
4. **Hover chip** -> shows Tooltip with reactor names

### Component Sketch

```tsx
export function ReactionBar({ entityType, entityId, projectId, boardId, taskId, commentId, compact }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  // Select the right hook based on entityType
  const reactionsQuery = entityType === 'task'
    ? useTaskReactions(projectId, boardId, taskId)
    : useCommentReactions(projectId, boardId, taskId, commentId!)

  const toggle = entityType === 'task'
    ? useToggleTaskReaction(projectId, boardId, taskId)
    : useToggleCommentReaction(projectId, boardId, taskId, commentId!)

  const summary = reactionsQuery.data?.data
  if (!summary && !pickerOpen) return null // hide when no reactions and no picker

  return (
    <div className="flex items-center flex-wrap gap-1.5">
      <AnimatePresence mode="popLayout">
        {summary?.groups.map(group => (
          <motion.div key={group.emoji} layout /* ... animation props */>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggle.mutate(group.emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
                    group.reacted_by_me
                      ? "bg-[var(--accent-muted-bg)] border-[var(--accent-solid)] text-[var(--accent-solid)]"
                      : "bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]",
                    compact && "text-[10px] px-1.5 py-0"
                  )}
                >
                  <span>{group.emoji}</span>
                  <span className="font-medium tabular-nums">{group.count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <ReactorTooltip reactors={group.reactors} emoji={group.emoji} />
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add reaction button */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button className="size-6 rounded-full flex items-center justify-center border border-dashed ...">
            <SmilePlus className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent ...>
          <EmojiPicker onSelect={(emoji) => {
            toggle.mutate(emoji)
            setPickerOpen(false)
          }} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

---

## 9. Emoji Picker Component

### Library Choice: Built-in Lightweight Picker

Rather than importing a heavy library like `emoji-mart` (~400KB), build a lightweight custom picker with the 8 quick-reaction emojis plus categorized full grid. The app already uses `cmdk` (command menu) which provides search infrastructure.

### `frontend/src/components/reactions/EmojiPicker.tsx`

### Structure

```
[Quick reactions row: 8 core emojis]
[Search input]
[Category tabs: Smileys | People | Nature | Food | Activities | Objects | Symbols]
[Emoji grid - scrollable]
[Recently used row]
```

### Core Emoji Set (Quick Reactions)

```typescript
export const QUICK_REACTIONS = [
  { emoji: '\u{1F44D}', label: 'Thumbs Up' },     // 👍
  { emoji: '\u{1F44E}', label: 'Thumbs Down' },    // 👎
  { emoji: '\u{2764}\u{FE0F}', label: 'Heart' },   // ❤️
  { emoji: '\u{1F389}', label: 'Celebration' },     // 🎉
  { emoji: '\u{1F680}', label: 'Rocket' },          // 🚀
  { emoji: '\u{1F440}', label: 'Eyes' },            // 👀
  { emoji: '\u{1F525}', label: 'Fire' },            // 🔥
  { emoji: '\u{1F615}', label: 'Confused' },        // 😕
] as const
```

### Full Emoji Data

Use a static JSON file with ~300 commonly used emojis organized by category. This keeps the bundle small (~15KB gzipped) vs emoji-mart's ~400KB. The file lives at `frontend/src/data/emojis.json`.

### Recently Used

Store in `localStorage` key `agentboard-recent-emojis` (max 16 entries). Read on mount, update on select.

### Search

Filter emojis by name/keywords. Use the search input at the top of the picker.

### Props

```typescript
interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}
```

---

## 10. Vote Button

### Design

A dedicated Vote button displayed prominently in `TaskDetailPanel`, just below the title area. It is a styled shortcut for toggling the thumbs-up reaction.

### `frontend/src/components/reactions/VoteButton.tsx`

```typescript
interface VoteButtonProps {
  projectId: string
  boardId: string
  taskId: string
}
```

### Visual

```
[ 👍  Vote  3 ]      ← when not voted by me
[ 👍  Voted  3 ]     ← when voted, accent highlight
```

### Implementation

```tsx
export function VoteButton({ projectId, boardId, taskId }: VoteButtonProps) {
  const { data } = useTaskReactions(projectId, boardId, taskId)
  const toggle = useToggleTaskReaction(projectId, boardId, taskId)

  const thumbsGroup = data?.data?.groups.find(g => g.emoji === '\u{1F44D}')
  const voted = thumbsGroup?.reacted_by_me ?? false
  const count = thumbsGroup?.count ?? 0

  return (
    <motion.button
      onClick={() => toggle.mutate('\u{1F44D}')}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200",
        voted
          ? "bg-[var(--accent-muted-bg)] border-[var(--accent-solid)] text-[var(--accent-solid)]"
          : "bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-foreground"
      )}
    >
      <span className="text-base">{'\u{1F44D}'}</span>
      <span>{voted ? 'Voted' : 'Vote'}</span>
      {count > 0 && (
        <span className="ml-0.5 bg-[var(--elevated)] px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums">
          {count}
        </span>
      )}
    </motion.button>
  )
}
```

---

## 11. UI Design

### Reaction Chips

- **Shape**: Rounded pill (`rounded-full`)
- **Size**: `px-2 py-0.5` normal, `px-1.5 py-0` compact (TaskCard)
- **Background inactive**: `bg-[var(--surface)]` with `border-[var(--border-subtle)]`
- **Background active (reacted_by_me)**: `bg-[var(--accent-muted-bg)]` with `border-[var(--accent-solid)]`
- **Text**: emoji + count, `text-xs font-medium tabular-nums`
- **Hover inactive**: `border-[var(--border-strong)]` + slight scale
- **Click**: `active:scale-[0.95]` for tactile feel

### Add Button ("+" / SmilePlus icon)

- **Shape**: `size-6 rounded-full` with dashed border
- **On TaskDetailPanel**: always visible
- **On TaskCard**: visible on hover (via group-hover)
- **On Comment**: always visible
- **Color**: `border-[var(--border-strong)] text-[var(--text-tertiary)]`
- **Hover**: `text-[var(--accent-solid)] border-[var(--accent-solid)] bg-[var(--accent-muted-bg)]`

### Emoji Picker

- **Container**: `w-80` floating popover, `bg-[var(--elevated)]` with `border-[var(--border-subtle)]`, `rounded-xl`, `shadow-xl`
- **Quick row**: 8 emojis in a horizontal strip at top, `gap-1`, each emoji `size-8 rounded-lg hover:bg-[var(--surface)]`
- **Search**: `Input` component, `text-sm`, sits below quick row
- **Grid**: 8 columns, `gap-0.5`, each cell `size-8 rounded-lg hover:bg-[var(--surface)] cursor-pointer text-lg`
- **Category nav**: small horizontal tab bar with emoji category icons
- **Max height**: `max-h-[320px]` with `overflow-y-auto` for the grid section

### Tooltip (Reactor Names)

- Uses existing `@radix-ui/react-tooltip` (already installed)
- Content: "Ibrahim, TestUser, and 1 more reacted with thumbs-up"
- Dark bg tooltip matching app theme
- Max 3 names shown, then "+N more"

### Vote Button

- Prominent position: in `TaskDetailPanel`, placed between title and property rows
- Visual: larger than reaction chips, with text label
- Accent glow when voted: `boxShadow: 0 0 12px -4px var(--accent-solid)`

### Animations (framer-motion)

- **Chip appear**: `initial={{ scale: 0.6, opacity: 0 }}` -> `animate={{ scale: 1, opacity: 1 }}` with spring
- **Chip disappear**: `exit={{ scale: 0.6, opacity: 0 }}` fast ease-out
- **Count change**: use `motion.span` with `key={count}` for number flip animation
- **Layout shift**: `layout` prop on each chip so they reflow smoothly when chips are added/removed
- **Vote button tap**: `whileTap={{ scale: 0.95 }}`
- **Emoji picker open**: `PopoverContent` with `data-[state=open]:animate-in` (already handled by shadcn popover)

---

## 12. TaskCard Integration

### Location

In `TaskCard.tsx`, add a mini reaction indicator in the footer bar (alongside due date, comment count, assignees).

### What to Show

- Only show if reactions exist (`reactions.total > 0`)
- Show top 2 emojis with counts: `👍 3  🚀 1`
- If more than 2 distinct emojis, show `+N` overflow

### How to Get Data

Reactions are included in `TaskResponse` from the backend (added as a computed field). This avoids separate API calls per card.

### Backend Change: Include Reactions in TaskResponse

Add `reactions: ReactionSummary | None = None` to `TaskResponse` schema.

In the task list endpoint, batch-load reaction summaries for all returned tasks:

```python
# In list_tasks handler:
task_ids = [t.id for t in tasks]
reaction_summaries = await crud_reaction.get_summaries_batch(
    db, "task", task_ids, current_user_id=current_user.id
)
responses = []
for t in tasks:
    resp = TaskResponse.model_validate(t)
    resp.reactions = reaction_summaries.get(t.id)
    responses.append(resp)
```

### Frontend Rendering

```tsx
{/* In TaskCard footer, after comments_count */}
{task.reactions && task.reactions.total > 0 && (
  <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
    {task.reactions.groups.slice(0, 2).map(g => (
      <span key={g.emoji} className="flex items-center gap-0.5">
        <span className="text-xs">{g.emoji}</span>
        <span>{g.count}</span>
      </span>
    ))}
    {task.reactions.groups.length > 2 && (
      <span className="text-[10px]">+{task.reactions.groups.length - 2}</span>
    )}
  </span>
)}
```

---

## 13. TaskDetailPanel Integration

### Placement

1. **VoteButton** — between title and property rows
2. **ReactionBar** — directly below the VoteButton

### Implementation Changes to `TaskDetailPanel.tsx`

```tsx
import { VoteButton } from '@/components/reactions/VoteButton'
import { ReactionBar } from '@/components/reactions/ReactionBar'

// Inside the scrollable content, after title block:
<motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
  <VoteButton projectId={projectId} boardId={boardId} taskId={displayTask.id} />
</motion.div>

<motion.div variants={fadeUp} className="mb-6">
  <ReactionBar
    entityType="task"
    entityId={displayTask.id}
    projectId={projectId}
    boardId={boardId}
    taskId={displayTask.id}
  />
</motion.div>
```

---

## 14. Comment Reactions

### Placement

Under each comment's content, before the separator line.

### Implementation Changes to `TaskComments.tsx`

```tsx
import { ReactionBar } from '@/components/reactions/ReactionBar'

// Inside the comment map, after the comment content and attachments:
<ReactionBar
  entityType="comment"
  entityId={comment.id}
  projectId={projectId}
  boardId={boardId}
  taskId={taskId}
  commentId={comment.id}
  compact
/>
```

### Backend: Include Reactions in CommentResponse

Option A: **Inline in response** — Add `reactions: ReactionSummary | None = None` to `CommentResponse`. Batch-load in the list_comments handler.

Option B: **Separate fetch** — Each `ReactionBar` fetches its own data via `useCommentReactions`. Simpler to implement, but causes N+1 on the frontend.

**Recommended**: Option A (inline) for comments that are paginated (max 50). Batch-load in the list handler.

```python
# In list_comments handler:
comment_ids = [c.id for c in comments]
reaction_summaries = await crud_reaction.get_summaries_batch(
    db, "comment", comment_ids, current_user_id=current_user.id
)
responses = []
for c in comments:
    resp = CommentResponse.model_validate(c)
    resp.reactions = reaction_summaries.get(c.id)
    responses.append(resp)
```

---

## 15. Real-time Sync

### WebSocket Events

| Event | Payload | When |
|-------|---------|------|
| `reaction.updated` | `{ entity_type, entity_id, data: ReactionSummary }` | After any toggle |

### Broadcasting

In the reaction toggle handler, broadcast to the board channel:

```python
await manager.broadcast_to_board(str(board.project_id), str(board.id), {
    "type": "reaction.updated",
    "entity_type": "task",  # or "comment"
    "entity_id": str(entity_id),
    "data": result.summary.model_dump(mode="json"),
    "user": {"id": str(current_user.id), "username": current_user.username},
})
```

### Frontend Handling

In `useWebSocket.ts`, add a listener for `reaction.updated`:

```typescript
wsManager.on('reaction.updated', (event) => {
  const { entity_type, entity_id, data } = event
  // Invalidate or directly update the reaction query cache
  queryClient.setQueryData(
    ['reactions', entity_type, entity_id],
    (old: any) => old ? { ...old, data } : { data }
  )
})
```

This gives instant reaction sync across all clients viewing the same board.

### User Notification WS

When a reaction notification is created, broadcast `notification.new` to the target user's channel (same pattern as task notifications):

```python
if result.action == "added":
    notif = await ReactionService.notify_reaction(...)
    if notif:
        await manager.broadcast_to_user(str(target_user_id), {"type": "notification.new"})
```

---

## 16. Notification Integration

### When to Notify

- When someone **adds** a reaction to your task -> notify task creator
- When someone **adds** a reaction to your comment -> notify comment author
- Do NOT notify on reaction removal
- Do NOT notify yourself (handled by `should_notify`)
- Do NOT notify on repeat-toggle (if user toggles same emoji on/off rapidly, only the final "added" state should notify)

### Deduplication

To avoid spamming notifications for rapid toggles, the `notify_reaction` method only fires when `result.action == "added"`. Since toggle is atomic (add or remove), there's no intermediate state.

For high-frequency scenarios (many users reacting at once), consider batching: instead of "User1 reacted thumbs-up", send "3 people reacted to your task" after a short delay. This is a future enhancement — for v1, individual notifications are acceptable.

### Notification Type

- Type string: `"task_reaction"`
- Preference key: `task_reaction` (added to `NotificationPreferences`)
- Default: `True` (enabled)

### Notification Data

```python
{
    "task_id": str(task_id),
    "board_id": str(board_id),
    "emoji": emoji,
}
```

---

## 17. Performance

### Batch Loading (N+1 Prevention)

- **Task list**: Use `crud_reaction.get_summaries_batch()` to load reaction summaries for all tasks in a single query. This is a single `SELECT ... WHERE entity_id IN (...)`.
- **Comment list**: Same batch pattern for all comments in a page.
- **Single task detail**: Single query for one entity — no batch needed.

### Caching

- **Frontend**: TanStack Query caches by `['reactions', entityType, entityId]`. Stale time can be set to 30s (same as other queries).
- **Optimistic updates**: Toggle mutations immediately update the local cache before the server responds, providing instant feedback.
- **WebSocket invalidation**: Real-time events update the cache directly without refetching.

### Indexes

- `ix_reactions_entity` on `(entity_type, entity_id)` — covers all lookups
- Unique constraints on `(entity_type, entity_id, emoji, user_id)` and `(entity_type, entity_id, emoji, agent_id)` — prevents duplicates and serves as indexes for toggle lookups

### Query Efficiency

The `get_summaries_batch` method does ONE query with `WHERE entity_id IN (...)`, then groups results in Python. For a board with 50 tasks, this is one DB round-trip.

---

## 18. Edge Cases

### Deleted Users in Reactions

- FK `ondelete=CASCADE` on `user_id` — when a user is deleted, their reactions are automatically removed.
- In the reactor tooltip, if a user/agent reference is null (shouldn't happen with CASCADE, but defensive), skip or show "Deleted User".

### Emoji Encoding

- Store emojis as UTF-8 strings in the database. PostgreSQL handles this natively. SQLite also supports UTF-8.
- Max length `String(32)` accommodates multi-codepoint emojis (e.g., flags, skin tones).
- Frontend sends emoji characters directly (no shortcodes).

### Rapid Toggle Debouncing

- Optimistic updates handle the UI side instantly.
- The mutation uses TanStack Query's built-in deduplication — if a mutation is in-flight for the same key, subsequent calls are queued.
- Add a 300ms debounce on the toggle function to prevent accidental double-clicks:

```typescript
const debouncedToggle = useDebouncedCallback(
  (emoji: string) => toggle.mutate(emoji),
  300
)
```

Or simpler: disable the button briefly after click via `toggle.isPending`.

### Concurrent Reactions

- Unique constraints prevent duplicate reactions at the DB level.
- If two users react simultaneously, both succeed independently (no conflict).
- If the same user somehow sends two identical toggle requests, the unique constraint prevents a duplicate INSERT, and the second request will find the existing reaction and remove it.

### Task/Comment Deletion

- When a task is deleted: all reactions with `entity_type="task"` and `entity_id=task_id` are cleaned up via `ReactionService.delete_reactions_for_entity()`.
- When a comment is deleted: same cleanup for `entity_type="comment"`.
- Add these calls to the existing delete handlers in `tasks.py` and `comments.py`.

### Empty State

- `ReactionBar` renders nothing when there are no reactions AND the picker is closed.
- The "+" button is always visible in TaskDetailPanel and under comments to allow adding the first reaction.
- On TaskCard, the reaction indicator only shows when `reactions.total > 0`.

### Agent Reactions

- Agents can react via the API by passing `agent_id` in the request body.
- Agent reactions use the `agent_id` unique constraint (separate from user reactions).
- Agent reactors appear in tooltips with their colored avatar, same as agent assignees.

---

## 19. File Changes

### New Files to Create

| File | Purpose |
|------|---------|
| `backend/app/models/reaction.py` | Reaction SQLAlchemy model |
| `backend/app/schemas/reaction.py` | Pydantic schemas (ReactionCreate, ReactionGroup, ReactionSummary, ToggleResult, ReactorBrief) |
| `backend/app/crud/reaction.py` | CRUDReaction with find, summary, batch, delete methods |
| `backend/app/services/reaction_service.py` | ReactionService (toggle, notify, delete) |
| `backend/app/api/v1/reactions.py` | Route handlers (task_router, comment_router) |
| `backend/alembic/versions/XXXX_add_reactions_table.py` | Alembic migration |
| `frontend/src/types/reaction.ts` | TypeScript interfaces |
| `frontend/src/hooks/useReactions.ts` | TanStack Query hooks |
| `frontend/src/components/reactions/ReactionBar.tsx` | Reusable reaction bar component |
| `frontend/src/components/reactions/EmojiPicker.tsx` | Lightweight emoji picker |
| `frontend/src/components/reactions/VoteButton.tsx` | Vote button (thumbs-up shortcut) |
| `frontend/src/components/reactions/ReactorTooltip.tsx` | Tooltip content for reactor names |
| `frontend/src/data/emojis.json` | Static emoji data (~300 emojis, categorized) |

### Existing Files to Modify

| File | Change |
|------|--------|
| `backend/app/models/__init__.py` | Add `Reaction` import and `__all__` entry |
| `backend/app/crud/__init__.py` | Add `crud_reaction` import and `__all__` entry |
| `backend/app/schemas/__init__.py` | Add reaction schema imports and `__all__` entries |
| `backend/app/schemas/notification.py` | Add `task_reaction: bool = True` to `NotificationPreferences` |
| `backend/app/schemas/task.py` | Add `reactions: ReactionSummary \| None = None` to `TaskResponse` |
| `backend/app/schemas/comment.py` | Add `reactions: ReactionSummary \| None = None` to `CommentResponse` |
| `backend/app/main.py` | Import and register `reactions.task_router` and `reactions.comment_router` |
| `backend/app/api/v1/tasks.py` | Batch-load reactions in `list_tasks` and `get_task`; cleanup reactions on delete |
| `backend/app/api/v1/comments.py` | Batch-load reactions in `list_comments`; cleanup reactions on delete |
| `frontend/src/types/index.ts` | Add `export type * from './reaction'` |
| `frontend/src/types/task.ts` | Add `reactions?: ReactionSummary` to `Task` and `Comment` interfaces |
| `frontend/src/lib/api-client.ts` | Add 4 reaction endpoint methods |
| `frontend/src/hooks/useWebSocket.ts` | Add `reaction.updated` event handler |
| `frontend/src/components/board/TaskDetailPanel.tsx` | Add VoteButton and ReactionBar |
| `frontend/src/components/board/TaskCard.tsx` | Add mini reaction indicator in footer |
| `frontend/src/components/tasks/TaskComments.tsx` | Add ReactionBar under each comment |
| `frontend/src/pages/SettingsPage.tsx` | Add `task_reaction` toggle in notification settings |

### NPM Packages to Install

None required. The implementation uses:
- Existing `@radix-ui/react-tooltip` for hover tooltips
- Existing `@radix-ui/react-popover` for emoji picker container
- Existing `framer-motion` for animations
- Existing `lucide-react` for the `SmilePlus` icon
- Custom lightweight emoji data (static JSON) instead of `emoji-mart`

### Backend Packages

No new packages needed. All functionality uses existing SQLAlchemy, FastAPI, and Pydantic.

---

## Implementation Order

1. **Backend model + migration** — Reaction model, migration, register in `__init__`
2. **Backend CRUD** — `crud_reaction.py` with all query methods
3. **Backend schemas** — `reaction.py` schemas, update `task.py` and `comment.py` response schemas
4. **Backend service** — `reaction_service.py` toggle/notify/delete
5. **Backend routes** — `reactions.py` with task and comment routers
6. **Backend integration** — wire into `main.py`, update task/comment handlers for batch-loading and cleanup
7. **Frontend types** — `reaction.ts`, update `task.ts`/`Comment`
8. **Frontend API client** — add 4 methods
9. **Frontend hooks** — `useReactions.ts` with optimistic updates
10. **Frontend EmojiPicker** — lightweight custom picker + emoji data
11. **Frontend ReactionBar** — reusable component
12. **Frontend VoteButton** — thumbs-up shortcut
13. **Frontend TaskDetailPanel** — integrate VoteButton + ReactionBar
14. **Frontend TaskCard** — mini reaction indicator
15. **Frontend TaskComments** — ReactionBar under each comment
16. **Frontend WebSocket** — real-time reaction sync
17. **Frontend Settings** — reaction notification toggle
18. **Testing** — manual E2E + verify edge cases

---

## Unresolved Questions

- Should reaction counts be denormalized onto the task/comment model for faster sorting, or computed on-the-fly? (v1: computed; denormalize if perf issue)
- Should board-level "sort by votes" be a backend query param or client-side sort? (recommend: client-side for v1, backend `sort_by=votes` later)
- Should reactions be visible to non-project-members in any context? (current: no, all reaction endpoints require board access)
- Max reactions per user per entity? (currently unlimited distinct emojis per user — cap at 20?)
- Should reaction activity appear in the activity log? (recommend: skip for v1, too noisy)
