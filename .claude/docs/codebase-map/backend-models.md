# Backend Models & Schemas

> SQLAlchemy ORM models and Pydantic request/response schemas.

---

## Models

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/__init__.py`
- **Purpose**: Registers all ORM models and exports them via `__all__`.
- Exports: `ActivityLog`, `Agent`, `APIKey`, `Checklist`, `ChecklistItem`, `CustomFieldDefinition`, `CustomFieldValue`, `Attachment`, `Board`, `BoardMember`, `Comment`, `Label`, `Notification`, `Project`, `ProjectMember`, `Reaction`, `Status`, `Task`, `TaskAssignee`, `TaskDependency`, `TaskLabel`, `TaskWatcher`, `User`, `Webhook`

---

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/user.py`
- **Purpose**: Core user account model with auth fields and profile info.
- `User` — registered user account
  - Key fields: `id` (UUID, PK), `email` (String(255), unique, indexed), `username` (String(100), unique, indexed), `password_hash` (String(255)), `full_name` (String(255), nullable), `avatar_url` (String(500), nullable), `role` (String(20), default "user"), `is_active` (Boolean, default True), `created_at` (DateTime), `updated_at` (DateTime, auto), `last_login_at` (DateTime, nullable)
  - Relationships: `api_keys` -> APIKey, `owned_projects` -> Project, `project_memberships` -> ProjectMember, `board_memberships` -> BoardMember

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/project.py`
- **Purpose**: Top-level project container that groups boards, tasks, statuses, labels, members, and agents.
- `Project` — project workspace
  - Key fields: `id` (UUID, PK), `name` (String(200)), `description` (Text, nullable), `slug` (String(200), unique, indexed), `owner_id` (UUID, FK -> users.id, CASCADE), `icon` (String(50), nullable), `color` (String(20), nullable), `is_archived` (Boolean, default False, indexed), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Relationships: `owner` -> User, `members` -> ProjectMember, `statuses` -> Status, `labels` -> Label, `tasks` -> Task, `boards` -> Board, `agents` -> Agent
  - Computed properties: `member_count` (int), `task_count` (int)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/board.py`
- **Purpose**: Kanban board within a project, containing statuses, tasks, and custom field definitions.
- `Board` — project board
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id, CASCADE), `name` (String(200)), `slug` (String(200)), `description` (Text, nullable), `icon` (String(50), nullable), `color` (String(20), nullable), `position` (Integer, default 0), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: UniqueConstraint(`project_id`, `slug`), Index(`project_id`, `position`)
  - Relationships: `project` -> Project, `members` -> BoardMember, `statuses` -> Status, `tasks` -> Task, `custom_field_definitions` -> CustomFieldDefinition
  - Computed properties: `member_count` (int), `task_count` (int), `status_count` (int)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/board_member.py`
- **Purpose**: Associates users to boards with a role.
- `BoardMember` — board membership join table
  - Key fields: `id` (UUID, PK), `board_id` (UUID, FK -> boards.id), `user_id` (UUID, FK -> users.id), `role` (String(20), default "member"), `joined_at` (DateTime)
  - Constraints: UniqueConstraint(`board_id`, `user_id`)
  - Relationships: `board` -> Board, `user` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task.py`
