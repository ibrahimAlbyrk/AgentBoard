# Frontend State — Hooks, Stores, Types & Utilities

## Hooks

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useAuth.ts`
- **Purpose**: TanStack Query mutations wrapping auth store login/register actions.
- `useLogin()` — mutation calling `authStore.login(credentials: LoginCredentials)`. Returns standard `useMutation` result.
- `useRegister()` — mutation calling `authStore.register(data: RegisterData)`. Returns standard `useMutation` result.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useProjects.ts`
- **Purpose**: CRUD hooks for projects via TanStack Query.
- `useProjects(params?)` — query key `['projects', params]`. Fetches paginated project list. Params: `page`, `per_page`, `search`, `include_archived`.
- `useProject(projectId)` — query key `['projects', projectId]`. Fetches single project detail. Enabled when `projectId` is truthy.
- `useCreateProject()` — mutation calling `api.createProject(data)`. Invalidates `['projects']`.
- `useUpdateProject()` — mutation taking `{ projectId, data }`. Invalidates `['projects']` and `['projects', projectId]`.
- `useDeleteProject()` — mutation taking `projectId`. Invalidates `['projects']`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useTasks.ts`
- **Purpose**: CRUD and move hooks for board-scoped tasks.
- `useTasks(projectId, boardId, filters?)` — query key `['tasks', projectId, boardId, filters]`. Enabled when both IDs truthy.
- `useCreateTask(projectId, boardId)` — mutation taking `TaskCreate`. Invalidates `['tasks', ...]` and `['activity', projectId]`.
- `useUpdateTask(projectId, boardId)` — mutation taking `{ taskId, data: TaskUpdate }`. Invalidates `['tasks', ...]` and `['activity', projectId]`.
- `useDeleteTask(projectId, boardId)` — mutation taking `taskId`. Invalidates `['tasks', ...]`.
- `useMoveTask(projectId, boardId)` — optimistic mutation taking `{ taskId, fromStatusId, data: TaskMove }`. Snapshots `boardStore.tasksByStatus` on mutate, rolls back on error, invalidates tasks and activity on settled.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useStatuses.ts`
- **Purpose**: CRUD hooks for board-scoped statuses.
- `useStatuses(projectId, boardId)` — query key `['statuses', projectId, boardId]`. Enabled when both IDs truthy.
- `useCreateStatus(projectId, boardId)` — mutation taking `{ name, color? }`. Invalidates `['statuses', ...]`.
- `useReorderStatuses(projectId, boardId)` — mutation taking `statusIds: string[]`. Invalidates `['statuses', ...]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useCardDisplayMode.ts`
- **Purpose**: Persists compact/detailed card display mode toggle to localStorage.
- `useCardDisplayMode()` — returns `{ mode: 'compact' | 'detailed', setMode(m) }`. Reads/writes localStorage key `agentboard-card-mode`, defaults to `'detailed'`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useChecklists.ts`
- **Purpose**: Full CRUD hooks for task-scoped checklists and checklist items.
- `useChecklists(projectId, boardId, taskId)` — query key `['checklists', projectId, boardId, taskId]`. Enabled when all three IDs truthy.
- `useCreateChecklist(projectId, boardId, taskId)` — mutation taking `{ title: string }`. Invalidates `['checklists', ...]` and `['tasks', projectId, boardId]`.
- `useUpdateChecklist(projectId, boardId, taskId)` — mutation taking `{ checklistId, data: { title? } }`. Invalidates `['checklists', ...]`.
- `useDeleteChecklist(projectId, boardId, taskId)` — mutation taking `checklistId`. Invalidates `['checklists', ...]` and `['tasks', projectId, boardId]`.
- `useCreateChecklistItem(projectId, boardId, taskId)` — mutation taking `{ checklistId, data: ChecklistItemCreate }`. Invalidates `['checklists', ...]` and `['tasks', ...]`.
- `useUpdateChecklistItem(projectId, boardId, taskId)` — mutation taking `{ checklistId, itemId, data: ChecklistItemUpdate }`. Invalidates `['checklists', ...]` and `['tasks', ...]`.
- `useDeleteChecklistItem(projectId, boardId, taskId)` — mutation taking `{ checklistId, itemId }`. Invalidates `['checklists', ...]` and `['tasks', ...]`.
- `useToggleChecklistItem(projectId, boardId, taskId)` — mutation taking `{ checklistId, itemId }`. Invalidates on settled.
- `useReorderChecklistItem(projectId, boardId, taskId)` — mutation taking `{ checklistId, itemId, position }`. Invalidates `['checklists', ...]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useComments.ts`
- **Purpose**: Query and create hooks for task comments.
- `useComments(projectId, boardId, taskId)` — query key `['comments', projectId, boardId, taskId]`. Enabled when all three IDs truthy.
- `useCreateComment(projectId, boardId, taskId)` — mutation taking `{ content: any, attachment_ids?: string[] }`. Invalidates `['comments', ...]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useCustomFields.ts`
- **Purpose**: CRUD hooks for board-scoped custom field definitions and task field values.
- `useCustomFieldDefinitions(projectId, boardId)` — query key `['custom-fields', projectId, boardId]`. Enabled when both IDs truthy.
- `useCreateCustomField(projectId, boardId)` — mutation taking `CustomFieldDefinitionCreate`. Invalidates `['custom-fields', ...]`.
- `useUpdateCustomField(projectId, boardId)` — mutation taking `{ fieldId, data: CustomFieldDefinitionUpdate }`. Invalidates `['custom-fields', ...]`.
- `useDeleteCustomField(projectId, boardId)` — mutation taking `fieldId`. Invalidates `['custom-fields', ...]` and `['tasks', ...]`.
- `useReorderCustomFields(projectId, boardId)` — mutation taking `fieldIds: string[]`. Invalidates `['custom-fields', ...]`.
- `useSetFieldValue(projectId, boardId, taskId)` — mutation taking `CustomFieldValueSet`. Invalidates `['tasks', ...]`.
- `useBulkSetFieldValues(projectId, boardId, taskId)` — mutation taking `CustomFieldValueSet[]`. Invalidates `['tasks', ...]`.
- `useClearFieldValue(projectId, boardId, taskId)` — mutation taking `fieldId`. Invalidates `['tasks', ...]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useLabels.ts`
- **Purpose**: CRUD hooks for project-scoped labels.
- `useLabels(projectId)` — query key `['labels', projectId]`. Enabled when `projectId` truthy.
- `useCreateLabel(projectId)` — mutation taking `{ name, color, description? }`. Invalidates `['labels', projectId]`.
- `useUpdateLabel(projectId)` — mutation taking `{ labelId, data: { name?, color?, description? } }`. Invalidates `['labels', projectId]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useReactions.ts`
- **Purpose**: Query and optimistic-toggle hooks for task and comment reactions.
- `useTaskReactions(projectId, boardId, taskId)` — query key `['reactions', 'task', taskId]`. Enabled when all three IDs truthy.
- `useCommentReactions(projectId, boardId, taskId, commentId)` — query key `['reactions', 'comment', commentId]`. Enabled when `commentId` truthy.
- `useToggleTaskReaction(projectId, boardId, taskId)` — optimistic mutation taking `emoji: string`. Cancels queries, applies local toggle via `optimisticToggle()`, rolls back on error. Invalidates `['reactions', 'task', taskId]` and `['tasks', ...]` on settled.
- `useToggleCommentReaction(projectId, boardId, taskId, commentId)` — optimistic mutation taking `emoji: string`. Same optimistic pattern. Invalidates `['reactions', 'comment', commentId]` and `['comments', ...]` on settled.
- Internal `optimisticToggle(prev, emoji)` — toggles `reacted_by_me` and adjusts `count` in local reaction group data.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useSearch.ts`
- **Purpose**: Debounced global search hook.
- `useSearch(query, types?, projectId?)` — query key `['search', debouncedQuery, types, projectId]`. Debounces query by 300ms. Enabled when debounced query >= 2 chars.
- Internal `useDebouncedValue<T>(value, delay)` — generic debounce helper (not exported).

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useNotifications.ts`
- **Purpose**: Notification list, unread count, and mark-read hooks.
- `useNotifications()` — query key `['notifications']`. Fetches last 30 notifications.
- `useUnreadCount()` — query key `['notifications', 'unread-count']`. Auto-refetches every 30 seconds.
- `useMarkRead()` — mutation taking `{ ids?: string[], all?: boolean }`. Invalidates `['notifications']`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useWebSocket.ts`
- **Purpose**: Connects to WebSocket for live board updates and dispatches events to board store and query cache.
- `markLocalMove(taskId)` — exported function; registers a task ID as locally-moved to suppress WS echo for 2 seconds.
- `useWebSocket(projectId, boardId)` — effect hook. Connects `wsManager` using auth token. Listens to events: `task.created` (adds task + shows toast), `task.updated` (in-place update or animated relocate if status changed), `task.deleted` (removes task), `task.moved` (animated relocate for remote moves, direct relocate for local moves), `notification.new` (invalidates notifications, triggers desktop notification if enabled), `checklist.updated` (invalidates checklists + tasks queries for the affected task), `reaction.updated` (sets reaction query data directly + invalidates tasks for task reactions), `custom_field.created/updated/deleted/reordered` (invalidates custom-fields query). Cleans up all listeners on unmount.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useMyTasks.ts`
- **Purpose**: Query hook for dashboard my-tasks endpoint.
- `useMyTasks()` — query key `['my-tasks']`. Fetches tasks assigned to current user via `api.getMyTasks()`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useActivity.ts`
- **Purpose**: Query hook for task activity logs.
- `useTaskActivity(projectId, taskId)` — query key `['activity', projectId, taskId]`. Enabled when both IDs truthy.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useBoards.ts`
- **Purpose**: CRUD hooks for project-scoped boards.
- `useBoards(projectId)` — query key `['boards', projectId]`. Enabled when `projectId` truthy.
- `useBoard(projectId, boardId)` — query key `['boards', projectId, boardId]`. Enabled when both IDs truthy.
- `useCreateBoard(projectId)` — mutation taking `BoardCreate`. Invalidates `['boards', projectId]` and `['projects', projectId]`.
- `useUpdateBoard(projectId)` — mutation taking `{ boardId, data: BoardUpdate }`. Invalidates `['boards', projectId]` and `['projects', projectId]`.
- `useDeleteBoard(projectId)` — mutation taking `boardId`. Invalidates `['boards', projectId]` and `['projects', projectId]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useAgents.ts`
- **Purpose**: CRUD hooks for project-scoped agents via TanStack Query.
- `useAgents(projectId, includeInactive?)` — query key `['agents', projectId, includeInactive]`. Fetches agent list. Enabled when `projectId` truthy. Defaults `includeInactive` to `true`.
- `useCreateAgent(projectId)` — mutation taking `AgentCreate`. Invalidates `['agents', projectId]` and `['project', projectId]`.
- `useUpdateAgent(projectId)` — mutation taking `{ agentId, data: AgentUpdate }`. Invalidates `['agents', projectId]` and `['project', projectId]`.
- `useDeleteAgent(projectId)` — mutation taking `agentId`. Invalidates `['agents', projectId]` and `['project', projectId]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/hooks/useAttachments.ts`
- **Purpose**: Query and mutation hooks for task file attachments.
- `useAttachments(projectId, boardId, taskId)` — query key `['attachments', projectId, boardId, taskId]`. Enabled when all three IDs truthy.
- `useUploadAttachment(projectId, boardId, taskId)` — mutation taking `File`. Invalidates `['attachments', ...]` and `['tasks', projectId, boardId]`.
- `useDeleteAttachment(projectId, boardId, taskId)` — mutation taking `attachmentId`. Invalidates `['attachments', ...]` and `['tasks', projectId, boardId]`.

---

## Stores

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/stores/authStore.ts`
- **Purpose**: Zustand store for authentication state, persisted to `localStorage` key `agentboard-auth`.
- `useAuthStore` — state: `user: User | null`, `accessToken: string | null`, `refreshToken: string | null`; actions: `setTokens(access, refresh)`, `setUser(user)`, `login(credentials)` (calls `api.login`, sets all state), `register(data)` (calls `api.register`, sets all state), `logout()` (calls `api.logout`, clears state).

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/stores/projectStore.ts`
- **Purpose**: Zustand store for current project context (project, boards, statuses, labels, members, agents).
- `useProjectStore` — state: `currentProject: Project | null`, `boards: Board[]`, `currentBoard: Board | null`, `statuses: Status[]`, `labels: Label[]`, `members: ProjectMember[]`, `agents: Agent[]`; actions: `setCurrentProject(project)`, `setBoards(boards)` (sorts by position), `setCurrentBoard(board | null)`, `setStatuses(statuses)` (sorts by position), `setLabels(labels)`, `setMembers(members)`, `setAgents(agents)`, `clearProject()` (resets all to defaults including agents).

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/stores/boardStore.ts`
- **Purpose**: Zustand store for Kanban board task state and client-side filters.
- `useBoardStore` — state: `tasksByStatus: Record<string, Task[]>`, `filters: FilterState` (`search`, `statuses`, `priorities`, `assignee`); actions: `setTasksForStatus(statusId, tasks)` (sorts by position), `addTask(task)` (inserts into correct status bucket sorted by position), `updateTask(taskId, data)` (in-place merge across all statuses), `moveTask(taskId, fromStatusId, toStatusId, position)` (optimistic local move with position sort), `relocateTask(taskId, newTask)` (removes from all statuses, inserts into target status), `removeTask(taskId)` (filters out from all statuses), `setFilters(partial)`, `clearFilters()`, `getFilteredTasks(statusId)` (applies search, priority, assignee filters — assignee filter checks `t.assignees` array with `user?.id` match), `clearBoard()` (resets tasks and filters).
- Internal `FilterState` — `search: string`, `statuses: string[]`, `priorities: string[]`, `assignee: string | null`.

