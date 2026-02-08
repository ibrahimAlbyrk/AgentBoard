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
- **Purpose**: Main Kanban board view for a specific project board, with task creation, detail panel, label manager, and filters.
- `BoardPage` (named export) — Route: `/projects/:projectId/boards/:boardId`
- Header shows project name/icon + board name, "Labels" button, "New Task" button, and `TaskFilters`
- Renders `KanbanBoard`, `TaskForm` dialog, `TaskDetailPanel` slide-over, `LabelManager` dialog
- Syncs project/board/tasks data into Zustand stores on load
- Auto-opens task from `?task=` query param
- Key state/hooks used: useState, useEffect, useRef, useParams, useSearchParams, useProject, useBoard, useTasks, useWebSocket, useProjectStore, useBoardStore

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
- `NotificationSettings` — Event toggles (assigned, updated, moved, deleted, comment), self-notifications, desktop notifications (with browser permission request), per-project muting, email notifications
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

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/KanbanBoard.tsx`
- **Purpose**: Core drag-and-drop Kanban board using dnd-kit with custom collision detection and position-based ordering.
- `KanbanBoard` (named export) — Renders columns with DndContext
- Props: `onTaskClick` (task: Task) => void, `onAddTask` (statusId: string) => void
- Custom `kanbanCollision` detection: pointerWithin for column detection, closestCenter for task proximity
- Handles drag start/move/over/end/cancel with optimistic position updates
- Tilt effect on drag overlay (3D perspective rotation based on velocity)
- Triggers `TaskAnimationLayer` for cross-column flight animations
- Key state/hooks used: useState, useCallback, useRef, useProjectStore, useBoardStore, useMoveTask, markLocalMove

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/BoardColumn.tsx`
- **Purpose**: Single Kanban column with droppable zone, sortable task list, and placeholder support.
- `BoardColumn` (named export) — Renders a status column
- Props: `status` (Status), `tasks` (Task[]), `onTaskClick`, `onAddTask`, `placeholderIdx` (number), `hideDragSourceId` (string)
- Uses `useDroppable` for column-level drop target, `SortableContext` for task ordering
- Shows "No tasks" empty state, drop placeholder at `placeholderIdx`
- Key state/hooks used: useDroppable (dnd-kit)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/TaskCard.tsx`
- **Purpose**: Visual task card displaying title, description, labels, due date, comment count, and multi-assignee avatars.
- `TaskCard` (named export) — Renders a single task card
- Props: `task` (Task), `onClick` (() => void), `isDragOverlay` (boolean)
- Priority-colored left border, up to 3 labels with overflow count
- Overdue date highlighting, comment count badge
- Multi-assignee display: up to 3 stacked avatars (users + agents) with overflow count
- Key state/hooks used: (none, presentational)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/SortableTaskCard.tsx`
- **Purpose**: Wrapper around TaskCard that integrates dnd-kit sortable behavior and flight animation awareness.
- `SortableTaskCard` (named export) — Sortable-draggable task card
- Props: `task` (Task), `onClick` (() => void), `hideWhileDragging` (boolean)
- Registers card ref for animation layer, shows dashed placeholder when dragging in same column
- Hides card (height: 0) when cross-column dragging
- Key state/hooks used: useCallback, useSortable (dnd-kit), useIsFlying, registerCardRef

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/TaskDetailPanel.tsx`
- **Purpose**: Floating modal panel for viewing/editing a task's full properties, labels, description, comments, attachments, and activity.
- `TaskDetailPanel` (named export) — Full task detail overlay
- Props: `task` (Task | null), `projectId` (string), `boardId` (string), `open` (boolean), `onClose` (() => void)
- Animated with framer-motion (spring scale/opacity entrance, staggered children)
- Inline-editable title and description
- Property rows: status, priority (Select dropdowns), assignees (`AssigneesPicker`), watchers (`WatchersPicker`), due date (date input with OVERDUE badge)
- Labels: toggle buttons for all project labels, "Manage" link opens `LabelManager`
- Tabs: Comments (`TaskComments`), Files (`TaskAttachments`), Activity (`TaskActivity`)
- Footer: creator avatar (user or agent), created/updated timestamps
- Sub-components: `PropertyRow` (consistent property row layout), `PersonPicker` (shared popover picker for users + agents), `AssigneesPicker`, `WatchersPicker`
- Key state/hooks used: useState, useEffect, useRef, useProjectStore, useUpdateTask, AnimatePresence/motion (framer-motion)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/board/TaskAnimationLayer.tsx`
- **Purpose**: Portal-based overlay that renders animated "flying" task cards during cross-column drag-and-drop transitions.
- `TaskAnimationLayer` (named export) — Fixed overlay rendered via `createPortal`
- Named exports: `registerCardRef`, `getCardRect`, `startFlight`, `endFlight`, `isFlying`, `useIsFlying`
- Module-level state: `cardRefs` (Map of task DOM refs), `flyingMap` (Map of in-flight tasks)
- `FlyingCard` sub-component: spring animation from source rect to destination rect using framer-motion
- Double-RAF technique to wait for layout settle before measuring target position
- Key state/hooks used: useState, useEffect, useLayoutEffect, useSyncExternalStore, createPortal, motion (framer-motion)

---

## Task Components

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/TaskForm.tsx`
- **Purpose**: Dialog form for creating a new task with title, description, status, priority, multi-assignee picker, labels, due date, and file attachments.
- `TaskForm` (named export) — Create task dialog
- Props: `projectId` (string), `boardId` (string), `open` (boolean), `onClose` (() => void), `defaultStatusId` (string)
- Zod-validated form (title required), Select dropdowns for status/priority
- Multi-assignee Popover picker: members + active agents with checkmarks, avatar stack preview
- Label toggle buttons for project labels
- File attachments: pending file list with preview/remove, attach button, uploads after task creation via `api.uploadAttachment`
- Key state/hooks used: useState, useRef, useCallback, useForm, useProjectStore, useCreateTask, api client

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/components/tasks/TaskComments.tsx`
- **Purpose**: Comment thread with input area (Cmd+Enter to submit), file attachment support (paste/upload), and chronological comment list with inline attachments.
- `TaskComments` (named export) — Comment section for a task
- Props: `projectId` (string), `boardId` (string), `taskId` (string)
- Textarea with send button, paperclip file attach button, clipboard image paste support
- Pending attachments preview strip before submit
- Comment list: user/agent avatar, relative timestamps, edited indicator, inline image thumbnails + file download links
- Lightbox overlay for image preview (Escape to close)
- Key state/hooks used: useState, useRef, useCallback, useEffect, useComments, useCreateComment, useUploadAttachment

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
