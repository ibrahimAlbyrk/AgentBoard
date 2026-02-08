# Frontend State — Hooks, Stores, Types & Utilities

## Hooks

### `frontend/src/hooks/useAuth.ts`
- **Purpose**: TanStack Query mutations wrapping auth store login/register actions.
- `useLogin()` — mutation calling `authStore.login(credentials: LoginCredentials)`. Returns standard `useMutation` result.
- `useRegister()` — mutation calling `authStore.register(data: RegisterData)`. Returns standard `useMutation` result.

### `frontend/src/hooks/useProjects.ts`
- **Purpose**: CRUD hooks for projects via TanStack Query.
- `useProjects(params?)` — query key `['projects', params]`. Fetches paginated project list. Params: `page`, `per_page`, `search`, `include_archived`.
- `useProject(projectId)` — query key `['projects', projectId]`. Fetches single project detail. Enabled when `projectId` is truthy.
- `useCreateProject()` — mutation calling `api.createProject(data)`. Invalidates `['projects']`.
- `useUpdateProject()` — mutation taking `{ projectId, data }`. Invalidates `['projects']` and `['projects', projectId]`.
- `useDeleteProject()` — mutation taking `projectId`. Invalidates `['projects']`.

### `frontend/src/hooks/useTasks.ts`
- **Purpose**: CRUD and move hooks for board-scoped tasks.
- `useTasks(projectId, boardId, filters?)` — query key `['tasks', projectId, boardId, filters]`. Enabled when both IDs truthy.
- `useCreateTask(projectId, boardId)` — mutation taking `TaskCreate`. Invalidates `['tasks', ...]` and `['activity', projectId]`.
- `useUpdateTask(projectId, boardId)` — mutation taking `{ taskId, data: TaskUpdate }`. Invalidates `['tasks', ...]` and `['activity', projectId]`.
- `useDeleteTask(projectId, boardId)` — mutation taking `taskId`. Invalidates `['tasks', ...]`.
- `useMoveTask(projectId, boardId)` — optimistic mutation taking `{ taskId, fromStatusId, data: TaskMove }`. Snapshots `boardStore.tasksByStatus` on mutate, rolls back on error, invalidates tasks and activity on settled.

### `frontend/src/hooks/useStatuses.ts`
- **Purpose**: CRUD hooks for board-scoped statuses.
- `useStatuses(projectId, boardId)` — query key `['statuses', projectId, boardId]`. Enabled when both IDs truthy.
- `useCreateStatus(projectId, boardId)` — mutation taking `{ name, color? }`. Invalidates `['statuses', ...]`.
- `useReorderStatuses(projectId, boardId)` — mutation taking `statusIds: string[]`. Invalidates `['statuses', ...]`.

### `frontend/src/hooks/useComments.ts`
- **Purpose**: Query and create hooks for task comments.
- `useComments(projectId, boardId, taskId)` — query key `['comments', projectId, boardId, taskId]`. Enabled when all three IDs truthy.
- `useCreateComment(projectId, boardId, taskId)` — mutation taking `content: string`. Invalidates `['comments', ...]`.

### `frontend/src/hooks/useLabels.ts`
- **Purpose**: CRUD hooks for project-scoped labels.
- `useLabels(projectId)` — query key `['labels', projectId]`. Enabled when `projectId` truthy.
- `useCreateLabel(projectId)` — mutation taking `{ name, color, description? }`. Invalidates `['labels', projectId]`.
- `useUpdateLabel(projectId)` — mutation taking `{ labelId, data: { name?, color?, description? } }`. Invalidates `['labels', projectId]`.

### `frontend/src/hooks/useSearch.ts`
- **Purpose**: Debounced global search hook.
- `useSearch(query, types?, projectId?)` — query key `['search', debouncedQuery, types, projectId]`. Debounces query by 300ms. Enabled when debounced query >= 2 chars.
- Internal `useDebouncedValue<T>(value, delay)` — generic debounce helper (not exported).

### `frontend/src/hooks/useNotifications.ts`
- **Purpose**: Notification list, unread count, and mark-read hooks.
- `useNotifications()` — query key `['notifications']`. Fetches last 30 notifications.
- `useUnreadCount()` — query key `['notifications', 'unread-count']`. Auto-refetches every 30 seconds.
- `useMarkRead()` — mutation taking `{ ids?: string[], all?: boolean }`. Invalidates `['notifications']`.

