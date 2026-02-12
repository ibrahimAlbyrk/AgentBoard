# Frontend Components Map

## Entry Points

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/App.tsx`
- **Purpose**: Root component defining route configuration and auth-guarded navigation.
- `App` (default export) — Renders `<Routes>` tree with all page routes
- `ProtectedRoute` — Wrapper that redirects unauthenticated users to `/login`
- Route config:
  - `/login` -> `LoginPage`
  - `/register` -> `RegisterPage`
  - `/` -> redirect to `/dashboard`
  - `/dashboard` -> `DashboardPage` (protected)
  - `/projects` -> `ProjectsPage` (protected)
  - `/projects/:projectId` -> `BoardListPage` (protected)
  - `/projects/:projectId/boards/:boardId` -> `BoardPage` (protected)
  - `/settings` -> `SettingsPage` (protected)
- All protected routes wrapped in `AppLayout` (provides sidebar + header shell)
- Key state/hooks used: `useAuthStore`

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/main.tsx`
- **Purpose**: Application bootstrap — mounts React root with global providers.
- Providers (outer to inner): `React.StrictMode` > `ThemeProvider` (next-themes, default dark) > `QueryClientProvider` (TanStack Query) > `BrowserRouter`
- QueryClient config: `refetchOnWindowFocus: false`, `retry: 1`, `staleTime: 30000`
- Renders `<App />` + `<Toaster>` (sonner, top-right)

---

## Pages

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/pages/LoginPage.tsx`
- **Purpose**: Email/password login form with Zod validation and animated gradient background.
- `LoginPage` (named export) — Route: `/login`
- Form fields: email, password (validated via zod + react-hook-form)
- On success: calls `authStore.login()`, navigates to `/dashboard`
- Key state/hooks used: useState, useNavigate, useForm, useAuthStore

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/pages/RegisterPage.tsx`
- **Purpose**: User registration form with email, username, password, and password confirmation.
- `RegisterPage` (named export) — Route: `/register`
- Form fields: email, username, full_name (optional), password, confirm_password
- Zod refine validates password match
- On success: calls `authStore.register()`, navigates to `/dashboard`
- Key state/hooks used: useState, useNavigate, useForm, useAuthStore

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/pages/DashboardPage.tsx`
- **Purpose**: Overview page showing stats cards (projects, tasks, in-progress, overdue), my-tasks section, recent project grid, and project edit form.
- `DashboardPage` (named export) — Route: `/dashboard`
- Displays greeting with user name, 4 stat cards (via `api.getDashboardStats()`), `MyTasksSection`, up to 6 `ProjectCard` components
- Archive/unarchive and delete project actions inline
- `ProjectForm` dialog for editing projects
- Links to `/projects` for "View all"
- Key state/hooks used: useState, useNavigate, useQueryClient, useAuthStore, useProjects, useDeleteProject, useQuery (dashboard-stats), api client

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/pages/ProjectsPage.tsx`
- **Purpose**: Full project list with search, sort (recent/name/tasks), archive toggle, create/edit/delete actions.
- `ProjectsPage` (named export) — Route: `/projects`
- Toolbar: search input, sort dropdown, show/hide archived toggle, project count
- Grid of `ProjectCard` components with edit/archive/delete handlers
- `ProjectForm` dialog for create/edit
- Key state/hooks used: useState, useMemo, useProjects, useDeleteProject, useQueryClient

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/pages/BoardPage.tsx`
- **Purpose**: Main Kanban board view with task creation, detail panel, label manager, filters, and compact/detailed card display toggle.
- `BoardPage` (named export) — Route: `/projects/:projectId/boards/:boardId`
- Header shows project name/icon + board name, compact/detailed view toggle, "Labels" button, "New Task" button, and `TaskFilters`
- Renders `KanbanBoard` (with `compact` prop from display mode), `TaskForm` dialog, `TaskDetailPanel` slide-over, `LabelManager` dialog
- Syncs project/board/tasks data into Zustand stores on load
- Auto-opens task from `?task=` query param
- Key state/hooks used: useState, useEffect, useRef, useParams, useSearchParams, useProject, useBoard, useTasks, useWebSocket, useCardDisplayMode, useProjectStore, useBoardStore

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/pages/BoardListPage.tsx`
- **Purpose**: Lists all boards within a project with create/edit/delete board functionality, plus agents strip and agent manager.
- `BoardListPage` (named export) — Route: `/projects/:projectId`
- Project header with name, icon, description; "Agents" button and "New Board" button
- Agents strip section: shows active agents as pill chips, "Manage" link, empty state with "Add Agent" link
- Grid of board cards with color accent, task/member counts, dropdown menu (edit/delete)
- Create board dialog and edit board dialog with name input and color picker (8 preset colors)
- `AgentManager` dialog for managing project agents
- Helper: `hexToRgb` for CSS color interpolation
- Key state/hooks used: useState, useNavigate, useParams, useProject, useCreateBoard, useUpdateBoard, useDeleteBoard

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/pages/SettingsPage.tsx`
- **Purpose**: User settings with tabs for Profile editing, API key management, and Notification preferences.
- `SettingsPage` (named export) — Route: `/settings`
- Profile tab: edit full name, avatar URL; email/username read-only
- API Keys tab: list, create (with copy-once dialog), delete API keys
- Notifications tab: renders `NotificationSettings` sub-component
- `NotificationSettings` — Event toggles (assigned, updated, moved, deleted, comment, reaction, mentioned), self-notifications, desktop notifications (with browser permission request), per-project muting, email notifications
- `ToggleRow` — Reusable row with label, description, and Switch toggle
- Key state/hooks used: useState, useCallback, useAuthStore, useNotificationPreferences, useUpdateNotificationPreferences, useProjects, api client (direct calls)

---

## Layout Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/layout/AppLayout.tsx`
- **Purpose**: Shell layout with responsive sidebar, header, and main content area via `<Outlet />`.
- `AppLayout` (named export) — Wraps all protected routes
- Mobile sidebar: overlay + slide-in, controlled by `sidebarOpen` state
- Key state/hooks used: useState

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/layout/Sidebar.tsx`
- **Purpose**: Navigation sidebar with workspace links, project list, search, and user profile section.
- `Sidebar` (named export) — Left sidebar panel
- Props: `onClose` (() => void) — closes mobile sidebar
- Sections: brand logo, search input (keyboard shortcut `/`), workspace nav (Dashboard, Projects, Settings), project list (up to 8, filterable), user avatar link
- Key state/hooks used: useState, useRef, useEffect, useLocation, useProjects, useAuthStore

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/layout/Header.tsx`
- **Purpose**: Top header bar with mobile menu toggle, theme toggle, notification popover with mark-read/clear-all, and user dropdown.
- `Header` (named export) — Top navigation bar
- Props: `onMenuClick` (() => void) — opens mobile sidebar
- Notifications popover: list with mark-as-read per item, "Mark all read" action, "Clear" all action; clickable notifications navigate to board with `?task=` param
- User dropdown: Profile link, Logout action
- Helper: `timeAgo` for relative timestamps
- Key state/hooks used: useNavigate, useAuthStore, useNotifications, useUnreadCount, useMarkRead, useClearNotifications

