# Frontend State Map -- Hooks, Stores, Types, Utilities

## Hooks (TanStack Query Wrappers)

### `/frontend/src/hooks/useAuth.ts`
- **Purpose**: Auth mutation hooks wrapping authStore login/register actions.
- `useLogin()` -- mutation, calls `authStore.login(credentials: LoginCredentials)`
- `useRegister()` -- mutation, calls `authStore.register(data: RegisterData)`

### `/frontend/src/hooks/useProjects.ts`
- **Purpose**: CRUD hooks for projects.
- `useProjects(params?)` -- query `['projects', params]`, returns `PaginatedResponse<Project>`
- `useProject(projectId)` -- query `['projects', projectId]`, returns `APIResponse<ProjectDetail>`
- `useCreateProject()` -- mutation, invalidates `['projects']`
- `useUpdateProject()` -- mutation `{ projectId, data }`, invalidates `['projects']` + `['projects', projectId]`
- `useDeleteProject()` -- mutation, invalidates `['projects']`

### `/frontend/src/hooks/useBoards.ts`
- **Purpose**: CRUD hooks for boards within a project.
- `useBoards(projectId)` -- query `['boards', projectId]`, returns `APIResponse<Board[]>`
- `useBoard(projectId, boardId)` -- query `['boards', projectId, boardId]`, returns `APIResponse<BoardDetail>`
- `useCreateBoard(projectId)` -- mutation `BoardCreate`, invalidates `['boards', projectId]` + `['projects', projectId]`
- `useUpdateBoard(projectId)` -- mutation `{ boardId, data: BoardUpdate }`, invalidates boards + project
- `useDeleteBoard(projectId)` -- mutation `boardId`, invalidates boards + project

### `/frontend/src/hooks/useTasks.ts`
- **Purpose**: CRUD + move hooks for board-scoped tasks with optimistic rollback on move.
- `useTasks(projectId, boardId, filters?)` -- query `['tasks', projectId, boardId, filters]`, returns `PaginatedResponse<Task>`
- `useCreateTask(projectId, boardId)` -- mutation `TaskCreate`, invalidates tasks + activity
- `useUpdateTask(projectId, boardId)` -- mutation `{ taskId, data: TaskUpdate }`, invalidates tasks + subtasks + activity
- `useDeleteTask(projectId, boardId)` -- mutation `{ taskId, mode?: 'cascade' | 'orphan' }`, invalidates tasks + activity
- `useMoveTask(projectId, boardId)` -- mutation `{ taskId, fromStatusId, data: TaskMove, _prevSnapshot? }`, optimistic via boardStore rollback on error, calls `clearLocalMove` on settle

### `/frontend/src/hooks/useStatuses.ts`
- **Purpose**: Status list, create, and reorder hooks (board-scoped).
- `useStatuses(projectId, boardId)` -- query `['statuses', projectId, boardId]`
- `useCreateStatus(projectId, boardId)` -- mutation `{ name, color? }`, invalidates statuses
- `useReorderStatuses(projectId, boardId)` -- mutation `statusIds: string[]`, invalidates statuses

### `/frontend/src/hooks/useLabels.ts`
- **Purpose**: CRUD hooks for project-scoped labels.
- `useLabels(projectId)` -- query `['labels', projectId]`
- `useCreateLabel(projectId)` -- mutation `{ name, color, description? }`, invalidates labels + project
- `useUpdateLabel(projectId)` -- mutation `{ labelId, data }`, invalidates labels + project
- `useDeleteLabel(projectId)` -- mutation `labelId`, invalidates labels + project

### `/frontend/src/hooks/useComments.ts`
- **Purpose**: CRUD hooks for task comments.
- `useComments(projectId, boardId, taskId)` -- query `['comments', projectId, boardId, taskId]`
- `useCreateComment(projectId, boardId, taskId)` -- mutation `{ content: any, attachment_ids? }`, invalidates comments + activity
- `useUpdateComment(projectId, boardId, taskId)` -- mutation `{ commentId, data: { content } }`, invalidates comments
- `useDeleteComment(projectId, boardId, taskId)` -- mutation `commentId`, invalidates comments + activity

