# Backend Models & Schemas Map

> SQLAlchemy ORM models and Pydantic request/response schemas.

---

## Models

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/__init__.py`
- **Purpose**: Re-exports all ORM model classes and defines `__all__`.
- Exports: `ActivityLog`, `Agent`, `AgentProject`, `APIKey`, `Checklist`, `ChecklistItem`, `CustomFieldDefinition`, `CustomFieldValue`, `Attachment`, `Board`, `BoardMember`, `Comment`, `Label`, `Notification`, `Project`, `ProjectMember`, `Reaction`, `Status`, `Task`, `TaskAssignee`, `TaskDependency`, `TaskLabel`, `TaskWatcher`, `User`, `Webhook`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/user.py`
- **Purpose**: Core user account model with auth, profile, and notification preferences.
- `User` — registered user account
  - Key fields: `id` (UUID, PK), `email` (String(255), unique, indexed), `username` (String(100), unique, indexed), `password_hash` (String(255)), `full_name` (String(255), optional), `avatar_url` (String(500), optional), `role` (String(20), default="user"), `is_active` (Boolean, default=True), `notification_preferences` (JSON, optional), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate), `last_login_at` (TZDateTime, optional)
  - Relationships: `api_keys` -> APIKey, `owned_projects` -> Project, `project_memberships` -> ProjectMember, `board_memberships` -> BoardMember

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/project.py`
- **Purpose**: Top-level project container owning boards, labels, statuses, tasks, and agent associations.
- `Project` — project entity
  - Key fields: `id` (UUID, PK), `name` (String(200)), `description` (Text, optional), `slug` (String(200), unique, indexed), `owner_id` (UUID, FK->users.id, CASCADE), `icon` (String(50), optional), `color` (String(20), optional), `is_archived` (Boolean, default=False, indexed), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Relationships: `owner` -> User, `members` -> ProjectMember, `statuses` -> Status, `labels` -> Label, `tasks` -> Task, `boards` -> Board, `agent_projects` -> AgentProject
  - Computed properties: `agents` (filters active non-deleted agents via agent_projects), `member_count`, `task_count`

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/board.py`
- **Purpose**: Board within a project; scopes statuses, tasks, and custom fields.
- `Board` — kanban board
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK->projects.id, CASCADE), `name` (String(200)), `slug` (String(200)), `description` (Text, optional), `icon` (String(50), optional), `color` (String(20), optional), `position` (Integer, default=0), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Constraints: UniqueConstraint(`project_id`, `slug`), Index(`project_id`, `position`)
  - Relationships: `project` -> Project, `members` -> BoardMember, `statuses` -> Status, `tasks` -> Task, `custom_field_definitions` -> CustomFieldDefinition
  - Computed properties: `member_count`, `task_count`, `status_count`

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/board_member.py`
- **Purpose**: Join table linking users to boards with a role.
- `BoardMember` — board membership
  - Key fields: `id` (UUID, PK), `board_id` (UUID, FK->boards.id, CASCADE), `user_id` (UUID, FK->users.id, CASCADE), `role` (String(20), default="member"), `joined_at` (TZDateTime)
  - Constraints: UniqueConstraint(`board_id`, `user_id`)
  - Relationships: `board` -> Board, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task.py`