---

## Board Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/BoardColumn.tsx`
- **Purpose**: Single Kanban column with droppable zone, sortable task list, and placeholder support.
- `BoardColumn` (named export) — Renders a status column
- Props: `status` (Status), `tasks` (Task[]), `onTaskClick` ((task: Task) => void), `onAddTask` (() => void), `placeholderIdx` (number), `hideDragSourceId` (string), `compact` (boolean) — enables compact card mode
- Uses `useDroppable` for column-level drop target, `SortableContext` for task ordering
- Passes `compact` prop through to `SortableTaskCard`
- Shows "No tasks" empty state, drop placeholder at `placeholderIdx`
- Key state/hooks used: useDroppable (dnd-kit)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/CustomFieldManager.tsx`
- **Purpose**: Dialog for managing board-scoped custom field definitions with create, edit, delete, and drag-to-reorder.
- `CustomFieldManager` (named export) — Custom field CRUD management dialog
- Props: `projectId` (string), `boardId` (string), `open` (boolean), `onClose` (() => void)
- Animated list/form transition (framer-motion AnimatePresence)
- Field type picker: 8 types (text, number, select, multi_select, date, checkbox, url, person) with icon grid
- Options editor for select/multi_select: color picker per option, add/remove options
- Drag-and-drop reorder via dnd-kit with `SortableFieldRow` sub-component
- Confirm-before-delete pattern per field
- Sub-component: `SortableFieldRow` — sortable row with grip handle, type icon, edit/delete buttons
- Key state/hooks used: useState, useSensors, useCustomFieldDefinitions, useCreateCustomField, useUpdateCustomField, useDeleteCustomField, useReorderCustomFields, AnimatePresence/motion (framer-motion)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/CustomFieldsSection.tsx`
- **Purpose**: Renders custom field values for a task with per-type field renderers and a link to manage field definitions.
- `CustomFieldsSection` (named export) — Custom fields display within task detail panel
- Props: `task` (Task), `projectId` (string), `boardId` (string), `definitions` (CustomFieldDefinition[])
- Maps each definition to the appropriate field renderer component (text, number, select, multi_select, date, checkbox, url, person)
- Shows required indicator dot for unfilled required fields
- Includes "Manage Fields" link and "Add Field" button for empty state
- Embeds `CustomFieldManager` dialog
- Key state/hooks used: useState, useSetFieldValue, useClearFieldValue

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/KanbanBoard.tsx`
- **Purpose**: Core drag-and-drop Kanban board using dnd-kit with custom collision detection and position-based ordering.
- `KanbanBoard` (named export) — Renders columns with DndContext
- Props: `onTaskClick` ((task: Task) => void), `onAddTask` ((statusId: string) => void), `compact` (boolean) — enables compact card display
- Custom `kanbanCollision` detection: pointerWithin for column detection, closestCenter for task proximity
- Handles drag start/move/over/end/cancel with optimistic position updates
- Tilt effect on drag overlay (3D perspective rotation based on velocity)
- Triggers `TaskAnimationLayer` for cross-column flight animations
- Passes `compact` prop through to `BoardColumn` and `TaskCard` (drag overlay)
- Key state/hooks used: useState, useCallback, useRef, useProjectStore, useBoardStore, useMoveTask, markLocalMove

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/SortableTaskCard.tsx`
- **Purpose**: Wrapper around TaskCard that integrates dnd-kit sortable behavior and flight animation awareness.
- `SortableTaskCard` (named export) — Sortable-draggable task card
- Props: `task` (Task), `onClick` (() => void), `hideWhileDragging` (boolean), `compact` (boolean) — compact card display
- Registers card ref for animation layer, shows dashed placeholder when dragging in same column
- Hides card (height: 0) when cross-column dragging
- Passes `compact` prop through to `TaskCard`
- Key state/hooks used: useCallback, useSortable (dnd-kit), useIsFlying, registerCardRef

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/TaskCard.tsx`
- **Purpose**: Visual task card with cover image/color/gradient support, compact mode, checklist progress, and reaction counts.
- `TaskCard` (named export) — Renders a single task card
- Props: `task` (Task), `onClick` (() => void), `isDragOverlay` (boolean), `compact` (boolean) — toggles between compact and detailed layouts
- Cover rendering: image (with lazy load/error handling), solid color, or gradient preset; respects `cover_size` (half/full height)
- Compact mode: single-line title, inline label dots (up to 5), mini assignee avatars
- Detailed mode: title (2-line), description preview, label chips (up to 3 + overflow count), checklist progress bar, due date, comment count, reaction emoji summary, multi-assignee avatars
- Priority-colored left border, overdue date highlighting
- Key state/hooks used: useState

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/TaskDetailPanel.tsx`
- **Purpose**: Floating modal panel for viewing/editing full task properties including cover, rich text description, custom fields, checklists, reactions, comments, attachments, and activity.
- `TaskDetailPanel` (named export) — Full task detail overlay
- Props: `task` (Task | null), `projectId` (string), `boardId` (string), `open` (boolean), `onClose` (() => void)
- Animated with framer-motion (spring scale/opacity entrance, staggered children)
- Cover area: displays image/color/gradient cover with hover overlay for change/remove actions via `CoverPicker`
- Inline-editable title; rich text description via `RichTextEditor` / `RichTextRenderer`
- Vote button and reaction bar (`VoteButton`, `ReactionBar`)
- Property rows: status, priority (Select dropdowns), assignees (`AssigneesPicker`), watchers (`WatchersPicker`), due date (date input with OVERDUE badge), cover (when no cover set), custom fields (`CustomFieldsSection`)
- Labels: toggle buttons for all project labels, "Manage" link opens `LabelManager`
- Checklists section via `ChecklistSection`
- Tabs: Comments (`TaskComments`), Files (`TaskAttachments`), Activity (`TaskActivity`)
- Footer: creator avatar (user or agent), created/updated timestamps
- Sub-components: `PropertyRow` (consistent property row layout), `PersonPicker` (shared popover picker for users + agents), `AssigneesPicker`, `WatchersPicker`
- Key state/hooks used: useState, useEffect, useRef, useProjectStore, useUpdateTask, useCustomFieldDefinitions, AnimatePresence/motion (framer-motion)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/TaskAnimationLayer.tsx`
- **Purpose**: Portal-based overlay that renders animated "flying" task cards during cross-column drag-and-drop transitions.
- `TaskAnimationLayer` (named export) — Fixed overlay rendered via `createPortal`
- Named exports: `registerCardRef`, `getCardRect`, `startFlight`, `endFlight`, `isFlying`, `useIsFlying`
- Module-level state: `cardRefs` (Map of task DOM refs), `flyingMap` (Map of in-flight tasks)
- `FlyingCard` sub-component: spring animation from source rect to destination rect using framer-motion
- Double-RAF technique to wait for layout settle before measuring target position
- Key state/hooks used: useState, useEffect, useLayoutEffect, useSyncExternalStore, createPortal, motion (framer-motion)

---

## Field Renderer Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/index.ts`
- **Purpose**: Barrel export for all custom field renderer components.
- Named exports: `TextFieldRenderer`, `NumberFieldRenderer`, `SelectFieldRenderer`, `MultiSelectFieldRenderer`, `DateFieldRenderer`, `CheckboxFieldRenderer`, `UrlFieldRenderer`, `PersonFieldRenderer`

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/CheckboxFieldRenderer.tsx`
- **Purpose**: Renders a checkbox (Switch toggle) for boolean custom field values.
- `CheckboxFieldRenderer` (named export) — Toggle switch for checkbox fields
- Props: `definition` (CustomFieldDefinition), `value` (CustomFieldValue | null), `onUpdate` ((value: CustomFieldValueSet) => void), `onClear` (() => void)
- Stores checked state as `value_number` (1.0 = true, 0.0 = false)
- Key state/hooks used: (none, presentational)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/DateFieldRenderer.tsx`
- **Purpose**: Renders a native date input for date custom field values.
- `DateFieldRenderer` (named export) — Date picker input for date fields
- Props: `definition` (CustomFieldDefinition), `value` (CustomFieldValue | null), `onUpdate` ((value: CustomFieldValueSet) => void), `onClear` (() => void)
- Stores value as `value_date` string; clears on empty input
- Key state/hooks used: (none, presentational)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/MultiSelectFieldRenderer.tsx`
- **Purpose**: Renders a multi-select popover with colored option chips for multi_select custom field values.
- `MultiSelectFieldRenderer` (named export) — Multi-option picker popover
- Props: `definition` (CustomFieldDefinition), `value` (CustomFieldValue | null), `onUpdate` ((value: CustomFieldValueSet) => void), `onClear` (() => void)
- Toggle selection of options; stores selected IDs as `value_json` (string array)
- Displays selected options as colored chips, checkmarks in dropdown
- Key state/hooks used: (none, presentational)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/NumberFieldRenderer.tsx`
- **Purpose**: Renders an inline-editable number input for number custom field values.
- `NumberFieldRenderer` (named export) — Click-to-edit number input
- Props: `definition` (CustomFieldDefinition), `value` (CustomFieldValue | null), `onUpdate` ((value: CustomFieldValueSet) => void), `onClear` (() => void)
- Click to edit, Enter/blur to save, Escape to cancel; stores as `value_number`
- Key state/hooks used: useState

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/PersonFieldRenderer.tsx`
- **Purpose**: Renders a person picker with stacked avatars and popover for selecting users/agents.
- `PersonFieldRenderer` (named export) — Multi-person picker for person custom fields
- Props: `definition` (CustomFieldDefinition), `value` (CustomFieldValue | null), `onUpdate` ((value: CustomFieldValueSet) => void), `onClear` (() => void)
- Displays stacked avatars for selected users/agents, plus add button popover
- Toggle user/agent selection; stores as `value_json` (array of `{user_id}` or `{agent_id}` entries)
- Key state/hooks used: useProjectStore

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/SelectFieldRenderer.tsx`
- **Purpose**: Renders a single-select dropdown with colored option dots for select custom field values.
- `SelectFieldRenderer` (named export) — Single-option select dropdown
- Props: `definition` (CustomFieldDefinition), `value` (CustomFieldValue | null), `onUpdate` ((value: CustomFieldValueSet) => void), `onClear` (() => void)
- Uses shadcn Select component; stores selected option ID as `value_json` (string)
- Includes "__clear__" option to remove selection
- Key state/hooks used: (none, presentational)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/TextFieldRenderer.tsx`
- **Purpose**: Renders an inline-editable text input for text custom field values.
- `TextFieldRenderer` (named export) — Click-to-edit text input
- Props: `definition` (CustomFieldDefinition), `value` (CustomFieldValue | null), `onUpdate` ((value: CustomFieldValueSet) => void), `onClear` (() => void)
- Click to edit, Enter/blur to save, Escape to cancel; stores as `value_text`
- Key state/hooks used: useState

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/field-renderers/UrlFieldRenderer.tsx`
- **Purpose**: Renders an inline-editable URL input with clickable link display and auto-prepend https://.
- `UrlFieldRenderer` (named export) — Click-to-edit URL input with link preview
- Props: `definition` (CustomFieldDefinition), `value` (CustomFieldValue | null), `onUpdate` ((value: CustomFieldValueSet) => void), `onClear` (() => void)
- Three states: empty placeholder, clickable link with external icon + edit button, editing input
- Auto-prepends `https://` if missing; stores as `value_text`
- Key state/hooks used: useState

