# Rich Text Editor with @ Mentions and # References

## 1. Overview

### Summary

Replace all plain-text description and comment inputs with a Tiptap-based rich text editor supporting formatted content, `@` mentions (users + agents), and `#` references (projects, boards, tasks). Store content as Tiptap JSON in the DB with a companion plain-text column for search indexing. Wire `@` mentions into the existing notification pipeline.

### User Stories

- As a user, I can format task descriptions with headings, bold, lists, code blocks, tables, and images so descriptions are expressive and readable.
- As a user, I can `@mention` a project member or agent inside a description or comment, and the mentioned user receives a notification.
- As a user, I can `#reference` a project, board, or task inline, and clicking it navigates to that entity.
- As a user, I see mentions rendered as colored chips and references as inline links, both in edit and read-only modes.
- As an API consumer, I can still send plain-text descriptions and the system stores them correctly (backward compatibility).

### Why Tiptap

- Built on ProseMirror -- battle-tested, extensible, excellent TypeScript support.
- First-class React bindings (`@tiptap/react`).
- Rich extension ecosystem: mention, link, code-block-lowlight, table, task-list, image, placeholder, etc.
- JSON document model maps cleanly to DB storage.
- MIT-licensed, active maintenance.

---

## 2. Library Selection

### Core

| Package | Purpose |
|---------|---------|
| `@tiptap/react` | React integration layer |
| `@tiptap/pm` | ProseMirror peer deps bundle |
| `@tiptap/starter-kit` | Base extensions (bold, italic, heading, lists, blockquote, code, hr, history) |

### Extensions

| Package | Purpose |
|---------|---------|
| `@tiptap/extension-underline` | Underline mark |
| `@tiptap/extension-strike` | Strikethrough (included in starter-kit but listed for clarity) |
| `@tiptap/extension-link` | Auto-detect + clickable links |
| `@tiptap/extension-code-block-lowlight` | Fenced code blocks with syntax highlighting |
| `@tiptap/extension-task-list` | Todo/checkbox list container |
| `@tiptap/extension-task-item` | Individual todo item |
| `@tiptap/extension-table` | Table node |
| `@tiptap/extension-table-row` | Table row |
| `@tiptap/extension-table-cell` | Table cell |
| `@tiptap/extension-table-header` | Table header cell |
| `@tiptap/extension-image` | Image node (paste/drag/upload) |
| `@tiptap/extension-placeholder` | Ghost placeholder text |
| `@tiptap/extension-mention` | `@` and `#` mention nodes |
| `@tiptap/extension-typography` | Smart quotes, dashes |
| `@tiptap/extension-character-count` | Optional char counting |
| `lowlight` | Syntax highlighting engine for code blocks |

### Install Command

```bash
cd frontend
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-underline @tiptap/extension-link \
  @tiptap/extension-code-block-lowlight @tiptap/extension-task-list \
  @tiptap/extension-task-item @tiptap/extension-table \
  @tiptap/extension-table-row @tiptap/extension-table-cell \
  @tiptap/extension-table-header @tiptap/extension-image \
  @tiptap/extension-placeholder @tiptap/extension-mention \
  @tiptap/extension-typography @tiptap/extension-character-count \
  lowlight
```

---

## 3. Data Model Changes

### Task Model

**File:** `backend/app/models/task.py`

```python
# BEFORE
description: Mapped[str | None] = mapped_column(Text)

# AFTER
description: Mapped[dict | None] = mapped_column(JSON)       # Tiptap JSON document
description_text: Mapped[str | None] = mapped_column(Text)   # plain-text extraction for search
```

- `description` stores Tiptap JSON (`{"type":"doc","content":[...]}`)
- `description_text` stores the plain-text extraction (all text nodes concatenated), used by search queries

### Comment Model

**File:** `backend/app/models/comment.py`

```python
# BEFORE
content: Mapped[str] = mapped_column(Text)

# AFTER
content: Mapped[dict] = mapped_column(JSON)             # Tiptap JSON document
content_text: Mapped[str] = mapped_column(Text)          # plain-text extraction
```

### Why JSON Column Not Text

- SQLAlchemy's `JSON` type stores native JSON in PostgreSQL (JSONB) and serialized JSON string in SQLite.
- Avoids double-serialization overhead.
- Enables future server-side JSON queries if needed (PostgreSQL JSONB operators).

### Column Type Import

Add `from sqlalchemy import JSON` to both model files.

---

## 4. Mention Data Model

### Design Decision: Parse-on-Save, No Separate Table

Instead of a `Mention` join table, we extract mentions from the Tiptap JSON on every save (create/update) in the service layer. Reasons:

1. No schema drift risk -- mentions always match actual content.
2. Simpler CRUD -- no orphan cleanup on edits.
3. Notification is a fire-once event; we only need mention data at write time.
4. If we later need "where am I mentioned?" queries, we can add a materialized view or a separate table then (YAGNI).

### Mention Node Schema (in Tiptap JSON)

```json
{
  "type": "mention",
  "attrs": {
    "id": "uuid-here",
    "entityType": "user",
    "label": "Ibrahim Albayrak"
  }
}
```

For `@` mentions: `entityType` is `"user"` or `"agent"`.
For `#` references: `entityType` is `"project"`, `"board"`, or `"task"`.

Both use the same `mention` node type but are distinguished by `entityType` and the trigger character. Tiptap's `Mention` extension supports multiple configurations via separate extension instances.

### Extracting Mentions from JSON

Utility function in `backend/app/services/content_service.py`:

```python
def extract_mentions(doc: dict) -> list[dict]:
    """Walk Tiptap JSON tree, return list of {entity_type, id} for all mention nodes."""
    mentions = []
    def walk(node):
        if node.get("type") == "mention":
            attrs = node.get("attrs", {})
            mentions.append({
                "entity_type": attrs.get("entityType"),
                "id": attrs.get("id"),
            })
        for child in node.get("content", []):
            walk(child)
    walk(doc)
    return mentions

def extract_plain_text(doc: dict) -> str:
    """Walk Tiptap JSON tree, concatenate all text nodes."""
    parts = []
    def walk(node):
        if node.get("type") == "text":
            parts.append(node.get("text", ""))
        elif node.get("type") == "mention":
            parts.append(node.get("attrs", {}).get("label", ""))
        for child in node.get("content", []):
            walk(child)
    walk(doc)
    return " ".join(parts)
```

---

## 5. Backend API

### New Endpoint: Mentionables

**File:** `backend/app/api/v1/mentionables.py`

```
GET /api/v1/projects/{project_id}/mentionables?q=<search>
```

Returns a combined list of project members (users) and active agents for autocomplete.

**Response shape:**

```json
{
  "success": true,
  "data": {
    "users": [
      { "id": "uuid", "username": "ibrahim", "full_name": "Ibrahim Albayrak", "avatar_url": null }
    ],
    "agents": [
      { "id": "uuid", "name": "Claude", "color": "#6366f1" }
    ]
  }
}
```

**Query param `q`** (optional): filters users by `full_name ILIKE %q%` or `username ILIKE %q%`, agents by `name ILIKE %q%`. If omitted, return all (limited to 20 each).

This is a lightweight endpoint combining existing `members` + `agents` queries. No new CRUD class needed.

### New Endpoint: Referenceable Entities

**File:** `backend/app/api/v1/mentionables.py` (same file)

```
GET /api/v1/projects/{project_id}/referenceables?q=<search>
```

Returns projects (user has access to), boards (within current project), and tasks (within current project, by title search).

**Response shape:**

```json
{
  "success": true,
  "data": {
    "projects": [
      { "id": "uuid", "name": "AgentBoard", "icon": "rocket", "color": "#..." }
    ],
    "boards": [
      { "id": "uuid", "name": "Sprint 1", "icon": "layout", "color": "#..." }
    ],
    "tasks": [
      { "id": "uuid", "title": "Fix login bug", "board_id": "uuid", "status_name": "In Progress" }
    ]
  }
}
```

**Limits:** 5 per category max. `q` is optional; if provided, filters by name/title ILIKE.

### Modified Endpoints

**Task create/update** (`backend/app/api/v1/tasks.py`):
- Accept `description` as either `string` (backward compat) or `dict` (Tiptap JSON).
- When receiving a string, auto-wrap it: `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"..."}]}]}`.
- After save, extract mentions from JSON and create notifications for newly mentioned users.

**Comment create/update** (`backend/app/api/v1/comments.py`):
- Same dual-format acceptance for `content`.
- Extract mentions on save, notify mentioned users.

### Modified Schemas

**File:** `backend/app/schemas/task.py`

```python
from typing import Any

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | dict | None = None   # accept string OR Tiptap JSON
    # ... rest unchanged

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | dict | None = None   # accept string OR Tiptap JSON
    # ... rest unchanged

class TaskResponse(BaseModel):
    # ...
    description: dict | None = None          # always return as Tiptap JSON
    description_text: str | None = None      # plain text for display fallback
    # ... rest unchanged
```

**File:** `backend/app/schemas/comment.py`

