# Task Cover Image & Card Customization

## 1. Overview

Add cover images (uploaded, color, gradient) and card display modes (compact/detailed) to Kanban task cards. Covers display at the top of both board cards and the detail panel. Users choose a cover source via a visual picker in TaskDetailPanel.

### User Stories

- As a user, I can upload an image or pick an existing image attachment as a task cover
- As a user, I can set a solid color or gradient as a task cover
- As a user, I can choose between full-height and half-height cover display
- As a user, I can remove a cover
- As a user, I can toggle between compact and detailed card views on the board

### Trello/Notion Comparison

| Feature | Trello | Notion | AgentBoard (this plan) |
|---------|--------|--------|----------------------|
| Image cover | Upload or from attachment | Page cover image | Both |
| Color cover | 10 colors | Gradient or color | 16 colors + 12 gradients |
| Cover sizes | Full / half | Full only | Full / half |
| Card density | N/A | Toggle views | Compact / detailed toggle |
| Gradient covers | No | Yes | Yes (12 presets) |

---

## 2. Data Model

### Task Model Additions

Add 3 nullable columns to the `tasks` table:

```python
# backend/app/models/task.py — new fields

cover_type: Mapped[str | None] = mapped_column(String(20))
# Values: None (no cover), "image", "color", "gradient"

cover_value: Mapped[str | None] = mapped_column(String(500))
# - image: attachment UUID string
# - color: hex string e.g. "#3B82F6"
# - gradient: preset key e.g. "sunset", "ocean"

cover_size: Mapped[str | None] = mapped_column(String(10))
# Values: None (defaults to "full"), "full", "half"
```

No new tables. No new relationships. The `cover_value` for images references an existing `Attachment.id` (not a foreign key — soft reference to avoid cascade complexity).

### Migration

Create `backend/alembic/versions/<hash>_add_task_cover_fields.py`:

```python
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
```

Uses `batch_alter_table` for SQLite compatibility (same pattern as existing migrations).

---

## 3. Backend API

### Modified Endpoints

No new endpoints needed. Cover fields flow through existing task CRUD:

#### `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}`

Accepts new optional fields in `TaskUpdate`:

```python
cover_type: Literal["image", "color", "gradient"] | None = None
cover_value: str | None = None
cover_size: Literal["full", "half"] | None = None
```

Special handling: sending `cover_type: None` with `cover_value: None` clears the cover (remove cover action). The `TaskService.update_task` already handles `exclude_unset=True`, so omitted fields are not touched.

#### `TaskResponse` — Include Cover Data

```python
cover_type: str | None = None
cover_value: str | None = None
cover_size: str | None = None
cover_image_url: str | None = None  # computed: resolved download URL when type=image
```

The `cover_image_url` is a computed field in `TaskResponse` via a `model_validator`:

```python
@model_validator(mode="before")
@classmethod
def resolve_cover_image_url(cls, data):
    if hasattr(data, "cover_type") and data.cover_type == "image" and data.cover_value:
        data.__dict__["cover_image_url"] = f"/api/v1/attachments/{data.cover_value}/download"
    return data
```

This reuses the existing attachment download endpoint — no new file serving logic.

#### Cover Validation in TaskService

In `TaskService.update_task`, add validation when `cover_type` is in `update_data`:

```python
if "cover_type" in update_data:
    ct = update_data.get("cover_type")
    cv = update_data.get("cover_value")
    if ct == "image" and cv:
        # Verify attachment exists and belongs to this task
        att = await crud_attachment.get(db, UUID(cv))
        if not att or att.task_id != task.id:
            raise HTTPException(400, "Invalid attachment for cover")
        if not att.mime_type.startswith("image/"):
            raise HTTPException(400, "Attachment is not an image")
    elif ct == "color" and cv:
        # Validate hex color format
        if not re.match(r'^#[0-9A-Fa-f]{6}$', cv):
            raise HTTPException(400, "Invalid hex color")
    elif ct == "gradient" and cv:
        if cv not in GRADIENT_PRESETS:
            raise HTTPException(400, "Invalid gradient preset")
    elif ct is None:
        # Clear cover — set all three fields to None
        update_data["cover_value"] = None
        update_data["cover_size"] = None
```

