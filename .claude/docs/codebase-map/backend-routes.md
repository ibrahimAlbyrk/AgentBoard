# Backend Routes Map

All routes are mounted under the `/api/v1` prefix in `main.py`.

---

### `backend/app/api/v1/auth.py`
- **Purpose**: User registration, login, and token refresh (no auth required)
- `POST /api/v1/auth/register` → `register()` — Create new user account, returns access + refresh tokens
- `POST /api/v1/auth/login` → `login()` — Authenticate via OAuth2 password form, returns tokens + user
- `POST /api/v1/auth/refresh` → `refresh()` — Exchange refresh token for new access + refresh tokens

---

### `backend/app/api/v1/users.py`
- **Purpose**: User profile retrieval and updates (requires auth)
- `GET /api/v1/users/me` → `get_me()` — Get current authenticated user's profile
- `PATCH /api/v1/users/me` → `update_me()` — Update current user's profile fields
- `GET /api/v1/users/{user_id}` → `get_user()` — Get any user's profile by UUID; requires auth

---

### `backend/app/api/v1/api_keys.py`
- **Purpose**: CRUD for API keys used for agent/programmatic auth (requires auth)
- `GET /api/v1/api-keys/` → `list_api_keys()` — List all API keys for the current user
- `POST /api/v1/api-keys/` → `create_api_key()` — Create a new API key; returns the raw key once
- `DELETE /api/v1/api-keys/{key_id}` → `delete_api_key()` — Soft-delete an API key (sets `is_active=False`); owner only

---

### `backend/app/api/v1/projects.py`
- **Purpose**: Project CRUD with archive/unarchive support (requires auth)
- `GET /api/v1/projects/` → `list_projects()` — Paginated list of user's projects; query params: `include_archived`, `page`, `per_page`
- `POST /api/v1/projects/` → `create_project()` — Create a new project with default statuses via ProjectService
- `GET /api/v1/projects/{project_id}` → `get_project()` — Get project detail; requires project membership
- `PATCH /api/v1/projects/{project_id}` → `update_project()` — Update project fields; requires project membership
- `DELETE /api/v1/projects/{project_id}` → `delete_project()` — Permanently delete a project; requires project membership
- `POST /api/v1/projects/{project_id}/archive` → `archive_project()` — Set project `is_archived=True`; requires project membership
- `POST /api/v1/projects/{project_id}/unarchive` → `unarchive_project()` — Set project `is_archived=False`; requires project membership

---

### `backend/app/api/v1/boards.py`
- **Purpose**: Board CRUD, reordering, and board member management within a project (requires project membership)
- `GET /api/v1/projects/{project_id}/boards/` → `list_boards()` — List all boards in a project
- `POST /api/v1/projects/{project_id}/boards/` → `create_board()` — Create a new board via BoardService
- `GET /api/v1/projects/{project_id}/boards/{board_id}` → `get_board()` — Get board detail with members; requires board access
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}` → `update_board()` — Update board fields; requires board access
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}` → `delete_board()` — Delete a board; requires board access
- `POST /api/v1/projects/{project_id}/boards/reorder` → `reorder_boards()` — Reorder boards by position using list of board IDs
- `GET /api/v1/projects/{project_id}/boards/{board_id}/members` → `list_board_members()` — List members of a board
- `POST /api/v1/projects/{project_id}/boards/{board_id}/members` → `add_board_member()` — Add a user as board member; 409 if already exists
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/members/{member_id}` → `update_board_member()` — Update board member role
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/members/{member_id}` → `remove_board_member()` — Remove a board member

---

### `backend/app/api/v1/members.py`
- **Purpose**: Project member management — add, update role, remove (requires project membership)
- `GET /api/v1/projects/{project_id}/members/` → `list_members()` — List all members of a project
- `POST /api/v1/projects/{project_id}/members/` → `add_member()` — Add a user to the project; 400 if already member
- `PATCH /api/v1/projects/{project_id}/members/{member_id}` → `update_member()` — Update a member's role
- `DELETE /api/v1/projects/{project_id}/members/{member_id}` → `remove_member()` — Remove a member from the project

---

### `backend/app/api/v1/labels.py`
- **Purpose**: CRUD for project-scoped labels (requires project membership)
- `GET /api/v1/projects/{project_id}/labels/` → `list_labels()` — List all labels in a project
- `POST /api/v1/projects/{project_id}/labels/` → `create_label()` — Create a new label with name, color, description
- `PATCH /api/v1/projects/{project_id}/labels/{label_id}` → `update_label()` — Update a label's fields
- `DELETE /api/v1/projects/{project_id}/labels/{label_id}` → `delete_label()` — Delete a label