- **Purpose**: Core task entity with priority, position, multi-assignee, watchers, hierarchy, covers, checklists, and custom fields.
- `Task` — kanban task card
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id, CASCADE), `board_id` (UUID, FK -> boards.id, CASCADE), `title` (String(500)), `description` (JSON, nullable), `description_text` (Text, nullable), `status_id` (UUID, FK -> statuses.id, RESTRICT), `priority` (String(20), default "none"), `creator_id` (UUID, FK -> users.id, CASCADE), `agent_creator_id` (UUID, FK -> agents.id, SET NULL, nullable), `parent_id` (UUID, FK -> tasks.id, SET NULL, nullable, self-referential), `due_date` (DateTime, nullable), `position` (Float, default 0.0), `created_at` (DateTime), `updated_at` (DateTime, auto), `completed_at` (DateTime, nullable), `cover_type` (String(20), nullable), `cover_value` (String(500), nullable), `cover_size` (String(10), nullable)
  - Constraints: Index(`status_id`, `position`)
  - Relationships: `project` -> Project, `board` -> Board, `status` -> Status, `creator` -> User, `agent_creator` -> Agent, `parent` -> Task (self), `children` -> Task (self), `labels` -> TaskLabel, `comments` -> Comment, `dependencies` -> TaskDependency, `dependents` -> TaskDependency, `attachments` -> Attachment, `watchers` -> TaskWatcher, `assignees` -> TaskAssignee, `checklists` -> Checklist (order_by position), `custom_field_values` -> CustomFieldValue

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task_assignee.py`
- **Purpose**: Many-to-many join table between tasks and assignees (users or agents).
- `TaskAssignee` — task-assignee association
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK -> tasks.id, CASCADE), `user_id` (UUID, FK -> users.id, CASCADE, nullable), `agent_id` (UUID, FK -> agents.id, CASCADE, nullable), `created_at` (DateTime)
  - Constraints: UniqueConstraint(`task_id`, `user_id`), UniqueConstraint(`task_id`, `agent_id`)
  - Relationships: `task` -> Task, `user` -> User, `agent` -> Agent

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/task_watcher.py`
- **Purpose**: Many-to-many join table between tasks and watchers (users or agents).
- `TaskWatcher` — task-watcher association
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK -> tasks.id, CASCADE), `user_id` (UUID, FK -> users.id, CASCADE, nullable), `agent_id` (UUID, FK -> agents.id, CASCADE, nullable), `created_at` (DateTime)
  - Constraints: UniqueConstraint(`task_id`, `user_id`), UniqueConstraint(`task_id`, `agent_id`)
  - Relationships: `task` -> Task, `user` -> User, `agent` -> Agent

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/agent.py`
- **Purpose**: Project-scoped agent entity representing an automated actor that can be assigned to tasks.
- `Agent` — project agent
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id, CASCADE), `name` (String(100)), `color` (String(7)), `is_active` (Boolean, default True), `created_by` (UUID, FK -> users.id, CASCADE), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: UniqueConstraint(`project_id`, `name`)
  - Relationships: `project` -> Project, `creator` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/checklist.py`