```python
class CommentCreate(BaseModel):
    content: str | dict = Field(...)         # accept string OR Tiptap JSON
    # ...

class CommentUpdate(BaseModel):
    content: str | dict = Field(...)

class CommentResponse(BaseModel):
    # ...
    content: dict                            # always return as Tiptap JSON
    content_text: str                        # plain text
```

---

## 6. Content Processing

### Service: `backend/app/services/content_service.py`

New file. Handles:
1. **Normalization** -- if input is a string, wrap it in a Tiptap doc structure.
2. **Plain-text extraction** -- walk the JSON tree, concatenate text nodes.
3. **Mention extraction** -- walk the JSON tree, collect mention node attrs.
4. **Sanitization** -- strip any unexpected node types or attrs (allowlist approach).

```python
ALLOWED_NODE_TYPES = {
    "doc", "paragraph", "heading", "text", "bulletList", "orderedList",
    "listItem", "taskList", "taskItem", "codeBlock", "blockquote",
    "horizontalRule", "table", "tableRow", "tableCell", "tableHeader",
    "image", "mention", "hardBreak",
}

ALLOWED_MARKS = {
    "bold", "italic", "underline", "strike", "code", "link",
}

def normalize_content(value: str | dict) -> dict:
    """Convert string to Tiptap JSON doc, or validate existing JSON doc."""
    if isinstance(value, str):
        return {
            "type": "doc",
            "content": [{
                "type": "paragraph",
                "content": [{"type": "text", "text": value}] if value else []
            }]
        }
    # Already a dict, validate it has type: doc
    if not isinstance(value, dict) or value.get("type") != "doc":
        raise ValueError("Invalid content format: must be a Tiptap JSON document")
    return value

def extract_plain_text(doc: dict) -> str:
    """Recursively extract all text content from Tiptap JSON."""
    parts = []
    def walk(node):
        if node.get("type") == "text":
            parts.append(node.get("text", ""))
        elif node.get("type") == "mention":
            label = node.get("attrs", {}).get("label", "")
            parts.append(f"@{label}" if label else "")
        for child in node.get("content", []):
            walk(child)
    walk(doc)
    return " ".join(parts).strip()

def extract_mentions(doc: dict, entity_types: set[str] | None = None) -> list[dict]:
    """Extract all mention nodes from Tiptap JSON."""
    mentions = []
    def walk(node):
        if node.get("type") == "mention":
            attrs = node.get("attrs", {})
            et = attrs.get("entityType")
            if entity_types is None or et in entity_types:
                mentions.append({
                    "entity_type": et,
                    "id": attrs.get("id"),
                    "label": attrs.get("label"),
                })
        for child in node.get("content", []):
            walk(child)
    walk(doc)
    return mentions
```

### Integration into TaskService

In `task_service.py`, after saving:

```python
from app.services.content_service import normalize_content, extract_plain_text, extract_mentions

# In create_task / update_task:
if task_in.description is not None:
    doc = normalize_content(task_in.description)
    task.description = doc
    task.description_text = extract_plain_text(doc)

    # Extract @user mentions for notifications
    user_mentions = extract_mentions(doc, {"user"})
    for mention in user_mentions:
        await NotificationService.create_notification(
            db,
            user_id=UUID(mention["id"]),
            actor_id=creator_id,
            project_id=project_id,
            type="mentioned",
            title="Mentioned in Task",
            message=f'{creator_name} mentioned you in "{task.title}"',
            data={"task_id": str(task.id), "board_id": str(task.board_id)},
        )
```

Same pattern for comments in `comments.py` route handler.

### Diff Tracking for Update

On task update, compare old mentions vs new mentions. Only notify for **newly added** mentions (avoid re-notifying on every edit):

```python
old_mentions = set()
if task.description:
    old_mentions = {m["id"] for m in extract_mentions(task.description, {"user"})}

doc = normalize_content(task_in.description)
new_mentions = {m["id"] for m in extract_mentions(doc, {"user"})}

newly_mentioned = new_mentions - old_mentions
for uid in newly_mentioned:
    await NotificationService.create_notification(...)
```

---

## 7. Notification Integration

### New Notification Type: `mentioned`

Add `"mentioned"` to the set of notification types.

**File:** `backend/app/schemas/notification.py`

Add to `NotificationPreferences`:
```python
mentioned: bool = True  # user can opt out of mention notifications
```

**Notification flow:**

1. User saves description/comment containing `@ibrahim`.
2. Service layer calls `extract_mentions(doc, {"user"})`.
3. For each user mention, calls `NotificationService.create_notification(type="mentioned", ...)`.
4. NotificationService checks user preferences (`should_notify`).
5. If approved: persists `Notification` row, triggers email if opted in.
6. Route handler broadcasts `notification.new` via WebSocket to mentioned user.