- **Purpose**: Central task entity with multi-assignee, labels, subtasks, checklists, and custom fields.
- `Task` — task/card on a board
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK->projects.id, CASCADE), `board_id` (UUID, FK->boards.id, CASCADE), `title` (String(500)), `description` (JSON, optional), `description_text` (Text, optional), `status_id` (UUID, FK->statuses.id, RESTRICT), `priority` (String(20), default="none"), `creator_id` (UUID, FK->users.id, CASCADE), `agent_creator_id` (UUID, FK->agents.id, SET NULL, optional), `parent_id` (UUID, FK->tasks.id, SET NULL, optional, self-ref), `due_date` (TZDateTime, optional), `position` (Float, default=0.0), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate), `completed_at` (TZDateTime, optional), `cover_type` (String(20), optional), `cover_value` (String(500), optional), `cover_size` (String(10), optional)
  - Constraints: Index(`status_id`, `position`)
  - Relationships: `project` -> Project, `board` -> Board, `status` -> Status, `creator` -> User, `agent_creator` -> Agent, `parent` -> Task (self), `children` -> Task (self), `labels` -> TaskLabel, `comments` -> Comment, `dependencies` -> TaskDependency, `dependents` -> TaskDependency, `attachments` -> Attachment, `watchers` -> TaskWatcher, `assignees` -> TaskAssignee, `checklists` -> Checklist (ordered by position), `custom_field_values` -> CustomFieldValue

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task_assignee.py`
- **Purpose**: Join table for multi-assignee tasks, supporting both users and agents.
- `TaskAssignee` — task assignment (user or agent)
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK->tasks.id, CASCADE), `user_id` (UUID, FK->users.id, CASCADE, optional), `agent_id` (UUID, FK->agents.id, CASCADE, optional), `created_at` (TZDateTime)
  - Constraints: UniqueConstraint(`task_id`, `user_id`), UniqueConstraint(`task_id`, `agent_id`)
  - Relationships: `task` -> Task, `user` -> User, `agent` -> Agent

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task_watcher.py`
- **Purpose**: Join table for task watchers, supporting both users and agents.
- `TaskWatcher` — task watcher (user or agent)
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK->tasks.id, CASCADE), `user_id` (UUID, FK->users.id, CASCADE, optional), `agent_id` (UUID, FK->agents.id, CASCADE, optional), `created_at` (TZDateTime)
  - Constraints: UniqueConstraint(`task_id`, `user_id`), UniqueConstraint(`task_id`, `agent_id`)
  - Relationships: `task` -> Task, `user` -> User, `agent` -> Agent

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task_label.py`
- **Purpose**: Join table linking tasks to labels (composite PK).
- `TaskLabel` — task-label association
  - Key fields: `task_id` (UUID, FK->tasks.id, PK), `label_id` (UUID, FK->labels.id, PK), `created_at` (TZDateTime)
  - Relationships: `task` -> Task, `label` -> Label

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task_dependency.py`
- **Purpose**: Join table for task-to-task dependencies (composite PK).
- `TaskDependency` — task dependency link
  - Key fields: `task_id` (UUID, FK->tasks.id, PK), `depends_on_id` (UUID, FK->tasks.id, PK), `created_at` (TZDateTime)
  - Relationships: `task` -> Task, `depends_on` -> Task

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/status.py`
- **Purpose**: Board-scoped workflow status column (e.g. To Do, In Progress, Done).
- `Status` — kanban column status
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK->projects.id, CASCADE), `board_id` (UUID, FK->boards.id, CASCADE), `name` (String(100)), `slug` (String(100)), `color` (String(20), optional), `position` (Integer), `is_default` (Boolean, default=False), `is_terminal` (Boolean, default=False), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Constraints: UniqueConstraint(`board_id`, `slug`), Index(`board_id`, `position`)
  - Relationships: `project` -> Project, `board` -> Board, `tasks` -> Task

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/label.py`
- **Purpose**: Project-scoped colored label for categorizing tasks.
- `Label` — task label/tag
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK->projects.id, CASCADE), `name` (String(100)), `color` (String(20)), `description` (Text, optional), `created_at` (TZDateTime)
  - Constraints: UniqueConstraint(`project_id`, `name`)
  - Relationships: `project` -> Project, `task_labels` -> TaskLabel

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/comment.py`
- **Purpose**: Rich-text comment on a task with optional agent authorship.
- `Comment` — task comment
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK->tasks.id, CASCADE), `user_id` (UUID, FK->users.id, CASCADE), `agent_creator_id` (UUID, FK->agents.id, SET NULL, optional), `content` (JSON), `content_text` (Text, default=""), `is_edited` (Boolean, default=False), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Constraints: Index(`task_id`, `created_at`)
  - Relationships: `task` -> Task, `user` -> User, `agent_creator` -> Agent, `attachments` -> Attachment

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/notification.py`
- **Purpose**: User notification with type, read status, and optional project scope.
- `Notification` — in-app notification
  - Key fields: `id` (UUID, PK), `user_id` (UUID, FK->users.id, CASCADE), `project_id` (UUID, FK->projects.id, CASCADE, optional), `type` (String(50)), `title` (String(200)), `message` (Text), `is_read` (Boolean, default=False), `data` (JSON, optional), `created_at` (TZDateTime)
  - Constraints: Index(`user_id`, `is_read`, `created_at`)
  - Relationships: `user` -> User, `project` -> Project

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/attachment.py`
- **Purpose**: File attachment on a task or comment.
- `Attachment` — uploaded file
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK->tasks.id, CASCADE), `comment_id` (UUID, FK->comments.id, CASCADE, optional), `user_id` (UUID, FK->users.id, CASCADE), `filename` (String(500)), `file_path` (String(1000)), `file_size` (Integer), `mime_type` (String(100)), `created_at` (TZDateTime)
  - Relationships: `task` -> Task, `comment` -> Comment, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/webhook.py`