#### Gradient Presets (Backend Constant)

```python
# backend/app/services/task_service.py or a new constants file

GRADIENT_PRESETS = {
    "sunset":   "linear-gradient(135deg, #f97316, #ec4899)",
    "ocean":    "linear-gradient(135deg, #06b6d4, #3b82f6)",
    "forest":   "linear-gradient(135deg, #22c55e, #14b8a6)",
    "lavender": "linear-gradient(135deg, #a78bfa, #818cf8)",
    "rose":     "linear-gradient(135deg, #fb7185, #f472b6)",
    "ember":    "linear-gradient(135deg, #ef4444, #f97316)",
    "slate":    "linear-gradient(135deg, #64748b, #475569)",
    "midnight": "linear-gradient(135deg, #1e3a5f, #312e81)",
    "aurora":   "linear-gradient(135deg, #22d3ee, #a78bfa)",
    "golden":   "linear-gradient(135deg, #f59e0b, #eab308)",
    "storm":    "linear-gradient(135deg, #6366f1, #8b5cf6)",
    "mint":     "linear-gradient(135deg, #34d399, #6ee7b7)",
}
```

#### Activity Logging

Cover changes log to activity with `changes: { "cover": "cover updated" }` or `"cover removed"`. Added to `FIELD_LABELS` dict in task_service.py.

---

## 4. Storage Integration

### Cover Images Reuse Existing Attachments

Covers do NOT have their own upload flow. The workflow is:

1. User uploads a file via the existing attachment system (TaskAttachments tab)
2. User picks that attachment as cover via the Cover Picker
3. Backend stores the attachment UUID in `cover_value`
4. Frontend resolves the display URL via `/api/v1/attachments/{id}/download`

Alternatively, the cover picker can include a direct upload button that:
1. Uploads via `POST .../attachments/` (existing endpoint)
2. Immediately sets the returned attachment ID as `cover_value`

This is a two-step mutation on the frontend (upload, then update task), composed in a single user action.

### Thumbnail Generation (Deferred)

Phase 1: Use CSS `object-fit: cover` with explicit height constraints. The browser handles scaling. This is simple, works with existing storage, and covers load from the same endpoint.

Phase 2 (optional): Add server-side thumbnail generation in `storage_service.py` using Pillow. Generate a 400px-wide thumbnail on upload for image attachments. Store as `{subdir}/thumb_{uuid}.webp`. Not needed for MVP — CSS scaling is sufficient and the images are already task-scoped (not massive).

---

## 5. Frontend Types

### Updated `Task` Interface

```typescript
// frontend/src/types/task.ts

export type CoverType = 'image' | 'color' | 'gradient'
export type CoverSize = 'full' | 'half'

export interface Task {
  // ... existing fields ...
  cover_type: CoverType | null
  cover_value: string | null
  cover_size: CoverSize | null
  cover_image_url: string | null
}
```

### Updated `TaskUpdate` Interface

```typescript
export interface TaskUpdate {
  // ... existing fields ...
  cover_type?: CoverType | null
  cover_value?: string | null
  cover_size?: CoverSize | null
}
```

### Gradient Preset Map (Frontend Constant)

```typescript
// frontend/src/lib/cover-presets.ts

export const GRADIENT_PRESETS: Record<string, string> = {
  sunset:   'linear-gradient(135deg, #f97316, #ec4899)',
  ocean:    'linear-gradient(135deg, #06b6d4, #3b82f6)',
  forest:   'linear-gradient(135deg, #22c55e, #14b8a6)',
  lavender: 'linear-gradient(135deg, #a78bfa, #818cf8)',
  rose:     'linear-gradient(135deg, #fb7185, #f472b6)',
  ember:    'linear-gradient(135deg, #ef4444, #f97316)',
  slate:    'linear-gradient(135deg, #64748b, #475569)',
  midnight: 'linear-gradient(135deg, #1e3a5f, #312e81)',
  aurora:   'linear-gradient(135deg, #22d3ee, #a78bfa)',
  golden:   'linear-gradient(135deg, #f59e0b, #eab308)',
  storm:    'linear-gradient(135deg, #6366f1, #8b5cf6)',
  mint:     'linear-gradient(135deg, #34d399, #6ee7b7)',
}

export const COLOR_PRESETS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
  '#F43F5E', '#64748B', '#78716C', '#1E293B',
] as const
```

