# AgentBoard Technical Specification

## 1. Database Schema

### 1.1 Users Table
```sql
users {
  id: UUID PRIMARY KEY
  email: VARCHAR(255) UNIQUE NOT NULL
  username: VARCHAR(100) UNIQUE NOT NULL
  password_hash: VARCHAR(255) NOT NULL
  full_name: VARCHAR(255)
  avatar_url: VARCHAR(500)
  role: ENUM('admin', 'user', 'agent') DEFAULT 'user'
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  last_login_at: TIMESTAMP
  is_active: BOOLEAN DEFAULT true
}

INDEXES:
  - idx_users_email ON users(email)
  - idx_users_username ON users(username)
```

### 1.2 API Keys Table
```sql
api_keys {
  id: UUID PRIMARY KEY
  user_id: UUID NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
  key_hash: VARCHAR(255) UNIQUE NOT NULL
  name: VARCHAR(100) NOT NULL
  prefix: VARCHAR(20) NOT NULL -- First 8 chars for identification
  scopes: JSON -- ['projects:read', 'tasks:write', etc.]
  last_used_at: TIMESTAMP
  expires_at: TIMESTAMP
  created_at: TIMESTAMP DEFAULT NOW()
  is_active: BOOLEAN DEFAULT true
}

INDEXES:
  - idx_api_keys_user_id ON api_keys(user_id)
  - idx_api_keys_prefix ON api_keys(prefix)
  - idx_api_keys_key_hash ON api_keys(key_hash)
```

### 1.3 Projects Table
```sql
projects {
  id: UUID PRIMARY KEY
  name: VARCHAR(255) NOT NULL
  description: TEXT
  slug: VARCHAR(255) UNIQUE NOT NULL
  owner_id: UUID NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
  icon: VARCHAR(50) -- emoji or icon name
  color: VARCHAR(7) -- hex color
  is_archived: BOOLEAN DEFAULT false
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
}

INDEXES:
  - idx_projects_owner_id ON projects(owner_id)
  - idx_projects_slug ON projects(slug)
  - idx_projects_archived ON projects(is_archived)
```

### 1.4 Project Members Table
```sql
project_members {
  id: UUID PRIMARY KEY
  project_id: UUID NOT NULL FOREIGN KEY REFERENCES projects(id) ON DELETE CASCADE
  user_id: UUID NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
  role: ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member'
  joined_at: TIMESTAMP DEFAULT NOW()

  UNIQUE(project_id, user_id)
}

INDEXES:
  - idx_project_members_project_id ON project_members(project_id)
  - idx_project_members_user_id ON project_members(user_id)
```

### 1.5 Statuses Table (Board Columns)
```sql
statuses {
  id: UUID PRIMARY KEY
  project_id: UUID NOT NULL FOREIGN KEY REFERENCES projects(id) ON DELETE CASCADE
  name: VARCHAR(100) NOT NULL
  slug: VARCHAR(100) NOT NULL -- to-do, in-progress, etc.
  color: VARCHAR(7) -- hex color
  position: INTEGER NOT NULL -- for ordering
  is_default: BOOLEAN DEFAULT false -- default status for new tasks
  is_terminal: BOOLEAN DEFAULT false -- indicates completion (complete, canceled)
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()

  UNIQUE(project_id, slug)
  UNIQUE(project_id, position)
}

INDEXES:
  - idx_statuses_project_id ON statuses(project_id)
  - idx_statuses_position ON statuses(project_id, position)
```

### 1.6 Labels Table
```sql
labels {
  id: UUID PRIMARY KEY
  project_id: UUID NOT NULL FOREIGN KEY REFERENCES projects(id) ON DELETE CASCADE
  name: VARCHAR(100) NOT NULL
  color: VARCHAR(7) NOT NULL -- hex color
  description: TEXT
  created_at: TIMESTAMP DEFAULT NOW()

  UNIQUE(project_id, name)
}

INDEXES:
  - idx_labels_project_id ON labels(project_id)
```