### `/frontend/src/hooks/useAttachments.ts`
- **Purpose**: List, upload, and delete hooks for task attachments.
- `useAttachments(projectId, boardId, taskId)` -- query `['attachments', projectId, boardId, taskId]`
- `useUploadAttachment(projectId, boardId, taskId)` -- mutation `File`, invalidates attachments + tasks + activity
- `useDeleteAttachment(projectId, boardId, taskId)` -- mutation `attachmentId`, invalidates attachments + tasks + activity

### `/frontend/src/hooks/useAgents.ts`
- **Purpose**: CRUD hooks for project-scoped agents, global agents, and project linking.
- `useAgents(projectId, includeInactive?)` -- query `['agents', projectId, includeInactive]`
- `useMyAgents(includeDeleted?)` -- query `['agents', 'mine', includeDeleted]`, returns `AgentWithProjects[]`
- `useCreateAgent(projectId)` -- mutation `AgentCreate`, invalidates agents + project
- `useUpdateAgent(projectId)` -- mutation `{ agentId, data: AgentUpdate }`, invalidates agents + project
- `useDeleteAgent(projectId)` -- mutation `agentId`, invalidates agents + project
- `useLinkAgent(projectId)` -- mutation `agentId`, invalidates agents + mine + project
- `useCreateGlobalAgent()` -- mutation `AgentCreate`, invalidates `['agents', 'mine']`
- `useUpdateGlobalAgent()` -- mutation `{ agentId, data: AgentUpdate }`, invalidates `['agents', 'mine']`
- `useDeleteGlobalAgent()` -- mutation `agentId`, invalidates `['agents', 'mine']`

### `/frontend/src/hooks/useNotifications.ts`
- **Purpose**: Notification list, unread count, mark-read, clear, and preference hooks.
- `useNotifications()` -- query `['notifications']`, fetches 30 per page
- `useUnreadCount()` -- query `['notifications', 'unread-count']`, refetches every 30s
- `useMarkRead()` -- mutation `{ ids?, all? }`, invalidates notifications
- `useClearNotifications()` -- mutation, invalidates notifications
- `useNotificationPreferences()` -- query `['notification-preferences']`, returns `NotificationPreferences`
- `useUpdateNotificationPreferences()` -- mutation `NotificationPreferences`, invalidates preferences

### `/frontend/src/hooks/useMyTasks.ts`
- **Purpose**: Dashboard hook for current user's assigned tasks.
- `useMyTasks()` -- query `['my-tasks']`, returns `APIResponse<MyTasksResponse>`

### `/frontend/src/hooks/useActivity.ts`
- **Purpose**: Task activity log hook.
- `useTaskActivity(projectId, taskId)` -- query `['activity', projectId, taskId]`, returns `PaginatedResponse<ActivityLog>`

### `/frontend/src/hooks/useSearch.ts`
- **Purpose**: Debounced global search hook (300ms delay, min 2 chars).
- `useSearch(query, types?, projectId?)` -- query `['search', debouncedQuery, types, projectId]`, enabled when query >= 2 chars
- Internal `useDebouncedValue<T>(value, delay)` helper

### `/frontend/src/hooks/useWebSocket.ts`
- **Purpose**: Connects to board WebSocket, dispatches real-time events to boardStore and query cache.
- `useWebSocket(projectId, boardId)` -- effect hook, connects `wsManager`, registers event handlers
- `markLocalMove(taskId)` -- marks a task as locally moved (prevents WS echo animation), 10s auto-cleanup
- `clearLocalMove(taskId)` -- clears local move flag
- **Events handled**: `task.created`, `task.updated`, `task.deleted`, `task.moved`, `notification.new`, `checklist.updated`, `reaction.updated`, `custom_field.created/updated/deleted/reordered`, `subtask.created/updated/deleted/reordered`
- Notifications trigger in-app toast + desktop notification (if `desktop_enabled` pref)
- Task moves from other users trigger flight animation via `TaskAnimationLayer`