### `frontend/src/hooks/useWebSocket.ts`
- **Purpose**: Connects to WebSocket for live board updates and dispatches events to board store.
- `markLocalMove(taskId)` — exported function; registers a task ID as locally-moved to suppress WS echo for 2 seconds.
- `useWebSocket(projectId, boardId)` — effect hook. Connects `wsManager` using auth token. Listens to events: `task.created` (adds task + shows toast), `task.updated` (in-place update or animated relocate if status changed), `task.deleted` (removes task), `task.moved` (animated relocate for remote moves, direct relocate for local moves). Cleans up listeners on unmount.

### `frontend/src/hooks/useActivity.ts`
- **Purpose**: Query hook for task activity logs.
- `useTaskActivity(projectId, taskId)` — query key `['activity', projectId, taskId]`. Enabled when both IDs truthy.

### `frontend/src/hooks/useBoards.ts`
- **Purpose**: CRUD hooks for project-scoped boards.
- `useBoards(projectId)` — query key `['boards', projectId]`. Enabled when `projectId` truthy.
- `useBoard(projectId, boardId)` — query key `['boards', projectId, boardId]`. Enabled when both IDs truthy.
- `useCreateBoard(projectId)` — mutation taking `BoardCreate`. Invalidates `['boards', projectId]` and `['projects', projectId]`.
- `useUpdateBoard(projectId)` — mutation taking `{ boardId, data: BoardUpdate }`. Invalidates `['boards', projectId]` and `['projects', projectId]`.
- `useDeleteBoard(projectId)` — mutation taking `boardId`. Invalidates `['boards', projectId]` and `['projects', projectId]`.

---

## Stores

### `frontend/src/stores/authStore.ts`
- **Purpose**: Zustand store for authentication state, persisted to `localStorage` key `agentboard-auth`.
- `useAuthStore` — state: `user: User | null`, `accessToken: string | null`, `refreshToken: string | null`; actions: `setTokens(access, refresh)`, `setUser(user)`, `login(credentials)` (calls `api.login`, sets all state), `register(data)` (calls `api.register`, sets all state), `logout()` (calls `api.logout`, clears state).

### `frontend/src/stores/projectStore.ts`
- **Purpose**: Zustand store for current project context (project, boards, statuses, labels, members).
- `useProjectStore` — state: `currentProject: Project | null`, `boards: Board[]`, `currentBoard: Board | null`, `statuses: Status[]`, `labels: Label[]`, `members: ProjectMember[]`; actions: `setCurrentProject(project)`, `setBoards(boards)` (sorts by position), `setCurrentBoard(board | null)`, `setStatuses(statuses)` (sorts by position), `setLabels(labels)`, `setMembers(members)`, `clearProject()` (resets all to defaults).

### `frontend/src/stores/boardStore.ts`
- **Purpose**: Zustand store for Kanban board task state and client-side filters.
- `useBoardStore` — state: `tasksByStatus: Record<string, Task[]>`, `filters: FilterState` (`search`, `statuses`, `priorities`, `assignee`); actions: `setTasksForStatus(statusId, tasks)` (sorts by position), `addTask(task)` (inserts into correct status bucket sorted by position), `updateTask(taskId, data)` (in-place merge across all statuses), `moveTask(taskId, fromStatusId, toStatusId, position)` (optimistic local move with position sort), `relocateTask(taskId, newTask)` (removes from all statuses, inserts into target status), `removeTask(taskId)` (filters out from all statuses), `setFilters(partial)`, `clearFilters()`, `getFilteredTasks(statusId)` (applies search, priority, assignee filters), `clearBoard()` (resets tasks and filters).
- Internal `FilterState` — `search: string`, `statuses: string[]`, `priorities: string[]`, `assignee: string | null`.

---

## Types

### `frontend/src/types/index.ts`
- **Purpose**: Barrel re-export for all type modules.
- Re-exports all types from `./api`, `./board`, `./project`, `./task`, `./user`, `./websocket`.

### `frontend/src/types/user.ts`
- **Purpose**: User-related type definitions.
- `User` — full user: `id`, `email`, `username`, `full_name`, `avatar_url`, `role`, `created_at`, `last_login_at`.
- `UserBrief` — compact user reference: `id`, `username`, `full_name`, `avatar_url`.
- `LoginCredentials` — `email`, `password`.
- `RegisterData` — `email`, `username`, `password`, `full_name?`.