### Card Display Mode (Per-User Local Preference)

```typescript
// Stored in localStorage key: 'agentboard-card-mode'
// Values: 'detailed' (default) | 'compact'
```

Not a Zustand store — a simple `localStorage` value read once on mount. A small hook wraps it:

```typescript
// frontend/src/hooks/useCardDisplayMode.ts

export function useCardDisplayMode() {
  const [mode, setModeState] = useState<'compact' | 'detailed'>(() => {
    return (localStorage.getItem('agentboard-card-mode') as 'compact' | 'detailed') || 'detailed'
  })
  const setMode = (m: 'compact' | 'detailed') => {
    localStorage.setItem('agentboard-card-mode', m)
    setModeState(m)
  }
  return { mode, setMode }
}
```

---

## 6. Frontend Hooks

No new TanStack Query hooks needed. Cover mutations use the existing `useUpdateTask`:

```typescript
// Setting a cover
updateTask.mutate({
  taskId: task.id,
  data: { cover_type: 'color', cover_value: '#3B82F6', cover_size: 'full' }
})

// Removing a cover
updateTask.mutate({
  taskId: task.id,
  data: { cover_type: null, cover_value: null, cover_size: null }
})

// Upload + set as cover (composed action)
const uploadAndSetCover = async (file: File) => {
  const res = await api.uploadAttachment(projectId, boardId, taskId, file)
  const attachmentId = res.data.id
  updateTask.mutate({
    taskId: task.id,
    data: { cover_type: 'image', cover_value: attachmentId, cover_size: 'full' }
  })
}
```

The existing `useUploadAttachment` hook can also be used, followed by `useUpdateTask` in `onSuccess`.

---

## 7. TaskCard Redesign

### Current Card Structure (No Cover)

```
+--[3px priority border]---------------------------+
| Title                                             |
| Description (2-line clamp)                        |
| [Label] [Label] [+2]                             |
| ───────────────────────────────                   |
| Calendar icon Due · Comments icon 3     Avatars   |
+---------------------------------------------------+
```

### New Card Structure (With Cover)

**Full cover (120px):**
```
+--[3px priority border]---------------------------+
| ┌───────────────────────────────────────────────┐ |
| │          COVER IMAGE / COLOR / GRADIENT        │ |
| │              (120px height)                    │ |
| └───────────────────────────────────────────────┘ |
| Title                                             |
| Description (2-line clamp)                        |
| [Label] [Label] [+2]                             |
| ───────────────────────────────────               |
| Calendar icon Due · Comments icon 3     Avatars   |
+---------------------------------------------------+
```

**Half cover (56px):**
```
+--[3px priority border]---------------------------+
| ┌───────────────────────────────────────────────┐ |
| │    COVER (56px height, tighter)               │ |
| └───────────────────────────────────────────────┘ |
| Title                                             |
| ... rest of card ...                              |
+---------------------------------------------------+
```

**Compact mode (no cover, minimal info):**
```
+--[3px priority border]---------------------------+
| Title                     [dot][dot]   Avatars    |
+---------------------------------------------------+
```

Compact mode shows: title, mini label color dots (not full label pills), assignee avatars. No description, no due date text, no comment count, no cover.

### TaskCard Implementation Changes