---

## Editor Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/EditorToolbar.tsx`
- **Purpose**: Toolbar for the Tiptap rich text editor with formatting buttons for headings, text styles, lists, blocks, links, and mention/reference triggers.
- `EditorToolbar` (named export) — Formatting toolbar for RichTextEditor
- Props: `editor` (Editor), `variant` ('full' | 'compact') — full shows headings, underline, strikethrough, task list, blockquote, horizontal rule, table
- Sub-components: `ToolbarButton` (individual toggle button with active state), `Divider` (visual separator)
- Both variants: bold, italic, code, bullet list, ordered list, link, @mention trigger, #reference trigger
- Key state/hooks used: (none, presentational)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/MentionSuggestion.tsx`
- **Purpose**: Suggestion dropdown for @mentions showing users and agents with keyboard navigation.
- `MentionSuggestion` (named export via forwardRef) — @mention autocomplete dropdown
- Props: `items` (SuggestionItem[]), `command` ((attrs) => void)
- Keyboard nav: ArrowUp/ArrowDown to select, Enter to confirm; exposes `onKeyDown` via imperative handle
- User items show avatar initial + name + username; agent items show colored avatar + name + "Agent" label
- Key state/hooks used: useState, useEffect, useImperativeHandle

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/ReferenceSuggestion.tsx`
- **Purpose**: Suggestion dropdown for #references showing projects, boards, and tasks grouped by type with keyboard navigation.
- `ReferenceSuggestion` (named export via forwardRef) — #reference autocomplete dropdown
- Props: `items` (SuggestionItem[]), `command` ((attrs) => void)
- Groups items by type (Projects, Boards, Tasks) with section headers and type-specific icons (Folder, Layout, CheckSquare)
- Keyboard nav: ArrowUp/ArrowDown to select, Enter to confirm; exposes `onKeyDown` via imperative handle
- Key state/hooks used: useState, useEffect, useImperativeHandle

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/RichTextEditor.tsx`
- **Purpose**: Full-featured Tiptap rich text editor with toolbar, @mention and #reference suggestions, and compact/full variants.
- `RichTextEditor` (named export) — Rich text editor wrapper
- Props: `projectId` (string), `value` (TiptapDoc | string | null), `onChange` ((doc: TiptapDoc) => void), `onSubmit` (() => void), `variant` ('full' | 'compact'), `placeholder` (string), `className` (string), `autoFocus` (boolean)
- Extensions: StarterKit, Underline, Link, Placeholder, TaskList, TaskItem, Table (full only), Image (full only), Typography, Mention (@), Reference (#)
- Suggestion rendering via tippy.js popover with `MentionSuggestion` and `ReferenceSuggestion` components
- Compact variant: Cmd+Enter triggers `onSubmit`, toolbar shown only when focused
- Full variant: toolbar always visible, includes table/image support
- Helper: `normalizeValue` handles TiptapDoc, string, and null inputs
- Key state/hooks used: useState, useCallback, useEffect, useRef, useEditor (tiptap), useMentionables, useReferenceables

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/RichTextRenderer.tsx`
- **Purpose**: Read-only renderer that converts Tiptap JSON documents or plain text strings to HTML.
- `RichTextRenderer` (named export) — Static rich text display
- Props: `content` (TiptapDoc | string | null | undefined), `className` (string)
- Uses `generateHTML` from @tiptap/html with matching extension set (StarterKit, Underline, Link, TaskList, TaskItem, Table, Image, Mention, Reference)
- Legacy plain text fallback: splits on newlines into `<p>` tags with HTML escaping
- Helper: `escapeHtml` for XSS-safe plain text rendering
- Key state/hooks used: useMemo

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/extensions/mention-user.ts`
- **Purpose**: Tiptap Mention extension configured for @user and @agent mentions.
- `MentionUser` (named export) — Mention extension with '@' trigger character
- Stores: `{ id, entityType: 'user'|'agent', label }`
- Key state/hooks used: (none, extension config)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/extensions/reference.ts`
- **Purpose**: Tiptap Mention extension configured for #references (projects, boards, tasks).
- `Reference` (named export) — Mention extension with '#' trigger character, allowSpaces enabled
- Stores: `{ id, entityType: 'project'|'board'|'task', label }`
- Key state/hooks used: (none, extension config)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/hooks/useMentionables.ts`
- **Purpose**: TanStack Query hook to fetch mentionable users and agents for a project.
- `useMentionables` (named export) — Fetches mentionables via `api.getMentionables(projectId)`
- Params: `projectId` (string)
- Config: `staleTime: 60_000`, enabled when projectId is truthy
- Key state/hooks used: useQuery

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/editor/hooks/useReferenceables.ts`
- **Purpose**: TanStack Query hook to fetch referenceable projects, boards, and tasks for # autocomplete.
- `useReferenceables` (named export) — Fetches referenceables via `api.getReferenceables(projectId, query)`
- Params: `projectId` (string), `query` (string)
- Config: `staleTime: 30_000`, enabled when projectId is truthy
- Key state/hooks used: useQuery

