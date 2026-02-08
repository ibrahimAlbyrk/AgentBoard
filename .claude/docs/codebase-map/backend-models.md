# Backend Models & Schemas

> SQLAlchemy ORM models and Pydantic request/response schemas.

---

## Models

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/__init__.py`
- **Purpose**: Registers all ORM models and exports them via `__all__`.
- Exports: `ActivityLog`, `APIKey`, `Attachment`, `Board`, `BoardMember`, `Comment`, `Label`, `Notification`, `Project`, `ProjectMember`, `Status`, `Task`, `TaskDependency`, `TaskLabel`, `User`, `Webhook`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/user.py`
- **Purpose**: Core user account model with auth fields and profile info.
- `User` — registered user account
  - Key fields: `id` (UUID, PK), `email` (String(255), unique, indexed), `username` (String(100), unique, indexed), `password_hash` (String(255)), `full_name` (String(255), nullable), `avatar_url` (String(500), nullable), `role` (String(20), default "user"), `is_active` (Boolean, default True), `created_at` (DateTime), `updated_at` (DateTime, auto), `last_login_at` (DateTime, nullable)
  - Relationships: `api_keys` -> APIKey, `owned_projects` -> Project, `project_memberships` -> ProjectMember, `board_memberships` -> BoardMember

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/project.py`
- **Purpose**: Top-level project container that groups boards, tasks, statuses, labels, and members.
- `Project` — project workspace
  - Key fields: `id` (UUID, PK), `name` (String(200)), `description` (Text, nullable), `slug` (String(200), unique, indexed), `owner_id` (UUID, FK -> users.id), `icon` (String(50), nullable), `color` (String(20), nullable), `is_archived` (Boolean, default False, indexed), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Relationships: `owner` -> User, `members` -> ProjectMember, `statuses` -> Status, `labels` -> Label, `tasks` -> Task, `boards` -> Board
  - Computed properties: `member_count` (int), `task_count` (int)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/board.py`
- **Purpose**: Kanban board within a project, containing statuses and tasks.
- `Board` — project board
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id), `name` (String(200)), `slug` (String(200)), `description` (Text, nullable), `icon` (String(50), nullable), `color` (String(20), nullable), `position` (Integer, default 0), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: UniqueConstraint(`project_id`, `slug`), Index(`project_id`, `position`)
  - Relationships: `project` -> Project, `members` -> BoardMember, `statuses` -> Status, `tasks` -> Task
  - Computed properties: `member_count` (int), `task_count` (int), `status_count` (int)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/board_member.py`
- **Purpose**: Associates users to boards with a role.
- `BoardMember` — board membership join table
  - Key fields: `id` (UUID, PK), `board_id` (UUID, FK -> boards.id), `user_id` (UUID, FK -> users.id), `role` (String(20), default "member"), `joined_at` (DateTime)
  - Constraints: UniqueConstraint(`board_id`, `user_id`)
  - Relationships: `board` -> Board, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task.py`