```tsx
// frontend/src/components/board/TaskCard.tsx

export function TaskCard({ task, onClick, isDragOverlay, compact }: TaskCardProps) {
  const hasCover = !compact && task.cover_type && task.cover_value
  const coverHeight = task.cover_size === 'half' ? 56 : 120

  return (
    <div onClick={onClick} ...existing classes...>
      {/* Cover */}
      {hasCover && (
        <div
          className="rounded-t-[9px] -mx-3.5 -mt-3.5 mb-3 overflow-hidden bg-[var(--overlay)]"
          style={{ height: coverHeight }}
        >
          {task.cover_type === 'image' && task.cover_image_url && (
            <img
              src={task.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          {task.cover_type === 'color' && (
            <div
              className="w-full h-full"
              style={{ backgroundColor: task.cover_value! }}
            />
          )}
          {task.cover_type === 'gradient' && (
            <div
              className="w-full h-full"
              style={{ background: GRADIENT_PRESETS[task.cover_value!] }}
            />
          )}
        </div>
      )}

      {/* Title — always shown */}
      <span className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 block">
        {task.title}
      </span>

      {compact ? (
        /* Compact: inline label dots + avatars */
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex gap-1">
            {task.labels.slice(0, 5).map(l => (
              <span key={l.id} className="size-2 rounded-full" style={{ backgroundColor: l.color }} />
            ))}
          </div>
          {/* Avatars (same as existing) */}
        </div>
      ) : (
        /* Detailed: full existing layout */
        <>
          {/* ...existing description, labels, divider, footer... */}
        </>
      )}
    </div>
  )
}
```

### Cover Rendering Details

**Image covers:**
- `object-fit: cover` for consistent aspect ratio
- `loading="lazy"` for performance
- Negative margins (`-mx-3.5 -mt-3.5`) to bleed edge-to-edge within card padding
- `rounded-t-[9px]` matches the card's `rounded-xl` minus 1px for border inset
- On error: hide the cover element (onError handler sets display:none or shows fallback)

**Color covers:**
- Simple `backgroundColor` div, full bleed
- Subtle inner shadow for depth: `box-shadow: inset 0 -1px 0 0 rgba(0,0,0,0.06)`

**Gradient covers:**
- CSS `background` property from preset map
- Same inner shadow treatment

### Skeleton Loading for Cover Images

When the board first loads and tasks have image covers, show a shimmer placeholder:

```tsx
const [imgLoaded, setImgLoaded] = useState(false)

{task.cover_type === 'image' && (
  <>
    {!imgLoaded && <div className="w-full h-full skeleton" />}
    <img
      src={task.cover_image_url!}
      onLoad={() => setImgLoaded(true)}
      className={cn('w-full h-full object-cover', !imgLoaded && 'hidden')}
      loading="lazy"
    />
  </>
)}
```

Uses the existing `.skeleton` CSS class (shimmer animation already defined in globals.css).

---

## 8. TaskDetailPanel Cover Section

### Cover Display Area

Insert a cover preview between the priority accent bar and the top bar:

```
┌──────────────────────────────────────────────┐
│ [priority accent bar 3px]                     │
│ ┌──────────────────────────────────────────┐  │
│ │        COVER PREVIEW (180px max)          │  │
│ │                                          │  │
│ │    [Change Cover]  [Remove]              │  │
│ └──────────────────────────────────────────┘  │
│ [top bar: task ID · status · close]           │
│ ...                                           │
```

When hovered, the cover area shows overlay buttons: "Change Cover" and a trash icon for "Remove".

If no cover is set, a subtle "Add Cover" button appears in the properties section (new `PropertyRow` with `ImageIcon`).

### Cover Section Implementation

```tsx
{/* Cover area — between accent bar and top bar */}
{displayTask.cover_type && displayTask.cover_value ? (
  <div className="relative group shrink-0" style={{ height: 180 }}>
    {/* Cover content */}
    {displayTask.cover_type === 'image' && displayTask.cover_image_url && (
      <img
        src={displayTask.cover_image_url}
        alt=""
        className="w-full h-full object-cover"
      />
    )}
    {displayTask.cover_type === 'color' && (
      <div className="w-full h-full" style={{ backgroundColor: displayTask.cover_value }} />
    )}
    {displayTask.cover_type === 'gradient' && (
      <div className="w-full h-full" style={{ background: GRADIENT_PRESETS[displayTask.cover_value] }} />
    )}

    {/* Hover overlay with actions */}
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end gap-2 p-3 opacity-0 group-hover:opacity-100">
      <button onClick={() => setShowCoverPicker(true)} className="...">
        <ImageIcon className="size-3.5" /> Change Cover
      </button>
      <button onClick={handleRemoveCover} className="...">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  </div>
) : null}
```