### `/frontend/src/hooks/useCardDisplayMode.ts`
- **Purpose**: Persisted card display mode toggle (compact/detailed) using localStorage.
- `useCardDisplayMode()` -- returns `{ mode: 'compact' | 'detailed', setMode(m) }`
- Storage key: `agentboard-card-mode`

### `/frontend/src/hooks/useChecklists.ts`
- **Purpose**: Full CRUD + toggle + reorder hooks for checklists and checklist items with optimistic updates.
- `useChecklists(projectId, boardId, taskId)` -- query `['checklists', projectId, boardId, taskId]`
- `useCreateChecklist(projectId, boardId, taskId)` -- mutation `{ title }`, invalidates checklists + tasks + activity
- `useUpdateChecklist(projectId, boardId, taskId)` -- mutation `{ checklistId, data: { title? } }`
- `useDeleteChecklist(projectId, boardId, taskId)` -- mutation `checklistId`, invalidates checklists + tasks + activity
- `useCreateChecklistItem(projectId, boardId, taskId)` -- mutation `{ checklistId, data: ChecklistItemCreate }`
- `useUpdateChecklistItem(projectId, boardId, taskId)` -- mutation `{ checklistId, itemId, data: ChecklistItemUpdate }`
- `useDeleteChecklistItem(projectId, boardId, taskId)` -- mutation `{ checklistId, itemId }`
- `useToggleChecklistItem(projectId, boardId, taskId)` -- mutation `{ checklistId, itemId }`, **optimistic** toggle of `is_completed`
- `useReorderChecklistItem(projectId, boardId, taskId)` -- mutation `{ checklistId, itemId, position }`, **optimistic** position update + sort

### `/frontend/src/hooks/useReactions.ts`
- **Purpose**: Reaction query + optimistic toggle hooks for tasks and comments.
- `useTaskReactions(projectId, boardId, taskId)` -- query `['reactions', 'task', taskId]`
- `useCommentReactions(projectId, boardId, taskId, commentId)` -- query `['reactions', 'comment', commentId]`
- `useToggleTaskReaction(projectId, boardId, taskId)` -- mutation `emoji: string`, **optimistic** toggle via `optimisticToggle()`, invalidates reactions + tasks
- `useToggleCommentReaction(projectId, boardId, taskId, commentId)` -- mutation `emoji: string`, **optimistic** toggle, invalidates reactions + comments

### `/frontend/src/hooks/useCustomFields.ts`
- **Purpose**: CRUD + reorder hooks for custom field definitions and value set/clear hooks.
- `useCustomFieldDefinitions(projectId, boardId)` -- query `['custom-fields', projectId, boardId]`
- `useCreateCustomField(projectId, boardId)` -- mutation `CustomFieldDefinitionCreate`
- `useUpdateCustomField(projectId, boardId)` -- mutation `{ fieldId, data: CustomFieldDefinitionUpdate }`
- `useDeleteCustomField(projectId, boardId)` -- mutation `fieldId`, invalidates custom-fields + tasks
- `useReorderCustomFields(projectId, boardId)` -- mutation `fieldIds: string[]`
- `useSetFieldValue(projectId, boardId, taskId)` -- mutation `CustomFieldValueSet`, invalidates tasks + activity
- `useBulkSetFieldValues(projectId, boardId, taskId)` -- mutation `CustomFieldValueSet[]`, invalidates tasks + activity
- `useClearFieldValue(projectId, boardId, taskId)` -- mutation `fieldId`, invalidates tasks + activity

### `/frontend/src/hooks/useSubtasks.ts`
- **Purpose**: Subtask list, create, reorder, convert, and promote hooks.
- `useSubtasks(projectId, boardId, parentId)` -- query `['subtasks', projectId, boardId, parentId]`
- `useCreateSubtask(projectId, boardId, parentId)` -- mutation `TaskCreate`, invalidates subtasks + tasks + activity
- `useReorderSubtask(projectId, boardId, parentId)` -- mutation `{ subtaskId, position }`, invalidates subtasks
- `useConvertToSubtask(projectId, boardId)` -- mutation `{ parentId, taskId }`, invalidates tasks + subtasks + activity
- `usePromoteSubtask(projectId, boardId)` -- mutation `taskId`, invalidates tasks + subtasks + activity

