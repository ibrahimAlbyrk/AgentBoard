# Backend Services & CRUD — Codebase Map

## CRUD Layer

### `backend/app/crud/__init__.py`
- **Purpose**: Re-exports all CRUD singletons and defines `__all__`
- Exports: `crud_user`, `crud_api_key`, `crud_board`, `crud_board_member`, `crud_project`, `crud_project_member`, `crud_status`, `crud_label`, `crud_task`, `crud_comment`, `crud_activity_log`, `crud_notification`, `crud_webhook`

### `backend/app/crud/base.py`
- **Purpose**: Generic async CRUD base class parameterized by model and schema types
- `CRUDBase[ModelType, CreateSchemaType, UpdateSchemaType]` (extends `Generic`) — reusable DB operations for any SQLAlchemy model
  - `get(db, id)` — fetch single record by UUID
  - `get_multi(db, skip, limit, filters)` — fetch paginated list with optional filters
  - `create(db, obj_in)` — insert new record from Pydantic schema
  - `update(db, db_obj, obj_in)` — patch record with dict or schema
  - `remove(db, id)` — delete record by UUID
  - `count(db, filters)` — count records with optional filters

### `backend/app/crud/user.py`
- **Purpose**: User CRUD with authentication and password hashing
- `CRUDUser` (extends `CRUDBase[User, UserCreate, UserUpdate]`) — user-specific DB operations
  - `get_by_email(db, email)` — lookup user by email
  - `get_by_username(db, username)` — lookup user by username
  - `authenticate(db, email, password)` — verify credentials, return user or None
  - `create(db, obj_in)` — override: hashes password before insert

### `backend/app/crud/project.py`
- **Purpose**: Project CRUD with eager-loading and user-scoped queries
- `CRUDProject` (extends `CRUDBase[Project, ProjectCreate, ProjectUpdate]`) — project DB operations
  - `get(db, id)` — override: eager-loads members, boards, labels, tasks
  - `update(db, db_obj, obj_in)` — override: re-fetches with eager-loads after update
  - `get_multi_by_user(db, user_id, include_archived)` — projects where user is owner or member
  - `get_by_slug(db, slug)` — lookup project by URL slug

### `backend/app/crud/task.py`
- **Purpose**: Task CRUD with relation loading, filtering, and aggregate queries
- `CRUDTask` (extends `CRUDBase[Task, TaskCreate, TaskUpdate]`) — task DB operations
  - `get_with_relations(db, task_id)` — fetch task with status, assignee, creator, labels
  - `get_multi_by_board(db, board_id, status_id, priority, assignee_id, search, skip, limit)` — filtered board tasks ordered by position
  - `get_max_position(db, status_id)` — highest position value in a status column
  - `get_children(db, parent_id)` — fetch subtasks of a parent
  - `bulk_update(db, task_ids, updates)` — apply same updates to multiple tasks
  - `count_by_status(db, project_id)` — task count grouped by status
  - `count_by_priority(db, project_id)` — task count grouped by priority

### `backend/app/crud/status.py`
- **Purpose**: Status column CRUD with board-scoped queries
- `CRUDStatus` (extends `CRUDBase[Status, StatusCreate, StatusUpdate]`) — status DB operations
  - `get_multi_by_board(db, board_id)` — all statuses for a board, ordered by position
  - `get_default_by_board(db, board_id)` — fetch the default status for a board
  - `get_max_position_by_board(db, board_id)` — highest position value among board statuses

### `backend/app/crud/label.py`
- **Purpose**: Label CRUD with project-scoped listing
- `CRUDLabel` (extends `CRUDBase[Label, LabelCreate, LabelUpdate]`) — label DB operations
  - `get_multi_by_project(db, project_id)` — all labels for a project

### `backend/app/crud/comment.py`
- **Purpose**: Comment CRUD with task-scoped listing and user eager-loading
- `CRUDComment` (extends `CRUDBase[Comment, CommentCreate, CommentUpdate]`) — comment DB operations
  - `get_multi_by_task(db, task_id, skip, limit)` — paginated comments with user, ordered by created_at

### `backend/app/crud/api_key.py`
- **Purpose**: API key CRUD with hash lookup and usage tracking
- `CRUDAPIKey` (extends `CRUDBase[APIKey, APIKeyCreate, APIKeyResponse]`) — API key DB operations
  - `get_by_key_hash(db, key_hash)` — lookup key by SHA256 hash
  - `get_multi_by_user(db, user_id)` — all API keys for a user
  - `update_last_used(db, api_key)` — stamp last_used_at timestamp

### `backend/app/crud/project_member.py`
- **Purpose**: Project membership CRUD with lookup and membership check
- `CRUDProjectMember` (extends `CRUDBase[ProjectMember, ProjectMemberCreate, ProjectMemberUpdate]`) — membership DB operations
  - `get_by_project_and_user(db, project_id, user_id)` — find specific membership record
  - `get_multi_by_project(db, project_id)` — all members with eager-loaded user
  - `is_member(db, project_id, user_id)` — boolean membership check

### `backend/app/crud/activity_log.py`
- **Purpose**: Activity log CRUD with project/task scoped queries and convenience log method
- `CRUDActivityLog` (extends `CRUDBase[ActivityLog, ActivityLogResponse, ActivityLogResponse]`) — activity log DB operations
  - `get_multi_by_project(db, project_id, action, entity_type, skip, limit)` — filtered project activity, newest first
  - `get_multi_by_task(db, task_id)` — all activity for a task, newest first
  - `log(db, project_id, task_id, user_id, action, entity_type, changes)` — create activity log entry directly