When no cover exists, add a "Cover" property row in the property section:

```tsx
<PropertyRow icon={ImageIcon} label="Cover">
  <button
    onClick={() => setShowCoverPicker(true)}
    className="text-sm text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors"
  >
    Add cover...
  </button>
</PropertyRow>
```

---

## 9. Cover Picker Component

### Architecture

New file: `frontend/src/components/tasks/CoverPicker.tsx`

Rendered as a Popover (not a dialog) anchored to the "Change Cover" / "Add cover" button. Tabs for each cover source.

### Layout

```
┌─ Cover Picker ──────────────────────────────┐
│  [Upload]  [Attachments]  [Colors]  [Gradients] │
│ ─────────────────────────────────────────────│
│                                              │
│  (Tab content area)                          │
│                                              │
│ ─────────────────────────────────────────────│
│  Size: [Full ●] [Half ○]      [Remove Cover] │
└──────────────────────────────────────────────┘
```

Width: 360px. Max height: 400px with scroll in content area.

### Tab: Upload

Simple drop zone (reuses pattern from TaskAttachments):

```tsx
<div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent-solid)]">
  <Upload className="size-6 mx-auto mb-2 text-[var(--text-tertiary)]" />
  <p className="text-sm text-[var(--text-tertiary)]">Click or drag an image</p>
  <p className="text-xs text-[var(--text-tertiary)] mt-1">JPG, PNG, GIF, WebP — max 10MB</p>
</div>
```

On file select: upload via `api.uploadAttachment`, then `updateTask` with `cover_type: 'image'`. Show spinner during upload. Accept only `image/*` mime types via the file input's `accept` attribute.

### Tab: Attachments

Grid of image attachments already on this task. Non-image attachments hidden.

```tsx
<div className="grid grid-cols-3 gap-2">
  {imageAttachments.map(att => (
    <button
      key={att.id}
      onClick={() => selectAttachmentAsCover(att.id)}
      className={cn(
        "aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.03]",
        att.id === currentCoverValue ? "border-[var(--accent-solid)] ring-2 ring-[var(--ring)]" : "border-transparent"
      )}
    >
      <img src={`/api/v1/attachments/${att.id}/download`} className="w-full h-full object-cover" />
    </button>
  ))}
</div>
```

If no image attachments exist, show: "No images attached. Upload one or use a color."

### Tab: Colors

4x4 grid of color swatches:

```tsx
<div className="grid grid-cols-8 gap-2">
  {COLOR_PRESETS.map(color => (
    <button
      key={color}
      onClick={() => selectColor(color)}
      className={cn(
        "size-9 rounded-lg transition-all hover:scale-110",
        color === currentCoverValue && coverType === 'color'
          ? "ring-2 ring-[var(--accent-solid)] ring-offset-2 ring-offset-[var(--elevated)]"
          : ""
      )}
      style={{ backgroundColor: color }}
    />
  ))}
</div>
```

Below the grid: a custom hex input field for power users:

```tsx
<div className="flex gap-2 mt-3">
  <Input
    placeholder="#000000"
    value={customHex}
    onChange={handleHexChange}
    className="flex-1 h-8 text-sm font-mono"
    maxLength={7}
  />
  <button onClick={() => selectColor(customHex)} className="...">Apply</button>
</div>
```

### Tab: Gradients

3x4 grid of gradient preview swatches:

```tsx
<div className="grid grid-cols-4 gap-2">
  {Object.entries(GRADIENT_PRESETS).map(([key, css]) => (
    <button
      key={key}
      onClick={() => selectGradient(key)}
      className={cn(
        "aspect-[3/2] rounded-lg transition-all hover:scale-105",
        key === currentCoverValue && coverType === 'gradient'
          ? "ring-2 ring-[var(--accent-solid)] ring-offset-2 ring-offset-[var(--elevated)]"
          : ""
      )}
      style={{ background: css }}
    />
  ))}
</div>
```