### `/frontend/src/hooks/useExpandedTasks.ts`
- **Purpose**: Per-board expanded task state persisted in localStorage with cross-tab sync.
- `useExpandedTasks(boardId)` -- returns `{ expandedSet: Set<string>, isExpanded(taskId), toggle(taskId) }`
- Storage key: `agentboard-expanded-{boardId}`
- Cross-tab sync via custom `expanded-tasks-change` window event

---

## Zustand Stores

### `/frontend/src/stores/authStore.ts`
- **Purpose**: Persisted auth state with login/register/logout actions.
- `useAuthStore` -- Zustand store with `persist` middleware (key: `agentboard-auth`)
- **State**: `user: User | null`, `accessToken: string | null`, `refreshToken: string | null`
- **Actions**: `setTokens(access, refresh)`, `setUser(user)`, `login(credentials)` (async, calls `api.login`), `register(data)` (async, calls `api.register`), `logout()` (clears state, fire-and-forget `api.logout`)

### `/frontend/src/stores/projectStore.ts`
- **Purpose**: Current project context state for the active view.
- `useProjectStore` -- Zustand store (no persist)
- **State**: `currentProject: Project | null`, `boards: Board[]`, `currentBoard: Board | null`, `statuses: Status[]`, `labels: Label[]`, `members: ProjectMember[]`, `agents: Agent[]`
- **Actions**: `setCurrentProject(project)`, `setBoards(boards)` (sorts by position), `setCurrentBoard(board | null)`, `setStatuses(statuses)` (sorts by position), `setLabels(labels)`, `setMembers(members)`, `setAgents(agents)`, `clearProject()` (resets all)

### `/frontend/src/stores/boardStore.ts`
- **Purpose**: Board-level task state, client-side filtering, and drag-drop task management.
- `useBoardStore` -- Zustand store (no persist)
- **State**: `tasksByStatus: Record<string, Task[]>`, `filters: FilterState`
- **FilterState type**: `search: string`, `priorities: string[]`, `assigneeUserIds: string[]`, `assigneeAgentIds: string[]`, `unassigned: boolean`, `labelIds: string[]`, `dueDatePresets: DueDatePreset[]`
- **DueDatePreset type** (exported): `'overdue' | 'today' | 'this_week' | 'next_week' | 'no_date'`
- **Actions**: `setTasksForStatus(statusId, tasks)`, `addTask(task)`, `updateTask(taskId, data)`, `moveTask(taskId, fromStatusId, toStatusId, position)` (binary insert), `relocateTask(taskId, newTask)`, `removeTask(taskId)`, `setFilters(partial)`, `clearFilters()`, `clearBoard()`
- **Selectors**: `hasActiveFilters()`, `getFilteredTasks(statusId)` (filters by search, priority, assignees incl. users/agents/unassigned, labels, due date presets with OR logic)

---

## Type Definitions

### `/frontend/src/types/api.ts`
- **Purpose**: Generic API response envelope types.
- `APIResponse<T>` -- `{ success, data: T, meta: { timestamp, request_id? } }`
- `PaginatedResponse<T>` -- `{ success, data: T[], pagination: { page, per_page, total, total_pages }, meta }`
- `APIError` -- `{ success: false, error: { code, message, details?: FieldError[] }, meta }`
- `TokenResponse` -- `{ access_token, refresh_token, token_type, user: User }`

### `/frontend/src/types/board.ts`
- **Purpose**: Board-related types.
- `Board` -- `id, project_id, name, slug, description, icon, color, position, member_count, task_count, status_count, created_at, updated_at`
- `BoardDetail` -- extends `Board` with `statuses: Status[]`, `members: BoardMember[]`
- `BoardMember` -- `id, user: UserBrief, role, joined_at`
- `BoardCreate` -- `name, description?, icon?, color?, create_default_statuses?`
- `BoardUpdate` -- `name?, description?, icon?, color?`