### 1.7 Tasks Table
```sql
tasks {
  id: UUID PRIMARY KEY
  project_id: UUID NOT NULL FOREIGN KEY REFERENCES projects(id) ON DELETE CASCADE
  title: VARCHAR(500) NOT NULL
  description: TEXT
  status_id: UUID NOT NULL FOREIGN KEY REFERENCES statuses(id) ON DELETE RESTRICT
  priority: ENUM('none', 'low', 'medium', 'high', 'urgent') DEFAULT 'none'
  assignee_id: UUID FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL
  creator_id: UUID NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
  due_date: TIMESTAMP
  position: FLOAT NOT NULL -- for drag-drop ordering within status
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  completed_at: TIMESTAMP
}

INDEXES:
  - idx_tasks_project_id ON tasks(project_id)
  - idx_tasks_status_id ON tasks(status_id)
  - idx_tasks_assignee_id ON tasks(assignee_id)
  - idx_tasks_creator_id ON tasks(creator_id)
  - idx_tasks_due_date ON tasks(due_date)
  - idx_tasks_position ON tasks(status_id, position)
  - idx_tasks_priority ON tasks(priority)
```

### 1.8 Task Labels Junction Table
```sql
task_labels {
  task_id: UUID NOT NULL FOREIGN KEY REFERENCES tasks(id) ON DELETE CASCADE
  label_id: UUID NOT NULL FOREIGN KEY REFERENCES labels(id) ON DELETE CASCADE
  created_at: TIMESTAMP DEFAULT NOW()

  PRIMARY KEY(task_id, label_id)
}

INDEXES:
  - idx_task_labels_task_id ON task_labels(task_id)
  - idx_task_labels_label_id ON task_labels(label_id)
```

### 1.9 Comments Table
```sql
comments {
  id: UUID PRIMARY KEY
  task_id: UUID NOT NULL FOREIGN KEY REFERENCES tasks(id) ON DELETE CASCADE
  user_id: UUID NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
  content: TEXT NOT NULL
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  is_edited: BOOLEAN DEFAULT false
}

INDEXES:
  - idx_comments_task_id ON comments(task_id, created_at)
  - idx_comments_user_id ON comments(user_id)
```

### 1.10 Activity Log Table
```sql
activity_logs {
  id: UUID PRIMARY KEY
  project_id: UUID NOT NULL FOREIGN KEY REFERENCES projects(id) ON DELETE CASCADE
  task_id: UUID FOREIGN KEY REFERENCES tasks(id) ON DELETE CASCADE
  user_id: UUID NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
  action: VARCHAR(50) NOT NULL -- 'created', 'updated', 'deleted', 'moved', etc.
  entity_type: VARCHAR(50) NOT NULL -- 'task', 'comment', 'status', etc.
  changes: JSON -- before/after values
  created_at: TIMESTAMP DEFAULT NOW()
}

INDEXES:
  - idx_activity_project_id ON activity_logs(project_id, created_at DESC)
  - idx_activity_task_id ON activity_logs(task_id, created_at DESC)
```

### 1.11 Entity Relationships Diagram

```
users (1) ──────< (N) api_keys
users (1) ──────< (N) projects [owner]
users (1) ──────< (N) project_members
projects (1) ────< (N) project_members
projects (1) ────< (N) statuses
projects (1) ────< (N) labels
projects (1) ────< (N) tasks
projects (1) ────< (N) activity_logs
statuses (1) ────< (N) tasks
users (1) ──────< (N) tasks [assignee]
users (1) ──────< (N) tasks [creator]
tasks (1) ───────< (N) comments
tasks (1) ───────< (N) task_labels
labels (1) ──────< (N) task_labels
tasks (1) ───────< (N) activity_logs
users (1) ───────< (N) activity_logs
```

## 2. REST API Specification

### 2.1 API Design Principles

#### Agent-Friendly Design
- **Consistent Response Format**: All responses follow same structure
- **Predictable Endpoints**: RESTful conventions, no surprises
- **Bulk Operations**: Support updating multiple resources in single request
- **Filtering & Search**: Rich query parameters for data retrieval
- **Idempotency**: PUT/PATCH/DELETE are idempotent
- **Rate Information**: Rate limit headers in every response

#### Standard Response Format
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-02-07T10:30:00Z",
    "request_id": "uuid"
  },
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 100,
    "total_pages": 2
  }
}
```

#### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-07T10:30:00Z",
    "request_id": "uuid"
  }
}
```

#### Standard Error Codes
```
400 BAD_REQUEST - Invalid input
401 UNAUTHORIZED - Auth required
403 FORBIDDEN - Insufficient permissions
404 NOT_FOUND - Resource not found
409 CONFLICT - Resource conflict
422 VALIDATION_ERROR - Input validation failed
429 RATE_LIMIT_EXCEEDED - Too many requests
500 INTERNAL_ERROR - Server error
```