### Size Toggle + Remove

Footer of the popover:

```tsx
<div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-3 py-2.5">
  <div className="flex items-center gap-2">
    <span className="text-xs text-[var(--text-tertiary)]">Size:</span>
    <button
      onClick={() => setCoverSize('full')}
      className={cn("text-xs px-2 py-0.5 rounded-md", size === 'full' ? "bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]" : "text-[var(--text-tertiary)]")}
    >Full</button>
    <button
      onClick={() => setCoverSize('half')}
      className={cn("text-xs px-2 py-0.5 rounded-md", size === 'half' ? "bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]" : "text-[var(--text-tertiary)]")}
    >Half</button>
  </div>
  <button
    onClick={handleRemoveCover}
    className="text-xs text-[var(--text-tertiary)] hover:text-destructive transition-colors"
  >
    Remove
  </button>
</div>
```

---

## 10. UI Design Specifications

### Design Language

Follows the existing AgentBoard aesthetic: dark elevated surfaces (`var(--elevated)`), subtle borders (`var(--border-subtle)`), blue accent (`var(--accent-solid)`), General Sans body font, Satoshi headings. No new fonts or colors introduced.

### Cover on Board Card

| Property | Full Cover | Half Cover |
|----------|-----------|------------|
| Height | 120px | 56px |
| Border radius | `rounded-t-[9px]` (matches card minus border) |
| Margin | `-mx-3.5 -mt-3.5 mb-3` (bleeds to card edges) |
| Image fit | `object-fit: cover; object-position: center` |
| Color/gradient | Fills container, subtle `inset 0 -1px 0 rgba(0,0,0,0.06)` shadow |
| Loading | `.skeleton` shimmer, same height |
| Error | Hide img, show `var(--overlay)` fallback |

### Cover on Detail Panel

| Property | Value |
|----------|-------|
| Height | 180px |
| Position | Below accent bar, above top bar |
| Border radius | None (flush with panel edges) |
| Hover | Overlay with black/30, action buttons slide up |
| Action buttons | `bg-black/60 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-1.5` |

### Cover Picker Popover

| Property | Value |
|----------|-------|
| Width | 360px |
| Max height | 400px |
| Background | `var(--elevated)` |
| Border | `1px solid var(--border-subtle)` |
| Border radius | `rounded-xl` (16px) |
| Shadow | `0 8px 40px -8px rgba(0,0,0,0.25)` |
| Tab style | Line tabs (same as detail panel tabs) |
| Color swatch size | 36px (size-9) |
| Gradient swatch | aspect-ratio 3:2, rounded-lg |
| Selected indicator | `ring-2 ring-[var(--accent-solid)] ring-offset-2` |

### Compact Card Mode

| Property | Value |
|----------|-------|
| Padding | `p-2.5` (reduced from `p-3.5`) |
| Title | Same 13px font, `line-clamp-1` (not 2) |
| Labels | 2px color dots, max 5, no text |
| Avatars | Same size-5 stacked avatars |
| Hidden | Description, due date text, comment count, cover |
| Divider | None |

### Board Header Toggle

Add a segmented control in the board header (next to "New Task" button):

```
[Rows icon] [Grid icon]
```

Uses `LayoutList` (compact) and `LayoutGrid` (detailed) from Lucide. Styled as a pair of toggle buttons with `bg-[var(--surface)]` background and `var(--accent-solid)` for active state.

### Animations

| Interaction | Animation |
|-------------|-----------|
| Cover appear (card) | `opacity 0->1, 200ms ease-out` |
| Cover change (detail) | Crossfade `opacity 200ms` |
| Picker open | Popover default (radix) |
| Color/gradient select | Selected ring with `transition-all 150ms` |
| Compact/detailed toggle | Cards animate height via `transition-all 300ms` (CSS) |
| Remove cover | `opacity 1->0, height collapse, 200ms` |

### Hover Effects