---

### `backend/app/api/v1/statuses.py`
- **Purpose**: Board-scoped status column CRUD and reordering (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/statuses/` → `list_statuses()` — List all statuses for a board, ordered by position
- `POST /api/v1/projects/{project_id}/boards/{board_id}/statuses/` → `create_status()` — Create a new status column; auto-assigns position if omitted
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/statuses/{status_id}` → `update_status()` — Update status fields (name, color, etc.)
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/statuses/{status_id}` → `delete_status()` — Delete a status; optional query param `move_tasks_to` to reassign tasks
- `POST /api/v1/projects/{project_id}/boards/{board_id}/statuses/reorder` → `reorder_statuses()` — Reorder statuses by position using list of status IDs

---

### `backend/app/api/v1/tasks.py`
- **Purpose**: Board-scoped task CRUD, move, and bulk operations with WebSocket broadcasts (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/` → `list_tasks()` — Paginated task list; query params: `status_id`, `priority`, `assignee_id`, `search`, `page`, `per_page`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/` → `create_task()` — Create task via TaskService; broadcasts `task.created` via WebSocket
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` → `get_task()` — Get single task with relations
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` → `update_task()` — Update task fields; broadcasts `task.updated`
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` → `delete_task()` — Delete a task; broadcasts `task.deleted`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/move` → `move_task()` — Move task to new status/position; broadcasts `task.moved`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-update` → `bulk_update_tasks()` — Update multiple tasks at once; broadcasts per task
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-move` → `bulk_move_tasks()` — Move multiple tasks to a status; broadcasts per task
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-delete` → `bulk_delete_tasks()` — Delete multiple tasks; broadcasts per task

---

### `backend/app/api/v1/comments.py`
- **Purpose**: Task-scoped comment CRUD (requires board access; edit/delete restricted to comment owner)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/` → `list_comments()` — Paginated list of comments on a task
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/` → `create_comment()` — Add a comment to a task
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}` → `update_comment()` — Edit own comment; sets `is_edited=True`; 403 if not owner
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}` → `delete_comment()` — Delete own comment; 403 if not owner

---

### `backend/app/api/v1/activity.py`
- **Purpose**: Project-scoped activity log retrieval (requires project membership)
- `GET /api/v1/projects/{project_id}/activity/` → `list_activity()` — Paginated activity logs; query params: `action`, `entity_type`, `page`, `per_page`
- `GET /api/v1/projects/{project_id}/activity/tasks/{task_id}` → `task_activity()` — Paginated activity logs for a specific task

---

### `backend/app/api/v1/search.py`
- **Purpose**: Global search across projects and tasks (requires auth)
- `GET /api/v1/search/` → `global_search()` — Search projects/tasks by name; query params: `q` (required), `type` (project|task), `project_id`, `page`, `per_page`

---

### `backend/app/api/v1/stats.py`
- **Purpose**: Project statistics dashboard (requires project membership)
- `GET /api/v1/projects/{project_id}/stats/` → `get_stats()` — Returns tasks_by_status, tasks_by_priority, total/completed/overdue counts, completion_rate

---

### `backend/app/api/v1/notifications.py`
- **Purpose**: User notification listing and read management (requires auth)
- `GET /api/v1/notifications/` → `list_notifications()` — Paginated list of notifications for current user
- `GET /api/v1/notifications/unread-count` → `unread_count()` — Get count of unread notifications
- `PUT /api/v1/notifications/read` → `mark_read()` — Mark notifications as read; body supports `mark_all` or `notification_ids` list

---

### `backend/app/api/v1/dashboard.py`
- **Purpose**: User-scoped dashboard statistics aggregated across all active projects (requires auth)
- `GET /api/v1/dashboard/stats` → `get_dashboard_stats()` — Returns `in_progress` (tasks in non-default, non-terminal statuses) and `overdue` (tasks past due_date, not completed) counts across user's non-archived projects

---

### `backend/app/api/v1/websocket.py`
- **Purpose**: Real-time WebSocket connection for live board updates (token validated via query param)
- `WS /api/v1/ws` → `websocket_endpoint()` — WebSocket endpoint; query params: `token`, `project_id`, `board_id`; responds to `ping` with `pong`; broadcasts task events to connected clients