- **Purpose**: Project-scoped webhook endpoint for event notifications.
- `Webhook` — outbound webhook
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK->projects.id, CASCADE), `url` (String(1000)), `events` (JSON), `secret` (String(255), optional), `is_active` (Boolean, default=True), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Relationships: `project` -> Project

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/project_member.py`
- **Purpose**: Join table linking users to projects with a role.
- `ProjectMember` — project membership
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK->projects.id, CASCADE), `user_id` (UUID, FK->users.id, CASCADE), `role` (String(20), default="member"), `joined_at` (TZDateTime)
  - Constraints: UniqueConstraint(`project_id`, `user_id`)
  - Relationships: `project` -> Project, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/activity_log.py`
- **Purpose**: Audit log for project-level actions on tasks and other entities.
- `ActivityLog` — activity audit entry
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK->projects.id, CASCADE), `task_id` (UUID, FK->tasks.id, SET NULL, optional), `user_id` (UUID, FK->users.id, CASCADE), `agent_id` (UUID, FK->agents.id, SET NULL, optional), `action` (String(50)), `entity_type` (String(50)), `changes` (JSON, optional), `created_at` (TZDateTime)
  - Constraints: Index(`project_id`, `created_at`)
  - Relationships: `project` -> Project, `task` -> Task, `user` -> User, `agent` -> Agent

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/api_key.py`
- **Purpose**: Hashed API key for programmatic access, optionally linked to an agent.
- `APIKey` — API key credential
  - Key fields: `id` (UUID, PK), `user_id` (UUID, FK->users.id, CASCADE), `agent_id` (UUID, FK->agents.id, SET NULL, optional), `key_hash` (String(255), unique, indexed), `name` (String(100)), `prefix` (String(20), indexed), `scopes` (JSON, optional), `is_active` (Boolean, default=True), `last_used_at` (TZDateTime, optional), `expires_at` (TZDateTime, optional), `created_at` (TZDateTime)
  - Relationships: `user` -> User, `agent` -> Agent

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/agent.py`
- **Purpose**: First-class agent entity that can be assigned to tasks and author comments.
- `Agent` — AI/bot agent
  - Key fields: `id` (UUID, PK), `name` (String(100)), `color` (String(7)), `is_active` (Boolean, default=True), `created_by` (UUID, FK->users.id, CASCADE), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate), `deleted_at` (TZDateTime, optional, soft delete)
  - Relationships: `creator` -> User, `agent_projects` -> AgentProject

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/agent_project.py`
- **Purpose**: M:N join table linking agents to projects.
- `AgentProject` — agent-project association
  - Key fields: `id` (UUID, PK), `agent_id` (UUID, FK->agents.id, CASCADE), `project_id` (UUID, FK->projects.id, CASCADE), `joined_at` (TZDateTime)
  - Constraints: UniqueConstraint(`agent_id`, `project_id`)
  - Relationships: `agent` -> Agent, `project` -> Project

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/reaction.py`
- **Purpose**: Polymorphic emoji reaction on tasks or comments, by user or agent.
- `Reaction` — emoji reaction
  - Key fields: `id` (UUID, PK), `entity_type` (String(20), "task"|"comment"), `entity_id` (UUID), `emoji` (String(32)), `user_id` (UUID, FK->users.id, CASCADE, optional), `agent_id` (UUID, FK->agents.id, CASCADE, optional), `created_at` (TZDateTime)
  - Constraints: UniqueConstraint(`entity_type`, `entity_id`, `emoji`, `user_id`), UniqueConstraint(`entity_type`, `entity_id`, `emoji`, `agent_id`), Index(`entity_type`, `entity_id`)
  - Relationships: `user` -> User, `agent` -> Agent

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/custom_field.py`
- **Purpose**: Board-scoped custom field definition with typed options.
- `CustomFieldType` (Enum) — text, number, select, multi_select, date, checkbox, url, person
- `CustomFieldDefinition` — custom field schema
  - Key fields: `id` (UUID, PK), `board_id` (UUID, FK->boards.id, CASCADE), `name` (String(200)), `field_type` (String(20)), `description` (Text, optional), `options` (JSON, optional), `is_required` (Boolean, default=False), `position` (Float, default=0.0), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Constraints: UniqueConstraint(`board_id`, `name`), Index(`board_id`, `position`)
  - Relationships: `board` -> Board, `values` -> CustomFieldValue

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/custom_field_value.py`
- **Purpose**: Per-task value for a custom field definition, stored in typed columns.
- `CustomFieldValue` — custom field value
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK->tasks.id, CASCADE), `field_definition_id` (UUID, FK->custom_field_definitions.id, CASCADE), `value_text` (Text, optional), `value_number` (Float, optional), `value_json` (JSON, optional), `value_date` (TZDateTime, optional), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Constraints: UniqueConstraint(`task_id`, `field_definition_id`), Index(`task_id`), Index(`field_definition_id`)
  - Relationships: `task` -> Task, `field_definition` -> CustomFieldDefinition

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/checklist.py`
- **Purpose**: Ordered checklist container within a task.
- `Checklist` — task checklist
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK->tasks.id, CASCADE), `title` (String(300)), `position` (Float, default=0.0), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Constraints: Index(`task_id`, `position`)
  - Relationships: `task` -> Task, `items` -> ChecklistItem (ordered by position)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/checklist_item.py`