- **Purpose**: Core task entity with priority, position, assignment, and hierarchy support.
- `Task` — kanban task card
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id), `board_id` (UUID, FK -> boards.id), `title` (String(500)), `description` (Text, nullable), `status_id` (UUID, FK -> statuses.id, RESTRICT), `priority` (String(20), default "none"), `assignee_id` (UUID, FK -> users.id, nullable), `creator_id` (UUID, FK -> users.id), `parent_id` (UUID, FK -> tasks.id, nullable, self-referential), `due_date` (DateTime, nullable), `position` (Float, default 0.0), `created_at` (DateTime), `updated_at` (DateTime, auto), `completed_at` (DateTime, nullable)
  - Constraints: Index(`status_id`, `position`)
  - Relationships: `project` -> Project, `board` -> Board, `status` -> Status, `assignee` -> User, `creator` -> User, `parent` -> Task (self), `children` -> Task (self), `labels` -> TaskLabel, `comments` -> Comment, `dependencies` -> TaskDependency, `dependents` -> TaskDependency

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/status.py`
- **Purpose**: Board column / workflow state for tasks.
- `Status` — kanban board column
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id), `board_id` (UUID, FK -> boards.id), `name` (String(100)), `slug` (String(100)), `color` (String(20), nullable), `position` (Integer), `is_default` (Boolean, default False), `is_terminal` (Boolean, default False), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: UniqueConstraint(`board_id`, `slug`), Index(`board_id`, `position`)
  - Relationships: `project` -> Project, `board` -> Board, `tasks` -> Task

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/label.py`
- **Purpose**: Colored tag for categorizing tasks within a project.
- `Label` — task label/tag
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id), `name` (String(100)), `color` (String(20)), `description` (Text, nullable), `created_at` (DateTime)
  - Constraints: UniqueConstraint(`project_id`, `name`)
  - Relationships: `project` -> Project, `task_labels` -> TaskLabel

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task_label.py`
- **Purpose**: Many-to-many join table between tasks and labels.
- `TaskLabel` — task-label association
  - Key fields: `task_id` (UUID, FK -> tasks.id, composite PK), `label_id` (UUID, FK -> labels.id, composite PK), `created_at` (DateTime)
  - Relationships: `task` -> Task, `label` -> Label

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task_dependency.py`
- **Purpose**: Many-to-many join table expressing "blocks/blocked-by" relationships between tasks.
- `TaskDependency` — task dependency link
  - Key fields: `task_id` (UUID, FK -> tasks.id, composite PK), `depends_on_id` (UUID, FK -> tasks.id, composite PK), `created_at` (DateTime)
  - Relationships: `task` -> Task, `depends_on` -> Task

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/comment.py`
- **Purpose**: User comment on a task with edit tracking.
- `Comment` — task comment
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK -> tasks.id), `user_id` (UUID, FK -> users.id), `content` (Text), `is_edited` (Boolean, default False), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: Index(`task_id`, `created_at`)
  - Relationships: `task` -> Task, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/api_key.py`
- **Purpose**: Hashed API key for agent/programmatic access with scopes and expiry.
- `APIKey` — API key credential
  - Key fields: `id` (UUID, PK), `user_id` (UUID, FK -> users.id), `key_hash` (String(255), unique, indexed), `name` (String(100)), `prefix` (String(20), indexed), `scopes` (JSON, nullable), `is_active` (Boolean, default True), `last_used_at` (DateTime, nullable), `expires_at` (DateTime, nullable), `created_at` (DateTime)
  - Relationships: `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/project_member.py`
- **Purpose**: Associates users to projects with a role.
- `ProjectMember` — project membership join table
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id), `user_id` (UUID, FK -> users.id), `role` (String(20), default "member"), `joined_at` (DateTime)
  - Constraints: UniqueConstraint(`project_id`, `user_id`)
  - Relationships: `project` -> Project, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/activity_log.py`
- **Purpose**: Audit trail recording user actions on projects/tasks.
- `ActivityLog` — activity/audit log entry
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id), `task_id` (UUID, FK -> tasks.id, nullable), `user_id` (UUID, FK -> users.id), `action` (String(50)), `entity_type` (String(50)), `changes` (JSON, nullable), `created_at` (DateTime)
  - Constraints: Index(`project_id`, `created_at`)
  - Relationships: `project` -> Project, `task` -> Task, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/attachment.py`
- **Purpose**: File attachment metadata linked to a task.
- `Attachment` — task file attachment
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK -> tasks.id), `user_id` (UUID, FK -> users.id), `filename` (String(500)), `file_path` (String(1000)), `file_size` (Integer), `mime_type` (String(100)), `created_at` (DateTime)
  - Relationships: `task` -> Task, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/notification.py`
- **Purpose**: In-app notification with read tracking and metadata.
- `Notification` — user notification
  - Key fields: `id` (UUID, PK), `user_id` (UUID, FK -> users.id), `project_id` (UUID, FK -> projects.id, nullable), `type` (String(50)), `title` (String(200)), `message` (Text), `is_read` (Boolean, default False), `data` (JSON, nullable), `created_at` (DateTime)
  - Constraints: Index(`user_id`, `is_read`, `created_at`)
  - Relationships: `user` -> User, `project` -> Project

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/webhook.py`
- **Purpose**: Outbound webhook configuration for project events.
- `Webhook` — webhook endpoint
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id), `url` (String(1000)), `events` (JSON), `secret` (String(255), nullable), `is_active` (Boolean, default True), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Relationships: `project` -> Project