### WebSocket Broadcast

After creating mention notifications in the task/comment route handler, add:

```python
for uid in newly_mentioned_user_ids:
    await manager.broadcast_to_user(str(uid), {"type": "notification.new"})
```

This follows the existing pattern used for assignee/watcher notifications.

---

## 8. Frontend Types

**File:** `frontend/src/types/editor.ts` (new file)

```typescript
// Tiptap JSON document
export interface TiptapDoc {
  type: 'doc'
  content: TiptapNode[]
}

export interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: TiptapMark[]
  text?: string
}

export interface TiptapMark {
  type: string
  attrs?: Record<string, unknown>
}

// Mention node attrs
export interface MentionAttrs {
  id: string
  entityType: 'user' | 'agent' | 'project' | 'board' | 'task'
  label: string
}

// Mentionables API response
export interface MentionableUser {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

export interface MentionableAgent {
  id: string
  name: string
  color: string
}

export interface MentionablesResponse {
  users: MentionableUser[]
  agents: MentionableAgent[]
}

// Referenceables API response
export interface ReferenceableProject {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export interface ReferenceableBoard {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export interface ReferenceableTask {
  id: string
  title: string
  board_id: string
  status_name: string
}

export interface ReferenceablesResponse {
  projects: ReferenceableProject[]
  boards: ReferenceableBoard[]
  tasks: ReferenceableTask[]
}
```

### Updated Task Type

**File:** `frontend/src/types/task.ts`

```typescript
import type { TiptapDoc } from './editor'

export interface Task {
  // ...
  description: TiptapDoc | null      // changed from string | null
  description_text: string | null     // new: plain text for fallback
  // ...
}

export interface TaskCreate {
  // ...
  description?: TiptapDoc | string    // accept both
  // ...
}

export interface TaskUpdate {
  // ...
  description?: TiptapDoc | string
  // ...
}

export interface Comment {
  // ...
  content: TiptapDoc                  // changed from string
  content_text: string                // new
  // ...
}
```

---

## 9. Editor Component Architecture

### Component Hierarchy

```
src/components/editor/
  RichTextEditor.tsx          -- Main editor wrapper (full + compact variants)
  EditorToolbar.tsx           -- Formatting toolbar (headings, bold, etc.)
  EditorBubbleMenu.tsx        -- Floating toolbar on text selection
  MentionSuggestion.tsx       -- @ mention autocomplete popup
  ReferenceSuggestion.tsx     -- # reference autocomplete popup
  MentionChip.tsx             -- Rendered mention inline node (read + edit mode)
  ReferenceLink.tsx           -- Rendered reference inline node
  RichTextRenderer.tsx        -- Read-only renderer (for displaying saved content)
  extensions/
    mention-user.ts           -- Tiptap Mention extension configured for @users/@agents
    reference.ts              -- Tiptap Mention extension configured for #references
    image-upload.ts           -- Custom Image extension with upload handler
  hooks/
    useMentionables.ts        -- TanStack Query hook for fetching mentionables
    useReferenceables.ts      -- TanStack Query hook for fetching referenceables
  styles/
    editor.css                -- Tiptap editor styles (ProseMirror base + custom)
```

### Editor Variants

**Full Editor** (task description):
- Persistent top toolbar with all formatting options
- Bubble menu on text selection (bold/italic/link)
- Full height, resizable
- All extensions enabled
- Image upload via paste/drag

**Compact Editor** (comments):
- No persistent toolbar; toolbar appears on focus (slide-in from bottom)
- Subset of extensions: bold, italic, code, link, lists, mention, reference
- No headings, tables, images, horizontal rules
- Smaller min-height
- Cmd+Enter to submit

---

## 10. @ Mention Extension

### Configuration

**File:** `frontend/src/components/editor/extensions/mention-user.ts`

```typescript
import Mention from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'  // Tiptap uses tippy internally via suggestion plugin
import { MentionSuggestion } from '../MentionSuggestion'

export const MentionUser = Mention.configure({
  HTMLAttributes: {
    class: 'mention-chip',
    'data-entity-type': 'mention',
  },
  suggestion: {
    char: '@',
    allowSpaces: false,
    startOfLine: false,
    items: async ({ query }) => {
      // This is overridden by the component; the actual fetching
      // happens via the render function's component props
      return []
    },
    render: () => {
      let component: ReactRenderer
      let popup: any

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionSuggestion, {
            props: { ...props, entityType: 'mention' },
            editor: props.editor,
          })
          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },
        onUpdate(props) {
          component.updateProps({ ...props, entityType: 'mention' })
          popup[0].setProps({ getReferenceClientRect: props.clientRect })
        },
        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0].hide()
            return true
          }
          return component.ref?.onKeyDown(props)
        },
        onExit() {
          popup[0].destroy()
          component.destroy()
        },
      }
    },
  },
})
```