- **Purpose**: Ordered checklist container belonging to a task.
- `Checklist` — task checklist
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK -> tasks.id, CASCADE), `title` (String(300)), `position` (Float, default 0.0), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: Index(`task_id`, `position`)
  - Relationships: `task` -> Task, `items` -> ChecklistItem (order_by position)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/checklist_item.py`
- **Purpose**: Individual checklist item with completion tracking, optional assignee, and due date.
- `ChecklistItem` — checklist line item
  - Key fields: `id` (UUID, PK), `checklist_id` (UUID, FK -> checklists.id, CASCADE), `title` (String(500)), `is_completed` (Boolean, default False), `position` (Float, default 0.0), `assignee_id` (UUID, FK -> users.id, SET NULL, nullable), `due_date` (DateTime, nullable), `completed_at` (DateTime, nullable), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: Index(`checklist_id`, `position`)
  - Relationships: `checklist` -> Checklist, `assignee` -> User

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/comment.py`
- **Purpose**: User or agent comment on a task with rich-text JSON content, edit tracking, and attachments.
- `Comment` — task comment
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK -> tasks.id, CASCADE), `user_id` (UUID, FK -> users.id, CASCADE), `agent_creator_id` (UUID, FK -> agents.id, SET NULL, nullable), `content` (JSON), `content_text` (Text, default ""), `is_edited` (Boolean, default False), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: Index(`task_id`, `created_at`)
  - Relationships: `task` -> Task, `user` -> User, `agent_creator` -> Agent, `attachments` -> Attachment

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/custom_field.py`
- **Purpose**: Board-scoped custom field definition with type validation and select options.
- `CustomFieldType` — enum: `TEXT`, `NUMBER`, `SELECT`, `MULTI_SELECT`, `DATE`, `CHECKBOX`, `URL`, `PERSON`
- `CustomFieldDefinition` — custom field definition
  - Key fields: `id` (UUID, PK), `board_id` (UUID, FK -> boards.id, CASCADE), `name` (String(200)), `field_type` (String(20)), `description` (Text, nullable), `options` (JSON, nullable), `is_required` (Boolean, default False), `position` (Float, default 0.0), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: UniqueConstraint(`board_id`, `name`), Index(`board_id`, `position`)
  - Relationships: `board` -> Board, `values` -> CustomFieldValue

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/custom_field_value.py`
- **Purpose**: Per-task value for a custom field, storing typed data in separate columns.
- `CustomFieldValue` — custom field value for a task
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK -> tasks.id, CASCADE), `field_definition_id` (UUID, FK -> custom_field_definitions.id, CASCADE), `value_text` (Text, nullable), `value_number` (Float, nullable), `value_json` (JSON, nullable), `value_date` (DateTime, nullable), `created_at` (DateTime), `updated_at` (DateTime, auto)
  - Constraints: UniqueConstraint(`task_id`, `field_definition_id`), Index(`task_id`), Index(`field_definition_id`)
  - Relationships: `task` -> Task, `field_definition` -> CustomFieldDefinition

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/reaction.py`
- **Purpose**: Polymorphic emoji reaction on tasks or comments by users or agents.
- `Reaction` — emoji reaction
  - Key fields: `id` (UUID, PK), `entity_type` (String(20) — "task" | "comment"), `entity_id` (UUID), `emoji` (String(32)), `user_id` (UUID, FK -> users.id, CASCADE, nullable), `agent_id` (UUID, FK -> agents.id, CASCADE, nullable), `created_at` (DateTime)
  - Constraints: UniqueConstraint(`entity_type`, `entity_id`, `emoji`, `user_id`), UniqueConstraint(`entity_type`, `entity_id`, `emoji`, `agent_id`), Index(`entity_type`, `entity_id`)
  - Relationships: `user` -> User, `agent` -> Agent

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
- **Purpose**: Audit trail recording user/agent actions on projects/tasks.
- `ActivityLog` — activity/audit log entry
  - Key fields: `id` (UUID, PK), `project_id` (UUID, FK -> projects.id, CASCADE), `task_id` (UUID, FK -> tasks.id, SET NULL, nullable), `user_id` (UUID, FK -> users.id, CASCADE), `agent_id` (UUID, FK -> agents.id, SET NULL, nullable), `action` (String(50)), `entity_type` (String(50)), `changes` (JSON, nullable), `created_at` (DateTime)
  - Constraints: Index(`project_id`, `created_at`)
  - Relationships: `project` -> Project, `task` -> Task, `user` -> User, `agent` -> Agent

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/models/attachment.py`
- **Purpose**: File attachment metadata linked to a task and optionally to a comment.
- `Attachment` — task/comment file attachment
  - Key fields: `id` (UUID, PK), `task_id` (UUID, FK -> tasks.id, CASCADE), `comment_id` (UUID, FK -> comments.id, CASCADE, nullable), `user_id` (UUID, FK -> users.id, CASCADE), `filename` (String(500)), `file_path` (String(1000)), `file_size` (Integer), `mime_type` (String(100)), `created_at` (DateTime)
  - Relationships: `task` -> Task, `comment` -> Comment, `user` -> User

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
- Exports all Create/Update/Response schemas for every entity plus base response wrappers, auth DTOs, agent schemas, checklist schemas, custom field schemas, and reaction schemas.
- Exports: `ResponseBase`, `PaginationMeta`, `PaginatedResponse`, `ErrorBody`, `ErrorDetail`, `ErrorResponse`, `UserCreate`, `UserUpdate`, `UserResponse`, `UserBrief`, `LoginRequest`, `TokenResponse`, `RefreshRequest`, `APIKeyCreate`, `APIKeyResponse`, `APIKeyCreatedResponse`, `BoardCreate`, `BoardUpdate`, `BoardResponse`, `BoardDetailResponse`, `BoardReorder`, `BoardMemberCreate`, `BoardMemberUpdate`, `BoardMemberResponse`, `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `ProjectDetailResponse`, `ProjectMemberCreate`, `ProjectMemberUpdate`, `ProjectMemberResponse`, `StatusCreate`, `StatusUpdate`, `StatusResponse`, `StatusReorder`, `LabelCreate`, `LabelUpdate`, `LabelResponse`, `TaskCreate`, `TaskUpdate`, `TaskResponse`, `TaskMove`, `TaskReorder`, `BulkTaskUpdate`, `BulkTaskMove`, `BulkTaskDelete`, `AttachmentResponse`, `ChecklistCreate`, `ChecklistUpdate`, `ChecklistResponse`, `ChecklistReorder`, `ChecklistItemCreate`, `ChecklistItemUpdate`, `ChecklistItemResponse`, `ChecklistItemReorder`, `ChecklistProgress`, `CommentCreate`, `CommentUpdate`, `CommentResponse`, `AgentCreate`, `AgentUpdate`, `AgentResponse`, `AgentBrief`, `ActivityLogResponse`, `NotificationMarkRead`, `NotificationResponse`, `ReactionCreate`, `ReactionGroup`, `ReactionSummary`, `ReactionToggle`, `ReactorBrief`, `ToggleResult`, `WebhookCreate`, `WebhookUpdate`, `WebhookResponse`, `CustomFieldDefinitionCreate`, `CustomFieldDefinitionUpdate`, `CustomFieldDefinitionResponse`, `CustomFieldReorder`, `CustomFieldValueSet`, `CustomFieldValueResponse`, `BulkFieldValueSet`, `SelectOption`

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
- **Purpose**: Project CRUD schemas with nested detail variant including agents.
- `ProjectCreate` — create project
  - Fields: `name` (str, required), `description` (str, optional), `slug` (str, optional), `icon` (str, optional), `color` (str, optional), `create_default_board` (bool, default True)
- `ProjectUpdate` — update project
  - Fields: `name` (str, optional), `description` (str, optional), `icon` (str, optional), `color` (str, optional)
- `ProjectResponse` — project summary
  - Fields: `id` (UUID), `name` (str), `description` (str, optional), `slug` (str), `owner` (UserBrief), `icon` (str, optional), `color` (str, optional), `is_archived` (bool), `member_count` (int), `task_count` (int), `created_at` (datetime), `updated_at` (datetime, optional)
- `ProjectDetailResponse` — extends ProjectResponse with nested collections
  - Fields: inherits ProjectResponse + `members` (list[ProjectMemberResponse]), `boards` (list[BoardResponse]), `labels` (list[LabelResponse]), `agents` (list[AgentResponse], default [])

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

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/checklist.py`
- **Purpose**: Checklist and checklist item CRUD, reorder, and progress schemas.
- `ChecklistItemCreate` — create checklist item
  - Fields: `title` (str, required, min 1 / max 500), `assignee_id` (UUID, optional), `due_date` (datetime, optional)