- **Purpose**: Individual item within a checklist, with optional assignee and due date.
- `ChecklistItem` — checklist line item
  - Key fields: `id` (UUID, PK), `checklist_id` (UUID, FK->checklists.id, CASCADE), `title` (String(500)), `is_completed` (Boolean, default=False), `position` (Float, default=0.0), `assignee_id` (UUID, FK->users.id, SET NULL, optional), `due_date` (TZDateTime, optional), `completed_at` (TZDateTime, optional), `created_at` (TZDateTime), `updated_at` (TZDateTime, onupdate)
  - Constraints: Index(`checklist_id`, `position`)
  - Relationships: `checklist` -> Checklist, `assignee` -> User

---

## Schemas

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/__init__.py`
- **Purpose**: Central re-export of all Pydantic schemas via `__all__` (67 exports).
- Exports: `ResponseBase`, `PaginationMeta`, `PaginatedResponse`, `ErrorBody`, `ErrorDetail`, `ErrorResponse`, `UserCreate`, `UserUpdate`, `UserResponse`, `UserBrief`, `LoginRequest`, `TokenResponse`, `RefreshRequest`, `APIKeyCreate`, `APIKeyResponse`, `APIKeyCreatedResponse`, `BoardCreate`, `BoardUpdate`, `BoardResponse`, `BoardDetailResponse`, `BoardReorder`, `BoardMemberCreate`, `BoardMemberUpdate`, `BoardMemberResponse`, `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `ProjectDetailResponse`, `ProjectMemberCreate`, `ProjectMemberUpdate`, `ProjectMemberResponse`, `StatusCreate`, `StatusUpdate`, `StatusResponse`, `StatusReorder`, `LabelCreate`, `LabelUpdate`, `LabelResponse`, `TaskCreate`, `TaskUpdate`, `TaskResponse`, `TaskMove`, `TaskReorder`, `BulkTaskUpdate`, `BulkTaskMove`, `BulkTaskDelete`, `AttachmentResponse`, `ChecklistCreate`, `ChecklistUpdate`, `ChecklistResponse`, `ChecklistReorder`, `ChecklistItemCreate`, `ChecklistItemUpdate`, `ChecklistItemResponse`, `ChecklistItemReorder`, `ChecklistProgress`, `CommentCreate`, `CommentUpdate`, `CommentResponse`, `AgentCreate`, `AgentUpdate`, `AgentResponse`, `AgentBrief`, `ActivityLogResponse`, `NotificationMarkRead`, `NotificationResponse`, `ReactionCreate`, `ReactionGroup`, `ReactionSummary`, `ReactionToggle`, `ReactorBrief`, `ToggleResult`, `WebhookCreate`, `WebhookUpdate`, `WebhookResponse`, `CustomFieldDefinitionCreate`, `CustomFieldDefinitionUpdate`, `CustomFieldDefinitionResponse`, `CustomFieldReorder`, `CustomFieldValueSet`, `CustomFieldValueResponse`, `BulkFieldValueSet`, `SelectOption`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/base.py`
- **Purpose**: Generic response wrappers, pagination, and error DTOs.
- `ResponseBase[T]` — standard success wrapper
  - Fields: `success` (bool, default=True), `data` (T), `meta` (dict, auto-timestamped)
- `PaginationMeta` — pagination metadata
  - Fields: `page` (int), `per_page` (int), `total` (int), `total_pages` (int)
- `PaginatedResponse[T]` — paginated list response
  - Fields: `success` (bool), `data` (list[T]), `pagination` (PaginationMeta), `meta` (dict)
- `ErrorDetail` — single field error
  - Fields: `field` (str, optional), `message` (str)
- `ErrorBody` — error payload
  - Fields: `code` (str), `message` (str), `details` (list[ErrorDetail], optional)
- `ErrorResponse` — standard error wrapper
  - Fields: `success` (bool, default=False), `error` (ErrorBody), `meta` (dict)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/auth.py`