### MentionSuggestion Component

**File:** `frontend/src/components/editor/MentionSuggestion.tsx`

Renders the autocomplete dropdown. Receives `query` from Tiptap's suggestion plugin. Fetches mentionables from the API using the `useMentionables` hook (or receives them as props from the parent editor that pre-fetches).

**Key behaviors:**
- Max 8 items shown (5 users + 3 agents, or dynamically balanced)
- Fuzzy filter on `query` against `full_name`, `username`, `name`
- Keyboard navigation: Arrow Up/Down to move, Enter to select, Escape to dismiss
- On select: inserts a mention node with `{ id, entityType, label }`
- Visual: Users show avatar + name, agents show color dot + name
- Empty state: "No matches" message
- Loading state: skeleton shimmer

### Data Fetching Strategy

**Option chosen:** Pre-fetch all mentionables when the editor mounts (project members + agents are bounded lists, typically < 50 items). Cache in TanStack Query with `staleTime: 60000`. Filter client-side as user types.

**Hook:** `frontend/src/components/editor/hooks/useMentionables.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useMentionables(projectId: string) {
  return useQuery({
    queryKey: ['mentionables', projectId],
    queryFn: () => api.getMentionables(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  })
}
```

---

## 11. # Reference Extension

### Configuration

**File:** `frontend/src/components/editor/extensions/reference.ts`

Same pattern as mention-user but:
- Trigger char: `#`
- Uses `ReferenceSuggestion` component
- Node attrs include `entityType: 'project' | 'board' | 'task'`

### ReferenceSuggestion Component

**File:** `frontend/src/components/editor/ReferenceSuggestion.tsx`

**Key behaviors:**
- Categorized sections: Projects / Boards / Tasks
- Each section has a subtle header label
- Max 5 items per category (15 total visible)
- Filter on `query` against name/title
- Icons per type: folder for project, layout for board, checkbox for task
- On select: inserts a reference node
- Clicking rendered reference in text navigates via React Router

### Data Fetching

Uses `useReferenceables` hook. Similar to mentionables but hits the `/referenceables` endpoint.

```typescript
export function useReferenceables(projectId: string, query: string) {
  return useQuery({
    queryKey: ['referenceables', projectId, query],
    queryFn: () => api.getReferenceables(projectId, query),
    staleTime: 30_000,
    enabled: !!projectId && query.length >= 0,
  })
}
```

For references, we debounce the query (300ms) and fetch server-side since tasks can number in the hundreds/thousands.

---

## 12. UI Design

### Design Direction

The editor follows AgentBoard's existing dark-theme aesthetic: `var(--surface)` backgrounds, `var(--border-subtle)` borders, `var(--accent-solid)` for interactive elements. The editor itself should feel like a native part of the UI, not an embedded third-party widget.

### Editor Chrome

- **Container:** Rounded-xl with `var(--surface)` bg, `var(--border-subtle)` border, focus ring on `var(--accent-solid)`.
- **Toolbar:** Horizontal button row inside the editor container, top edge, separated by thin border.
- **Toolbar buttons:** `size-7` icon-only buttons, `var(--text-tertiary)` default, `var(--text-primary)` on hover, `var(--accent-solid)` bg tint when format is active.
- **Toolbar groups:** Separated by 1px vertical dividers (text styles | lists | insert | mention/ref).

### Toolbar Layout (Full Editor)

```
[ H1 H2 H3 | B I U S | Code CodeBlock | BulletList OrderedList TaskList | Quote HR | Table Image Link | @ # ]
```

Compact editor toolbar (appears on focus):

```
[ B I Code | BulletList OrderedList | Link | @ # ]
```

### Mention Chip Rendering

**User mentions:**
- Inline `<span>` with `var(--accent-muted-bg)` background, `var(--accent-solid)` text
- Rounded-md, px-1.5 py-0.5
- Prefix: tiny avatar circle or first-letter circle (4px)
- Text: `@Full Name` or `@username`
- Hover: slightly brighter bg, cursor pointer
- Click: user info popover (avatar, name, role) or navigate to profile

**Agent mentions:**
- Same shape but bg/text color derived from agent's `color` field
- Prefix: colored dot matching agent color
- Text: `@AgentName`