---

## Types

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/index.ts`
- **Purpose**: Barrel re-export for all type modules.
- Re-exports all types from `./agent`, `./api`, `./board`, `./custom-field`, `./editor`, `./project`, `./reaction`, `./task`, `./user`, `./websocket`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/user.ts`
- **Purpose**: User, auth, and notification preference type definitions.
- `NotificationPreferences` — `task_assigned`, `task_updated`, `task_moved`, `task_deleted`, `task_comment`, `task_reaction`, `mentioned`, `self_notifications`, `desktop_enabled`, `muted_projects: string[]`, `email_enabled`, `email_digest: 'off' | 'instant'`.
- `User` — full user: `id`, `email`, `username`, `full_name`, `avatar_url`, `role`, `notification_preferences: NotificationPreferences | null`, `created_at`, `last_login_at`.
- `UserBrief` — compact user reference: `id`, `username`, `full_name`, `avatar_url`.
- `LoginCredentials` — `email`, `password`.
- `RegisterData` — `email`, `username`, `password`, `full_name?`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/agent.ts`
- **Purpose**: Agent-related type definitions for project-scoped AI agents.
- `Agent` — full agent: `id`, `name`, `color`, `is_active`, `created_at`, `updated_at`.
- `AgentBrief` — compact agent reference: `id`, `name`, `color`.
- `AgentCreate` — `name`, `color`.
- `AgentUpdate` — `name?`, `color?`, `is_active?`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/api.ts`
- **Purpose**: Generic API response envelope types.
- `APIResponse<T>` — `success`, `data: T`, `meta: { timestamp, request_id? }`.
- `PaginatedResponse<T>` — `success`, `data: T[]`, `pagination: { page, per_page, total, total_pages }`, `meta: { timestamp }`.
- `APIError` — `success: false`, `error: { code, message, details?: [{ field, message }] }`, `meta: { timestamp }`.
- `TokenResponse` — `access_token`, `refresh_token`, `token_type`, `user: User`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/custom-field.ts`
- **Purpose**: Custom field definition, value, and configuration type definitions for board-scoped fields.
- `CustomFieldType` — union: `'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'person'`.
- `SelectOption` — `id`, `label`, `color`.
- `CustomFieldDefinition` — `id`, `board_id`, `name`, `field_type: CustomFieldType`, `description`, `options: SelectOption[] | null`, `is_required`, `position`, `created_at`, `updated_at`.
- `CustomFieldDefinitionCreate` — `name`, `field_type: CustomFieldType`, `description?`, `options?: SelectOption[]`, `is_required?`.
- `CustomFieldDefinitionUpdate` — `name?`, `description?`, `options?: SelectOption[]`, `is_required?`.
- `CustomFieldValue` — `id`, `field_definition_id`, `value_text`, `value_number`, `value_json`, `value_date`, `created_at`, `updated_at`.
- `CustomFieldValueSet` — `field_definition_id`, `value_text?`, `value_number?`, `value_json?`, `value_date?`.
- `FieldTypeConfig` — `type: CustomFieldType`, `label`, `icon`, `description`.
- `FIELD_TYPE_CONFIGS` — constant array of 8 `FieldTypeConfig` entries (text, number, select, multi_select, date, checkbox, url, person).

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/editor.ts`
- **Purpose**: Tiptap rich text editor JSON document types and mention/reference API response types.
- `TiptapDoc` — `type: 'doc'`, `content: TiptapNode[]`.
- `TiptapNode` — `type`, `attrs?`, `content?: TiptapNode[]`, `marks?: TiptapMark[]`, `text?`.
- `TiptapMark` — `type`, `attrs?`.
- `MentionAttrs` — `id`, `entityType: 'user' | 'agent' | 'project' | 'board' | 'task'`, `label`.
- `MentionableUser` — `id`, `username`, `full_name`, `avatar_url`.
- `MentionableAgent` — `id`, `name`, `color`.
- `MentionablesResponse` — `users: MentionableUser[]`, `agents: MentionableAgent[]`.
- `ReferenceableProject` — `id`, `name`, `icon`, `color`.
- `ReferenceableBoard` — `id`, `name`, `icon`, `color`.
- `ReferenceableTask` — `id`, `title`, `board_id`, `status_name`.
- `ReferenceablesResponse` — `projects: ReferenceableProject[]`, `boards: ReferenceableBoard[]`, `tasks: ReferenceableTask[]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/reaction.ts`
- **Purpose**: Reaction summary and toggle result types for task/comment emoji reactions.
- `ReactorBrief` — `user: UserBrief | null`, `agent: AgentBrief | null`.
- `ReactionGroup` — `emoji`, `count`, `reacted_by_me`, `reactors: ReactorBrief[]`.
- `ReactionSummary` — `groups: ReactionGroup[]`, `total`.
- `ToggleResult` — `action: 'added' | 'removed'`, `emoji`, `summary: ReactionSummary`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/websocket.ts`
- **Purpose**: WebSocket event payload types.
- `WSEvent` — base event: `type`, `project_id`, `data: Record<string, unknown>`, `user?: { id, username }`, `timestamp`.
- `WSTaskEvent` — extends `WSEvent` with `type` narrowed to `'task.created' | 'task.updated' | 'task.deleted' | 'task.moved'`.
- `WSChecklistEvent` — extends `WSEvent` with `type: 'checklist.updated'`, `data: { task_id: string }`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/project.ts`
- **Purpose**: Project, status, and label type definitions.
- `Project` — `id`, `name`, `description`, `slug`, `owner: UserBrief`, `icon`, `color`, `is_archived`, `member_count`, `task_count`, `created_at`, `updated_at`.
- `ProjectDetail` — extends `Project` with `members: ProjectMember[]`, `boards: Board[]`, `labels: Label[]`, `agents: Agent[]`.
- `ProjectMember` — `id`, `user: UserBrief`, `role`, `joined_at`.
- `ProjectCreate` — `name`, `description?`, `slug?`, `icon?`, `color?`, `create_default_board?`.
- `Status` — `id`, `board_id`, `name`, `slug`, `color`, `position`, `is_default`, `is_terminal`, `task_count`, `created_at`.
- `Label` — `id`, `name`, `color`, `description`, `task_count`, `created_at`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/task.ts`
- **Purpose**: Task, comment, attachment, checklist, filter, and activity log type definitions.
- `Priority` — union type: `'none' | 'low' | 'medium' | 'high' | 'urgent'`.
- `CoverType` — union type: `'image' | 'color' | 'gradient'`.
- `CoverSize` — union type: `'full' | 'half'`.
- `Attachment` — `id`, `filename`, `file_size`, `mime_type`, `download_url`, `user: UserBrief`, `created_at`.
- `AssigneeBrief` — `id`, `user: UserBrief | null`, `agent: AgentBrief | null`.
- `WatcherBrief` — `id`, `user: UserBrief | null`, `agent: AgentBrief | null`.
- `ChecklistItem` — `id`, `checklist_id`, `title`, `is_completed`, `position`, `assignee: UserBrief | null`, `due_date`, `completed_at`, `created_at`, `updated_at`.
- `Checklist` — `id`, `task_id`, `title`, `position`, `items: ChecklistItem[]`, `created_at`, `updated_at`.
- `ChecklistProgress` — `total`, `completed`.
- `ChecklistItemCreate` — `title`, `assignee_id?`, `due_date?`.
- `ChecklistItemUpdate` — `title?`, `is_completed?`, `assignee_id?`, `due_date?`.
- `Task` — `id`, `project_id`, `board_id`, `title`, `description: TiptapDoc | string | null`, `description_text`, `status: Status`, `priority: Priority`, `assignees: AssigneeBrief[]`, `creator: UserBrief`, `agent_creator: AgentBrief | null`, `labels: Label[]`, `attachments: Attachment[]`, `watchers: WatcherBrief[]`, `due_date`, `position`, `parent_id`, `comments_count`, `checklist_progress: ChecklistProgress`, `cover_type: CoverType | null`, `cover_value`, `cover_size: CoverSize | null`, `cover_image_url`, `custom_field_values: CustomFieldValue[]`, `reactions?: ReactionSummary`, `created_at`, `updated_at`, `completed_at`.
- `TaskCreate` — `title`, `description?: TiptapDoc | string`, `status_id?`, `priority?`, `assignee_user_ids?`, `assignee_agent_ids?`, `agent_creator_id?`, `label_ids?`, `watcher_user_ids?`, `watcher_agent_ids?`, `due_date?`, `parent_id?`.
- `TaskUpdate` — `title?`, `description?: TiptapDoc | string`, `status_id?`, `priority?`, `assignee_user_ids?`, `assignee_agent_ids?`, `label_ids?`, `watcher_user_ids?`, `watcher_agent_ids?`, `due_date?`, `cover_type?`, `cover_value?`, `cover_size?`.
- `TaskMove` — `status_id`, `position?`.
- `Comment` — `id`, `content: TiptapDoc | string`, `content_text`, `user: UserBrief`, `agent_creator: AgentBrief | null`, `attachments: Attachment[]`, `reactions?: ReactionSummary`, `created_at`, `updated_at`, `is_edited`.
- `TaskFilters` — `status_id?`, `priority?`, `assignee_id?`, `search?`, `page?`, `per_page?`.
- `ActivityLog` — `id`, `action`, `entity_type`, `changes: Record<string, { old?, new? } | string>`, `user: UserBrief`, `task_id`, `created_at`.
- `DashboardTask` — extends `Task` with `project_name: string`.
- `MyTasksSummary` — `overdue_count`, `due_today_count`, `due_this_week_count`, `total_assigned`.
- `MyTasksResponse` — `summary: MyTasksSummary`, `tasks: DashboardTask[]`.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/types/board.ts`
- **Purpose**: Board-related type definitions.
- `Board` — `id`, `project_id`, `name`, `slug`, `description`, `icon`, `color`, `position`, `member_count`, `task_count`, `status_count`, `created_at`, `updated_at`.
- `BoardDetail` — extends `Board` with `statuses: Status[]`, `members: BoardMember[]`.
- `BoardMember` — `id`, `user: UserBrief`, `role`, `joined_at`.
- `BoardCreate` — `name`, `description?`, `icon?`, `color?`, `create_default_statuses?`.
- `BoardUpdate` — `name?`, `description?`, `icon?`, `color?`.

---

## Libraries / Utilities

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/lib/api-client.ts`
- **Purpose**: Primary API client class with auto token refresh, used by all hooks.
- **Base URL**: `/api/v1`
- **Auth**: Reads `accessToken`/`refreshToken` from `localStorage` key `agentboard-auth` (Zustand persist). Attaches `Authorization: Bearer` header.
- **Interceptor**: On 401 response, attempts `POST /auth/refresh` with refresh token. If successful, updates tokens in localStorage and retries request once.
- **File upload**: `upload<T>(path, file)` method using `FormData` with same 401 retry logic.
- **Exported singleton**: `api` (instance of `APIClient`)
- **Endpoint methods**:
  - Auth: `login(credentials)` (form-urlencoded), `register(data)`, `logout()`
  - Projects: `listProjects(params?)`, `getProject(id)`, `createProject(data)`, `updateProject(id, data)`, `deleteProject(id)`, `archiveProject(id)`, `unarchiveProject(id)`
  - Boards: `listBoards(projectId)`, `getBoard(projectId, boardId)`, `createBoard(projectId, data)`, `updateBoard(projectId, boardId, data)`, `deleteBoard(projectId, boardId)`
  - Statuses: `listStatuses(projectId, boardId)`, `createStatus(projectId, boardId, data)`, `updateStatus(projectId, boardId, statusId, data)`, `deleteStatus(projectId, boardId, statusId)`, `reorderStatuses(projectId, boardId, statusIds)`
  - Labels: `listLabels(projectId)`, `createLabel(projectId, data)`, `updateLabel(projectId, labelId, data)`, `deleteLabel(projectId, labelId)`
  - Agents: `listAgents(projectId, includeInactive?)`, `createAgent(projectId, data)`, `updateAgent(projectId, agentId, data)`, `deleteAgent(projectId, agentId)`
  - Tasks: `listTasks(projectId, boardId, filters?)`, `getTask(projectId, boardId, taskId)`, `createTask(projectId, boardId, data)`, `updateTask(projectId, boardId, taskId, data)`, `deleteTask(projectId, boardId, taskId)`, `moveTask(projectId, boardId, taskId, data)`, `bulkUpdateTasks(projectId, boardId, taskIds, data)`, `bulkMoveTasks(projectId, boardId, taskIds, data)`, `bulkDeleteTasks(projectId, boardId, taskIds)`
  - Comments: `listComments(projectId, boardId, taskId)`, `createComment(projectId, boardId, taskId, data)`, `updateComment(projectId, boardId, taskId, commentId, data)`, `deleteComment(projectId, boardId, taskId, commentId)`
  - Attachments: `uploadAttachment(projectId, boardId, taskId, file)`, `listAttachments(projectId, boardId, taskId)`, `deleteAttachment(projectId, boardId, taskId, attachmentId)`
  - Checklists: `listChecklists(projectId, boardId, taskId)`, `createChecklist(projectId, boardId, taskId, data)`, `updateChecklist(projectId, boardId, taskId, checklistId, data)`, `deleteChecklist(projectId, boardId, taskId, checklistId)`, `createChecklistItem(projectId, boardId, taskId, checklistId, data)`, `updateChecklistItem(projectId, boardId, taskId, checklistId, itemId, data)`, `deleteChecklistItem(projectId, boardId, taskId, checklistId, itemId)`, `toggleChecklistItem(projectId, boardId, taskId, checklistId, itemId)`, `reorderChecklistItem(projectId, boardId, taskId, checklistId, itemId, position)`
  - Reactions: `getTaskReactions(projectId, boardId, taskId)`, `toggleTaskReaction(projectId, boardId, taskId, data)`, `getCommentReactions(projectId, boardId, taskId, commentId)`, `toggleCommentReaction(projectId, boardId, taskId, commentId, data)`
  - Custom Fields: `listCustomFields(projectId, boardId)`, `createCustomField(projectId, boardId, data)`, `updateCustomField(projectId, boardId, fieldId, data)`, `deleteCustomField(projectId, boardId, fieldId)`, `reorderCustomFields(projectId, boardId, fieldIds)`, `setFieldValue(projectId, boardId, taskId, fieldId, data)`, `bulkSetFieldValues(projectId, boardId, taskId, values)`, `clearFieldValue(projectId, boardId, taskId, fieldId)`
  - Mentionables: `getMentionables(projectId, q?)`, `getReferenceables(projectId, q?)`
  - Activity: `listTaskActivity(projectId, taskId)`
  - Search: `search(q, types?, projectId?)`
  - Stats: `getProjectStats(projectId)`, `getDashboardStats()`
  - Dashboard: `getMyTasks()`
  - API Keys: `listApiKeys()`, `createApiKey(data)`, `deleteApiKey(keyId)`
  - Notifications: `listNotifications(params?)`, `getUnreadCount()`, `markNotificationsRead(ids?, markAll?)`, `clearNotifications()`, `getNotificationPreferences()`, `updateNotificationPreferences(prefs)`
  - Users: `getMe()`, `updateMe(data)`

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/lib/api.ts`
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

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/lib/cover-presets.ts`
- **Purpose**: Predefined gradient and solid color presets for task covers.
- `GRADIENT_PRESETS` — `Record<string, string>` with 12 named gradients: `sunset`, `ocean`, `forest`, `lavender`, `rose`, `ember`, `slate`, `midnight`, `aurora`, `golden`, `storm`, `mint`. Each value is a CSS `linear-gradient(135deg, ...)`.
- `COLOR_PRESETS` — readonly tuple of 16 hex color strings (reds, oranges, yellows, greens, blues, purples, pinks, grays).

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/lib/websocket.ts`
- **Purpose**: WebSocket connection manager with auto-reconnect and heartbeat.
- **Exported singleton**: `wsManager` (instance of `WebSocketManager`)
- **Connection URL**: `ws[s]://{host}/api/v1/ws?token={token}&project_id={id}&board_id={id}`
- **Methods**: `connect(projectId, boardId, token)` (opens WS, sends `subscribe` message, starts 30s ping heartbeat), `disconnect()` (intentional close, clears timers), `on(type, handler)` (registers event listener), `off(type, handler)` (removes event listener).
- **Reconnect**: Exponential backoff starting at 3s, max 30s. Skipped on intentional close.
- **Messages sent**: `{ type: 'subscribe', project_id, board_id }`, `{ type: 'ping' }`
- **Messages received**: Dispatches by `type` field to registered handlers. Ignores `pong` messages.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/frontend/src/lib/utils.ts`
- **Purpose**: Tailwind CSS class name merge utility.
- `cn(...inputs: ClassValue[])` — merges class names using `clsx` + `twMerge` for conflict resolution.
