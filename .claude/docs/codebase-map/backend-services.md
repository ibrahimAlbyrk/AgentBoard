# Backend Services & CRUD — Codebase Map

## CRUD Layer

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/__init__.py`
- **Purpose**: Re-exports all CRUD singletons and defines `__all__`
- Exports: `crud_user`, `crud_agent`, `crud_checklist`, `crud_checklist_item`, `crud_api_key`, `crud_board`, `crud_board_member`, `crud_project`, `crud_project_member`, `crud_status`, `crud_label`, `crud_task`, `crud_comment`, `crud_activity_log`, `crud_attachment`, `crud_notification`, `crud_reaction`, `crud_webhook`, `crud_custom_field_definition`, `crud_custom_field_value`

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/base.py`
- **Purpose**: Generic async CRUD base class parameterized by model and schema types
- `CRUDBase[ModelType, CreateSchemaType, UpdateSchemaType]` (extends `Generic`) — reusable DB operations for any SQLAlchemy model
  - `get(db, id)` — fetch single record by UUID
  - `get_multi(db, skip, limit, filters)` — fetch paginated list with optional filters
  - `create(db, obj_in)` — insert new record from Pydantic schema
  - `update(db, db_obj, obj_in)` — patch record with dict or schema
  - `remove(db, id)` — delete record by UUID
  - `count(db, filters)` — count records with optional filters

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/user.py`
- **Purpose**: User CRUD with authentication and password hashing
- `CRUDUser` (extends `CRUDBase[User, UserCreate, UserUpdate]`) — user-specific DB operations
  - `get_by_email(db, email)` — lookup user by email
  - `get_by_username(db, username)` — lookup user by username
  - `authenticate(db, email, password)` — verify credentials, return user or None
  - `create(db, obj_in)` — override: hashes password before insert

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/project.py`
- **Purpose**: Project CRUD with eager-loading and user-scoped queries
- `CRUDProject` (extends `CRUDBase[Project, ProjectCreate, ProjectUpdate]`) — project DB operations
  - `get(db, id)` — override: eager-loads members, boards (with members/tasks/statuses), labels, agents, tasks
  - `update(db, db_obj, obj_in)` — override: re-fetches with eager-loads after update
  - `get_multi_by_user(db, user_id, include_archived)` — projects where user is owner or member, eager-loads owner/members/tasks
  - `get_by_slug(db, slug)` — lookup project by URL slug

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/task.py`
- **Purpose**: Task CRUD with relation loading, filtering, and aggregate queries
- `_task_load_options` — shared eager-load tuple: status, creator, agent_creator, assignees (user+agent), labels, attachments (user), watchers (user+agent), checklists (items+assignee), custom_field_values
- `CRUDTask` (extends `CRUDBase[Task, TaskCreate, TaskUpdate]`) — task DB operations
  - `get_with_relations(db, task_id)` — fetch task with all relations via `_task_load_options`
  - `get_multi_by_board(db, board_id, status_id, priority, assignee_id, search, skip, limit)` — filtered board tasks ordered by position, searches title and description_text
  - `get_max_position(db, status_id)` — highest position value in a status column
  - `get_children(db, parent_id)` — fetch subtasks of a parent
  - `bulk_update(db, task_ids, updates)` — apply same updates to multiple tasks
  - `count_by_status(db, project_id)` — task count grouped by status UUID
  - `get_assigned_to_user(db, user_id, project_ids, limit, agent_id)` — incomplete tasks assigned to user/agent across projects, joins Status to exclude terminal, includes comments_count subquery, ordered by due_date
  - `count_by_priority(db, project_id)` — task count grouped by priority string

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/checklist.py`
- **Purpose**: Checklist CRUD with task-scoped queries and item eager-loading
- `CRUDChecklist` (extends `CRUDBase[Checklist, ChecklistCreate, ChecklistUpdate]`) — checklist DB operations
  - `get_with_items(db, checklist_id)` — fetch checklist with items and item assignees
  - `get_multi_by_task(db, task_id)` — all checklists for a task, ordered by position, with items
  - `get_max_position(db, task_id)` — highest position value among task checklists

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/checklist_item.py`
- **Purpose**: Checklist item CRUD with position queries
- `CRUDChecklistItem` (extends `CRUDBase[ChecklistItem, ChecklistItemCreate, ChecklistItemUpdate]`) — checklist item DB operations
  - `get_max_position(db, checklist_id)` — highest position value in a checklist

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/custom_field.py`
- **Purpose**: Custom field definition and value CRUD with board/task-scoped queries
- `CRUDCustomFieldDefinition` (extends `CRUDBase[CustomFieldDefinition, CustomFieldDefinitionCreate, CustomFieldDefinitionUpdate]`) — field definition DB operations
  - `get_multi_by_board(db, board_id)` — all definitions for a board, ordered by position
  - `get_max_position(db, board_id)` — highest position value among board field definitions
  - `get_by_name(db, board_id, name)` — lookup definition by board and name