### `backend/app/crud/notification.py`
- **Purpose**: Notification CRUD with read/unread management and bulk operations
- `CRUDNotification` (extends `CRUDBase[Notification, NotificationResponse, NotificationResponse]`) — notification DB operations
  - `get_by_user(db, user_id, skip, limit)` — paginated user notifications, newest first
  - `get_unread_by_user(db, user_id)` — all unread notifications for a user
  - `count_unread(db, user_id)` — count of unread notifications
  - `mark_read(db, notification_id)` — mark single notification as read
  - `mark_all_read(db, user_id)` — mark all user notifications as read

### `backend/app/crud/webhook.py`
- **Purpose**: Webhook CRUD with project-scoped and event-filtered queries
- `CRUDWebhook` (extends `CRUDBase[Webhook, WebhookCreate, WebhookUpdate]`) — webhook DB operations
  - `get_multi_by_project(db, project_id)` — all webhooks for a project
  - `get_active_for_event(db, project_id, event_type)` — active webhooks matching event type

### `backend/app/crud/board.py`
- **Purpose**: Board CRUD with eager-loading and project-scoped queries
- `CRUDBoard` (extends `CRUDBase[Board, BoardCreate, BoardUpdate]`) — board DB operations
  - `get(db, id)` — override: eager-loads members, statuses, tasks
  - `get_multi_by_project(db, project_id)` — all boards with relations, ordered by position
  - `get_by_slug(db, project_id, slug)` — lookup board by project + slug
  - `get_max_position(db, project_id)` — highest board position in project

### `backend/app/crud/board_member.py`
- **Purpose**: Board membership CRUD with lookup and membership check
- `CRUDBoardMember` (extends `CRUDBase[BoardMember, BoardMemberCreate, BoardMemberUpdate]`) — board membership DB operations
  - `get_by_board_and_user(db, board_id, user_id)` — find specific board membership
  - `get_multi_by_board(db, board_id)` — all board members with eager-loaded user
  - `is_member(db, board_id, user_id)` — boolean board membership check

---

## Service Layer

### `backend/app/services/project_service.py`
- **Purpose**: Project creation orchestration with slug generation, owner membership, and optional default board
- `ProjectService` — static methods for project business logic
  - `create_project(db, user_id, project_in)` — creates project, generates slug, adds owner as admin member, optionally creates default board via BoardService

### `backend/app/services/task_service.py`
- **Purpose**: Task lifecycle orchestration with position management, label syncing, and activity logging
- `TaskService` — static methods for task business logic
  - `create_task(db, project_id, board_id, creator_id, task_in)` — resolves default status, calculates end position, attaches labels, logs "created" activity
  - `update_task(db, task, user_id, task_in)` — diffs changed fields, syncs labels, logs "updated" activity with old/new values
  - `move_task(db, task, user_id, new_status_id, position)` — moves task between columns, sets/clears completed_at for terminal statuses, logs "moved" activity
  - `bulk_update(db, project_id, user_id, task_ids, updates)` — apply updates to multiple tasks, logs activity per task
  - `bulk_move(db, project_id, user_id, task_ids, status_id)` — move multiple tasks to status with sequential positions, logs activity per task

### `backend/app/services/position_service.py`
- **Purpose**: Task position calculation for drag-and-drop ordering within status columns
- `PositionService` — static methods for position arithmetic
  - `POSITION_GAP = 1024.0` — constant gap between positions
  - `calculate_position(before, after)` — midpoint between neighbors, or offset from one side
  - `get_end_position(db, status_id)` — position after the last task in a column
  - `rebalance(db, status_id)` — re-space all tasks evenly in a column

### `backend/app/services/notification_service.py`
- **Purpose**: Notification creation, email stub, and webhook delivery with HMAC signing
- `NotificationService` — static methods for notification dispatch
  - `create_notification(db, user_id, project_id, type, title, message, data)` — persist in-app notification
  - `send_email(to, subject, body)` — logs email (SMTP not configured)
  - `send_webhook(url, secret, event)` — POST JSON payload with optional HMAC-SHA256 signature
  - `notify_project_event(db, project_id, event_type, data)` — fans out event to all matching active webhooks

### `backend/app/services/auth_service.py`
- **Purpose**: Authentication orchestration for registration, login, token refresh, and API key creation
- `AuthService` — static methods for auth flows
  - `register(db, user_in)` — validates uniqueness, creates user, returns access + refresh tokens
  - `login(db, email, password)` — authenticates, checks is_active, stamps last_login_at, returns tokens
  - `refresh_token(token)` — validates refresh token type, issues new access + refresh tokens
  - `create_api_key(db, user_id, key_in)` — generates raw key + hash, sets optional expiry, returns APIKey + raw key

### `backend/app/services/websocket_manager.py`
- **Purpose**: In-memory WebSocket connection manager for real-time broadcasts
- `ConnectionManager` — manages WebSocket connections keyed by channel string
  - `connect(key, websocket)` — register WebSocket under a channel key
  - `disconnect(key, websocket)` — remove WebSocket, clean up empty channels
  - `_broadcast(key, message)` — send JSON to all connections on a key, prune dead sockets
  - `broadcast_to_board(project_id, board_id, message)` — broadcast scoped to `{project_id}:{board_id}`
  - `broadcast_to_project(project_id, message)` — broadcast scoped to project_id
- `manager` — module-level singleton instance

### `backend/app/services/board_service.py`
- **Purpose**: Board creation orchestration with slug generation, owner membership, and default status columns
- `BoardService` — static methods for board business logic
  - `DEFAULT_STATUSES` — list of 5 default columns: To Do, In Progress, In Review, Testing, Complete
  - `create_board(db, project_id, user_id, board_in)` — creates board, generates slug, adds creator as admin member, optionally seeds default statuses