#### Rate Limiting
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1644235200
```

- User tier: 1000 req/hour
- Agent tier: 5000 req/hour
- Admin tier: Unlimited

#### Pagination
```
Default: page=1, per_page=50
Max: per_page=100
Query params: ?page=1&per_page=50
```

#### Filtering
```
?filter[status]=in-progress
?filter[priority]=high,urgent
?filter[assignee_id]=uuid
?filter[due_date_from]=2026-02-01
?filter[due_date_to]=2026-02-28
```

#### Sorting
```
?sort=created_at          // ASC
?sort=-created_at         // DESC
?sort=priority,-created_at // Multiple
```

#### Field Selection
```
?fields=id,title,status   // Only return specified fields
```

### 2.2 Authentication Endpoints

#### POST /api/v1/auth/register
Register new user
```json
Request:
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}

Response: 201
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "full_name": "John Doe",
      "role": "user",
      "created_at": "2026-02-07T10:30:00Z"
    },
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

#### POST /api/v1/auth/login
User login
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200
{
  "success": true,
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600,
    "user": { /* user object */ }
  }
}
```

#### POST /api/v1/auth/refresh
Refresh access token
```json
Request:
{
  "refresh_token": "refresh_token"
}

Response: 200
{
  "success": true,
  "data": {
    "access_token": "new_jwt_token",
    "expires_in": 3600
  }
}
```

#### POST /api/v1/auth/logout
Logout (invalidate tokens)
```json
Response: 204
```

### 2.3 API Key Endpoints

#### GET /api/v1/api-keys
List user's API keys
```json
Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production Agent",
      "prefix": "ak_prod_",
      "scopes": ["projects:read", "tasks:write"],
      "last_used_at": "2026-02-07T09:00:00Z",
      "expires_at": "2027-02-07T00:00:00Z",
      "created_at": "2026-01-01T00:00:00Z",
      "is_active": true
    }
  ]
}
```

#### POST /api/v1/api-keys
Create new API key
```json
Request:
{
  "name": "Production Agent",
  "scopes": ["projects:read", "tasks:write", "comments:write"],
  "expires_in_days": 365
}

Response: 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Production Agent",
    "key": "ak_prod_1234567890abcdef", // Only shown once
    "prefix": "ak_prod_",
    "scopes": ["projects:read", "tasks:write"],
    "expires_at": "2027-02-07T00:00:00Z",
    "created_at": "2026-02-07T10:30:00Z"
  }
}
```

#### DELETE /api/v1/api-keys/:id
Revoke API key
```json
Response: 204
```

### 2.4 Project Endpoints

#### GET /api/v1/projects
List user's projects
```json
Query params:
  ?include_archived=false
  ?sort=-updated_at
  ?page=1&per_page=50

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Web App Redesign",
      "description": "Q1 2026 redesign project",
      "slug": "web-app-redesign",
      "owner": {
        "id": "uuid",
        "username": "johndoe",
        "full_name": "John Doe"
      },
      "icon": "🚀",
      "color": "#3B82F6",
      "is_archived": false,
      "member_count": 5,
      "task_count": 23,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-02-07T10:00:00Z"
    }
  ],
  "pagination": { /* pagination object */ }
}
```

#### GET /api/v1/projects/:id
Get project details
```json
Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Web App Redesign",
    "description": "Q1 2026 redesign project",
    "slug": "web-app-redesign",
    "owner": { /* user object */ },
    "icon": "🚀",
    "color": "#3B82F6",
    "is_archived": false,
    "members": [
      {
        "id": "uuid",
        "user": { /* user object */ },
        "role": "admin",
        "joined_at": "2026-01-01T00:00:00Z"
      }
    ],
    "statuses": [
      {
        "id": "uuid",
        "name": "To Do",
        "slug": "to-do",
        "color": "#94A3B8",
        "position": 0,
        "is_default": true,
        "task_count": 5
      }
    ],
    "labels": [ /* label objects */ ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-02-07T10:00:00Z"
  }
}
```

#### POST /api/v1/projects
Create project
```json
Request:
{
  "name": "Web App Redesign",
  "description": "Q1 2026 redesign project",
  "slug": "web-app-redesign", // optional, auto-generated if not provided
  "icon": "🚀",
  "color": "#3B82F6",
  "create_default_statuses": true // creates default status columns
}

Response: 201
{
  "success": true,
  "data": { /* project object with default statuses */ }
}
```

#### PATCH /api/v1/projects/:id
Update project
```json
Request:
{
  "name": "Web App Redesign v2",
  "description": "Updated description"
}