- `CRUDCustomFieldValue` (extends `CRUDBase[CustomFieldValue, CustomFieldValueResponse, CustomFieldValueResponse]`) — field value DB operations
  - `get_by_task(db, task_id)` — all custom field values for a task
  - `get_by_task_and_field(db, task_id, field_definition_id)` — single value by task and field
  - `delete_by_task_and_field(db, task_id, field_definition_id)` — remove value if exists

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/reaction.py`
- **Purpose**: Reaction CRUD with entity-scoped queries, summary aggregation, and batch operations
- `CRUDReaction` (extends `CRUDBase[Reaction, ReactionCreate, ReactionCreate]`) — reaction DB operations
  - `find_reaction(db, entity_type, entity_id, emoji, user_id, agent_id)` — lookup specific reaction by entity+emoji+actor
  - `get_by_entity(db, entity_type, entity_id)` — all reactions for an entity with user/agent, ordered by created_at
  - `get_summary(db, entity_type, entity_id, current_user_id)` — grouped emoji summary with reactor details and reacted_by_me flag
  - `get_summaries_batch(db, entity_type, entity_ids, current_user_id)` — batch summaries for multiple entities in one query
  - `delete_by_entity(db, entity_type, entity_id)` — delete all reactions for an entity
  - `count_emoji_for_entity(db, entity_type, entity_id, emoji)` — count of specific emoji on entity
  - `get_vote_counts(db, task_ids)` — thumbs-up count per task for multiple tasks
  - `_build_summary(reactions, current_user_id)` — static: build ReactionSummary from reaction list

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/status.py`
- **Purpose**: Status column CRUD with board-scoped queries
- `CRUDStatus` (extends `CRUDBase[Status, StatusCreate, StatusUpdate]`) — status DB operations
  - `get_multi_by_board(db, board_id)` — all statuses for a board, ordered by position
  - `get_default_by_board(db, board_id)` — fetch the default status for a board
  - `get_max_position_by_board(db, board_id)` — highest position value among board statuses

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/label.py`
- **Purpose**: Label CRUD with project-scoped listing
- `CRUDLabel` (extends `CRUDBase[Label, LabelCreate, LabelUpdate]`) — label DB operations
  - `get_multi_by_project(db, project_id)` — all labels for a project

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/comment.py`
- **Purpose**: Comment CRUD with task-scoped listing, user/agent eager-loading, and attachments
- `CRUDComment` (extends `CRUDBase[Comment, CommentCreate, CommentUpdate]`) — comment DB operations
  - `get_multi_by_task(db, task_id, skip, limit)` — paginated comments with user, agent_creator, and attachments (with user), ordered by created_at, uses `.unique()` for collection dedup

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/api_key.py`
- **Purpose**: API key CRUD with hash lookup, name uniqueness, and usage tracking
- `CRUDAPIKey` (extends `CRUDBase[APIKey, APIKeyCreate, APIKeyResponse]`) — API key DB operations
  - `get_by_key_hash(db, key_hash)` — lookup key by SHA256 hash
  - `get_multi_by_user(db, user_id)` — all active API keys for a user
  - `get_by_name_and_user(db, name, user_id)` — lookup active key by name and user
  - `update_last_used(db, api_key)` — stamp last_used_at timestamp

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/project_member.py`
- **Purpose**: Project membership CRUD with lookup and membership check
- `CRUDProjectMember` (extends `CRUDBase[ProjectMember, ProjectMemberCreate, ProjectMemberUpdate]`) — membership DB operations
  - `get_by_project_and_user(db, project_id, user_id)` — find specific membership record
  - `get_multi_by_project(db, project_id)` — all members with eager-loaded user
  - `is_member(db, project_id, user_id)` — boolean membership check

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/activity_log.py`
- **Purpose**: Activity log CRUD with project/task scoped queries, agent eager-loading, and convenience log method
- `CRUDActivityLog` (extends `CRUDBase[ActivityLog, ActivityLogResponse, ActivityLogResponse]`) — activity log DB operations
  - `get_multi_by_project(db, project_id, action, entity_type, skip, limit)` — filtered project activity with agent, newest first
  - `get_multi_by_task(db, task_id)` — all activity for a task with agent, newest first
  - `log(db, project_id, task_id, user_id, action, entity_type, changes, agent_id)` — create activity log entry directly, supports optional agent_id

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/notification.py`
- **Purpose**: Notification CRUD with read/unread management and bulk operations
- `CRUDNotification` (extends `CRUDBase[Notification, NotificationResponse, NotificationResponse]`) — notification DB operations
  - `get_by_user(db, user_id, skip, limit)` — paginated user notifications, newest first
  - `get_unread_by_user(db, user_id)` — all unread notifications for a user
  - `count_unread(db, user_id)` — count of unread notifications
  - `mark_read(db, notification_id)` — mark single notification as read
  - `mark_all_read(db, user_id)` — mark all user notifications as read

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/webhook.py`
- **Purpose**: Webhook CRUD with project-scoped and event-filtered queries
- `CRUDWebhook` (extends `CRUDBase[Webhook, WebhookCreate, WebhookUpdate]`) — webhook DB operations
  - `get_multi_by_project(db, project_id)` — all webhooks for a project
  - `get_active_for_event(db, project_id, event_type)` — active webhooks matching event type

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/board.py`
- **Purpose**: Board CRUD with eager-loading and project-scoped queries
- `CRUDBoard` (extends `CRUDBase[Board, BoardCreate, BoardUpdate]`) — board DB operations
  - `get(db, id)` — override: eager-loads members, statuses, tasks
  - `get_multi_by_project(db, project_id)` — all boards with relations, ordered by position
  - `get_by_slug(db, project_id, slug)` — lookup board by project + slug
  - `get_max_position(db, project_id)` — highest board position in project

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/board_member.py`
- **Purpose**: Board membership CRUD with lookup and membership check
- `CRUDBoardMember` (extends `CRUDBase[BoardMember, BoardMemberCreate, BoardMemberUpdate]`) — board membership DB operations
  - `get_by_board_and_user(db, board_id, user_id)` — find specific board membership
  - `get_multi_by_board(db, board_id)` — all board members with eager-loaded user
  - `is_member(db, board_id, user_id)` — boolean board membership check

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/agent.py`
- **Purpose**: Agent CRUD with project-scoped listing and name lookup
- `CRUDAgent` (extends `CRUDBase[Agent, AgentCreate, AgentUpdate]`) — agent DB operations
  - `get_multi_by_project(db, project_id, include_inactive)` — agents for a project, optionally including inactive, ordered by name
  - `get_by_name(db, project_id, name)` — lookup agent by project and name

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/crud/attachment.py`
- **Purpose**: Attachment CRUD with task/comment-scoped queries and unlinked lookup
- `CRUDAttachment` (extends `CRUDBase[Attachment, AttachmentResponse, AttachmentResponse]`) — attachment DB operations
  - `get_by_task(db, task_id)` — task-level attachments (excludes comment attachments), with user, ordered by created_at
  - `get_by_comment(db, comment_id)` — attachments for a comment, with user, ordered by created_at
  - `get_unlinked_by_ids(db, ids, task_id, user_id)` — fetch attachments by IDs that belong to task/user and have no comment link

---

## Service Layer

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/project_service.py`
- **Purpose**: Project creation orchestration with slug generation, owner membership, and optional default board
- `ProjectService` — static methods for project business logic
  - `create_project(db, user_id, project_in)` — creates project, generates slug, adds owner as admin member, optionally creates default board via BoardService

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/task_service.py`
- **Purpose**: Task lifecycle orchestration with position management, content normalization, cover validation, assignee/watcher/label syncing, activity logging, mention notifications, and notification dispatch
- `GRADIENT_PRESETS` — dict of named gradient CSS values for task covers
- `FIELD_LABELS` — dict mapping field names to human-readable labels for change descriptions
- `_describe_changes(changes, label_changed)` — format changes dict into human-readable string
- `_get_assignee_user_ids(task)` — extract user IDs from task assignees
- `_sync_assignees(db, task_id, user_ids, agent_ids)` — replace all assignees on a task (delete + re-insert)
- `_sync_watchers(db, task_id, user_ids, agent_ids)` — replace all watchers on a task (delete + re-insert)
- `_notify_watchers(db, task, actor_id, type, title, message)` — notify user-watchers excluding assignees to avoid duplicates
- `_notify_assignees(db, task, actor_id, type, title, message)` — notify all user-assignees
- `TaskService` — static methods for task business logic
  - `create_task(db, project_id, board_id, creator_id, task_in)` — resolves default status, calculates end position, validates agent IDs, normalizes description to Tiptap JSON, syncs assignees/watchers/labels, logs "created" activity, notifies assignees, watchers, and @mentioned users
  - `update_task(db, task, user_id, task_in)` — diffs changed fields, validates covers (image/color/gradient), normalizes description, syncs labels/assignees/watchers, validates agent assignees, logs "updated" activity, notifies assignees (assigned or updated), watchers, and newly @mentioned users, commits and reloads relations
  - `move_task(db, task, user_id, new_status_id, position)` — moves task between columns, sets/clears completed_at for terminal statuses, logs "moved" activity, notifies assignees and watchers
  - `bulk_update(db, project_id, user_id, task_ids, updates)` — apply updates to multiple tasks, logs activity per task
  - `bulk_move(db, project_id, user_id, task_ids, status_id)` — move multiple tasks to status with sequential positions, logs activity per task

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/checklist_service.py`
- **Purpose**: Checklist and checklist item lifecycle with position management, limits enforcement, and activity logging
- `POSITION_GAP = 1024.0` — constant gap between positions
- `MAX_CHECKLISTS_PER_TASK = 10` — max checklists allowed per task
- `MAX_ITEMS_PER_CHECKLIST = 50` — max items allowed per checklist
- `ChecklistService` — static methods for checklist business logic
  - `create_checklist(db, task, user_id, body)` — enforces max limit, calculates position, creates checklist, logs activity
  - `update_checklist(db, checklist, user_id, body)` — updates checklist title
  - `delete_checklist(db, checklist, user_id)` — deletes checklist, logs activity
  - `create_item(db, checklist, user_id, body)` — enforces max limit, calculates position, creates item with assignee/due_date
  - `update_item(db, item, user_id, body)` — updates item fields, sets completed_at on completion toggle
  - `toggle_item(db, item, user_id)` — toggles is_completed and sets/clears completed_at

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/content_service.py`
- **Purpose**: Tiptap rich text processing: normalization, plain-text extraction, and mention extraction
- `normalize_content(value)` — convert string/dict to Tiptap JSON doc, returns None for empty
- `extract_plain_text(doc)` — recursively extract text from Tiptap JSON nodes
- `extract_mentions(doc, entity_types)` — extract mention nodes, optionally filtered by entity_type

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/custom_field_service.py`
- **Purpose**: Custom field definition CRUD orchestration and value validation with type-specific rules
- `CustomFieldService` — static methods for custom field business logic
  - `validate_value(definition, value_set)` — validates value against field type (text, number, select, multi_select, date, checkbox, url, person)
  - `create_definition(db, board_id, field_in)` — creates field definition with auto-positioned ordering
  - `update_definition(db, definition, field_in)` — patches definition fields including options serialization
  - `set_field_value(db, task_id, definition, value_set)` — validates and upserts a custom field value for a task
  - `bulk_set_values(db, task_id, board_id, values)` — set multiple field values, validates each definition belongs to board

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/reaction_service.py`
- **Purpose**: Reaction toggle orchestration with notification dispatch for task and comment reactions
- `ReactionService` — static methods for reaction business logic
  - `toggle_reaction(db, entity_type, entity_id, emoji, user_id, agent_id)` — adds or removes reaction (idempotent toggle), returns action + updated summary
  - `get_summary(db, entity_type, entity_id, current_user_id)` — delegates to crud_reaction.get_summary
  - `notify_reaction(db, entity_type, entity_id, emoji, actor_id, project_id, board_id)` — sends notification to task creator or comment author, skips self-reactions
  - `delete_reactions_for_entity(db, entity_type, entity_id)` — bulk delete all reactions for an entity

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/position_service.py`
- **Purpose**: Task position calculation for drag-and-drop ordering within status columns
- `PositionService` — static methods for position arithmetic
  - `POSITION_GAP = 1024.0` — constant gap between positions
  - `calculate_position(before, after)` — midpoint between neighbors, or offset from one side
  - `get_end_position(db, status_id)` — position after the last task in a column
  - `rebalance(db, status_id)` — re-space all tasks evenly in a column

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/notification_service.py`
- **Purpose**: Preference-aware notification creation, instant email dispatch via Resend, and webhook delivery with HMAC signing
- `NotificationService` — static methods for notification dispatch
  - `get_user_prefs(db, user_id)` — fetch and parse user's NotificationPreferences from JSON
  - `should_notify(db, user_id, actor_id, notification_type, project_id)` — check self-notification, per-type, and muted-project preferences
  - `create_notification(db, user_id, actor_id, project_id, type, title, message, data)` — persist notification after preference check, triggers instant email if opted in
  - `_dispatch_email(to, title, message, notification_type)` — render Jinja2 template and fire-and-forget email via Resend if configured
  - `send_webhook(url, secret, event)` — POST JSON payload with optional HMAC-SHA256 signature header
  - `notify_project_event(db, project_id, event_type, data)` — fans out event to all matching active webhooks

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/auth_service.py`
- **Purpose**: Authentication orchestration for registration, login, token refresh, and API key creation
- `AuthService` — static methods for auth flows
  - `register(db, user_in)` — validates uniqueness, creates user, returns access + refresh tokens
  - `login(db, email, password)` — authenticates, checks is_active, stamps last_login_at, returns tokens
  - `refresh_token(token)` — validates refresh token type, issues new access + refresh tokens
  - `create_api_key(db, user_id, key_in)` — generates raw key + hash, sets optional expiry, returns APIKey + raw key

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/websocket_manager.py`
- **Purpose**: In-memory WebSocket connection manager for real-time broadcasts
- `ConnectionManager` — manages WebSocket connections keyed by channel string
  - `connect(key, websocket)` — register WebSocket under a channel key
  - `disconnect(key, websocket)` — remove WebSocket, clean up empty channels
  - `_broadcast(key, message)` — send JSON to all connections on a key, prune dead sockets
  - `broadcast_to_board(project_id, board_id, message)` — broadcast scoped to `{project_id}:{board_id}`
  - `broadcast_to_project(project_id, message)` — broadcast scoped to project_id
- `manager` — module-level singleton instance

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/board_service.py`
- **Purpose**: Board creation orchestration with slug generation, owner membership, and default status columns
- `BoardService` — static methods for board business logic
  - `DEFAULT_STATUSES` — list of 5 default columns: To Do, In Progress, In Review, Testing, Complete
  - `create_board(db, project_id, user_id, board_in)` — creates board, generates slug, adds creator as admin member, optionally seeds default statuses

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/email_service.py`
- **Purpose**: Email sending via Resend API with Jinja2 HTML templates
- `email_configured()` — returns True if RESEND_API_KEY is set
- `render_notification_email(title, message, notification_type)` — renders notification.html Jinja2 template with app_name context
- `_send_email(to, subject, html_body)` — async POST to Resend API with SSL via certifi, logs success/failure
- `fire_and_forget_email(to, subject, html_body)` — schedules email send as background task on running event loop, warns if no loop

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/services/storage_service.py`
- **Purpose**: File storage abstraction with local disk implementation
- `StorageBackend` (Protocol) — interface defining save/delete/get_path methods
- `LocalStorage` — local filesystem storage backend
  - `__init__(base_dir)` — defaults to settings.UPLOAD_DIR
  - `save(file, subdir)` — write UploadFile to disk with UUID filename, return (relative_path, file_size)
  - `delete(file_path)` — remove file from disk if exists
  - `get_path(file_path)` — resolve relative path to absolute Path
- `storage` — module-level LocalStorage singleton