### `/frontend/src/types/project.ts`
- **Purpose**: Project, status, and label types.
- `Project` -- `id, name, description, slug, owner: UserBrief, icon, color, is_archived, member_count, task_count, created_at, updated_at`
- `ProjectDetail` -- extends `Project` with `members: ProjectMember[]`, `boards: Board[]`, `labels: Label[]`, `agents: Agent[]`
- `ProjectMember` -- `id, user: UserBrief, role, joined_at`
- `ProjectCreate` -- `name, description?, slug?, icon?, color?, create_default_board?`
- `Status` -- `id, board_id, name, slug, color, position, is_default, is_terminal, task_count, created_at`
- `Label` -- `id, name, color, description, task_count, created_at`

### `/frontend/src/types/task.ts`
- **Purpose**: Task, comment, checklist, subtask, activity, and dashboard types.
- `Priority` -- `'none' | 'low' | 'medium' | 'high' | 'urgent'`
- `CoverType` -- `'image' | 'color' | 'gradient'`
- `CoverSize` -- `'full' | 'half'`
- `Attachment` -- `id, filename, file_size, mime_type, download_url, user: UserBrief, created_at`
- `AssigneeBrief` -- `id, user: UserBrief | null, agent: AgentBrief | null`
- `WatcherBrief` -- `id, user: UserBrief | null, agent: AgentBrief | null`
- `ChecklistItem` -- `id, checklist_id, title, is_completed, position, assignee, due_date, completed_at, created_at, updated_at`
- `Checklist` -- `id, task_id, title, position, items: ChecklistItem[], created_at, updated_at`
- `ChecklistProgress` -- `{ total, completed }`
- `SubtaskProgress` -- `{ total, completed }`
- `SubtaskBrief` -- `id, title, status, priority, position, completed_at, assignees`
- `TaskDeleteMode` -- `'cascade' | 'orphan'`
- `ChecklistItemCreate` -- `title, assignee_id?, due_date?`
- `ChecklistItemUpdate` -- `title?, is_completed?, assignee_id?, due_date?`
- `Task` -- `id, project_id, board_id, title, description: TiptapDoc | string | null, description_text, status, priority, assignees, creator, agent_creator, labels, attachments, watchers, due_date, position, parent_id, comments_count, checklist_progress, subtask_progress, children_count, children: SubtaskBrief[], cover_type, cover_value, cover_size, cover_image_url, custom_field_values, reactions?, created_at, updated_at, completed_at`
- `TaskCreate` -- `title, description?, status_id?, priority?, assignee_user_ids?, assignee_agent_ids?, label_ids?, watcher_user_ids?, watcher_agent_ids?, due_date?, parent_id?`
- `TaskUpdate` -- extends TaskCreate fields + `cover_type?, cover_value?, cover_size?, parent_id? (nullable)`
- `TaskMove` -- `status_id, position?`
- `Comment` -- `id, content: TiptapDoc | string, content_text, user, agent_creator, attachments, reactions?, created_at, updated_at, is_edited`
- `TaskFilters` -- `status_id?, priority?, assignee_id?, search?, page?, per_page?`
- `ActivityLog` -- `id, action, entity_type, changes, user, agent, task_id, created_at`
- `DashboardTask` -- extends `Task` with `project_name, parent_title`
- `MyTasksSummary` -- `overdue_count, due_today_count, due_this_week_count, total_assigned`
- `MyTasksResponse` -- `{ summary: MyTasksSummary, tasks: DashboardTask[] }`

### `/frontend/src/types/user.ts`
- **Purpose**: User, auth, and notification preference types.
- `NotificationPreferences` -- `task_assigned, task_updated, task_moved, task_deleted, task_comment, task_reaction, mentioned, subtask_created, subtask_deleted, watcher_added, watcher_removed, assignee_added, assignee_removed, comment_deleted, self_notifications, desktop_enabled, muted_projects: string[], email_enabled, email_digest: 'off' | 'instant' | 'daily'`
- `User` -- `id, email, username, full_name, avatar_url, role, notification_preferences, created_at, last_login_at`
- `UserBrief` -- `id, username, full_name, avatar_url`
- `LoginCredentials` -- `email, password`
- `RegisterData` -- `email, username, password, full_name?`