### Reference Link Rendering

- Inline `<span>` styled as a link: `var(--accent-solid)` text, dotted underline
- Prefix icon: tiny 10px icon (folder/layout/checkbox) matching entity type
- Text: entity name/title
- Hover: solid underline
- Click: navigates to entity URL using React Router

### Bubble Menu

- Appears on text selection
- Floating, dark bg (`var(--elevated)`), rounded-xl, shadow-xl
- Buttons: Bold, Italic, Underline, Strikethrough, Code, Link
- Smooth fade-in with framer-motion

### Mobile Behavior

- Toolbar scrolls horizontally on overflow
- Bubble menu positioned above selection (no overlap with mobile keyboard)
- Mention/reference dropdowns render as bottom sheet on small screens (< 640px)

### Read-Only Renderer

`RichTextRenderer` component renders Tiptap JSON to HTML without instantiating an editor. Uses `generateHTML()` from `@tiptap/html` with the same extension set. This is used in:
- Task cards (truncated description preview)
- Comment display
- Activity log previews

---

## 13. Migration Strategy

### Database Migration

**Alembic migration:** `backend/alembic/versions/xxx_add_rich_text_columns.py`

```python
def upgrade():
    # Task: rename description -> description_legacy, add new columns
    op.add_column('tasks', sa.Column('description_json', sa.JSON(), nullable=True))
    op.add_column('tasks', sa.Column('description_text', sa.Text(), nullable=True))

    # Comment: same pattern
    op.add_column('comments', sa.Column('content_json', sa.JSON(), nullable=True))
    op.add_column('comments', sa.Column('content_text', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('tasks', 'description_json')
    op.drop_column('tasks', 'description_text')
    op.drop_column('comments', 'content_json')
    op.drop_column('comments', 'content_text')
```

### Data Migration Script

**File:** `backend/scripts/migrate_to_rich_text.py` (run once after schema migration)

```python
# For each task with a non-null description (plain text):
#   1. Wrap in Tiptap JSON: {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"..."}]}]}
#   2. Split on newlines -> multiple paragraph nodes
#   3. Set description_json = wrapped JSON
#   4. Set description_text = original plain text
#   5. Set description (old column) = NULL (or keep for rollback)

# Same for comments.content -> content_json + content_text
```

**Two-phase rollout:**
1. **Phase 1:** Add new columns, deploy backend that writes to both old and new columns. Frontend still reads old column.
2. **Phase 2:** Switch frontend to read new JSON column, render with Tiptap. Run data migration for existing rows.
3. **Phase 3:** Drop old text columns (or keep as `_legacy` for safety).

**Simpler alternative (recommended for this project size):** Since this is a relatively young project, do an in-place migration:

1. Add `description_text` column to tasks and `content_text` column to comments.
2. Change `description` and `content` column types from `Text` to `JSON`.
3. Run migration script that converts existing plain text to Tiptap JSON.
4. Deploy. The schema accepts both formats via the `normalize_content()` function.

Since SQLite (dev) and PostgreSQL (prod) both support JSON columns, this works across environments.

---

## 14. Search Integration

### Current Search Implementation

**File:** `backend/app/api/v1/search.py`

Currently searches `Task.title.ilike(f"%{q}%")`. Description is not searched at all.

### Updated Search

After migration, add description search using `description_text`:

```python
# In global_search task query:
query = select(Task).where(
    or_(
        Task.title.ilike(f"%{q}%"),
        Task.description_text.ilike(f"%{q}%"),
    )
)
```

Also update `crud/task.py` `get_multi_by_board` search filter:

```python
# In get_multi_by_board, when search param is provided:
if search:
    query = query.where(
        or_(
            Task.title.ilike(f"%{search}%"),
            Task.description_text.ilike(f"%{search}%"),
        )
    )
```

The `description_text` column strips all formatting and mention markup, providing clean search results.

---

## 15. Edge Cases

### Deleted Users in Mentions

- Mention nodes store `label` (display name) alongside `id`.
- If the user is deleted, the mention chip renders with the stored label text but in a dimmed/disabled style.
- Clicking shows "User no longer exists" tooltip.
- No notification is sent if user ID doesn't resolve.

### Deleted Agents in Mentions

- Same approach: render stored label with a muted style.
- Agent color falls back to gray if agent is deleted.

### Deleted Entities in References

- Reference nodes store the entity title.
- If entity is deleted, render as plain text (no link) with strikethrough style.
- Clicking shows "This [project/board/task] has been deleted" tooltip.
- Detection: the frontend can check entity existence lazily or rely on 404 when clicked.