---

## Reaction Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/reactions/EmojiPicker.tsx`
- **Purpose**: Full emoji picker with quick reactions bar, search, category tabs, recent emojis (localStorage), and categorized grid.
- `EmojiPicker` (named export) — Emoji selection panel
- Props: `onSelect` ((emoji: string) => void)
- Quick reactions strip: 8 common emojis (thumbs up/down, heart, celebration, rocket, eyes, fire, confused)
- Search input filters across all categories by name and keywords
- Category tabs with scroll-to-category navigation
- "Recently Used" section persisted to localStorage (`agentboard-recent-emojis`, max 16)
- Emoji data from `@/data/emojis.json`
- Key state/hooks used: useState, useMemo, useCallback, useRef, useEffect

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/reactions/ReactionBar.tsx`
- **Purpose**: Displays emoji reaction groups with toggle behavior, animated badges, reactor tooltips, and an add-reaction popover.
- `ReactionBar` (named export) — Reaction display and toggle bar
- Props: `entityType` ('task' | 'comment'), `projectId` (string), `boardId` (string), `taskId` (string), `commentId` (string, optional), `compact` (boolean)
- Each reaction group shows emoji + count with active/inactive styling; click toggles reaction
- Animated spring entrance/exit for reaction badges via framer-motion
- Tooltip on hover shows reactor names via `ReactorTooltip`
- Add button opens `EmojiPicker` in popover
- Key state/hooks used: useState, useTaskReactions, useCommentReactions, useToggleTaskReaction, useToggleCommentReaction, AnimatePresence/motion (framer-motion)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/reactions/ReactorTooltip.tsx`
- **Purpose**: Tooltip content showing names of users/agents who reacted with a specific emoji.
- `ReactorTooltip` (named export) — Reactor name list tooltip
- Props: `reactors` (ReactorBrief[]), `emoji` (string)
- Shows up to 3 names with "and N more" overflow; formats "A and B" / "A, B, and C" patterns
- Helper: `reactorName` extracts display name from user or agent
- Key state/hooks used: (none, presentational)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/reactions/VoteButton.tsx`
- **Purpose**: Standalone thumbs-up vote button with count badge and voted/not-voted states.
- `VoteButton` (named export) — Quick upvote toggle button
- Props: `projectId` (string), `boardId` (string), `taskId` (string)
- Toggles thumbs-up reaction; shows "Vote" / "Voted" label and count badge
- Styled with accent glow when voted; spring animation on tap
- Key state/hooks used: useTaskReactions, useToggleTaskReaction, motion (framer-motion)

---

## Task Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/ChecklistSection.tsx`
- **Purpose**: Checklist management section with multiple checklists, sortable items, progress bars, assignees, and due dates.
- `ChecklistSection` (named export) — Checklists area within task detail panel
- Props: `projectId` (string), `boardId` (string), `taskId` (string)
- Add checklist input with inline creation
- Empty state with "Add a checklist" button
- Sub-component: `ChecklistBlock` — individual checklist with editable title, progress bar, collapsible items list, drag-and-drop reorder (dnd-kit), confirm-before-delete, add item input
- Sub-component: `ChecklistItemRow` — sortable checklist item with animated checkbox toggle, editable title, due date popover (with overdue highlighting), assignee popover, drag handle, delete button
- Sub-component: `AssigneeList` — member picker popover for item assignment with unassign option
- Key state/hooks used: useState, useRef, useCallback, useProjectStore, useChecklists, useCreateChecklist, useUpdateChecklist, useDeleteChecklist, useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem, useToggleChecklistItem, useReorderChecklistItem, useSortable (dnd-kit), AnimatePresence/motion (framer-motion)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/CoverPicker.tsx`
- **Purpose**: Popover for selecting task cover images, colors, or gradients with upload, attachment selection, and size control.
- `CoverPicker` (named export) — Cover selection popover
- Props: `task` (Task), `projectId` (string), `boardId` (string), `children` (ReactNode — trigger element), `open` (boolean), `onOpenChange` ((open: boolean) => void)
- Tabs: Upload (drag-and-drop/click, max 10MB images), Attachments (select from existing image attachments), Colors (preset grid + custom hex input), Gradients (preset grid)
- Footer: size toggle (Full/Half), Remove button (when cover exists)
- Key state/hooks used: useState, useRef, useCallback, useUploadAttachment, useUpdateTask

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/TaskComments.tsx`
- **Purpose**: Comment thread with rich text input (RichTextEditor, Cmd+Enter to submit), file attachment support, per-comment reactions, and image lightbox.
- `TaskComments` (named export) — Comment section for a task
- Props: `projectId` (string), `boardId` (string), `taskId` (string)
- Rich text editor (compact variant) with send button, paperclip file attach button
- Pending attachments preview strip before submit
- Comment list: user/agent avatar, relative timestamps, edited indicator, rich text rendered via `RichTextRenderer`, inline image thumbnails + file download links
- Per-comment `ReactionBar` (compact mode)
- Lightbox overlay for image preview (Escape to close)
- Helper: `formatFileSize` formats bytes to human-readable string
- Key state/hooks used: useState, useRef, useCallback, useEffect, useComments, useCreateComment, useUploadAttachment

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/TaskForm.tsx`
- **Purpose**: Dialog form for creating a new task with title, description, status, priority, multi-assignee picker, labels, due date, and file attachments.
- `TaskForm` (named export) — Create task dialog
- Props: `projectId` (string), `boardId` (string), `open` (boolean), `onClose` (() => void), `defaultStatusId` (string)
- Zod-validated form (title required), Select dropdowns for status/priority
- Multi-assignee Popover picker: members + active agents with checkmarks, avatar stack preview
- Label toggle buttons for project labels
- File attachments: pending file list with preview/remove, attach button, uploads after task creation via `api.uploadAttachment`
- Key state/hooks used: useState, useRef, useCallback, useForm, useProjectStore, useCreateTask, api client

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/TaskActivity.tsx`
- **Purpose**: Activity log timeline showing task creation, updates, and moves with formatted change descriptions.
- `TaskActivity` (named export) — Activity feed for a task
- Props: `projectId` (string), `taskId` (string)
- Color-coded action icons (created=green, updated=blue, moved=amber)
- User avatar and name per log entry, relative timestamps
- Helper: `formatChanges` parses log changes into readable strings (handles assignee changes, status moves, field updates)
- Sub-component: `ActionIcon` renders colored icon per action type
- Key state/hooks used: useTaskActivity

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/TaskAttachments.tsx`
- **Purpose**: File attachment manager with drag-and-drop upload zone, file list with image thumbnails, download/delete actions, and image lightbox.
- `TaskAttachments` (named export) — Attachments tab for a task
- Props: `projectId` (string), `boardId` (string), `taskId` (string)
- Drag-and-drop upload zone (click or drag), max 10MB per file
- File list: image thumbnail or file icon, filename, size, uploader avatar, relative timestamp
- Actions: download link, delete button (only for own uploads)
- Lightbox overlay for image preview (Escape to close)
- Helper: `formatFileSize` formats bytes to human-readable string
- Key state/hooks used: useState, useRef, useCallback, useEffect, useAttachments, useUploadAttachment, useDeleteAttachment, useAuthStore

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/TaskFilters.tsx`
- **Purpose**: Filter bar for board tasks with debounced search, priority select, and assignee select.
- `TaskFilters` (named export) — Inline filter controls
- Search input (300ms debounce), priority dropdown, assignee dropdown, "Clear" button
- Key state/hooks used: useState, useEffect, useCallback, useProjectStore, useBoardStore