Response: 200
{
  "success": true,
  "data": { /* updated project object */ }
}
```

#### DELETE /api/v1/projects/:id
Delete project
```json
Response: 204
```

#### POST /api/v1/projects/:id/archive
Archive project
```json
Response: 200
{
  "success": true,
  "data": { /* project object with is_archived=true */ }
}
```

#### POST /api/v1/projects/:id/unarchive
Unarchive project
```json
Response: 200
{
  "success": true,
  "data": { /* project object with is_archived=false */ }
}
```

### 2.5 Project Members Endpoints

#### GET /api/v1/projects/:id/members
List project members
```json
Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "johndoe",
        "full_name": "John Doe",
        "avatar_url": "https://..."
      },
      "role": "admin",
      "joined_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/projects/:id/members
Add member to project
```json
Request:
{
  "user_id": "uuid",
  "role": "member"
}

Response: 201
{
  "success": true,
  "data": { /* project member object */ }
}
```

#### PATCH /api/v1/projects/:id/members/:member_id
Update member role
```json
Request:
{
  "role": "admin"
}

Response: 200
{
  "success": true,
  "data": { /* updated project member object */ }
}
```

#### DELETE /api/v1/projects/:id/members/:member_id
Remove member from project
```json
Response: 204
```

### 2.6 Status (Board Column) Endpoints

#### GET /api/v1/projects/:id/statuses
List project statuses
```json
Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "To Do",
      "slug": "to-do",
      "color": "#94A3B8",
      "position": 0,
      "is_default": true,
      "is_terminal": false,
      "task_count": 5,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/projects/:id/statuses
Create status
```json
Request:
{
  "name": "Code Review",
  "slug": "code-review", // optional
  "color": "#8B5CF6",
  "position": 3, // optional, defaults to end
  "is_default": false,
  "is_terminal": false
}

Response: 201
{
  "success": true,
  "data": { /* status object */ }
}
```

#### PATCH /api/v1/projects/:id/statuses/:status_id
Update status
```json
Request:
{
  "name": "In Review",
  "color": "#8B5CF6"
}

Response: 200
{
  "success": true,
  "data": { /* updated status object */ }
}
```

#### POST /api/v1/projects/:id/statuses/reorder
Reorder statuses
```json
Request:
{
  "status_ids": ["uuid1", "uuid2", "uuid3"] // new order
}

Response: 200
{
  "success": true,
  "data": [ /* reordered status objects */ ]
}
```

#### DELETE /api/v1/projects/:id/statuses/:status_id
Delete status
```json
Query params:
  ?move_tasks_to=uuid // required if status has tasks

Response: 204
```

### 2.7 Label Endpoints

#### GET /api/v1/projects/:id/labels
List project labels
```json
Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "bug",
      "color": "#EF4444",
      "description": "Something isn't working",
      "task_count": 12,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/projects/:id/labels
Create label
```json
Request:
{
  "name": "bug",
  "color": "#EF4444",
  "description": "Something isn't working"
}

Response: 201
{
  "success": true,
  "data": { /* label object */ }
}
```

#### PATCH /api/v1/projects/:id/labels/:label_id
Update label
```json
Request:
{
  "name": "critical-bug",
  "color": "#DC2626"
}

Response: 200
{
  "success": true,
  "data": { /* updated label object */ }
}
```

#### DELETE /api/v1/projects/:id/labels/:label_id
Delete label
```json
Response: 204
```

### 2.8 Task Endpoints

#### GET /api/v1/projects/:id/tasks
List project tasks
```json
Query params:
  ?filter[status]=in-progress
  ?filter[status_id]=uuid
  ?filter[priority]=high,urgent
  ?filter[assignee_id]=uuid
  ?filter[creator_id]=uuid
  ?filter[label]=bug,feature
  ?filter[due_date_from]=2026-02-01
  ?filter[due_date_to]=2026-02-28
  ?filter[completed]=false
  ?search=search text in title/description
  ?sort=-priority,created_at
  ?include=assignee,creator,labels,comments_count
  ?page=1&per_page=50

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Fix login bug",
      "description": "Users can't login after password reset",
      "status": {
        "id": "uuid",
        "name": "In Progress",
        "slug": "in-progress",
        "color": "#3B82F6"
      },
      "priority": "high",
      "assignee": {
        "id": "uuid",
        "username": "johndoe",
        "full_name": "John Doe",
        "avatar_url": "https://..."
      },
      "creator": { /* user object */ },
      "labels": [
        {
          "id": "uuid",
          "name": "bug",
          "color": "#EF4444"
        }
      ],
      "due_date": "2026-02-10T00:00:00Z",
      "position": 1.5,
      "comments_count": 3,
      "created_at": "2026-02-05T10:00:00Z",
      "updated_at": "2026-02-07T10:30:00Z",
      "completed_at": null
    }
  ],
  "pagination": { /* pagination object */ }
}
```