- `ChecklistItemUpdate` — update checklist item
  - Fields: `title` (str, optional), `is_completed` (bool, optional), `assignee_id` (UUID, optional), `due_date` (datetime, optional)
- `ChecklistItemReorder` — reorder checklist item
  - Fields: `position` (float, required)
- `ChecklistItemResponse` — checklist item response
  - Fields: `id` (UUID), `checklist_id` (UUID), `title` (str), `is_completed` (bool), `position` (float), `assignee` (UserBrief, optional), `due_date` (datetime, optional), `completed_at` (datetime, optional), `created_at` (datetime), `updated_at` (datetime, optional)
- `ChecklistCreate` — create checklist
  - Fields: `title` (str, required, min 1 / max 300)
- `ChecklistUpdate` — update checklist
  - Fields: `title` (str, optional)
- `ChecklistReorder` — reorder checklist
  - Fields: `position` (float, required)
- `ChecklistResponse` — checklist response with nested items
  - Fields: `id` (UUID), `task_id` (UUID), `title` (str), `position` (float), `items` (list[ChecklistItemResponse], default []), `created_at` (datetime), `updated_at` (datetime, optional)
- `ChecklistProgress` — aggregate progress counts (embedded in TaskResponse)
  - Fields: `total` (int, default 0), `completed` (int, default 0)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/comment.py`
- **Purpose**: Comment CRUD schemas with rich-text JSON content, agent creator, attachment, and reaction support.
- `CommentCreate` — create comment
  - Fields: `content` (str | dict, required), `attachment_ids` (list[UUID], default []), `agent_creator_id` (UUID, optional)
- `CommentUpdate` — edit comment
  - Fields: `content` (str | dict, required)
- `CommentResponse` — comment response
  - Fields: `id` (UUID), `content` (dict | str), `content_text` (str, default ""), `user` (UserBrief), `agent_creator` (AgentBrief, optional), `attachments` (list[AttachmentResponse], default []), `created_at` (datetime), `updated_at` (datetime, optional), `is_edited` (bool), `reactions` (ReactionSummary, optional)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/custom_field.py`
- **Purpose**: Custom field definition and value schemas with select option support and validation.
- `SelectOption` — option for select/multi_select fields
  - Fields: `id` (str, auto UUID), `label` (str, min 1 / max 100), `color` (str, min 4 / max 7)