---

## Project Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/projects/ProjectForm.tsx`
- **Purpose**: Dialog form for creating or editing a project with name, description, icon (emoji), and color picker.
- `ProjectForm` (named export) — Create/edit project dialog
- Props: `open` (boolean), `onClose` (() => void), `project` (Project | null)
- Zod-validated form, resets fields when `project` prop changes
- Key state/hooks used: useEffect, useForm, useCreateProject, useUpdateProject

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/projects/ProjectCard.tsx`
- **Purpose**: Project card with color accent, icon, stats (members/tasks), owner avatar, and context menu (edit/archive/delete).
- `ProjectCard` (named export) — Project grid card
- Props: `project` (Project), `onEdit` ((project) => void), `onArchive` ((project) => void), `onDelete` ((project) => void)
- Color-derived gradient band and hover glow effect
- Dropdown menu: Edit, Archive/Unarchive, Delete
- Footer: owner avatar, relative update time, arrow indicator
- Key state/hooks used: useNavigate

---

## Agent Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/agents/AgentManager.tsx`
- **Purpose**: Dialog for managing project agents — list, create, edit, delete, and toggle active/inactive with color picker.
- `AgentManager` (named export) — Agent CRUD management dialog
- Props: `projectId` (string), `open` (boolean), `onClose` (() => void)
- Agent list with colored avatar, active/inactive switch, edit/delete buttons (hover-reveal)
- Add form: name input, 8 preset colors, live preview
- Nested edit dialog: name input and color picker
- Key state/hooks used: useState, useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent

---

## Label Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/labels/LabelManager.tsx`
- **Purpose**: Dialog for managing project labels — list, create, edit, and delete with animated transitions and color picker.
- `LabelManager` (named export) — Label CRUD management dialog
- Props: `projectId` (string), `open` (boolean), `onClose` (() => void)
- Features: 16 preset colors + custom hex input, inline label preview, confirm-before-delete, animated list/form transition (framer-motion)
- Key state/hooks used: useState, useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel, useProjectStore, AnimatePresence/motion (framer-motion)

---

## Dashboard Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/dashboard/MyTasksSection.tsx`
- **Purpose**: Dashboard section showing tasks assigned to current user, grouped by urgency (overdue, due soon, active) with an urgency banner.
- `MyTasksSection` (named export) — My tasks dashboard widget
- Sub-components: `UrgencyBanner` (overdue/due_today/due_this_week counts with segmented bar and "All clear" state), `DashboardTaskRow` (clickable task row with priority bar, title, priority badge, project chip, status dot, labels, due date, comment count), `TaskGroup` (collapsible group header with icon and count)
- Navigates to board page with `?task=` query param on click
- Key state/hooks used: useMemo, useNavigate, useMyTasks

---

## Shared Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/shared/ConfirmDialog.tsx`
- **Purpose**: Reusable confirmation dialog with cancel/confirm (destructive) buttons.
- `ConfirmDialog` (named export) — Generic confirm action dialog
- Props: `title` (string), `description` (string), `confirmLabel` (string, default "Delete"), `onConfirm` (() => void), `open` (boolean), `onOpenChange` ((open) => void)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/shared/ThemeToggle.tsx`
- **Purpose**: Dark/light theme toggle button with animated sun/moon icons.
- `ThemeToggle` (named export) — Theme switcher button
- Key state/hooks used: useTheme (next-themes)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/shared/LoadingSpinner.tsx`
- **Purpose**: Centered loading spinner with optional text label.
- `LoadingSpinner` (named export) — Full-width spinner
- Props: `text` (string), `className` (string)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/shared/EmptyState.tsx`
- **Purpose**: Centered empty state placeholder with icon, title, description, and optional action button.
- `EmptyState` (named export) — Empty state display
- Props: `icon` (LucideIcon), `title` (string), `description` (string), `action` ({ label, onClick })
