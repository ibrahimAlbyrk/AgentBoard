# Frontend Components Map

## Entry Points

### `frontend/src/App.tsx`
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

### `frontend/src/main.tsx`
- **Purpose**: Application bootstrap — mounts React root with global providers.
- Providers (outer to inner): `React.StrictMode` > `ThemeProvider` (next-themes, default dark) > `QueryClientProvider` (TanStack Query) > `BrowserRouter`
- QueryClient config: `refetchOnWindowFocus: false`, `retry: 1`, `staleTime: 30000`
- Renders `<App />` + `<Toaster>` (sonner, top-right)

---

## Pages

### `frontend/src/pages/LoginPage.tsx`
- **Purpose**: Email/password login form with Zod validation and animated gradient background.
- `LoginPage` (named export) — Route: `/login`
- Form fields: email, password (validated via zod + react-hook-form)
- On success: calls `authStore.login()`, navigates to `/dashboard`
- Key state/hooks used: useState, useNavigate, useForm, useAuthStore

### `frontend/src/pages/RegisterPage.tsx`
- **Purpose**: User registration form with email, username, password, and password confirmation.
- `RegisterPage` (named export) — Route: `/register`
- Form fields: email, username, full_name (optional), password, confirm_password
- Zod refine validates password match
- On success: calls `authStore.register()`, navigates to `/dashboard`
- Key state/hooks used: useState, useNavigate, useForm, useAuthStore

### `frontend/src/pages/DashboardPage.tsx`
- **Purpose**: Overview page showing stats cards (projects, tasks, in-progress, overdue) and recent project grid.
- `DashboardPage` (named export) — Route: `/dashboard`
- Displays greeting with user name, 4 stat cards, up to 6 project cards
- Links to `/projects` for "View all"
- Key state/hooks used: useNavigate, useAuthStore, useProjects

### `frontend/src/pages/ProjectsPage.tsx`
- **Purpose**: Full project list with search, sort (recent/name/tasks), archive toggle, create/edit/delete actions.
- `ProjectsPage` (named export) — Route: `/projects`
- Toolbar: search input, sort dropdown, show/hide archived toggle, project count
- Grid of `ProjectCard` components with edit/archive/delete handlers
- `ProjectForm` dialog for create/edit
- Key state/hooks used: useState, useMemo, useProjects, useDeleteProject, useQueryClient

### `frontend/src/pages/BoardPage.tsx`
- **Purpose**: Main Kanban board view for a specific project board, with task creation and detail panel.
- `BoardPage` (named export) — Route: `/projects/:projectId/boards/:boardId`
- Header shows project name/icon + board name, "New Task" button, and `TaskFilters`
- Renders `KanbanBoard`, `TaskForm` dialog, `TaskDetailPanel` slide-over
- Syncs project/board/tasks data into Zustand stores on load
- Key state/hooks used: useState, useEffect, useRef, useParams, useProject, useBoard, useTasks, useWebSocket, useProjectStore, useBoardStore

### `frontend/src/pages/BoardListPage.tsx`
- **Purpose**: Lists all boards within a project with create/delete board functionality.
- `BoardListPage` (named export) — Route: `/projects/:projectId`
- Grid of board cards with color accent, task/member counts, dropdown menu (edit/delete)
- Create board dialog with name input and color picker (8 preset colors)
- Helper: `hexToRgb` for CSS color interpolation
- Key state/hooks used: useState, useNavigate, useParams, useProject, useCreateBoard, useDeleteBoard

### `frontend/src/pages/SettingsPage.tsx`
- **Purpose**: User settings with tabs for Profile editing, API key management, and Notifications (placeholder).
- `SettingsPage` (named export) — Route: `/settings`
- Profile tab: edit full name, avatar URL; email/username read-only
- API Keys tab: list, create (with copy-once dialog), delete API keys
- Notifications tab: placeholder
- Key state/hooks used: useState, useAuthStore, api client (direct calls)

---

## Layout Components

### `frontend/src/components/layout/AppLayout.tsx`
- **Purpose**: Shell layout with responsive sidebar, header, and main content area via `<Outlet />`.
- `AppLayout` (named export) — Wraps all protected routes
- Mobile sidebar: overlay + slide-in, controlled by `sidebarOpen` state
- Key state/hooks used: useState

### `frontend/src/components/layout/Sidebar.tsx`
- **Purpose**: Navigation sidebar with workspace links, project list, search, and user profile section.
- `Sidebar` (named export) — Left sidebar panel
- Props: `onClose` (() => void) — closes mobile sidebar
- Sections: brand logo, search input (keyboard shortcut `/`), workspace nav (Dashboard, Projects, Settings), project list (up to 8, filterable), user avatar link
- Key state/hooks used: useState, useRef, useEffect, useLocation, useProjects, useAuthStore