- **Purpose**: Authentication request/response schemas.
- `LoginRequest` — login credentials
  - Fields: `email` (EmailStr, required), `password` (str, required)
- `TokenResponse` — JWT token pair + user
  - Fields: `access_token` (str), `refresh_token` (str), `token_type` (str, default="bearer"), `user` (UserResponse)
- `RefreshRequest` — token refresh
  - Fields: `refresh_token` (str, required)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/user.py`
- **Purpose**: User CRUD and brief display schemas.
- `UserCreate` — registration
  - Fields: `email` (EmailStr, required), `username` (str, required), `password` (str, min_length=8), `full_name` (str, optional)
- `UserUpdate` — profile update
  - Fields: `full_name` (str, optional), `avatar_url` (str, optional)
- `PasswordChange` — password change
  - Fields: `current_password` (str, required), `new_password` (str, min_length=8)
- `UserResponse` — full user response
  - Fields: `id` (UUID), `email` (str), `username` (str), `full_name` (str, optional), `avatar_url` (str, optional), `role` (str), `notification_preferences` (dict, optional), `created_at` (datetime), `last_login_at` (datetime, optional)
- `UserBrief` — minimal user info for embedding
  - Fields: `id` (UUID), `username` (str), `full_name` (str, optional), `avatar_url` (str, optional)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/project.py`
- **Purpose**: Project CRUD and detail response schemas.
- `ProjectCreate` — new project
  - Fields: `name` (str, required), `description` (str, optional), `slug` (str, optional), `icon` (str, optional), `color` (str, optional), `create_default_board` (bool, default=True)
- `ProjectUpdate` — update project
  - Fields: `name` (str, optional), `description` (str, optional), `icon` (str, optional), `color` (str, optional)
- `ProjectResponse` — project summary
  - Fields: `id` (UUID), `name` (str), `description` (str, optional), `slug` (str), `owner` (UserBrief), `icon` (str, optional), `color` (str, optional), `is_archived` (bool), `member_count` (int), `task_count` (int), `created_at` (datetime), `updated_at` (datetime, optional)
- `ProjectDetailResponse` — extends ProjectResponse
  - Fields: + `members` (list[ProjectMemberResponse]), `boards` (list[BoardResponse]), `labels` (list[LabelResponse]), `agents` (list[AgentResponse])

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/board.py`
- **Purpose**: Board CRUD, detail, and reorder schemas.
- `BoardCreate` — new board
  - Fields: `name` (str, required), `description` (str, optional), `icon` (str, optional), `color` (str, optional), `create_default_statuses` (bool, default=True)
- `BoardUpdate` — update board
  - Fields: `name` (str, optional), `description` (str, optional), `icon` (str, optional), `color` (str, optional)
- `BoardResponse` — board summary
  - Fields: `id` (UUID), `project_id` (UUID), `name` (str), `slug` (str), `description` (str, optional), `icon` (str, optional), `color` (str, optional), `position` (int), `member_count` (int), `task_count` (int), `status_count` (int), `created_at` (datetime), `updated_at` (datetime, optional)
- `BoardDetailResponse` — extends BoardResponse
  - Fields: + `statuses` (list[StatusResponse]), `members` (list[BoardMemberResponse])
- `BoardReorder` — reorder boards
  - Fields: `board_ids` (list[UUID])

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/board_member.py`
- **Purpose**: Board membership CRUD schemas.
- `BoardMemberCreate` — add member
  - Fields: `user_id` (UUID, required), `role` (str, default="member")
- `BoardMemberUpdate` — change role
  - Fields: `role` (str, required)
- `BoardMemberResponse` — member info
  - Fields: `id` (UUID), `user` (UserBrief), `role` (str), `joined_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/task.py`
- **Purpose**: Task CRUD, movement, bulk ops, subtask, and dashboard schemas.
- `TaskCreate` — new task
  - Fields: `title` (str, 1-500 chars), `description` (str|dict, optional), `status_id` (UUID, optional), `priority` (Literal["none","low","medium","high","urgent"], default="none"), `assignee_user_ids` (list[UUID]), `assignee_agent_ids` (list[UUID]), `label_ids` (list[UUID]), `watcher_user_ids` (list[UUID]), `watcher_agent_ids` (list[UUID]), `due_date` (datetime, optional), `parent_id` (UUID, optional), `cover_type` (Literal["image","color","gradient"], optional), `cover_value` (str, optional), `cover_size` (Literal["full","half"], optional)