- **Board card with cover**: Same existing hover (`-translate-y-0.5, shadow-lift`). Cover image does not zoom on card hover (too distracting at board scale).
- **Detail panel cover**: On hover shows overlay `bg-black/30` with action buttons fading in (`opacity 0->1, 200ms`).
- **Picker swatches**: `hover:scale-110` for colors, `hover:scale-105` for gradients.
- **Attachment grid items**: `hover:scale-[1.03]` with `transition-transform 150ms`.

---

## 11. Performance

### Lazy Loading

- Board card cover images use `loading="lazy"` attribute (native browser lazy loading)
- Only images in/near viewport load — dnd-kit renders all cards but most are off-screen in wide boards
- Detail panel cover loads eagerly (always visible when panel opens)

### Image Optimization

- CSS `object-fit: cover` handles all sizing — no server-side resize needed for MVP
- Consider adding `width` and `height` attributes to prevent layout shift (set to card width x cover height)
- WebP/AVIF support: the storage service preserves original format. Users uploading optimized formats get faster loads automatically

### Skeleton Loading

- Use existing `.skeleton` CSS class (shimmer animation)
- Skeleton shown while `<img>` loads, hidden via `onLoad` callback
- Color/gradient covers render instantly (no skeleton needed)

### Render Performance

- Cover images in cards are small DOM elements — no significant render cost
- `compact` mode reduces DOM nodes per card (fewer elements = faster paint)
- The cover data is already included in `TaskResponse` — no additional API calls

### WebSocket Updates

Cover changes propagate via existing `task.updated` WS event. The `boardStore.updateTask` merges new cover fields automatically. Image URLs don't change (same attachment ID), so no cache-busting needed.

---

## 12. Responsive Design

### Mobile (< 640px)

- **Board cards**: Cover height reduced to 80px (full) / 40px (half)
- **Detail panel**: Cover height reduced to 140px
- **Cover picker**: Full-width popover (not anchored), slides up from bottom
- **Compact mode**: Default on mobile screens (auto-switch via media query or keep user preference)

### Tablet (640px - 1024px)

- Board cards: Standard cover heights
- Cover picker: Standard 360px popover

### Implementation

```tsx
// Cover height responsive
const coverHeight = useMemo(() => {
  const base = task.cover_size === 'half' ? 56 : 120
  // Could use window.innerWidth check or just use CSS
  return base
}, [task.cover_size])
```

Prefer CSS-only responsive adjustments:

```tsx
<div
  className="rounded-t-[9px] -mx-3.5 -mt-3.5 mb-3 overflow-hidden bg-[var(--overlay)]"
  style={{
    height: task.cover_size === 'half' ? 56 : 120,
  }}
>
```

Mobile height override via Tailwind: `h-20 sm:h-[120px]` for full, `h-10 sm:h-14` for half. But since height varies by cover_size, inline style is cleaner.

---

## 13. Edge Cases

### Deleted Attachment Used as Cover

When an attachment is deleted (`DELETE .../attachments/{id}`), the task's `cover_value` still references it. The download endpoint returns 404.

**Handling:**
- Frontend: `<img>` `onError` handler hides the cover and shows nothing (graceful degradation)
- Backend: In `delete_attachment` endpoint, add a check — if the deleted attachment is any task's `cover_value`, clear that task's cover fields:

```python
# In attachments.py delete_attachment handler, after storage.delete:
if attachment.task_id:
    task = await crud_task.get(db, attachment.task_id)
    if task and task.cover_type == "image" and str(task.cover_value) == str(attachment_id):
        task.cover_type = None
        task.cover_value = None
        task.cover_size = None
        db.add(task)
```

### Large Images

- Upload already enforced at 10MB (`MAX_FILE_SIZE`)
- CSS `object-fit: cover` handles any aspect ratio
- Very wide or tall images: no problem, always cropped to container
- Animated GIFs: Render but may be heavy. No special handling for MVP

### Broken Image URLs

- `onError` on `<img>` hides the cover element
- Never show a broken image icon to users

### Cover on Drag Overlay

When dragging a card with a cover, the `DragOverlay` renders a `TaskCard` with `isDragOverlay=true`. The cover should still display on the overlay card for visual continuity.