### `frontend/src/types/api.ts`
- **Purpose**: Generic API response envelope types.
- `APIResponse<T>` — `success`, `data: T`, `meta: { timestamp, request_id? }`.
- `PaginatedResponse<T>` — `success`, `data: T[]`, `pagination: { page, per_page, total, total_pages }`, `meta: { timestamp }`.
- `APIError` — `success: false`, `error: { code, message, details?: [{ field, message }] }`, `meta: { timestamp }`.
- `TokenResponse` — `access_token`, `refresh_token`, `token_type`, `user: User`.

### `frontend/src/types/websocket.ts`
- **Purpose**: WebSocket event payload types.
- `WSEvent` — base event: `type`, `project_id`, `data: Record<string, unknown>`, `user?: { id, username }`, `timestamp`.
- `WSTaskEvent` — extends `WSEvent` with `type` narrowed to `'task.created' | 'task.updated' | 'task.deleted' | 'task.moved'`.

### `frontend/src/types/project.ts`
- **Purpose**: Project, status, and label type definitions.
- `Project` — `id`, `name`, `description`, `slug`, `owner: UserBrief`, `icon`, `color`, `is_archived`, `member_count`, `task_count`, `created_at`, `updated_at`.
- `ProjectDetail` — extends `Project` with `members: ProjectMember[]`, `boards: Board[]`, `labels: Label[]`.
- `ProjectMember` — `id`, `user: UserBrief`, `role`, `joined_at`.
- `ProjectCreate` — `name`, `description?`, `slug?`, `icon?`, `color?`, `create_default_board?`.
- `Status` — `id`, `board_id`, `name`, `slug`, `color`, `position`, `is_default`, `is_terminal`, `task_count`, `created_at`.
- `Label` — `id`, `name`, `color`, `description`, `task_count`, `created_at`.

### `frontend/src/types/task.ts`
- **Purpose**: Task, comment, filter, and activity log type definitions.
- `Priority` — union type: `'none' | 'low' | 'medium' | 'high' | 'urgent'`.
- `Task` — `id`, `project_id`, `board_id`, `title`, `description`, `status: Status`, `priority: Priority`, `assignee: UserBrief | null`, `creator: UserBrief`, `labels: Label[]`, `due_date`, `position`, `parent_id`, `comments_count`, `created_at`, `updated_at`, `completed_at`.
- `TaskCreate` — `title`, `description?`, `status_id?`, `priority?`, `assignee_id?`, `label_ids?`, `due_date?`, `parent_id?`.
- `TaskUpdate` — `title?`, `description?`, `status_id?`, `priority?`, `assignee_id?`, `label_ids?`, `due_date?`.
- `TaskMove` — `status_id`, `position?`.
- `Comment` — `id`, `content`, `user: UserBrief`, `created_at`, `updated_at`, `is_edited`.
- `TaskFilters` — `status_id?`, `priority?`, `assignee_id?`, `search?`, `page?`, `per_page?`.
- `ActivityLog` — `id`, `action`, `entity_type`, `changes: Record<string, { old?, new? } | string>`, `user: UserBrief`, `task_id`, `created_at`.

### `frontend/src/types/board.ts`
- **Purpose**: Board-related type definitions.
- `Board` — `id`, `project_id`, `name`, `slug`, `description`, `icon`, `color`, `position`, `member_count`, `task_count`, `status_count`, `created_at`, `updated_at`.
- `BoardDetail` — extends `Board` with `statuses: Status[]`, `members: BoardMember[]`.
- `BoardMember` — `id`, `user: UserBrief`, `role`, `joined_at`.
- `BoardCreate` — `name`, `description?`, `icon?`, `color?`, `create_default_statuses?`.
- `BoardUpdate` — `name?`, `description?`, `icon?`, `color?`.

---

## Libraries / Utilities