### `/frontend/src/types/websocket.ts`
- **Purpose**: WebSocket event types.
- `WSEvent` -- `type, project_id, data, user?: { id, username, agent?: { id, name } }, timestamp`
- `WSTaskEvent` -- extends `WSEvent`, type: `'task.created' | 'task.updated' | 'task.deleted' | 'task.moved'`
- `WSChecklistEvent` -- extends `WSEvent`, type: `'checklist.updated'`, data: `{ task_id }`

### `/frontend/src/types/agent.ts`
- **Purpose**: Agent types for project-scoped and global agent management.
- `Agent` -- `id, name, color, is_active, created_at, updated_at, deleted_at`
- `AgentBrief` -- `id, name, color`
- `AgentCreate` -- `name, color`
- `AgentUpdate` -- `name?, color?, is_active?`
- `AgentWithProjects` -- extends `Agent` with `projects: { id, name }[]`

### `/frontend/src/types/reaction.ts`
- **Purpose**: Reaction data types for emoji reactions on tasks and comments.
- `ReactorBrief` -- `{ user: UserBrief | null, agent: AgentBrief | null }`
- `ReactionGroup` -- `emoji, count, reacted_by_me, reactors: ReactorBrief[]`
- `ReactionSummary` -- `{ groups: ReactionGroup[], total }`
- `ToggleResult` -- `{ action: 'added' | 'removed', emoji, summary: ReactionSummary }`

### `/frontend/src/types/custom-field.ts`
- **Purpose**: Custom field definition, value, and configuration types.
- `CustomFieldType` -- `'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'person'`
- `SelectOption` -- `{ id, label, color }`
- `CustomFieldDefinition` -- `id, board_id, name, field_type, description, options, is_required, position, created_at, updated_at`
- `CustomFieldDefinitionCreate` -- `name, field_type, description?, options?, is_required?`
- `CustomFieldDefinitionUpdate` -- `name?, description?, options?, is_required?`
- `CustomFieldValue` -- `id, field_definition_id, value_text, value_number, value_json, value_date, created_at, updated_at`
- `CustomFieldValueSet` -- `field_definition_id, value_text?, value_number?, value_json?, value_date?`
- `FieldTypeConfig` -- `{ type, label, icon, description }`
- `FIELD_TYPE_CONFIGS` -- constant array of 8 `FieldTypeConfig` entries (text, number, select, multi_select, date, checkbox, url, person)

### `/frontend/src/types/editor.ts`
- **Purpose**: Tiptap rich-text editor JSON document types and mention/reference types.
- `TiptapDoc` -- `{ type: 'doc', content: TiptapNode[] }`
- `TiptapNode` -- `{ type, attrs?, content?, marks?, text? }`
- `TiptapMark` -- `{ type, attrs? }`
- `MentionAttrs` -- `{ id, entityType: 'user' | 'agent' | 'project' | 'board' | 'task', label }`
- `MentionableUser` -- `{ id, username, full_name, avatar_url }`
- `MentionableAgent` -- `{ id, name, color }`
- `MentionablesResponse` -- `{ users: MentionableUser[], agents: MentionableAgent[] }`
- `ReferenceableProject` -- `{ id, name, icon, color }`
- `ReferenceableBoard` -- `{ id, name, icon, color, project_id }`
- `ReferenceableTask` -- `{ id, title, board_id, project_id, status_name }`
- `ReferenceablesResponse` -- `{ projects, boards, tasks }`

### `/frontend/src/types/index.ts`
- **Purpose**: Barrel re-export of all type modules.
- Re-exports: `agent`, `api`, `board`, `custom-field`, `editor`, `project`, `reaction`, `task`, `user`, `websocket`

---

## API Clients