### Paste Handling

- **Paste rich text (from Word, Google Docs, etc.):** Tiptap's `PasteRule` + built-in parsing handles HTML clipboard data. Strip unsupported formatting via `transformPastedHTML` editor option.
- **Paste plain text:** Inserted as paragraph nodes.
- **Paste images:** Intercept paste event, upload image via existing attachment API, insert Image node with the returned URL.
- **Paste URLs:** Auto-detect and wrap in Link mark.

### XSS Prevention

- Tiptap JSON is a structured format with an allowlist of node types and marks. It does not store raw HTML.
- The `normalize_content()` function validates the document structure.
- The `RichTextRenderer` uses `generateHTML()` with the same configured extensions, which only renders known node types.
- User-generated text content is always escaped by React's JSX rendering.
- Server-side: never store or return raw HTML. Always store as Tiptap JSON.
- Additional safety: strip `<script>`, `javascript:` URLs from any Link mark `href` attrs on the backend.

### Large Documents

- Tiptap JSON for a typical task description (1-2 pages of text) is ~5-20KB.
- The `JSON` column type handles this efficiently.
- `description_text` keeps search lightweight.
- Frontend: lazy-render long documents with `content-visibility: auto` CSS.

### Concurrent Editing

- Not in scope for initial implementation (YAGNI).
- The existing optimistic update + WebSocket broadcast pattern handles concurrent saves: last write wins.
- Future: could add Yjs collaboration via `@tiptap/extension-collaboration`.

### Empty Document Handling

- An empty editor produces `{"type":"doc","content":[{"type":"paragraph"}]}`.
- Treat this as equivalent to `null` description. Check `description_text` length for emptiness.
- Backend: if `description_text` is empty after normalization, store `description = null` and `description_text = null`.

### API Backward Compatibility

- Schema validators accept both `string` and `dict` for description/content fields.
- API consumers sending plain strings (CLI tools, API key users) continue working.
- Response always returns Tiptap JSON (frontend) + plain text (for non-rich clients via `description_text`).

---

## 16. File Changes

### New Files

| File | Purpose |
|------|---------|
| `backend/app/services/content_service.py` | Content normalization, plain-text extraction, mention extraction |
| `backend/app/api/v1/mentionables.py` | Mentionables + referenceables API endpoints |
| `frontend/src/types/editor.ts` | TypeScript types for Tiptap content, mentions, references |
| `frontend/src/components/editor/RichTextEditor.tsx` | Main editor component (full + compact variants) |
| `frontend/src/components/editor/EditorToolbar.tsx` | Formatting toolbar |
| `frontend/src/components/editor/EditorBubbleMenu.tsx` | Selection-based floating toolbar |
| `frontend/src/components/editor/MentionSuggestion.tsx` | @ mention autocomplete dropdown |
| `frontend/src/components/editor/ReferenceSuggestion.tsx` | # reference autocomplete dropdown |
| `frontend/src/components/editor/MentionChip.tsx` | Rendered mention node component |
| `frontend/src/components/editor/ReferenceLink.tsx` | Rendered reference node component |
| `frontend/src/components/editor/RichTextRenderer.tsx` | Read-only Tiptap JSON to HTML renderer |
| `frontend/src/components/editor/extensions/mention-user.ts` | @ mention Tiptap extension config |
| `frontend/src/components/editor/extensions/reference.ts` | # reference Tiptap extension config |
| `frontend/src/components/editor/extensions/image-upload.ts` | Image extension with upload handler |
| `frontend/src/components/editor/hooks/useMentionables.ts` | TanStack Query hook for mentionables |
| `frontend/src/components/editor/hooks/useReferenceables.ts` | TanStack Query hook for referenceables |
| `frontend/src/components/editor/styles/editor.css` | ProseMirror + custom editor styles |
| `backend/alembic/versions/xxx_rich_text_columns.py` | Alembic migration for JSON columns |

### Modified Files