---

## Schemas

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/__init__.py`
- **Purpose**: Central re-export of all Pydantic schemas via `__all__`.
- Exports all Create/Update/Response schemas for every entity plus base response wrappers and auth DTOs.

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/base.py`
- **Purpose**: Generic response wrappers for consistent API envelope format.
- `ResponseBase[T]` — generic success envelope
  - Fields: `success` (bool, default True), `data` (T, required), `meta` (dict, auto-timestamp)
- `PaginationMeta` — pagination metadata
  - Fields: `page` (int), `per_page` (int), `total` (int), `total_pages` (int)
- `PaginatedResponse[T]` — paginated list envelope
  - Fields: `success` (bool, default True), `data` (list[T]), `pagination` (PaginationMeta), `meta` (dict, auto-timestamp)
- `ErrorDetail` — single field-level error
  - Fields: `field` (str, optional), `message` (str, required)
- `ErrorBody` — error payload
  - Fields: `code` (str, required), `message` (str, required), `details` (list[ErrorDetail], optional)
- `ErrorResponse` — error envelope
  - Fields: `success` (bool, default False), `error` (ErrorBody, required), `meta` (dict, auto-timestamp)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/user.py`
- **Purpose**: User registration, update, and response DTOs.
- `UserCreate` — create user
  - Fields: `email` (EmailStr, required), `username` (str, required), `password` (str, required, min_length=8), `full_name` (str, optional)
- `UserUpdate` — update user profile
  - Fields: `full_name` (str, optional), `avatar_url` (str, optional)
- `UserResponse` — full user response
  - Fields: `id` (UUID), `email` (str), `username` (str), `full_name` (str, optional), `avatar_url` (str, optional), `role` (str), `created_at` (datetime), `last_login_at` (datetime, optional)
- `UserBrief` — minimal user reference (used in nested responses)
  - Fields: `id` (UUID), `username` (str), `full_name` (str, optional), `avatar_url` (str, optional)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/auth.py`
- **Purpose**: Authentication request/response schemas for login and token refresh.
- `LoginRequest` — login credentials
  - Fields: `email` (EmailStr, required), `password` (str, required)
- `TokenResponse` — JWT token pair with user
  - Fields: `access_token` (str), `refresh_token` (str), `token_type` (str, default "bearer"), `user` (UserResponse)
- `RefreshRequest` — token refresh
  - Fields: `refresh_token` (str, required)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/project.py`
- **Purpose**: Project CRUD schemas with nested detail variant.
- `ProjectCreate` — create project
  - Fields: `name` (str, required), `description` (str, optional), `slug` (str, optional), `icon` (str, optional), `color` (str, optional), `create_default_board` (bool, default True)
- `ProjectUpdate` — update project
  - Fields: `name` (str, optional), `description` (str, optional), `icon` (str, optional), `color` (str, optional)
- `ProjectResponse` — project summary
  - Fields: `id` (UUID), `name` (str), `description` (str, optional), `slug` (str), `owner` (UserBrief), `icon` (str, optional), `color` (str, optional), `is_archived` (bool), `member_count` (int), `task_count` (int), `created_at` (datetime), `updated_at` (datetime, optional)
- `ProjectDetailResponse` — extends ProjectResponse with nested collections
  - Fields: inherits ProjectResponse + `members` (list[ProjectMemberResponse]), `boards` (list), `labels` (list[LabelResponse])

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/board.py`
- **Purpose**: Board CRUD and reorder schemas.
- `BoardCreate` — create board
  - Fields: `name` (str, required), `description` (str, optional), `icon` (str, optional), `color` (str, optional), `create_default_statuses` (bool, default True)