#### GET /api/v1/projects/:id/tasks/:task_id
Get task details
```json
Query params:
  ?include=assignee,creator,labels,comments

Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Fix login bug",
    "description": "Users can't login after password reset",
    "status": { /* status object */ },
    "priority": "high",
    "assignee": { /* user object */ },
    "creator": { /* user object */ },
    "labels": [ /* label objects */ ],
    "due_date": "2026-02-10T00:00:00Z",
    "position": 1.5,
    "created_at": "2026-02-05T10:00:00Z",
    "updated_at": "2026-02-07T10:30:00Z",
    "completed_at": null
  }
}
```

#### POST /api/v1/projects/:id/tasks
Create task
```json
Request:
{
  "title": "Fix login bug",
  "description": "Users can't login after password reset",
  "status_id": "uuid", // optional, uses default if not provided
  "priority": "high",
  "assignee_id": "uuid",
  "label_ids": ["uuid1", "uuid2"],
  "due_date": "2026-02-10T00:00:00Z"
}

Response: 201
{
  "success": true,
  "data": { /* task object */ }
}
```

#### PATCH /api/v1/projects/:id/tasks/:task_id
Update task
```json
Request:
{
  "title": "Fix critical login bug",
  "priority": "urgent",
  "assignee_id": "uuid",
  "label_ids": ["uuid1", "uuid2"], // replaces all labels
  "due_date": "2026-02-09T00:00:00Z"
}

Response: 200
{
  "success": true,
  "data": { /* updated task object */ }
}
```

#### DELETE /api/v1/projects/:id/tasks/:task_id
Delete task
```json
Response: 204
```

#### POST /api/v1/projects/:id/tasks/:task_id/move
Move task to different status (with position)
```json
Request:
{
  "status_id": "uuid",
  "position": 2.5 // position in new status
}

Response: 200
{
  "success": true,
  "data": { /* updated task object */ }
}
```

#### POST /api/v1/projects/:id/tasks/:task_id/reorder
Reorder task within same status
```json
Request:
{
  "position": 1.5 // new position
}

Response: 200
{
  "success": true,
  "data": { /* updated task object */ }
}
```

#### POST /api/v1/projects/:id/tasks/bulk-update
Bulk update tasks
```json
Request:
{
  "task_ids": ["uuid1", "uuid2", "uuid3"],
  "updates": {
    "status_id": "uuid",
    "priority": "high",
    "assignee_id": "uuid"
  }
}

Response: 200
{
  "success": true,
  "data": {
    "updated_count": 3,
    "tasks": [ /* updated task objects */ ]
  }
}
```

#### POST /api/v1/projects/:id/tasks/bulk-move
Bulk move tasks to different status
```json
Request:
{
  "task_ids": ["uuid1", "uuid2", "uuid3"],
  "status_id": "uuid"
}

Response: 200
{
  "success": true,
  "data": {
    "moved_count": 3,
    "tasks": [ /* updated task objects */ ]
  }
}
```

#### POST /api/v1/projects/:id/tasks/bulk-delete
Bulk delete tasks
```json
Request:
{
  "task_ids": ["uuid1", "uuid2", "uuid3"]
}

Response: 200
{
  "success": true,
  "data": {
    "deleted_count": 3
  }
}
```

### 2.9 Comment Endpoints

#### GET /api/v1/projects/:id/tasks/:task_id/comments
List task comments
```json
Query params:
  ?sort=-created_at
  ?page=1&per_page=50

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "I'm working on this now",
      "user": {
        "id": "uuid",
        "username": "johndoe",
        "full_name": "John Doe",
        "avatar_url": "https://..."
      },
      "created_at": "2026-02-07T10:00:00Z",
      "updated_at": "2026-02-07T10:00:00Z",
      "is_edited": false
    }
  ],
  "pagination": { /* pagination object */ }
}
```

