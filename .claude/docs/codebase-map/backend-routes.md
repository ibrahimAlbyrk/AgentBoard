# Backend Routes Map

All routes are mounted under the `/api/v1` prefix in `main.py`.

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/auth.py`
- **Purpose**: User registration, login, and token refresh (no auth required)
- `POST /api/v1/auth/register` → `register()` — Create new user account, returns access + refresh tokens
- `POST /api/v1/auth/login` → `login()` — Authenticate via OAuth2 password form, returns tokens + user
- `POST /api/v1/auth/refresh` → `refresh()` — Exchange refresh token for new access + refresh tokens

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/users.py`
- **Purpose**: User profile retrieval and updates (requires auth)
- `GET /api/v1/users/me` → `get_me()` — Get current authenticated user's profile
- `PATCH /api/v1/users/me` → `update_me()` — Update current user's profile fields
- `GET /api/v1/users/{user_id}` → `get_user()` — Get any user's profile by UUID; requires auth

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/api_keys.py`
- **Purpose**: CRUD for API keys used for agent/programmatic auth (requires auth)
- `GET /api/v1/api-keys/` → `list_api_keys()` — List all API keys for the current user
- `POST /api/v1/api-keys/` → `create_api_key()` — Create a new API key via AuthService; returns the raw key once. 409 if name already exists for user
- `DELETE /api/v1/api-keys/{key_id}` → `delete_api_key()` — Soft-delete an API key (sets `is_active=False`); owner only, 404 if not found or not owned

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/projects.py`
- **Purpose**: Project CRUD with archive/unarchive support (requires auth)
- `GET /api/v1/projects/` → `list_projects()` — Paginated list of user's projects; query params: `include_archived`, `page`, `per_page`
- `POST /api/v1/projects/` → `create_project()` — Create a new project with default statuses via ProjectService
- `GET /api/v1/projects/{project_id}` → `get_project()` — Get project detail; requires project membership
- `PATCH /api/v1/projects/{project_id}` → `update_project()` — Update project fields; requires project membership
- `DELETE /api/v1/projects/{project_id}` → `delete_project()` — Permanently delete a project; requires project membership
- `POST /api/v1/projects/{project_id}/archive` → `archive_project()` — Set project `is_archived=True`; requires project membership
- `POST /api/v1/projects/{project_id}/unarchive` → `unarchive_project()` — Set project `is_archived=False`; requires project membership

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/boards.py`
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

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/members.py`
- **Purpose**: Project member management — add, update role, remove (requires project membership)
- `GET /api/v1/projects/{project_id}/members/` → `list_members()` — List all members of a project
- `POST /api/v1/projects/{project_id}/members/` → `add_member()` — Add a user to the project; 400 if already member
- `PATCH /api/v1/projects/{project_id}/members/{member_id}` → `update_member()` — Update a member's role
- `DELETE /api/v1/projects/{project_id}/members/{member_id}` → `remove_member()` — Remove a member from the project

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/agents.py`
- **Purpose**: Project-scoped agent CRUD (requires project membership)
- `GET /api/v1/projects/{project_id}/agents/` → `list_agents()` — List all agents in a project; query param: `include_inactive` (default false)
- `POST /api/v1/projects/{project_id}/agents/` → `create_agent()` — Create a new agent with name and color; 409 if name already exists in project; requires auth
- `PATCH /api/v1/projects/{project_id}/agents/{agent_id}` → `update_agent()` — Update agent fields; 409 if renaming to existing name; 404 if not found or wrong project
- `DELETE /api/v1/projects/{project_id}/agents/{agent_id}` → `delete_agent()` — Delete an agent; 404 if not found or wrong project

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/labels.py`
- **Purpose**: CRUD for project-scoped labels (requires project membership)
- `GET /api/v1/projects/{project_id}/labels/` → `list_labels()` — List all labels in a project
- `POST /api/v1/projects/{project_id}/labels/` → `create_label()` — Create a new label with name, color, description
- `PATCH /api/v1/projects/{project_id}/labels/{label_id}` → `update_label()` — Update a label's fields
- `DELETE /api/v1/projects/{project_id}/labels/{label_id}` → `delete_label()` — Delete a label

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/statuses.py`
- **Purpose**: Board-scoped status column CRUD and reordering (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/statuses/` → `list_statuses()` — List all statuses for a board, ordered by position
- `POST /api/v1/projects/{project_id}/boards/{board_id}/statuses/` → `create_status()` — Create a new status column; auto-assigns position if omitted
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/statuses/{status_id}` → `update_status()` — Update status fields (name, color, etc.)
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/statuses/{status_id}` → `delete_status()` — Delete a status; optional query param `move_tasks_to` to reassign tasks
- `POST /api/v1/projects/{project_id}/boards/{board_id}/statuses/reorder` → `reorder_statuses()` — Reorder statuses by position using list of status IDs

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/tasks.py`
- **Purpose**: Board-scoped task CRUD, move, and bulk operations with reaction summaries, WebSocket broadcasts, and notifications (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/` → `list_tasks()` — Paginated task list with per-task reaction summaries; query params: `status_id`, `priority`, `assignee_id`, `search`, `page`, `per_page`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/` → `create_task()` — Create task via TaskService; broadcasts `task.created` via WebSocket; notifies assignees and watchers
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` → `get_task()` — Get single task with all relations and reaction summary
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` → `update_task()` — Update task fields via TaskService; broadcasts `task.updated`; notifies assignees and watchers
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}` → `delete_task()` — Delete a task; cleans up reactions; broadcasts `task.deleted`; creates notifications for assignees and watchers
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/move` → `move_task()` — Move task to new status/position via TaskService; broadcasts `task.moved`; notifies assignees and watchers
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-update` → `bulk_update_tasks()` — Update multiple tasks via TaskService; broadcasts `task.updated` per task; notifies assignees
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-move` → `bulk_move_tasks()` — Move multiple tasks to a status via TaskService; broadcasts `task.moved` per task; notifies assignees
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/bulk-delete` → `bulk_delete_tasks()` — Delete multiple tasks; broadcasts `task.deleted` per task; notifies assignees

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/checklists.py`
- **Purpose**: Task-scoped checklist and checklist item CRUD with reordering and toggle support (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/` → `list_checklists()` — List all checklists for a task
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/` → `create_checklist()` — Create a checklist on a task via ChecklistService; broadcasts `checklist.updated`
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}` → `update_checklist()` — Update checklist fields; broadcasts `checklist.updated`
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}` → `delete_checklist()` — Delete a checklist; broadcasts `checklist.updated`
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/reorder` → `reorder_checklist()` — Update checklist position; broadcasts `checklist.updated`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items` → `create_item()` — Add an item to a checklist via ChecklistService; broadcasts `checklist.updated`
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items/{item_id}` → `update_item()` — Update checklist item fields; broadcasts `checklist.updated`
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items/{item_id}` → `delete_item()` — Delete a checklist item; broadcasts `checklist.updated`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items/{item_id}/toggle` → `toggle_item()` — Toggle item checked state via ChecklistService; broadcasts `checklist.updated`
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists/{checklist_id}/items/{item_id}/reorder` → `reorder_item()` — Update checklist item position; broadcasts `checklist.updated`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/comments.py`
- **Purpose**: Task-scoped comment CRUD with rich text (Tiptap JSON), @mention notifications, and reaction cleanup (requires board access; edit/delete restricted to comment owner)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/` → `list_comments()` — Paginated list of comments with per-comment reaction summaries; query params: `page`, `per_page`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/` → `create_comment()` — Add a comment; normalizes content to Tiptap JSON; supports `agent_creator_id`; links `attachment_ids`; sends `task_comment` notifications to assignees and `mentioned` notifications to @mentioned users via WebSocket
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}` → `update_comment()` — Edit own comment content; normalizes to Tiptap JSON; sets `is_edited=True`; sends `mentioned` notifications for newly @mentioned users; 403 if not owner
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}` → `delete_comment()` — Delete own comment; cleans up associated reactions; 403 if not owner

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/attachments.py`
- **Purpose**: Task-scoped file attachment upload, listing, deletion with cover image cleanup, and a separate download endpoint (requires board access for task-scoped ops)
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/attachments/` → `upload_attachment()` — Upload a file attachment to a task; enforces `MAX_FILE_SIZE`; stores via storage service; requires auth
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/attachments/` → `list_attachments()` — List all attachments for a task
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/attachments/{attachment_id}` → `delete_attachment()` — Delete own attachment; removes file from storage; clears task cover if attachment was used as cover image; 403 if not uploader
- `GET /api/v1/attachments/{attachment_id}/download` → `download_attachment()` — Download an attachment file by ID (separate `download_router`, not task-scoped); returns `FileResponse`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/custom_fields.py`
- **Purpose**: Board-scoped custom field definition CRUD, reordering, and task-scoped field value get/set/clear with WebSocket broadcasts (requires board access)
- `GET /api/v1/projects/{project_id}/boards/{board_id}/custom-fields` → `list_custom_fields()` — List all custom field definitions for a board
- `POST /api/v1/projects/{project_id}/boards/{board_id}/custom-fields` → `create_custom_field()` — Create a custom field definition; 409 if name already exists on board; broadcasts `custom_field.created`
- `PATCH /api/v1/projects/{project_id}/boards/{board_id}/custom-fields/{field_id}` → `update_custom_field()` — Update a custom field definition; 409 if renaming to existing name; broadcasts `custom_field.updated`
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/custom-fields/{field_id}` → `delete_custom_field()` — Delete a custom field definition and all its values; broadcasts `custom_field.deleted`
- `POST /api/v1/projects/{project_id}/boards/{board_id}/custom-fields/reorder` → `reorder_custom_fields()` — Reorder custom field definitions by position; broadcasts `custom_field.reordered`
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values` → `list_field_values()` — List all custom field values for a task
- `PUT /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values` → `bulk_set_field_values()` — Set multiple field values at once via CustomFieldService; broadcasts `task.updated`
- `PUT /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values/{field_id}` → `set_field_value()` — Set a single custom field value on a task; broadcasts `task.updated`
- `DELETE /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values/{field_id}` → `clear_field_value()` — Clear a custom field value from a task; broadcasts `task.updated`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/mentionables.py`
- **Purpose**: Autocomplete endpoints for @mention (users/agents) and #reference (projects/boards/tasks) in rich text editors (requires project membership)
- `GET /api/v1/projects/{project_id}/mentionables` → `get_mentionables()` — Return project members (users) and active agents for @mention autocomplete; query param: `q` (search filter, max 100 chars); returns up to 20 users and 20 agents
- `GET /api/v1/projects/{project_id}/referenceables` → `get_referenceables()` — Return accessible projects, boards within current project, and tasks within current project for #reference autocomplete; query param: `q` (search filter, max 100 chars); returns up to 5 each

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/reactions.py`
- **Purpose**: Toggle and retrieve emoji reactions on tasks and comments with WebSocket broadcasts and notifications (requires board access)
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/reactions/toggle` → `toggle_task_reaction()` — Toggle an emoji reaction on a task; broadcasts `reaction.updated`; sends notification on add via ReactionService
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/reactions` → `get_task_reactions()` — Get reaction summary for a task
- `POST /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}/reactions/toggle` → `toggle_comment_reaction()` — Toggle an emoji reaction on a comment; broadcasts `reaction.updated`; sends notification on add via ReactionService
- `GET /api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}/reactions` → `get_comment_reactions()` — Get reaction summary for a comment

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/activity.py`
- **Purpose**: Project-scoped activity log retrieval (requires project membership)
- `GET /api/v1/projects/{project_id}/activity/` → `list_activity()` — Paginated activity logs; query params: `action`, `entity_type`, `page`, `per_page`
- `GET /api/v1/projects/{project_id}/activity/tasks/{task_id}` → `task_activity()` — Paginated activity logs for a specific task

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/search.py`
- **Purpose**: Global search across projects and tasks, searches task description_text in addition to title (requires auth)
- `GET /api/v1/search/` → `global_search()` — Search projects by name and tasks by title or description_text; query params: `q` (required), `type` (project|task), `project_id`, `page`, `per_page`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/stats.py`
- **Purpose**: Project statistics dashboard (requires project membership)
- `GET /api/v1/projects/{project_id}/stats/` → `get_stats()` — Returns tasks_by_status, tasks_by_priority, total/completed/overdue counts, completion_rate

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/notifications.py`
- **Purpose**: User notification listing and read management (requires auth)
- `GET /api/v1/notifications/` → `list_notifications()` — Paginated list of notifications for current user
- `GET /api/v1/notifications/unread-count` → `unread_count()` — Get count of unread notifications
- `PUT /api/v1/notifications/read` → `mark_read()` — Mark notifications as read; body supports `mark_all` or `notification_ids` list

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/dashboard.py`
- **Purpose**: User-scoped dashboard statistics and my-tasks view aggregated across all active projects (requires auth)
- `GET /api/v1/dashboard/stats` → `get_dashboard_stats()` — Returns `in_progress` (non-default, non-terminal, not completed) and `overdue` (past due_date, not completed) task counts across user's non-archived projects
- `GET /api/v1/dashboard/my-tasks` → `get_my_tasks()` — Returns summary (overdue/due_today/due_this_week/total_assigned counts) and up to 50 tasks assigned to current user; optional query param: `agent_id` to filter by agent assignee

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/websocket.py`
- **Purpose**: Real-time WebSocket connection for live board updates (token validated via query param)
- `WS /api/v1/ws` → `websocket_endpoint()` — WebSocket endpoint; query params: `token`, `project_id`, `board_id`; responds to `ping` with `pong`; broadcasts task events to connected clients