### `frontend/src/lib/api-client.ts`
- **Purpose**: Primary API client class with auto token refresh, used by all hooks.
- **Base URL**: `/api/v1`
- **Auth**: Reads `accessToken`/`refreshToken` from `localStorage` key `agentboard-auth` (Zustand persist). Attaches `Authorization: Bearer` header.
- **Interceptor**: On 401 response, attempts `POST /auth/refresh` with refresh token. If successful, updates tokens in localStorage and retries request once.
- **Exported singleton**: `api` (instance of `APIClient`)
- **Endpoint methods**:
  - Auth: `login(credentials)` (form-urlencoded), `register(data)`, `logout()`
  - Projects: `listProjects(params?)`, `getProject(id)`, `createProject(data)`, `updateProject(id, data)`, `deleteProject(id)`, `archiveProject(id)`, `unarchiveProject(id)`
  - Boards: `listBoards(projectId)`, `getBoard(projectId, boardId)`, `createBoard(projectId, data)`, `updateBoard(projectId, boardId, data)`, `deleteBoard(projectId, boardId)`
  - Statuses: `listStatuses(projectId, boardId)`, `createStatus(projectId, boardId, data)`, `updateStatus(projectId, boardId, statusId, data)`, `deleteStatus(projectId, boardId, statusId)`, `reorderStatuses(projectId, boardId, statusIds)`
  - Labels: `listLabels(projectId)`, `createLabel(projectId, data)`, `updateLabel(projectId, labelId, data)`, `deleteLabel(projectId, labelId)`
  - Tasks: `listTasks(projectId, boardId, filters?)`, `getTask(projectId, boardId, taskId)`, `createTask(projectId, boardId, data)`, `updateTask(projectId, boardId, taskId, data)`, `deleteTask(projectId, boardId, taskId)`, `moveTask(projectId, boardId, taskId, data)`, `bulkUpdateTasks(projectId, boardId, taskIds, data)`, `bulkMoveTasks(projectId, boardId, taskIds, data)`, `bulkDeleteTasks(projectId, boardId, taskIds)`
  - Comments: `listComments(projectId, boardId, taskId)`, `createComment(projectId, boardId, taskId, data)`, `updateComment(projectId, boardId, taskId, commentId, data)`, `deleteComment(projectId, boardId, taskId, commentId)`
  - Activity: `listTaskActivity(projectId, taskId)`
  - Search: `search(q, types?, projectId?)`
  - Stats: `getProjectStats(projectId)`
  - API Keys: `listApiKeys()`, `createApiKey(data)`, `deleteApiKey(keyId)`
  - Notifications: `listNotifications(params?)`, `getUnreadCount()`, `markNotificationsRead(ids?, markAll?)`
  - Users: `getMe()`, `updateMe(data)`

### `frontend/src/lib/api.ts`
- **Purpose**: Legacy/alternative API client using a plain `request()` function (reads token from `localStorage` key `token`). Not used by hooks (hooks use `api-client.ts`).
- **Base URL**: `/api/v1`
- **Exported object**: `api` with namespaced methods:
  - `api.auth` — `login(email, password)`, `register(data)`, `me()`
  - `api.projects` — `list()`, `get(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `members(id)`, `statuses(id)`, `labels(id)`
  - `api.tasks` — `list(projectId)`, `get(projectId, taskId)`, `create(projectId, data)`, `update(projectId, taskId, data)`, `delete(projectId, taskId)`, `move(projectId, taskId, data)`
  - `api.comments` — `list(projectId, taskId)`, `create(projectId, taskId, content)`, `delete(projectId, taskId, commentId)`
  - `api.apiKeys` — `list()`, `create(name)`, `delete(id)`
  - `api.users` — `update(data)`
- Internal types: `ApiKey` (`id`, `name`, `key_prefix`, `last_used?`, `created_at`), `ProjectUpdate` (`name?`, `description?`, `icon?`, `color?`, `is_archived?`).

### `frontend/src/lib/websocket.ts`
- **Purpose**: WebSocket connection manager with auto-reconnect and heartbeat.
- **Exported singleton**: `wsManager` (instance of `WebSocketManager`)
- **Connection URL**: `ws[s]://{host}/api/v1/ws?token={token}&project_id={id}&board_id={id}`
- **Methods**: `connect(projectId, boardId, token)` (opens WS, sends `subscribe` message, starts 30s ping heartbeat), `disconnect()` (intentional close, clears timers), `on(type, handler)` (registers event listener), `off(type, handler)` (removes event listener).
- **Reconnect**: Exponential backoff starting at 3s, max 30s. Skipped on intentional close.
- **Messages sent**: `{ type: 'subscribe', project_id, board_id }`, `{ type: 'ping' }`
- **Messages received**: Dispatches by `type` field to registered handlers. Ignores `pong` messages.

### `frontend/src/lib/utils.ts`
- **Purpose**: Tailwind CSS class name merge utility.
- `cn(...inputs: ClassValue[])` — merges class names using `clsx` + `twMerge` for conflict resolution.