- `TaskUpdate` — update task (all fields optional, same shape as TaskCreate)
- `AssigneeBrief` — embedded assignee
  - Fields: `id` (UUID), `user` (UserBrief, optional), `agent` (AgentBrief, optional)
- `WatcherBrief` — embedded watcher
  - Fields: `id` (UUID), `user` (UserBrief, optional), `agent` (AgentBrief, optional)
- `SubtaskProgress` — subtask completion counts
  - Fields: `total` (int), `completed` (int)
- `SubtaskBrief` — minimal subtask for embedding
  - Fields: `id` (UUID), `title` (str), `status` (StatusResponse), `priority` (str), `position` (float), `completed_at` (datetime, optional), `assignees` (list[AssigneeBrief])
- `TaskDeleteMode` — delete strategy
  - Fields: `mode` (Literal["cascade","orphan"], default="orphan")
- `ConvertToSubtask` — convert task to subtask
  - Fields: `task_id_to_convert` (UUID)
- `TaskResponse` — full task response
  - Fields: `id` (UUID), `project_id` (UUID), `board_id` (UUID), `title` (str), `description` (dict, optional), `description_text` (str, optional), `status` (StatusResponse), `priority` (str), `assignees` (list[AssigneeBrief]), `creator` (UserBrief), `agent_creator` (AgentBrief, optional), `labels` (list[LabelResponse]), `attachments` (list[AttachmentResponse]), `watchers` (list[WatcherBrief]), `due_date` (datetime, optional), `position` (float), `parent_id` (UUID, optional), `cover_type` (str, optional), `cover_value` (str, optional), `cover_size` (str, optional), `cover_image_url` (str, optional), `comments_count` (int), `checklist_progress` (ChecklistProgress), `subtask_progress` (SubtaskProgress), `children_count` (int), `children` (list[SubtaskBrief]), `custom_field_values` (list[CustomFieldValueResponse]), `reactions` (ReactionSummary, optional), `created_at` (datetime), `updated_at` (datetime, optional), `completed_at` (datetime, optional)
  - Validators: `resolve_checklist_progress` (computes from checklists), `resolve_cover_image_url` (builds download URL for image covers), `resolve_labels` (unwraps TaskLabel join objects to Label), `resolve_subtask_progress` (counts children completion)
- `SubtaskReorder` — reorder subtask
  - Fields: `subtask_id` (UUID), `position` (float, validated positive finite)
- `TaskMove` — move task to status
  - Fields: `status_id` (UUID, required), `position` (float, optional, validated)
- `TaskReorder` — reorder task
  - Fields: `position` (float, validated positive finite)
- `BulkTaskUpdate` — bulk update
  - Fields: `task_ids` (list[UUID]), `updates` (dict)
- `BulkTaskMove` — bulk move
  - Fields: `task_ids` (list[UUID]), `status_id` (UUID)
- `BulkTaskDelete` — bulk delete
  - Fields: `task_ids` (list[UUID])
- `DashboardTaskResponse` — extends TaskResponse for dashboard
  - Fields: + `project_name` (str), `parent_title` (str, optional)
- `MyTasksSummary` — dashboard summary counts
  - Fields: `overdue_count` (int), `due_today_count` (int), `due_this_week_count` (int), `total_assigned` (int)
- `MyTasksResponse` — dashboard my-tasks response
  - Fields: `summary` (MyTasksSummary), `tasks` (list[DashboardTaskResponse])

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/status.py`
- **Purpose**: Status CRUD and reorder schemas.
- `StatusCreate` — new status
  - Fields: `name` (str, required), `color` (str, optional), `position` (int, optional), `is_default` (bool, default=False), `is_terminal` (bool, default=False)
- `StatusUpdate` — update status
  - Fields: `name` (str, optional), `color` (str, optional), `is_default` (bool, optional), `is_terminal` (bool, optional)
- `StatusResponse` — status info
  - Fields: `id` (UUID), `board_id` (UUID), `name` (str), `slug` (str), `color` (str, optional), `position` (int), `is_default` (bool), `is_terminal` (bool), `task_count` (int), `created_at` (datetime)
- `StatusReorder` — reorder statuses
  - Fields: `status_ids` (list[UUID])

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/label.py`
- **Purpose**: Label CRUD schemas.
- `LabelCreate` — new label
  - Fields: `name` (str, required), `color` (str, required), `description` (str, optional)
- `LabelUpdate` — update label
  - Fields: `name` (str, optional), `color` (str, optional), `description` (str, optional)
- `LabelResponse` — label info
  - Fields: `id` (UUID), `name` (str), `color` (str), `description` (str, optional), `task_count` (int), `created_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/comment.py`