### `frontend/src/components/layout/Header.tsx`
- **Purpose**: Top header bar with mobile menu toggle, theme toggle, notification popover, and user dropdown.
- `Header` (named export) — Top navigation bar
- Props: `onMenuClick` (() => void) — opens mobile sidebar
- Notifications popover: list with mark-as-read, "mark all read" action
- User dropdown: Profile link, Logout action
- Helper: `timeAgo` for relative timestamps
- Key state/hooks used: useNavigate, useAuthStore, useNotifications, useUnreadCount, useMarkRead

---

## Board Components

### `frontend/src/components/board/KanbanBoard.tsx`
- **Purpose**: Core drag-and-drop Kanban board using dnd-kit with custom collision detection and position-based ordering.
- `KanbanBoard` (named export) — Renders columns with DndContext
- Props: `onTaskClick` (task: Task) => void, `onAddTask` (statusId: string) => void
- Custom `kanbanCollision` detection: pointerWithin for column detection, closestCenter for task proximity
- Handles drag start/move/over/end/cancel with optimistic position updates
- Tilt effect on drag overlay (3D perspective rotation based on velocity)
- Triggers `TaskAnimationLayer` for cross-column flight animations
- Key state/hooks used: useState, useCallback, useRef, useProjectStore, useBoardStore, useMoveTask, markLocalMove

### `frontend/src/components/board/BoardColumn.tsx`
- **Purpose**: Single Kanban column with droppable zone, sortable task list, and placeholder support.
- `BoardColumn` (named export) — Renders a status column
- Props: `status` (Status), `tasks` (Task[]), `onTaskClick`, `onAddTask`, `placeholderIdx` (number), `hideDragSourceId` (string)
- Uses `useDroppable` for column-level drop target, `SortableContext` for task ordering
- Shows "No tasks" empty state, drop placeholder at `placeholderIdx`
- Key state/hooks used: useDroppable (dnd-kit)

### `frontend/src/components/board/TaskCard.tsx`
- **Purpose**: Visual task card displaying title, description, labels, due date, comment count, and assignee.
- `TaskCard` (named export) — Renders a single task card
- Props: `task` (Task), `onClick` (() => void), `isDragOverlay` (boolean)
- Priority-colored left border, up to 3 labels with overflow count
- Overdue date highlighting, comment count badge, assignee avatar
- Key state/hooks used: (none, presentational)

### `frontend/src/components/board/SortableTaskCard.tsx`
- **Purpose**: Wrapper around TaskCard that integrates dnd-kit sortable behavior and flight animation awareness.
- `SortableTaskCard` (named export) — Sortable-draggable task card
- Props: `task` (Task), `onClick` (() => void), `hideWhileDragging` (boolean)
- Registers card ref for animation layer, shows dashed placeholder when dragging in same column
- Hides card (height: 0) when cross-column dragging
- Key state/hooks used: useCallback, useSortable (dnd-kit), useIsFlying, registerCardRef

### `frontend/src/components/board/TaskDetailPanel.tsx`
- **Purpose**: Floating modal panel for viewing/editing a task's properties, labels, description, comments, and activity.
- `TaskDetailPanel` (named export) — Full task detail overlay
- Props: `task` (Task | null), `projectId` (string), `boardId` (string), `open` (boolean), `onClose` (() => void)
- Animated with framer-motion (spring scale/opacity entrance, staggered children)
- Inline-editable title and description
- Property rows: status, priority, assignee (Select dropdowns), due date (date input)
- Labels: toggle buttons for all project labels
- Tabs: Comments (`TaskComments`) and Activity (`TaskActivity`)
- Footer: created/updated timestamps
- Helper: `PropertyRow` sub-component for consistent property row layout
- Key state/hooks used: useState, useEffect, useRef, useProjectStore, useUpdateTask, AnimatePresence/motion (framer-motion)

### `frontend/src/components/board/TaskAnimationLayer.tsx`
- **Purpose**: Portal-based overlay that renders animated "flying" task cards during cross-column drag-and-drop transitions.
- `TaskAnimationLayer` (named export) — Fixed overlay rendered via `createPortal`
- Named exports: `registerCardRef`, `getCardRect`, `startFlight`, `endFlight`, `isFlying`, `useIsFlying`
- Module-level state: `cardRefs` (Map of task DOM refs), `flyingMap` (Map of in-flight tasks)
- `FlyingCard` sub-component: spring animation from source rect to destination rect using framer-motion
- Double-RAF technique to wait for layout settle before measuring target position
- Key state/hooks used: useState, useEffect, useLayoutEffect, useSyncExternalStore, createPortal, motion (framer-motion)