#### POST /api/v1/projects/:id/tasks/:task_id/comments
Create comment
```json
Request:
{
  "content": "I'm working on this now"
}

Response: 201
{
  "success": true,
  "data": { /* comment object */ }
}
```

#### PATCH /api/v1/projects/:id/tasks/:task_id/comments/:comment_id
Update comment
```json
Request:
{
  "content": "Updated comment content"
}

Response: 200
{
  "success": true,
  "data": { /* updated comment object with is_edited=true */ }
}
```

#### DELETE /api/v1/projects/:id/tasks/:task_id/comments/:comment_id
Delete comment
```json
Response: 204
```

### 2.10 Activity Log Endpoints

#### GET /api/v1/projects/:id/activity
Get project activity log
```json
Query params:
  ?filter[action]=created,updated,deleted
  ?filter[entity_type]=task,comment
  ?filter[user_id]=uuid
  ?filter[date_from]=2026-02-01
  ?filter[date_to]=2026-02-07
  ?page=1&per_page=50

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "updated",
      "entity_type": "task",
      "user": { /* user object */ },
      "task": { /* minimal task object */ },
      "changes": {
        "status": {
          "from": "to-do",
          "to": "in-progress"
        },
        "priority": {
          "from": "medium",
          "to": "high"
        }
      },
      "created_at": "2026-02-07T10:30:00Z"
    }
  ],
  "pagination": { /* pagination object */ }
}
```

#### GET /api/v1/projects/:id/tasks/:task_id/activity
Get task activity log
```json
Response: 200
{
  "success": true,
  "data": [ /* activity objects */ ]
}
```

### 2.11 Search Endpoints

#### GET /api/v1/search
Global search across user's projects
```json
Query params:
  ?q=search query
  ?type=task,project,comment // entity types to search
  ?project_id=uuid // limit to specific project
  ?page=1&per_page=50

Response: 200
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Fix login bug",
        "project": { /* minimal project object */ },
        "match_field": "title",
        "highlight": "Fix <mark>login</mark> bug"
      }
    ],
    "projects": [ /* project objects */ ],
    "comments": [ /* comment objects */ ]
  },
  "meta": {
    "total_results": 15,
    "query": "login"
  }
}
```

### 2.12 User Endpoints

#### GET /api/v1/users/me
Get current user profile
```json
Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "avatar_url": "https://...",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z",
    "last_login_at": "2026-02-07T09:00:00Z"
  }
}
```

#### PATCH /api/v1/users/me
Update current user profile
```json
Request:
{
  "full_name": "John Smith",
  "avatar_url": "https://..."
}

Response: 200
{
  "success": true,
  "data": { /* updated user object */ }
}
```

#### GET /api/v1/users/:id
Get user by ID (public profile)
```json
Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "full_name": "John Doe",
    "avatar_url": "https://...",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 2.13 Statistics Endpoints

#### GET /api/v1/projects/:id/stats
Get project statistics
```json
Response: 200
{
  "success": true,
  "data": {
    "total_tasks": 50,
    "tasks_by_status": {
      "to-do": 15,
      "in-progress": 20,
      "in-review": 8,
      "complete": 7
    },
    "tasks_by_priority": {
      "none": 10,
      "low": 15,
      "medium": 15,
      "high": 8,
      "urgent": 2
    },
    "overdue_tasks": 3,
    "completion_rate": 0.14,
    "avg_completion_time_hours": 48.5,
    "active_members": 5
  }
}
```

## 3. WebSocket Events Specification

### 3.1 Connection
```
ws://api.example.com/v1/ws?token=jwt_token
```

### 3.2 Authentication
```json
Send on connect:
{
  "type": "authenticate",
  "token": "jwt_token or api_key"
}

Response:
{
  "type": "authenticated",
  "user_id": "uuid"
}
```

### 3.3 Subscribe to Project
```json
Send:
{
  "type": "subscribe",
  "project_id": "uuid"
}