- `CustomFieldDefinitionCreate` — create custom field definition
  - Fields: `name` (str, required, min 1 / max 200), `field_type` (Literal["text","number","select","multi_select","date","checkbox","url","person"], required), `description` (str, optional), `options` (list[SelectOption], optional), `is_required` (bool, default False)
  - Validators: `validate_options` (model_validator, after) — requires options for select/multi_select, clears options for other types
- `CustomFieldDefinitionUpdate` — update custom field definition
  - Fields: `name` (str, optional), `description` (str, optional), `options` (list[SelectOption], optional), `is_required` (bool, optional)
- `CustomFieldDefinitionResponse` — custom field definition response
  - Fields: `id` (UUID), `board_id` (UUID), `name` (str), `field_type` (str), `description` (str, optional), `options` (list[SelectOption], optional), `is_required` (bool), `position` (float), `created_at` (datetime), `updated_at` (datetime)
- `CustomFieldReorder` — reorder custom field definitions
  - Fields: `field_ids` (list[UUID], required)
- `CustomFieldValueSet` — set a single field value on a task
  - Fields: `field_definition_id` (UUID, required), `value_text` (str, optional), `value_number` (float, optional), `value_json` (Any, optional), `value_date` (datetime, optional)
- `BulkFieldValueSet` — set multiple field values at once
  - Fields: `values` (list[CustomFieldValueSet], required)
- `CustomFieldValueResponse` — custom field value response
  - Fields: `id` (UUID), `field_definition_id` (UUID), `value_text` (str, optional), `value_number` (float, optional), `value_json` (Any, optional), `value_date` (datetime, optional), `created_at` (datetime), `updated_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/task.py`
- **Purpose**: Task CRUD, move, reorder, bulk ops, and dashboard schemas with multi-assignee/watcher, cover, checklist progress, custom fields, and reaction support.
- `TaskCreate` — create task
  - Fields: `title` (str, required, min 1 / max 500), `description` (str | dict, optional), `status_id` (UUID, optional), `priority` (Literal["none","low","medium","high","urgent"], default "none"), `assignee_user_ids` (list[UUID], default []), `assignee_agent_ids` (list[UUID], default []), `agent_creator_id` (UUID, optional), `label_ids` (list[UUID], default []), `watcher_user_ids` (list[UUID], default []), `watcher_agent_ids` (list[UUID], default []), `due_date` (datetime, optional), `parent_id` (UUID, optional), `cover_type` (Literal["image","color","gradient"], optional), `cover_value` (str, optional), `cover_size` (Literal["full","half"], optional)
- `TaskUpdate` — update task
  - Fields: `title` (str, optional), `description` (str | dict, optional), `status_id` (UUID, optional), `priority` (Literal[...], optional), `assignee_user_ids` (list[UUID], optional), `assignee_agent_ids` (list[UUID], optional), `label_ids` (list[UUID], optional), `watcher_user_ids` (list[UUID], optional), `watcher_agent_ids` (list[UUID], optional), `due_date` (datetime, optional), `cover_type` (Literal["image","color","gradient"], optional), `cover_value` (str, optional), `cover_size` (Literal["full","half"], optional)
- `AssigneeBrief` — nested assignee reference (user or agent)
  - Fields: `id` (UUID), `user` (UserBrief, optional), `agent` (AgentBrief, optional)
- `WatcherBrief` — nested watcher reference (user or agent)
  - Fields: `id` (UUID), `user` (UserBrief, optional), `agent` (AgentBrief, optional)