---

## Task Components

### `frontend/src/components/tasks/TaskForm.tsx`
- **Purpose**: Dialog form for creating a new task with title, description, status, priority, assignee, and due date.
- `TaskForm` (named export) — Create task dialog
- Props: `projectId` (string), `boardId` (string), `open` (boolean), `onClose` (() => void), `defaultStatusId` (string)
- Zod-validated form (title required), Select dropdowns for status/priority/assignee
- Key state/hooks used: useState, useForm, useProjectStore, useCreateTask

### `frontend/src/components/tasks/TaskComments.tsx`
- **Purpose**: Comment thread with input area (Cmd+Enter to submit) and chronological comment list.
- `TaskComments` (named export) — Comment section for a task
- Props: `projectId` (string), `boardId` (string), `taskId` (string)
- Textarea with send button, list of comments with user avatar and relative timestamps
- Key state/hooks used: useState, useComments, useCreateComment

### `frontend/src/components/tasks/TaskActivity.tsx`
- **Purpose**: Activity log timeline showing task creation, updates, and moves with formatted change descriptions.
- `TaskActivity` (named export) — Activity feed for a task
- Props: `projectId` (string), `taskId` (string)
- Color-coded action icons (created=green, updated=blue, moved=amber)
- Helper: `formatChanges` parses log changes into readable strings
- Key state/hooks used: useTaskActivity

### `frontend/src/components/tasks/TaskFilters.tsx`
- **Purpose**: Filter bar for board tasks with debounced search, priority select, and assignee select.
- `TaskFilters` (named export) — Inline filter controls
- Search input (300ms debounce), priority dropdown, assignee dropdown, "Clear" button
- Key state/hooks used: useState, useEffect, useCallback, useProjectStore, useBoardStore

---

## Project Components

### `frontend/src/components/projects/ProjectForm.tsx`
- **Purpose**: Dialog form for creating or editing a project with name, description, icon (emoji), and color picker.
- `ProjectForm` (named export) — Create/edit project dialog
- Props: `open` (boolean), `onClose` (() => void), `project` (Project | null)
- Zod-validated form, resets fields when `project` prop changes
- Key state/hooks used: useEffect, useForm, useCreateProject, useUpdateProject

### `frontend/src/components/projects/ProjectCard.tsx`
- **Purpose**: Project card with color accent, icon, stats (members/tasks), owner avatar, and context menu (edit/archive/delete).
- `ProjectCard` (named export) — Project grid card
- Props: `project` (Project), `onEdit` ((project) => void), `onArchive` ((project) => void), `onDelete` ((project) => void)
- Color-derived gradient band and hover glow effect
- Dropdown menu: Edit, Archive/Unarchive, Delete
- Footer: owner avatar, relative update time, arrow indicator
- Key state/hooks used: useNavigate

---

## Label Components

### `frontend/src/components/labels/LabelManager.tsx`
- **Purpose**: Dialog for managing project labels — list, create, edit, and delete with animated transitions and color picker.
- `LabelManager` (named export) — Label CRUD management dialog
- Props: `projectId` (string), `open` (boolean), `onClose` (() => void)
- Features: 16 preset colors + custom hex input, inline label preview, confirm-before-delete, animated list/form transition (framer-motion)
- Key state/hooks used: useState, useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel, useProjectStore, AnimatePresence/motion (framer-motion)

---

## Shared Components

### `frontend/src/components/shared/ConfirmDialog.tsx`
- **Purpose**: Reusable confirmation dialog with cancel/confirm (destructive) buttons.
- `ConfirmDialog` (named export) — Generic confirm action dialog
- Props: `title` (string), `description` (string), `confirmLabel` (string, default "Delete"), `onConfirm` (() => void), `open` (boolean), `onOpenChange` ((open) => void)

### `frontend/src/components/shared/ThemeToggle.tsx`
- **Purpose**: Dark/light theme toggle button with animated sun/moon icons.
- `ThemeToggle` (named export) — Theme switcher button
- Key state/hooks used: useTheme (next-themes)

### `frontend/src/components/shared/LoadingSpinner.tsx`
- **Purpose**: Centered loading spinner with optional text label.
- `LoadingSpinner` (named export) — Full-width spinner
- Props: `text` (string), `className` (string)

### `frontend/src/components/shared/EmptyState.tsx`
- **Purpose**: Centered empty state placeholder with icon, title, description, and optional action button.
- `EmptyState` (named export) — Empty state display
- Props: `icon` (LucideIcon), `title` (string), `description` (string), `action` ({ label, onClick })