- **Purpose**: Comment CRUD schemas with rich content and reaction support.
- `CommentCreate` — new comment
  - Fields: `content` (str|dict, required), `attachment_ids` (list[UUID], default=[])
- `CommentUpdate` — edit comment
  - Fields: `content` (str|dict, required)
- `CommentResponse` — comment info
  - Fields: `id` (UUID), `content` (dict|str), `content_text` (str), `user` (UserBrief), `agent_creator` (AgentBrief, optional), `attachments` (list[AttachmentResponse]), `created_at` (datetime), `updated_at` (datetime, optional), `is_edited` (bool), `reactions` (ReactionSummary, optional)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/notification.py`
- **Purpose**: Notification response, mark-read, type constants, and preference schemas.
- `NotificationResponse` — notification info
  - Fields: `id` (UUID), `type` (str), `title` (str), `message` (str), `is_read` (bool), `data` (dict, optional), `project_id` (UUID, optional), `created_at` (datetime)
- `NotificationMarkRead` — mark notifications read
  - Fields: `notification_ids` (list[UUID], optional), `mark_all` (bool, default=False)
- `NotificationType` — constants class with 14 notification types: task_assigned, task_updated, task_moved, task_deleted, task_comment, task_reaction, mentioned, subtask_created, subtask_deleted, watcher_added, watcher_removed, assignee_added, assignee_removed, comment_deleted
- `NotificationPreferences` — per-user notification settings
  - Fields: 14 boolean toggles (one per notification type, all default=True), `self_notifications` (bool, True), `desktop_enabled` (bool, False), `muted_projects` (list[str]), `email_enabled` (bool, False), `email_digest` (str, "off"|"instant"|"daily")

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/attachment.py`
- **Purpose**: Attachment response schema with auto-generated download URL.
- `AttachmentResponse` — file attachment info
  - Fields: `id` (UUID), `filename` (str), `file_size` (int), `mime_type` (str), `download_url` (str, computed), `user` (UserBrief), `created_at` (datetime)
  - Validators: `build_download_url` (generates `/api/v1/attachments/{id}/download`)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/webhook.py`
- **Purpose**: Webhook CRUD schemas.
- `WebhookCreate` — new webhook
  - Fields: `url` (HttpUrl, required), `events` (list[str], required), `secret` (str, optional)
- `WebhookUpdate` — update webhook
  - Fields: `url` (HttpUrl, optional), `events` (list[str], optional), `is_active` (bool, optional)
- `WebhookResponse` — webhook info
  - Fields: `id` (UUID), `url` (str), `events` (list[str]), `is_active` (bool), `created_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/project_member.py`
- **Purpose**: Project membership CRUD schemas.
- `ProjectMemberCreate` — add member
  - Fields: `user_id` (UUID, required), `role` (str, default="member")
- `ProjectMemberUpdate` — change role
  - Fields: `role` (str, required)
- `ProjectMemberResponse` — member info
  - Fields: `id` (UUID), `user` (UserBrief), `role` (str), `joined_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/activity_log.py`
- **Purpose**: Activity log response schema.
- `ActivityLogResponse` — audit entry
  - Fields: `id` (UUID), `action` (str), `entity_type` (str), `changes` (dict), `user` (UserBrief), `agent` (AgentBrief, optional), `task_id` (UUID, optional), `created_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/api_key.py`
- **Purpose**: API key create and response schemas (key only shown on creation).
- `APIKeyCreate` — new API key
  - Fields: `name` (str, required), `scopes` (list[str], default=[]), `expires_in_days` (int, optional, default=365), `agent_id` (UUID, optional)
- `APIKeyResponse` — API key info (no secret)
  - Fields: `id` (UUID), `name` (str), `prefix` (str), `scopes` (list[str]), `agent_id` (UUID, optional), `agent_name` (str, optional), `last_used_at` (datetime, optional), `expires_at` (datetime, optional), `created_at` (datetime), `is_active` (bool)
- `APIKeyCreatedResponse` — API key with plaintext key (one-time)
  - Fields: `id` (UUID), `name` (str), `key` (str), `prefix` (str), `scopes` (list[str]), `expires_at` (datetime, optional), `created_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/agent.py`
- **Purpose**: Agent CRUD, brief, and agent-with-projects schemas.
- `AgentCreate` — new agent
  - Fields: `name` (str, 1-100 chars), `color` (str, 4-7 chars)
- `AgentUpdate` — update agent
  - Fields: `name` (str, optional), `color` (str, optional), `is_active` (bool, optional)
- `AgentBrief` — minimal agent info for embedding
  - Fields: `id` (UUID), `name` (str), `color` (str)
- `AgentResponse` — extends AgentBrief
  - Fields: + `is_active` (bool), `created_at` (datetime), `updated_at` (datetime, optional), `deleted_at` (datetime, optional)
- `ProjectBrief` — minimal project for agent context
  - Fields: `id` (UUID), `name` (str)
- `AgentWithProjectsResponse` — extends AgentResponse
  - Fields: + `projects` (list[ProjectBrief])

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/reaction.py`
- **Purpose**: Reaction toggle, grouping, and summary schemas.
- `ReactionCreate` — create reaction
  - Fields: `emoji` (str, 1-32 chars)