Response:
{
  "type": "subscribed",
  "project_id": "uuid"
}
```

### 3.4 Event Types

#### task.created
```json
{
  "type": "task.created",
  "project_id": "uuid",
  "data": { /* task object */ },
  "user": { /* user who created */ },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

#### task.updated
```json
{
  "type": "task.updated",
  "project_id": "uuid",
  "data": { /* updated task object */ },
  "changes": {
    "status_id": {
      "from": "uuid1",
      "to": "uuid2"
    }
  },
  "user": { /* user who updated */ },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

#### task.deleted
```json
{
  "type": "task.deleted",
  "project_id": "uuid",
  "data": {
    "task_id": "uuid"
  },
  "user": { /* user who deleted */ },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

#### task.moved
```json
{
  "type": "task.moved",
  "project_id": "uuid",
  "data": {
    "task_id": "uuid",
    "from_status_id": "uuid1",
    "to_status_id": "uuid2",
    "position": 2.5
  },
  "user": { /* user who moved */ },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

#### comment.created
```json
{
  "type": "comment.created",
  "project_id": "uuid",
  "task_id": "uuid",
  "data": { /* comment object */ },
  "user": { /* user who commented */ },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

#### status.created / status.updated / status.deleted
```json
{
  "type": "status.created",
  "project_id": "uuid",
  "data": { /* status object */ },
  "user": { /* user who made change */ },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

#### label.created / label.updated / label.deleted
```json
{
  "type": "label.created",
  "project_id": "uuid",
  "data": { /* label object */ },
  "user": { /* user who made change */ },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

#### member.added / member.removed / member.role_changed
```json
{
  "type": "member.added",
  "project_id": "uuid",
  "data": {
    "member": { /* user object */ },
    "role": "member"
  },
  "user": { /* user who made change */ },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

### 3.5 Heartbeat
```json
Client sends every 30s:
{
  "type": "ping"
}

Server responds:
{
  "type": "pong"
}
```

## 4. Advanced Features

### 4.1 Task Position Algorithm
Use fractional indexing for drag-drop reordering:
- Tasks stored with float position (e.g., 1.0, 2.0, 3.0)
- Insert between tasks: average of neighbors (between 1.0 and 3.0 = 2.0)
- Move to top: min_position - 1
- Move to bottom: max_position + 1
- Periodically rebalance positions to avoid precision issues

### 4.2 Filtering DSL (Advanced)
```
?filter=status:in-progress AND priority:high,urgent AND assignee:@me
?filter=(status:to-do OR status:in-progress) AND due_date:<2026-02-10
```

### 4.3 Webhooks (Future)
Allow agents to register webhooks for project events:
```json
POST /api/v1/projects/:id/webhooks
{
  "url": "https://agent.example.com/webhook",
  "events": ["task.created", "task.updated"],
  "secret": "webhook_secret"
}
```

### 4.4 Batch Operations Response
```json
{
  "success": true,
  "data": {
    "successful": 8,
    "failed": 2,
    "results": [
      {
        "id": "uuid1",
        "status": "success",
        "data": { /* updated object */ }
      },
      {
        "id": "uuid2",
        "status": "error",
        "error": "Validation failed"
      }
    ]
  }
}
```

### 4.5 Field-Level Permissions (Future)
```json
{
  "role": "viewer",
  "permissions": {
    "tasks": {
      "read": true,
      "create": false,
      "update": false,
      "delete": false
    },
    "comments": {
      "read": true,
      "create": true,
      "update": ["own"],
      "delete": ["own"]
    }
  }
}
```

## 5. Implementation Notes

### 5.1 Agent-Friendly Features
1. **Consistent IDs**: Always use UUIDs, never sequential integers
2. **Idempotency Keys**: Support `Idempotency-Key` header for POST requests
3. **Bulk Operations**: All write operations have bulk equivalents
4. **Rich Filtering**: Support complex filters without custom DSL syntax
5. **Predictable Errors**: Structured error codes agents can handle programmatically
6. **Rate Limit Headers**: Always include rate limit info
7. **Versioning**: API version in URL path (/v1/)
8. **JSON Only**: No form-data, all JSON requests/responses
9. **UTC Timestamps**: All timestamps in ISO 8601 UTC format
10. **Pagination Links**: Include next/prev URLs in pagination object

### 5.2 Performance Considerations
1. **Database Indexes**: All foreign keys and frequently queried fields indexed
2. **N+1 Prevention**: Support `include` parameter to eager-load relations
3. **Caching**: Cache project/status/label lists (invalidate on write)
4. **Connection Pooling**: Reuse database connections
5. **Query Optimization**: Limit default result sets, enforce max page size
6. **WebSocket Scaling**: Use Redis pub/sub for multi-server WebSocket

### 5.3 Security
1. **API Key Scoping**: Fine-grained permission scopes
2. **Rate Limiting**: Per-user and per-IP limits
3. **Input Validation**: Strict validation on all inputs
4. **SQL Injection**: Use parameterized queries
5. **CORS**: Configurable CORS for web clients
6. **Audit Logging**: Log all write operations to activity_logs
7. **Token Expiration**: Short-lived JWT tokens, long-lived refresh tokens

### 5.4 Monitoring
Track these metrics:
- API request latency (p50, p95, p99)
- Error rates by endpoint
- Rate limit hits
- WebSocket connection count
- Database query performance
- Agent vs human traffic ratio

## 6. Example Agent Workflow

### Scenario: Agent creates task, moves it, adds comment

```bash
# 1. Authenticate
curl -X POST https://api.example.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com","password":"secret"}'
# Returns: { "data": { "access_token": "token" } }

# 2. List projects
curl https://api.example.com/v1/projects \
  -H "Authorization: Bearer token"
# Returns: { "data": [{ "id": "proj-uuid" }] }

# 3. Get project statuses
curl https://api.example.com/v1/projects/proj-uuid/statuses \
  -H "Authorization: Bearer token"
# Returns: { "data": [{ "id": "status-uuid", "slug": "to-do" }] }

# 4. Create task
curl -X POST https://api.example.com/v1/projects/proj-uuid/tasks \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Investigate API latency",
    "description": "p95 latency increased 200ms",
    "priority": "high",
    "label_ids": ["label-uuid"]
  }'
# Returns: { "data": { "id": "task-uuid", "status": { "slug": "to-do" } } }

# 5. Move task to in-progress
curl -X POST https://api.example.com/v1/projects/proj-uuid/tasks/task-uuid/move \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"status_id":"in-progress-status-uuid","position":1}'
# Returns: { "data": { "status": { "slug": "in-progress" } } }

# 6. Add comment
curl -X POST https://api.example.com/v1/projects/proj-uuid/tasks/task-uuid/comments \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"content":"Started investigation. Checking database query logs."}'
# Returns: { "data": { "id": "comment-uuid" } }

# 7. Bulk update related tasks
curl -X POST https://api.example.com/v1/projects/proj-uuid/tasks/bulk-update \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "task_ids": ["task-uuid-1", "task-uuid-2"],
    "updates": { "priority": "high" }
  }'
# Returns: { "data": { "updated_count": 2 } }
```

## 7. API Client Libraries (Recommendations)

### Python Example
```python
from agentboard import AgentBoard

client = AgentBoard(api_key="ak_prod_...")

# List projects
projects = client.projects.list()

# Create task
task = client.tasks.create(
    project_id="uuid",
    title="Fix bug",
    priority="high",
    labels=["bug"]
)

# Move task
task.move(status="in-progress")

# Add comment
task.comments.create(content="Working on this")

# Bulk operations
client.tasks.bulk_update(
    task_ids=["uuid1", "uuid2"],
    updates={"priority": "urgent"}
)
```

### JavaScript Example
```javascript
import AgentBoard from '@agentboard/sdk';

const client = new AgentBoard({ apiKey: 'ak_prod_...' });

// List projects
const projects = await client.projects.list();

// Create task
const task = await client.tasks.create({
  projectId: 'uuid',
  title: 'Fix bug',
  priority: 'high',
  labels: ['bug']
});

// Move task
await task.move({ status: 'in-progress' });

// Add comment
await task.comments.create({ content: 'Working on this' });

// WebSocket connection
client.ws.subscribe('project-uuid', (event) => {
  if (event.type === 'task.updated') {
    console.log('Task updated:', event.data);
  }
});
```

## 8. Summary

### Key Design Decisions
1. **UUID Primary Keys**: Distributed-system friendly, no sequential ID leakage
2. **Fractional Positioning**: Efficient drag-drop without reordering entire lists
3. **Flexible Status System**: Each project defines own workflow
4. **Bulk Operations**: Critical for agent efficiency
5. **Rich Filtering**: Powerful queries without complex DSL
6. **WebSocket Events**: Real-time updates for collaborative work
7. **Activity Logging**: Complete audit trail
8. **Scoped API Keys**: Fine-grained agent permissions

### Agent-First Principles Applied
- Consistent response format (predictable parsing)
- Comprehensive error codes (programmatic handling)
- Bulk endpoints (efficiency)
- Rate limit visibility (self-regulation)
- Idempotency support (retry safety)
- Field selection (bandwidth optimization)
- Include parameter (N+1 prevention)
- ISO 8601 timestamps (universal parsing)

This specification provides complete foundation for building AgentBoard with agent-friendly API that also serves human users effectively.
