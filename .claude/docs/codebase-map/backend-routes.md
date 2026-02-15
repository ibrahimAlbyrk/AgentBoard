# Backend Routes Map

All routes are prefixed with `/api/v1/` via `main.py` router registration.

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/auth.py`
- **Purpose**: User registration, login, and token refresh (no auth required)
- `POST /api/v1/auth/register` -> `register()` — Create new user account, returns access + refresh tokens
- `POST /api/v1/auth/login` -> `login()` — Authenticate via OAuth2 password form (email + password), returns tokens + user
- `POST /api/v1/auth/refresh` -> `refresh()` — Exchange refresh token for new access + refresh tokens

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/users.py`
- **Purpose**: User profile retrieval, updates, and password change (requires auth)
- `GET /api/v1/users/me` -> `get_me()` — Get current authenticated user's profile
- `PATCH /api/v1/users/me` -> `update_me()` — Update current user's profile fields
- `PUT /api/v1/users/me/password` -> `change_password()` — Change current user's password; verifies current password first
- `GET /api/v1/users/{user_id}` -> `get_user()` — Get any user's profile by UUID; requires auth

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/api_keys.py`
- **Purpose**: CRUD for API keys used for agent/programmatic auth (requires auth)
- `GET /api/v1/api-keys/` -> `list_api_keys()` — List all API keys for the current user (includes agent_name if linked)
- `POST /api/v1/api-keys/` -> `create_api_key()` — Create a new API key via AuthService; returns the raw key once; 409 if name exists
- `DELETE /api/v1/api-keys/{key_id}` -> `delete_api_key()` — Soft-delete an API key (sets `is_active=False`); owner only

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/projects.py`
- **Purpose**: Project CRUD with archive/unarchive support (requires auth)
- `GET /api/v1/projects/` -> `list_projects()` — Paginated list of user's projects; query: `include_archived`, `page`, `per_page`
- `POST /api/v1/projects/` -> `create_project()` — Create a new project via ProjectService
- `GET /api/v1/projects/{project_id}` -> `get_project()` — Get project detail; requires project membership
- `PATCH /api/v1/projects/{project_id}` -> `update_project()` — Update project fields; requires project membership
- `DELETE /api/v1/projects/{project_id}` -> `delete_project()` — Permanently delete a project; requires project membership
- `POST /api/v1/projects/{project_id}/archive` -> `archive_project()` — Set `is_archived=True`; requires project membership
- `POST /api/v1/projects/{project_id}/unarchive` -> `unarchive_project()` — Set `is_archived=False`; requires project membership

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/boards.py`
- **Purpose**: Board CRUD, reordering, and board member management within a project
- `GET /api/v1/projects/{project_id}/boards/` -> `list_boards()` — List all boards in a project; requires project membership
- `POST /api/v1/projects/{project_id}/boards/` -> `create_board()` — Create a new board via BoardService; requires project membership + auth
- `GET /api/v1/projects/{project_id}/boards/{board_id}` -> `get_board()` — Get board detail with members; requires board access
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}` -> `update_board()` — Update board fields; requires board access
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}` -> `delete_board()` — Delete a board; requires board access
- `POST /api/v1/projects/{project_id}/boards/reorder` -> `reorder_boards()` — Reorder boards by position using list of board IDs; requires project membership
- `GET /api/v1/projects/{project_id}/boards/{board_id}/members` -> `list_board_members()` — List members of a board; requires board access
- `POST /api/v1/projects/{project_id}/boards/{board_id}/members` -> `add_board_member()` — Add a user as board member; 409 if already exists; requires board access
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/members/{member_id}` -> `update_board_member()` — Update board member role; requires board access
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/members/{member_id}` -> `remove_board_member()` — Remove a board member; requires board access

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/members.py`
- **Purpose**: Project member management (requires project membership)
- `GET /api/v1/projects/{project_id}/members/` -> `list_members()` — List all members of a project
- `POST /api/v1/projects/{project_id}/members/` -> `add_member()` — Add a user to the project; 400 if already member
- `PATCH /api/v1/projects/{project_id}/members/{member_id}` -> `update_member()` — Update a member's role
- `DELETE /api/v1/projects/{project_id}/members/{member_id}` -> `remove_member()` — Remove a member from the project

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/agents.py`
- **Purpose**: Agent management — both user-level (global) and project-scoped endpoints
- **User-level (prefix: `/api/v1/agents`)**:
  - `GET /api/v1/agents/mine` -> `list_my_agents()` — List all agents owned by current user across projects; query: `include_deleted`; requires auth
  - `POST /api/v1/agents/` -> `create_global_agent()` — Create agent not linked to any project; requires auth
  - `PATCH /api/v1/agents/{agent_id}` -> `update_global_agent()` — Update agent globally (owner only); requires auth
  - `DELETE /api/v1/agents/{agent_id}` -> `delete_global_agent()` — Soft-delete agent, remove from all projects; requires auth
- **Project-scoped (prefix: `/api/v1/projects/{project_id}/agents`)**:
  - `GET /api/v1/projects/{project_id}/agents/` -> `list_agents()` — List agents in project; query: `include_inactive`; requires project membership
  - `POST /api/v1/projects/{project_id}/agents/` -> `create_agent()` — Create agent and link to project; requires project membership + auth
  - `POST /api/v1/projects/{project_id}/agents/{agent_id}/link` -> `link_agent_to_project()` — Link existing agent to project; requires project membership + auth
  - `PATCH /api/v1/projects/{project_id}/agents/{agent_id}` -> `update_agent()` — Update agent within project context; requires project membership + auth
  - `DELETE /api/v1/projects/{project_id}/agents/{agent_id}` -> `delete_agent()` — Unlink agent from project (soft-deletes if no projects remain); requires project membership

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/statuses.py`
- **Purpose**: Board-scoped status column CRUD and reordering (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/statuses/` -> `list_statuses()` — List all statuses for a board, ordered by position
- `POST /api/v1/projects/{project_id}/boards/{board_id}/statuses/` -> `create_status()` — Create a new status column; auto-assigns position if omitted
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/statuses/{status_id}` -> `update_status()` — Update status fields (name, color, flags)
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/statuses/{status_id}` -> `delete_status()` — Delete a status; query: `move_tasks_to` (optional UUID to migrate tasks)
- `POST /api/v1/projects/{project_id}/boards/{board_id}/statuses/reorder` -> `reorder_statuses()` — Reorder statuses by position using list of status IDs

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/labels.py`
- **Purpose**: CRUD for project-scoped labels (requires project membership)
- `GET /api/v1/projects/{project_id}/labels/` -> `list_labels()` — List all labels in a project
- `POST /api/v1/projects/{project_id}/labels/` -> `create_label()` — Create a new label; duplicate name check (case-insensitive)
- `PATCH /api/v1/projects/{project_id}/labels/{label_id}` -> `update_label()` — Update a label's fields
- `DELETE /api/v1/projects/{project_id}/labels/{label_id}` -> `delete_label()` — Delete a label

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/tasks.py`
- **Purpose**: Full task lifecycle — CRUD, move, bulk operations, subtask management with WS broadcasts and notifications (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/` -> `list_tasks()` — Paginated task list with reaction summaries; query: `status_id`, `priority`, `assignee_id`, `search`, `page`, `per_page`; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/` -> `create_task()` — Create task via TaskService; supports actor auth (agents); broadcasts `task.created`; fires webhooks
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` -> `get_task()` — Get single task with all relations and reaction summary; requires auth
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` -> `update_task()` — Update task via TaskService; broadcasts `task.updated`; fires webhooks
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` -> `delete_task()` — Delete task; query: `mode` (cascade|orphan); broadcasts `task.deleted`; fires webhooks; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/move` -> `move_task()` — Move task to new status/position; broadcasts `task.moved`; fires webhooks
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-update` -> `bulk_update_tasks()` — Bulk update multiple tasks; broadcasts per task; notifies assignees/watchers; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-move` -> `bulk_move_tasks()` — Bulk move tasks to a status; broadcasts per task; notifies assignees/watchers; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-delete` -> `bulk_delete_tasks()` — Bulk delete tasks; broadcasts per task; notifies assignees/watchers; requires auth
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/subtasks` -> `list_subtasks()` — List child tasks with reactions; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/subtasks` -> `create_subtask()` — Create subtask under parent; broadcasts `subtask.created`
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/subtasks/reorder` -> `reorder_subtask()` — Reorder a subtask position; broadcasts `subtask.reordered`; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/convert-to-subtask` -> `convert_to_subtask()` — Convert existing task into subtask of this task; broadcasts `subtask.created`; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/promote` -> `promote_subtask()` — Promote subtask to independent root task; broadcasts `task.created` + `subtask.deleted`; requires auth

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/comments.py`
- **Purpose**: Task comment CRUD with Tiptap JSON content, @mention notifications, and reaction support (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/` -> `list_comments()` — Paginated list with per-comment reaction summaries; query: `page`, `per_page`; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/` -> `create_comment()` — Create comment; normalizes to Tiptap JSON; links attachments; notifies assignees, watchers, @mentioned users; fires webhooks
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}` -> `update_comment()` — Edit own comment; sets `is_edited=True`; notifies newly @mentioned users; requires ownership
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}` -> `delete_comment()` — Delete own comment; cleans up reactions; notifies assignees/watchers; requires ownership

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/attachments.py`
- **Purpose**: File upload/download/delete for task attachments (requires board access for task-scoped ops)
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/attachments/` -> `upload_attachment()` — Upload file (enforces MAX_FILE_SIZE); requires auth
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/attachments/` -> `list_attachments()` — List all attachments for a task
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/attachments/{attachment_id}` -> `delete_attachment()` — Delete own attachment; removes from storage; clears task cover if applicable; requires auth + ownership
- **Download router (prefix: `/api/v1/attachments`)**:
  - `GET /api/v1/attachments/{attachment_id}/download` -> `download_attachment()` — Download attachment file; no auth required

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/activity.py`
- **Purpose**: Project-scoped activity log retrieval (requires project membership)
- `GET /api/v1/projects/{project_id}/activity/` -> `list_activity()` — Paginated activity logs; query: `action`, `entity_type`, `page`, `per_page`
- `GET /api/v1/projects/{project_id}/activity/tasks/{task_id}` -> `task_activity()` — Paginated activity logs for a specific task

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/notifications.py`
- **Purpose**: User notification management and preferences (requires auth)
- `GET /api/v1/notifications/` -> `list_notifications()` — Paginated list of notifications; query: `page`, `per_page`
- `GET /api/v1/notifications/unread-count` -> `unread_count()` — Get count of unread notifications
- `PUT /api/v1/notifications/read` -> `mark_read()` — Mark notifications as read; body: `mark_all` or `notification_ids` list
- `DELETE /api/v1/notifications/clear` -> `clear_all()` — Delete all notifications for current user
- `GET /api/v1/notifications/preferences` -> `get_preferences()` — Get notification preferences
- `PUT /api/v1/notifications/preferences` -> `update_preferences()` — Update notification preferences

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/search.py`
- **Purpose**: Global search across projects and tasks (requires auth)
- `GET /api/v1/search/` -> `global_search()` — Search projects by name and tasks by title/description_text; query: `q` (required), `type` (project|task), `project_id`, `page`, `per_page`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/stats.py`
- **Purpose**: Project-level statistics (requires project membership)
- `GET /api/v1/projects/{project_id}/stats/` -> `get_stats()` — Returns tasks_by_status, tasks_by_priority, total/completed/overdue counts, completion_rate

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/dashboard.py`
- **Purpose**: Cross-project dashboard data for current user (requires auth)
- `GET /api/v1/dashboard/stats` -> `get_dashboard_stats()` — Aggregated stats (in_progress, overdue, total_tasks) across all non-archived projects
- `GET /api/v1/dashboard/my-tasks` -> `get_my_tasks()` — Tasks assigned to current user with due-date summary; query: `agent_id`; returns up to 50 tasks

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/websocket.py`
- **Purpose**: Real-time WebSocket connection for live board updates
- `WS /api/v1/ws` -> `websocket_endpoint()` — WebSocket endpoint; query: `token` (JWT), `project_id`, `board_id`; joins board + user channels; handles ping/pong

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/checklists.py`
- **Purpose**: Task-scoped checklist and checklist item CRUD with reordering and toggle (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/` -> `list_checklists()` — List all checklists for a task with items
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/` -> `create_checklist()` — Create checklist via ChecklistService; broadcasts `checklist.updated`; requires auth
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}` -> `update_checklist()` — Update checklist title; broadcasts `checklist.updated`; requires auth
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}` -> `delete_checklist()` — Delete checklist; broadcasts `checklist.updated`; requires auth
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/reorder` -> `reorder_checklist()` — Update checklist position; broadcasts `checklist.updated`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items` -> `create_item()` — Add item to checklist; broadcasts `checklist.updated`; requires auth
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items/{item_id}` -> `update_item()` — Update checklist item; broadcasts `checklist.updated`; requires auth
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items/{item_id}` -> `delete_item()` — Delete checklist item; logs activity; broadcasts `checklist.updated`; requires auth
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items/{item_id}/toggle` -> `toggle_item()` — Toggle item checked state; broadcasts `checklist.updated`; requires auth
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items/{item_id}/reorder` -> `reorder_item()` — Reorder checklist item position; broadcasts `checklist.updated`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/reactions.py`
- **Purpose**: Emoji reaction toggle and retrieval for tasks and comments with WS broadcasts (requires board access)
- **Task reactions (prefix: `/api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/reactions`)**:
  - `POST .../reactions/toggle` -> `toggle_task_reaction()` — Toggle emoji reaction on task; broadcasts `reaction.updated`; notifies on add
  - `GET .../reactions` -> `get_task_reactions()` — Get reaction summary for task; requires auth