| File | Changes |
|------|---------|
| **Backend** | |
| `backend/app/models/task.py` | `description` -> `JSON`, add `description_text: Text` |
| `backend/app/models/comment.py` | `content` -> `JSON`, add `content_text: Text` |
| `backend/app/models/__init__.py` | No change (no new models) |
| `backend/app/schemas/task.py` | `description: str \| dict \| None`, add `description_text` to response |
| `backend/app/schemas/comment.py` | `content: str \| dict`, add `content_text` to response |
| `backend/app/schemas/notification.py` | Add `mentioned: bool = True` to `NotificationPreferences` |
| `backend/app/schemas/__init__.py` | No change (no new schemas to export) |
| `backend/app/services/task_service.py` | Call `normalize_content()`, `extract_plain_text()`, handle mention notifications |
| `backend/app/api/v1/tasks.py` | Import content_service, process mentions on create/update |
| `backend/app/api/v1/comments.py` | Import content_service, process mentions on create/update |
| `backend/app/api/v1/search.py` | Search `description_text` alongside `title` |
| `backend/app/crud/task.py` | Update search filter to include `description_text` |
| `backend/app/main.py` | Register `mentionables` router |
| **Frontend** | |
| `frontend/package.json` | Add all `@tiptap/*` and `lowlight` dependencies |
| `frontend/src/types/task.ts` | Update `Task.description`, `Comment.content` types |
| `frontend/src/types/index.ts` | Re-export `editor.ts` types |
| `frontend/src/lib/api-client.ts` | Add `getMentionables()`, `getReferenceables()` methods |
| `frontend/src/components/board/TaskDetailPanel.tsx` | Replace `<Textarea>` description with `<RichTextEditor variant="full">` |
| `frontend/src/components/tasks/TaskComments.tsx` | Replace `<Textarea>` comment input with `<RichTextEditor variant="compact">`, replace plain text display with `<RichTextRenderer>` |
| `frontend/src/components/tasks/TaskForm.tsx` | Replace `<Textarea>` description with `<RichTextEditor variant="full">` |
| `frontend/src/components/board/TaskCard.tsx` | Use `description_text` for preview instead of `description` |
| `frontend/src/components/dashboard/MyTasksSection.tsx` | Use `description_text` if description preview is shown |
| `frontend/src/hooks/useTasks.ts` | No changes (API shape unchanged, just field type changes) |
| `frontend/src/hooks/useComments.ts` | No changes (same reason) |

### NPM Packages to Install

```bash
npm install \
  @tiptap/react \
  @tiptap/pm \
  @tiptap/starter-kit \
  @tiptap/extension-underline \
  @tiptap/extension-link \
  @tiptap/extension-code-block-lowlight \
  @tiptap/extension-task-list \
  @tiptap/extension-task-item \
  @tiptap/extension-table \
  @tiptap/extension-table-row \
  @tiptap/extension-table-cell \
  @tiptap/extension-table-header \
  @tiptap/extension-image \
  @tiptap/extension-placeholder \
  @tiptap/extension-mention \
  @tiptap/extension-typography \
  @tiptap/extension-character-count \
  lowlight
```

No additional backend pip packages required. SQLAlchemy's `JSON` type is built-in.

---

## Implementation Order

Recommended build sequence:

1. **Backend: content_service.py** -- normalization, extraction utilities. Add unit tests.
2. **Backend: DB migration** -- add JSON columns, run data migration.
3. **Backend: schema changes** -- update Pydantic schemas for dual string/dict accept.
4. **Backend: task_service + comments route** -- integrate content_service, mention extraction.
5. **Backend: mentionables endpoint** -- new route for autocomplete data.
6. **Frontend: install Tiptap packages**.
7. **Frontend: editor types** -- `editor.ts` type definitions.
8. **Frontend: RichTextEditor component** -- core editor with toolbar, both variants.
9. **Frontend: editor styles** -- ProseMirror CSS, custom dark theme styles.
10. **Frontend: RichTextRenderer** -- read-only renderer.
11. **Frontend: integrate into TaskDetailPanel** -- replace textarea, test save/load cycle.
12. **Frontend: integrate into TaskComments** -- replace textarea + display.
13. **Frontend: integrate into TaskForm** -- replace textarea.
14. **Frontend: MentionSuggestion** -- @ autocomplete popup + API hook.
15. **Frontend: ReferenceSuggestion** -- # autocomplete popup + API hook.
16. **Frontend: mention/reference rendering** -- chips, links, navigation.
17. **Backend: mention notifications** -- wire into notification pipeline.
18. **Frontend: update TaskCard** -- use `description_text` for preview.
19. **Full integration testing** -- create tasks with rich content, mentions, references; verify notifications, search, rendering.

---

## Unresolved Questions

- Image paste/upload: reuse existing attachment endpoint or create a dedicated image upload endpoint with auto-resize?
- Max document size limit? (e.g., 100KB JSON payload)
- Should `#` references also link to individual task IDs (e.g., `#ABC123` short codes)?
- Agent mentions: should they trigger any action (webhook, activity log) or just be visual?
- Collaborative editing (Yjs): defer entirely or lay groundwork in extension setup?
- Should the compact editor (comments) support task lists and code blocks?