- `BoardUpdate` — update board
  - Fields: `name` (str, optional), `description` (str, optional), `icon` (str, optional), `color` (str, optional)
- `BoardResponse` — board summary
  - Fields: `id` (UUID), `project_id` (UUID), `name` (str), `slug` (str), `description` (str, optional), `icon` (str, optional), `color` (str, optional), `position` (int), `member_count` (int), `task_count` (int), `status_count` (int), `created_at` (datetime), `updated_at` (datetime, optional)
- `BoardDetailResponse` — extends BoardResponse with nested collections
  - Fields: inherits BoardResponse + `statuses` (list[StatusResponse]), `members` (list[BoardMemberResponse])
- `BoardReorder` — reorder boards
  - Fields: `board_ids` (list[UUID], required)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/board_member.py`
- **Purpose**: Board membership CRUD schemas.
- `BoardMemberCreate` — add member to board
  - Fields: `user_id` (UUID, required), `role` (str, default "member")
- `BoardMemberUpdate` — change member role
  - Fields: `role` (str, required)
- `BoardMemberResponse` — board member response
  - Fields: `id` (UUID), `user` (UserBrief), `role` (str), `joined_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/task.py`
- **Purpose**: Task CRUD, move, reorder, and bulk operation schemas.
- `TaskCreate` — create task
  - Fields: `title` (str, required, min 1 / max 500), `description` (str, optional), `status_id` (UUID, optional), `priority` (Literal["none","low","medium","high","urgent"], default "none"), `assignee_id` (UUID, optional), `label_ids` (list[UUID], default []), `due_date` (datetime, optional), `parent_id` (UUID, optional)
- `TaskUpdate` — update task
  - Fields: `title` (str, optional), `description` (str, optional), `status_id` (UUID, optional), `priority` (Literal[...], optional), `assignee_id` (UUID, optional), `label_ids` (list[UUID], optional), `due_date` (datetime, optional)
- `TaskResponse` — full task response
  - Fields: `id` (UUID), `project_id` (UUID), `board_id` (UUID), `title` (str), `description` (str, optional), `status` (StatusResponse), `priority` (str), `assignee` (UserBrief, optional), `creator` (UserBrief), `labels` (list[LabelResponse]), `due_date` (datetime, optional), `position` (float), `parent_id` (UUID, optional), `comments_count` (int, default 0), `created_at` (datetime), `updated_at` (datetime, optional), `completed_at` (datetime, optional)
- `TaskMove` — move task to different status
  - Fields: `status_id` (UUID, required), `position` (float, optional)
- `TaskReorder` — reorder task within column
  - Fields: `position` (float, required)
- `BulkTaskUpdate` — bulk update multiple tasks
  - Fields: `task_ids` (list[UUID], required), `updates` (dict, required)
- `BulkTaskMove` — bulk move tasks to status
  - Fields: `task_ids` (list[UUID], required), `status_id` (UUID, required)
- `BulkTaskDelete` — bulk delete tasks
  - Fields: `task_ids` (list[UUID], required)
- `DashboardTaskResponse` — extends TaskResponse for dashboard
  - Fields: inherits TaskResponse + `project_name` (str, default "")
- `MyTasksSummary` — my-tasks summary counts
  - Fields: `overdue_count` (int, 0), `due_today_count` (int, 0), `due_this_week_count` (int, 0), `total_assigned` (int, 0)
- `MyTasksResponse` — my-tasks endpoint envelope
  - Fields: `summary` (MyTasksSummary), `tasks` (list[DashboardTaskResponse])

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/status.py`
- **Purpose**: Status (board column) CRUD and reorder schemas.
- `StatusCreate` — create status column
  - Fields: `name` (str, required), `color` (str, optional), `position` (int, optional), `is_default` (bool, default False), `is_terminal` (bool, default False)