### `/frontend/src/lib/api.ts`
- **Purpose**: Legacy simple API client using plain `fetch` with localStorage token (`token` key).
- Base URL: `/api/v1`
- `request<T>(path, options?)` -- generic fetch wrapper with Bearer token from `localStorage.getItem('token')`
- `api.auth` -- `login(email, password)`, `register(data)`, `me()`
- `api.projects` -- `list()`, `get(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `members(id)`, `statuses(id)`, `labels(id)`
- `api.tasks` -- `list(projectId)`, `get(projectId, taskId)`, `create(projectId, data)`, `update(projectId, taskId, data)`, `delete(projectId, taskId)`, `move(projectId, taskId, data)`
- `api.comments` -- `list(projectId, taskId)`, `create(projectId, taskId, content)`, `delete(projectId, taskId, commentId)`
- `api.apiKeys` -- `list()`, `create(name)`, `delete(id)`
- `api.users` -- `update(data)`
- Internal types: `ApiKey`, `ProjectUpdate`

### `/frontend/src/lib/api-client.ts`
- **Purpose**: Primary class-based API client with auto token refresh on 401 and file upload support.
- Base URL: `/api/v1`
- Token source: `localStorage.getItem('agentboard-auth')` (Zustand persisted store)
- `APIClient.request<T>(path, options, retry?)` -- generic fetch with auto 401 refresh retry
- `APIClient.upload<T>(path, file, retry?)` -- multipart FormData upload with auth
- `APIClient.refreshToken()` -- POST `/auth/refresh`, updates localStorage tokens
- **Auth**: `login(credentials)` (form-urlencoded), `register(data)`, `logout()`
- **Projects**: `listProjects(params?)`, `getProject(id)`, `createProject(data)`, `updateProject(id, data)`, `deleteProject(id)`, `archiveProject(id)`, `unarchiveProject(id)`
- **Boards**: `listBoards(projectId)`, `getBoard(projectId, boardId)`, `createBoard(projectId, data)`, `updateBoard(projectId, boardId, data)`, `deleteBoard(projectId, boardId)`
- **Statuses**: `listStatuses(p, b)`, `createStatus(p, b, data)`, `updateStatus(p, b, sId, data)`, `deleteStatus(p, b, sId)`, `reorderStatuses(p, b, ids)`
- **Labels**: `listLabels(p)`, `createLabel(p, data)`, `updateLabel(p, lId, data)`, `deleteLabel(p, lId)`
- **Agents**: `listAgents(p, includeInactive?)`, `createAgent(p, data)`, `updateAgent(p, aId, data)`, `deleteAgent(p, aId)`, `listMyAgents(includeDeleted?)`, `createGlobalAgent(data)`, `updateGlobalAgent(aId, data)`, `deleteGlobalAgent(aId)`, `linkAgentToProject(p, aId)`
- **Tasks**: `listTasks(p, b, filters?)`, `getTask(p, b, tId)`, `createTask(p, b, data)`, `updateTask(p, b, tId, data)`, `deleteTask(p, b, tId, mode?)`, `moveTask(p, b, tId, data)`, `bulkUpdateTasks(p, b, ids, data)`, `bulkMoveTasks(p, b, ids, data)`, `bulkDeleteTasks(p, b, ids)`
- **Subtasks**: `listSubtasks(p, b, tId)`, `createSubtask(p, b, parentId, data)`, `reorderSubtask(p, b, parentId, sId, position)`, `convertToSubtask(p, b, parentId, taskId)`, `promoteSubtask(p, b, tId)`
- **Comments**: `listComments(p, b, tId)`, `createComment(p, b, tId, data)`, `updateComment(p, b, tId, cId, data)`, `deleteComment(p, b, tId, cId)`
- **Attachments**: `uploadAttachment(p, b, tId, file)`, `listAttachments(p, b, tId)`, `deleteAttachment(p, b, tId, aId)`
- **Checklists**: `listChecklists`, `createChecklist`, `updateChecklist`, `deleteChecklist`, `createChecklistItem`, `updateChecklistItem`, `deleteChecklistItem`, `toggleChecklistItem`, `reorderChecklistItem` -- all scoped to `(projectId, boardId, taskId, ...)`
- **Reactions**: `getTaskReactions(p, b, tId)`, `toggleTaskReaction(p, b, tId, data)`, `getCommentReactions(p, b, tId, cId)`, `toggleCommentReaction(p, b, tId, cId, data)`
- **Custom Fields**: `listCustomFields(p, b)`, `createCustomField(p, b, data)`, `updateCustomField(p, b, fId, data)`, `deleteCustomField(p, b, fId)`, `reorderCustomFields(p, b, ids)`, `setFieldValue(p, b, tId, fId, data)`, `bulkSetFieldValues(p, b, tId, values)`, `clearFieldValue(p, b, tId, fId)`
- **Mentionables**: `getMentionables(projectId, q?)`, `getReferenceables(projectId, q?)`
- **Activity**: `listTaskActivity(p, tId)`
- **Search**: `search(q, types?, projectId?)`
- **Stats**: `getProjectStats(p)`, `getDashboardStats()`, `getMyTasks()`
- **API Keys**: `listApiKeys()`, `createApiKey(data)`, `deleteApiKey(keyId)`
- **Notifications**: `listNotifications(params?)`, `getUnreadCount()`, `markNotificationsRead(ids?, all?)`, `clearNotifications()`, `getNotificationPreferences()`, `updateNotificationPreferences(prefs)`
- **Users**: `getMe()`, `updateMe(data)`, `changePassword(data)`
- Exported singleton: `export const api = new APIClient()`

---

## WebSocket Client

### `/frontend/src/lib/websocket.ts`
- **Purpose**: WebSocket connection manager with auto-reconnect and event pub/sub.
- `WebSocketManager` class (singleton exported as `wsManager`)
- `connect(projectId, boardId, token)` -- connects to `ws(s)://host/api/v1/ws?token=...&project_id=...&board_id=...`, sends `subscribe` message, starts 30s heartbeat ping
- `disconnect()` -- intentional close, cleans up timers
- `on(type, handler)` -- subscribe to event type
- `off(type, handler)` -- unsubscribe from event type
- Auto-reconnect on unintentional close with exponential backoff (3s initial, 30s max)
- Ignores `pong` messages silently