- `TaskResponse` — full task response
  - Fields: `id` (UUID), `project_id` (UUID), `board_id` (UUID), `title` (str), `description` (dict, optional), `description_text` (str, optional), `status` (StatusResponse), `priority` (str), `assignees` (list[AssigneeBrief], default []), `creator` (UserBrief), `agent_creator` (AgentBrief, optional), `labels` (list[LabelResponse]), `attachments` (list[AttachmentResponse], default []), `watchers` (list[WatcherBrief], default []), `due_date` (datetime, optional), `position` (float), `parent_id` (UUID, optional), `cover_type` (str, optional), `cover_value` (str, optional), `cover_size` (str, optional), `cover_image_url` (str, optional), `comments_count` (int, default 0), `checklist_progress` (ChecklistProgress, default empty), `custom_field_values` (list[CustomFieldValueResponse], default []), `reactions` (ReactionSummary, optional), `created_at` (datetime), `updated_at` (datetime, optional), `completed_at` (datetime, optional)
  - Validators: `resolve_checklist_progress` (model_validator, before) — computes total/completed from checklists; `resolve_cover_image_url` (model_validator, before) — generates download URL for image covers; `resolve_labels` (model_validator, before) — converts TaskLabel join objects to Label objects for serialization
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

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/agent.py`
- **Purpose**: Agent CRUD and brief reference schemas.
- `AgentCreate` — create agent
  - Fields: `name` (str, required, min_length=1, max_length=100), `color` (str, required, min_length=4, max_length=7)
- `AgentUpdate` — update agent
  - Fields: `name` (str, optional), `color` (str, optional), `is_active` (bool, optional)
- `AgentBrief` — minimal agent reference (used in nested responses)
  - Fields: `id` (UUID), `name` (str), `color` (str)
- `AgentResponse` — full agent response (extends AgentBrief)
  - Fields: inherits AgentBrief + `is_active` (bool), `created_at` (datetime), `updated_at` (datetime, optional)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/attachment.py`
- **Purpose**: Attachment response schema with computed download URL.
- `AttachmentResponse` — attachment response
  - Fields: `id` (UUID), `filename` (str), `file_size` (int), `mime_type` (str), `download_url` (str, default ""), `user` (UserBrief), `created_at` (datetime)
  - Validators: `build_download_url` (model_validator, before) — generates `/api/v1/attachments/{id}/download` URL

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
- **Purpose**: Activity log response schema with agent support.
- `ActivityLogResponse` — activity entry response
  - Fields: `id` (UUID), `action` (str), `entity_type` (str), `changes` (dict), `user` (UserBrief), `agent` (AgentBrief, optional), `task_id` (UUID, optional), `created_at` (datetime)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/notification.py`
- **Purpose**: Notification response, bulk-read, and preference schemas.
- `NotificationResponse` — notification response
  - Fields: `id` (UUID), `type` (str), `title` (str), `message` (str), `is_read` (bool), `data` (dict[str, Any], optional), `project_id` (UUID, optional), `created_at` (datetime)
- `NotificationMarkRead` — mark notifications as read
  - Fields: `notification_ids` (list[UUID], optional), `mark_all` (bool, default False)
- `NotificationPreferences` — user notification preference settings
  - Fields: `task_assigned` (bool, True), `task_updated` (bool, True), `task_moved` (bool, True), `task_deleted` (bool, True), `task_comment` (bool, True), `task_reaction` (bool, True), `mentioned` (bool, True), `self_notifications` (bool, True), `desktop_enabled` (bool, False), `muted_projects` (list[str], []), `email_enabled` (bool, False), `email_digest` (str, "off")

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/reaction.py`
- **Purpose**: Reaction create, toggle, and summary schemas for emoji reactions on tasks/comments.
- `ReactionCreate` — create reaction
  - Fields: `emoji` (str, required, min 1 / max 32), `agent_id` (UUID, optional)
- `ReactionToggle` — toggle reaction on/off
  - Fields: `emoji` (str, required, min 1 / max 32), `agent_id` (UUID, optional)
- `ReactorBrief` — minimal reactor reference (user or agent)
  - Fields: `user` (UserBrief, optional), `agent` (AgentBrief, optional)
- `ReactionGroup` — grouped reactions by emoji
  - Fields: `emoji` (str), `count` (int), `reacted_by_me` (bool, default False), `reactors` (list[ReactorBrief], default [])
- `ReactionSummary` — aggregated reaction summary
  - Fields: `groups` (list[ReactionGroup], default []), `total` (int, default 0)
- `ToggleResult` — result of a reaction toggle operation
  - Fields: `action` (str — "added" | "removed"), `emoji` (str), `summary` (ReactionSummary)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/schemas/webhook.py`
- **Purpose**: Webhook CRUD schemas.
- `WebhookCreate` — create webhook
  - Fields: `url` (HttpUrl, required), `events` (list[str], required), `secret` (str, optional)
- `WebhookUpdate` — update webhook
  - Fields: `url` (HttpUrl, optional), `events` (list[str], optional), `is_active` (bool, optional)
- `WebhookResponse` — webhook response
  - Fields: `id` (UUID), `url` (str), `events` (list[str]), `is_active` (bool), `created_at` (datetime)