- `StatusUpdate` — update status column
  - Fields: `name` (str, optional), `color` (str, optional), `is_default` (bool, optional), `is_terminal` (bool, optional)
- `StatusResponse` — status column response
  - Fields: `id` (UUID), `board_id` (UUID), `name` (str), `slug` (str), `color` (str, optional), `position` (int), `is_default` (bool), `is_terminal` (bool), `task_count` (int, default 0), `created_at` (datetime)
- `StatusReorder` — reorder status columns
  - Fields: `status_ids` (list[UUID], required)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/label.py`
- **Purpose**: Label CRUD schemas.
- `LabelCreate` — create label
  - Fields: `name` (str, required), `color` (str, required), `description` (str, optional)
- `LabelUpdate` — update label
  - Fields: `name` (str, optional), `color` (str, optional), `description` (str, optional)
- `LabelResponse` — label response
  - Fields: `id` (UUID), `name` (str), `color` (str), `description` (str, optional), `task_count` (int, default 0), `created_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/comment.py`
- **Purpose**: Comment CRUD schemas.
- `CommentCreate` — create comment
  - Fields: `content` (str, required, min_length=1)
- `CommentUpdate` — edit comment
  - Fields: `content` (str, required, min_length=1)
- `CommentResponse` — comment response
  - Fields: `id` (UUID), `content` (str), `user` (UserBrief), `created_at` (datetime), `updated_at` (datetime, optional), `is_edited` (bool)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/api_key.py`
- **Purpose**: API key creation and response schemas.
- `APIKeyCreate` — create API key
  - Fields: `name` (str, required), `scopes` (list[str], default []), `expires_in_days` (int, optional, default 365)
- `APIKeyResponse` — API key summary (no secret)
  - Fields: `id` (UUID), `name` (str), `prefix` (str), `scopes` (list[str]), `last_used_at` (datetime, optional), `expires_at` (datetime, optional), `created_at` (datetime), `is_active` (bool)
- `APIKeyCreatedResponse` — returned once on creation (includes raw key)
  - Fields: `id` (UUID), `name` (str), `key` (str), `prefix` (str), `scopes` (list[str]), `expires_at` (datetime, optional), `created_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/project_member.py`
- **Purpose**: Project membership CRUD schemas.
- `ProjectMemberCreate` — add member to project
  - Fields: `user_id` (UUID, required), `role` (str, default "member")
- `ProjectMemberUpdate` — change member role
  - Fields: `role` (str, required)
- `ProjectMemberResponse` — project member response
  - Fields: `id` (UUID), `user` (UserBrief), `role` (str), `joined_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/activity_log.py`
- **Purpose**: Activity log response schema.
- `ActivityLogResponse` — activity entry response
  - Fields: `id` (UUID), `action` (str), `entity_type` (str), `changes` (dict), `user` (UserBrief), `task_id` (UUID, optional), `created_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/notification.py`
- **Purpose**: Notification response and bulk-read schemas.
- `NotificationResponse` — notification response
  - Fields: `id` (UUID), `type` (str), `title` (str), `message` (str), `is_read` (bool), `data` (dict[str, Any], optional), `project_id` (UUID, optional), `created_at` (datetime)
- `NotificationMarkRead` — mark notifications as read
  - Fields: `notification_ids` (list[UUID], optional), `mark_all` (bool, default False)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/webhook.py`
- **Purpose**: Webhook CRUD schemas.
- `WebhookCreate` — create webhook
  - Fields: `url` (HttpUrl, required), `events` (list[str], required), `secret` (str, optional)
- `WebhookUpdate` — update webhook
  - Fields: `url` (HttpUrl, optional), `events` (list[str], optional), `is_active` (bool, optional)
- `WebhookResponse` — webhook response
  - Fields: `id` (UUID), `url` (str), `events` (list[str]), `is_active` (bool), `created_at` (datetime)