- `ReactionToggle` — toggle reaction
  - Fields: `emoji` (str, 1-32 chars)
- `ReactorBrief` — who reacted
  - Fields: `user` (UserBrief, optional), `agent` (AgentBrief, optional)
- `ReactionGroup` — grouped reactions by emoji
  - Fields: `emoji` (str), `count` (int), `reacted_by_me` (bool), `reactors` (list[ReactorBrief])
- `ReactionSummary` — all reactions on an entity
  - Fields: `groups` (list[ReactionGroup]), `total` (int)
- `ToggleResult` — toggle response
  - Fields: `action` (str, "added"|"removed"), `emoji` (str), `summary` (ReactionSummary)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/custom_field.py`
- **Purpose**: Custom field definition and value schemas with select option support.
- `SelectOption` — option for select/multi_select fields
  - Fields: `id` (str, auto-uuid), `label` (str, 1-100 chars), `color` (str, 4-7 chars)
- `CustomFieldDefinitionCreate` — new field definition
  - Fields: `name` (str, 1-200 chars), `field_type` (Literal["text","number","select","multi_select","date","checkbox","url","person"]), `description` (str, optional), `options` (list[SelectOption], optional), `is_required` (bool, default=False)
  - Validators: `validate_options` (requires options for select types, clears for others)
- `CustomFieldDefinitionUpdate` — update definition
  - Fields: `name` (str, optional), `description` (str, optional), `options` (list[SelectOption], optional), `is_required` (bool, optional)
- `CustomFieldDefinitionResponse` — definition info
  - Fields: `id` (UUID), `board_id` (UUID), `name` (str), `field_type` (str), `description` (str, optional), `options` (list[SelectOption], optional), `is_required` (bool), `position` (float), `created_at` (datetime), `updated_at` (datetime)
- `CustomFieldReorder` — reorder fields
  - Fields: `field_ids` (list[UUID])
- `CustomFieldValueSet` — set a field value
  - Fields: `field_definition_id` (UUID), `value_text` (str, optional), `value_number` (float, optional), `value_json` (Any, optional), `value_date` (datetime, optional)
- `BulkFieldValueSet` — set multiple values at once
  - Fields: `values` (list[CustomFieldValueSet])
- `CustomFieldValueResponse` — stored value
  - Fields: `id` (UUID), `field_definition_id` (UUID), `value_text` (str, optional), `value_number` (float, optional), `value_json` (Any, optional), `value_date` (datetime, optional), `created_at` (datetime), `updated_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/checklist.py`
- **Purpose**: Checklist and checklist item CRUD, reorder, and progress schemas.
- `ChecklistItemCreate` — new item
  - Fields: `title` (str, 1-500 chars), `assignee_id` (UUID, optional), `due_date` (datetime, optional)
- `ChecklistItemUpdate` — update item
  - Fields: `title` (str, optional), `is_completed` (bool, optional), `assignee_id` (UUID, optional), `due_date` (datetime, optional)
- `ChecklistItemReorder` — reorder item
  - Fields: `position` (float)
- `ChecklistItemResponse` — item info
  - Fields: `id` (UUID), `checklist_id` (UUID), `title` (str), `is_completed` (bool), `position` (float), `assignee` (UserBrief, optional), `due_date` (datetime, optional), `completed_at` (datetime, optional), `created_at` (datetime), `updated_at` (datetime, optional)
- `ChecklistCreate` — new checklist
  - Fields: `title` (str, 1-300 chars)
- `ChecklistUpdate` — update checklist
  - Fields: `title` (str, optional)
- `ChecklistReorder` — reorder checklist
  - Fields: `position` (float)
- `ChecklistResponse` — checklist with items
  - Fields: `id` (UUID), `task_id` (UUID), `title` (str), `position` (float), `items` (list[ChecklistItemResponse]), `created_at` (datetime), `updated_at` (datetime, optional)
- `ChecklistProgress` — aggregate progress (embedded in TaskResponse)
  - Fields: `total` (int), `completed` (int)