---

## Utility Modules

### `/frontend/src/lib/utils.ts`
- **Purpose**: Shared utility functions.
- `cn(...inputs: ClassValue[])` -- merges Tailwind classes via `clsx` + `twMerge`
- `hexToRgb(hex)` -- converts hex color to space-separated RGB string (e.g. `"255 0 128"`)

### `/frontend/src/lib/cover-presets.ts`
- **Purpose**: Predefined gradient and color presets for task covers.
- `GRADIENT_PRESETS` -- Record of 12 named CSS gradients (sunset, ocean, forest, lavender, rose, ember, slate, midnight, aurora, golden, storm, mint)
- `COLOR_PRESETS` -- readonly array of 16 hex color strings

### `/frontend/src/lib/errors.ts`
- **Purpose**: Structured error parsing for backend API errors.
- `FieldError` -- `{ field, message }`
- `ParsedError` -- `{ message, code, details?: FieldError[] }`
- `parseApiError(err)` -- extracts structured error from backend `{ error: { code, message, details } }`, `{ detail }`, Error instances, or strings
- `getErrorMessage(err)` -- shorthand for `parseApiError(err).message`
- `isNetworkError(err)` -- checks for `Failed to fetch` TypeError or AbortError
- `getErrorMessageWithNetwork(err)` -- returns network-aware error message

### `/frontend/src/lib/format.ts`
- **Purpose**: Formatting utilities.
- `formatFileSize(bytes)` -- converts bytes to human-readable string (B/KB/MB)

### `/frontend/src/lib/position.ts`
- **Purpose**: Position calculation for drag-and-drop task ordering (mirrors backend PositionService).
- `POSITION_GAP` -- constant `1024.0`
- `calculateInsertPosition(sortedPositions, insertIdx)` -- midpoint bisection position calculation

### `/frontend/src/lib/toast.ts`
- **Purpose**: Pre-configured toast notification helpers wrapping Sonner.
- `toast.success(message, opts?)` -- 3s duration
- `toast.error(messageOrError, opts?)` -- 5s duration, auto-parses API errors, shows field details as description
- `toast.warning(message, opts?)` -- 4s duration
- `toast.info(message, opts?)` -- 3s duration
- `toast.dismiss(id?)` -- dismiss toast by ID