- **Comment reactions (prefix: `/api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}/reactions`)**:
  - `POST .../reactions/toggle` -> `toggle_comment_reaction()` — Toggle emoji reaction on comment; broadcasts `reaction.updated`; notifies on add
  - `GET .../reactions` -> `get_comment_reactions()` — Get reaction summary for comment; requires auth

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/custom_fields.py`
- **Purpose**: Board-scoped custom field definitions and task-scoped field values with WS broadcasts (requires board access + auth)
- **Definitions**:
  - `GET /api/v1/projects/{project_id}/boards/{board_id}/custom-fields` -> `list_custom_fields()` — List custom field definitions for board
  - `POST /api/v1/projects/{project_id}/boards/{board_id}/custom-fields` -> `create_custom_field()` — Create definition; 409 if name exists; broadcasts `custom_field.created`
  - `PATCH /api/v1/projects/{project_id}/boards/{board_id}/custom-fields/{field_id}` -> `update_custom_field()` — Update definition; broadcasts `custom_field.updated`
  - `DELETE /api/v1/projects/{project_id}/boards/{board_id}/custom-fields/{field_id}` -> `delete_custom_field()` — Delete definition + all values; broadcasts `custom_field.deleted`
  - `POST /api/v1/projects/{project_id}/boards/{board_id}/custom-fields/reorder` -> `reorder_custom_fields()` — Reorder definitions; broadcasts `custom_field.reordered`
- **Values**:
  - `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values` -> `list_field_values()` — List all field values for a task
  - `PUT /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values` -> `bulk_set_field_values()` — Bulk set multiple values; logs changes; broadcasts `task.updated`
  - `PUT /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values/{field_id}` -> `set_field_value()` — Set single value; logs changes; broadcasts `task.updated`
  - `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values/{field_id}` -> `clear_field_value()` — Clear a value; logs changes; broadcasts `task.updated`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/mentionables.py`
- **Purpose**: Autocomplete data for @mentions and #references in rich text (requires project membership + auth)
- `GET /api/v1/projects/{project_id}/mentionables` -> `get_mentionables()` — Return users + agents for @mention autocomplete; query: `q`; max 20 each
- `GET /api/v1/projects/{project_id}/referenceables` -> `get_referenceables()` — Return projects, boards, tasks for #reference autocomplete; query: `q`; max 5 each

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/webhooks.py`
- **Purpose**: CRUD for project webhooks with HMAC-SHA256 signing (requires auth + project owner)
- `GET /api/v1/projects/{project_id}/webhooks/` -> `list_webhooks()` — List project webhooks
- `POST /api/v1/projects/{project_id}/webhooks/` -> `create_webhook()` — Create webhook with URL, events list, and optional secret
- `PATCH /api/v1/projects/{project_id}/webhooks/{webhook_id}` -> `update_webhook()` — Update webhook fields
- `DELETE /api/v1/projects/{project_id}/webhooks/{webhook_id}` -> `delete_webhook()` — Delete webhook