### Bulk Operations

- Bulk update/move/delete: cover fields are not affected by bulk operations (they're not in `BulkTaskUpdate.updates`)
- If a bulk delete removes a task, any cover reference is gone with the task (CASCADE)

### Task Duplication (Future)

If task duplication is added later, the cover fields should be copied. Image cover references the same attachment (which still exists on the original task). This works because attachment IDs are stable.

### No Cover Value Without Type

If `cover_value` is set but `cover_type` is null, treat as no cover. The frontend checks `task.cover_type && task.cover_value` before rendering.

---

## 14. File Changes

### Backend — New Files

| File | Purpose |
|------|---------|
| `backend/alembic/versions/<hash>_add_task_cover_fields.py` | Migration adding 3 columns to tasks |
| `backend/app/core/constants.py` | `GRADIENT_PRESETS` dict (could also go in task_service.py) |

### Backend — Modified Files

| File | Changes |
|------|---------|
| `backend/app/models/task.py` | Add `cover_type`, `cover_value`, `cover_size` mapped columns |
| `backend/app/schemas/task.py` | Add cover fields to `TaskCreate`, `TaskUpdate`, `TaskResponse`; add `cover_image_url` computed field with validator |
| `backend/app/services/task_service.py` | Add `FIELD_LABELS["cover"]`; add cover validation in `update_task`; import `GRADIENT_PRESETS` |
| `backend/app/api/v1/attachments.py` | In `delete_attachment`: clear cover if deleted attachment was a cover |

### Frontend — New Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/cover-presets.ts` | `GRADIENT_PRESETS` map, `COLOR_PRESETS` array |
| `frontend/src/components/tasks/CoverPicker.tsx` | Cover picker popover with tabs (Upload, Attachments, Colors, Gradients) |
| `frontend/src/hooks/useCardDisplayMode.ts` | localStorage-backed compact/detailed toggle hook |

### Frontend — Modified Files

| File | Changes |
|------|---------|
| `frontend/src/types/task.ts` | Add `CoverType`, `CoverSize` types; add `cover_type`, `cover_value`, `cover_size`, `cover_image_url` to `Task`; add cover fields to `TaskUpdate` |
| `frontend/src/components/board/TaskCard.tsx` | Add cover rendering at card top; add `compact` prop; handle image loading/error states |
| `frontend/src/components/board/TaskDetailPanel.tsx` | Add cover preview area above top bar; add "Cover" property row; integrate CoverPicker; add cover remove handler |
| `frontend/src/components/board/KanbanBoard.tsx` | Pass `compact` prop from `useCardDisplayMode` to TaskCard via BoardColumn |
| `frontend/src/components/board/BoardColumn.tsx` | Accept and forward `compact` prop to TaskCard |
| `frontend/src/components/board/SortableTaskCard.tsx` | Forward `compact` prop |
| `frontend/src/pages/BoardPage.tsx` | Add display mode toggle button in header; use `useCardDisplayMode` hook |

### Summary Counts

- **New files**: 4 (1 backend, 3 frontend)
- **Modified files**: 10 (4 backend, 6 frontend)
- **Total**: 14 files
- **New DB columns**: 3 (all nullable, no data migration needed)
- **New API endpoints**: 0 (reuses existing task update + attachment upload)
- **New components**: 1 (`CoverPicker`)
- **New hooks**: 1 (`useCardDisplayMode`)

---

## Implementation Order

1. **Backend model + migration** — Add columns, run migration
2. **Backend schemas** — Update TaskCreate/TaskUpdate/TaskResponse with cover fields
3. **Backend service** — Add cover validation in TaskService, attachment delete cleanup
4. **Frontend types** — Update Task/TaskUpdate types
5. **Frontend presets** — Create cover-presets.ts
6. **TaskCard** — Add cover rendering + compact mode
7. **CoverPicker** — Build the picker component
8. **TaskDetailPanel** — Integrate cover display + picker
9. **Board header** — Add display mode toggle
10. **Polish** — Skeleton loading, error handling, responsive adjustments
