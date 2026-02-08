---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
description: Indexes and maps the entire codebase into structured markdown files for instant navigation. Run once to create, re-run to incrementally update. Eliminates redundant explore agents.
model: opus
---

# Purpose

You are a **Codebase Cartographer**. Your mission is to produce a complete, structured index of every source file, class, function, and export in this project. The output is a set of focused markdown map files stored in `.claude/docs/codebase-map/` plus a master `INDEX.md`. These maps allow instant file/function lookup without re-scanning the codebase. Follow the `Workflow` precisely.

## Configuration

MAP_DIR: .claude/docs/codebase-map
INDEX_FILE: .claude/docs/codebase-map/INDEX.md
CLAUDE_MD: CLAUDE.md

## Instructions

- You are a senior software architect performing a systematic codebase audit
- Your output must be **concise, accurate, and immediately useful** — every entry must tell a developer exactly what a file/function does in one short line
- **Incremental mode**: If `INDEX.md` already exists, detect which files changed since last mapping (use `git diff --name-only` against the last map timestamp stored in INDEX.md metadata) and only re-map those files. New files get added, deleted files get removed
- **Full mode**: If `INDEX.md` does not exist, perform a complete mapping from scratch
- Maximize parallelism: spawn one Task agent per domain/layer to map files concurrently
- Each map file must stay under 300 lines to avoid context bloat
- Use this exact format for every entry — no deviations:
  ```
  ### `relative/path/to/file.ext`
  - **Purpose**: One-line description of what this file does
  - `ClassName` — what it does
  - `function_name()` — what it does
  - `CONSTANT_NAME` — what it is
  ```
- Skip `__pycache__`, `node_modules`, `.venv`, `alembic/versions/`, and `frontend/src/components/ui/` (shadcn standard library)
- Skip `__init__.py` files that ONLY contain re-exports or are empty. If an `__init__.py` has real logic (imports, `__all__`, model registration), map it
- After all agents finish, assemble `INDEX.md` with links to each map file and a quick-reference table
- Finally, ensure `CLAUDE.md` has a "Codebase Map" section referencing `INDEX.md`

## Workflow

### Step 1 — Discover ALL Source Files

**CRITICAL**: Before doing anything, use Glob to discover every source file. Do NOT rely on hardcoded lists.

Run these Glob calls in parallel:
- `backend/app/**/*.py` — captures ALL Python files in the backend
- `frontend/src/**/*.ts` — captures ALL TypeScript files
- `frontend/src/**/*.tsx` — captures ALL TSX files

Filter out:
- `frontend/src/components/ui/**` (shadcn/ui — standard library)
- `__pycache__/**`
- `alembic/versions/**`

Store the complete file list. This is your **source of truth** — every file in this list MUST be mapped.

### Step 2 — Detect Mode

Read `INDEX.md` at the `MAP_DIR` path.

**If it exists (incremental mode):**
Extract the `last_mapped` timestamp from its metadata block and run:
```bash
git log --since="<last_mapped>" --name-only --pretty=format: | sort -u
```
Intersect this with your Step 1 file list. Only files that appear in BOTH lists need re-mapping. Also check for files in Step 1 that don't appear in any existing map file (newly added files) — these must be mapped too. Check for files referenced in existing maps that no longer exist in Step 1 — these must be removed.

**If it does NOT exist (full mode):**
Map every file from Step 1.

### Step 3 — Assign Files to Domains

Categorize every file from Step 1 into exactly one of these 6 domains. Use path-based rules:

| Domain | File Pattern | Map File |
|--------|-------------|----------|
| Backend Core | `backend/app/main.py`, `backend/app/core/**`, `backend/app/middleware/**`, `backend/app/api/deps.py`, `backend/app/api/__init__.py`, `backend/app/api/v1/__init__.py` | `backend-core.md` |
| Backend Routes | `backend/app/api/v1/*.py` (EXCEPT `__init__.py`) | `backend-routes.md` |
| Backend Models | `backend/app/models/**`, `backend/app/schemas/**` | `backend-models.md` |
| Backend Services | `backend/app/crud/**`, `backend/app/services/**` | `backend-services.md` |
| Frontend Components | `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/pages/**`, `frontend/src/components/**` (EXCEPT `components/ui/`) | `frontend-components.md` |
| Frontend State | `frontend/src/hooks/**`, `frontend/src/stores/**`, `frontend/src/types/**`, `frontend/src/lib/**` | `frontend-state.md` |

**VERIFICATION**: After categorization, count total files assigned. This MUST equal the total from Step 1 (minus filtered files). If any file is unassigned, add it to the most relevant domain. Log a warning for unassigned files.

### Step 4 — Spawn Parallel Mapping Agents

Create the `MAP_DIR` directory if it doesn't exist. Then launch 6 Task agents **in parallel** using `subagent_type: "general-purpose"`.

**CRITICAL**: For each agent, provide the EXACT list of absolute file paths to read. Do NOT use glob patterns in agent prompts — list every file explicitly. In incremental mode, only include changed/new files but instruct the agent to merge with existing content by reading the existing map file first.

#### Agent 1: Backend Core & Config

Prompt:
```
You are mapping backend infrastructure files for a codebase index. Your job is to READ each file listed below completely and produce a structured markdown map.

OUTPUT FORMAT (strict — no deviations):
### `<relative_path_from_project_root>`
- **Purpose**: <one clear sentence: what this file does>
- `<ClassName>` — <what it does, max 10 words>
- `<function_name()>` — <what it does, max 10 words>

RULES:
- You MUST use the Read tool to read every file listed below. Do NOT guess or infer — only document what you actually see in the code
- Skip private/dunder methods unless they contain significant logic
- For config files, list each setting/field as a bullet
- For __init__.py files, only include if they contain real logic (model registration, __all__, etc.)
- Keep descriptions brutally concise — a senior dev should scan this in seconds
- Output ONLY the markdown map content, no commentary or headers above it

FILES TO MAP (read each one using the Read tool):
<INSERT_ABSOLUTE_PATHS_HERE>

Write the complete result to: .claude/docs/codebase-map/backend-core.md
```

#### Agent 2: Backend Routes & API

Prompt:
```
You are mapping API route files for a codebase index. Your job is to READ each file listed below completely and document every route handler.

OUTPUT FORMAT (strict):
### `<relative_path_from_project_root>`
- **Purpose**: <one sentence>
- `METHOD /full/path` → `handler_name()` — <what it does>

RULES:
- You MUST use the Read tool to read every file listed below. Do NOT guess or infer
- Document every @router decorated function with its HTTP method and FULL path (including prefix)
- Include path parameters and notable query params
- Note authentication requirements (e.g., "requires auth", "requires project membership")
- Output ONLY the markdown map content

FILES TO MAP (read each one using the Read tool):
<INSERT_ABSOLUTE_PATHS_HERE>

Write the complete result to: .claude/docs/codebase-map/backend-routes.md
```

#### Agent 3: Backend Models & Schemas

Prompt:
```
You are mapping SQLAlchemy models and Pydantic schemas for a codebase index. Your job is to READ each file listed below and document the data structures.

OUTPUT FORMAT (strict):
For models:
### `<relative_path_from_project_root>`
- **Purpose**: <one sentence>
- `ClassName` — <what it represents>
  - Key fields: `field1` (type), `field2` (type), ...
  - Relationships: `rel_name` → TargetModel

For schemas:
### `<relative_path_from_project_root>`
- **Purpose**: <one sentence>
- `SchemaName` — <Create/Update/Response for what>
  - Fields: `field1` (type, required/optional), ...

RULES:
- You MUST use the Read tool to read every file listed below. Do NOT guess or infer
- List all columns for models, all fields for schemas
- Note validators, computed properties, and hybrid properties
- For __init__.py: only include if it defines __all__ or registers models
- Output ONLY the markdown map content

FILES TO MAP (read each one using the Read tool):
<INSERT_ABSOLUTE_PATHS_HERE>

Write the complete result to: .claude/docs/codebase-map/backend-models.md
```

#### Agent 4: Backend Services & CRUD

Prompt:
```
You are mapping service and CRUD layer files for a codebase index. Your job is to READ each file listed below and document business logic functions.

OUTPUT FORMAT (strict):
### `<relative_path_from_project_root>`
- **Purpose**: <one sentence>
- `ClassName` (extends BaseClass) — <what it does>
- `method_name(params)` — <what it does, max 10 words>

RULES:
- You MUST use the Read tool to read every file listed below. Do NOT guess or infer
- For CRUD classes, note which CRUDBase they extend and any custom query methods beyond the base
- For services, document the orchestration logic and side effects (e.g., "sends notification", "broadcasts via WebSocket")
- Output ONLY the markdown map content

FILES TO MAP (read each one using the Read tool):
<INSERT_ABSOLUTE_PATHS_HERE>

Write the complete result to: .claude/docs/codebase-map/backend-services.md
```

#### Agent 5: Frontend Pages & Components

Prompt:
```
You are mapping React components for a codebase index. Your job is to READ each file listed below and document the component's role and key exports.

OUTPUT FORMAT (strict):
### `<relative_path_from_project_root>`
- **Purpose**: <one sentence>
- `ComponentName` — <what it renders/does>
- Props: `propName` (type) — <purpose>  (skip if no props)
- Key state/hooks used: useX, useY

RULES:
- You MUST use the Read tool to read every file listed below. Do NOT guess or infer
- Document the default export and any named exports
- Note which hooks and stores each component uses
- For pages, note the route path they correspond to
- For App.tsx, document the route configuration
- For main.tsx, document providers and initialization
- Output ONLY the markdown map content

FILES TO MAP (read each one using the Read tool):
<INSERT_ABSOLUTE_PATHS_HERE>

Write the complete result to: .claude/docs/codebase-map/frontend-components.md
```

#### Agent 6: Frontend Hooks, Stores & Utilities

Prompt:
```
You are mapping React hooks, Zustand stores, type definitions, and utility modules for a codebase index. Your job is to READ each file listed below and document every export.

OUTPUT FORMAT (strict):
### `<relative_path_from_project_root>`
- **Purpose**: <one sentence>
- `useHookName()` — <what it returns/does>
- `storeName` — state: `field1`, `field2`; actions: `action1()`, `action2()`
- `utilFunction()` — <what it does>
- `TypeName` — <what it represents, key fields>

RULES:
- You MUST use the Read tool to read every file listed below. Do NOT guess or infer
- For hooks: document return values, query keys, and mutations
- For stores: list state fields AND actions/selectors
- For types: list all exported interfaces/types with their key fields
- For api-client/api: document the base URL, interceptors, and all endpoint functions
- For websocket: document events and message types
- Output ONLY the markdown map content

FILES TO MAP (read each one using the Read tool):
<INSERT_ABSOLUTE_PATHS_HERE>

Write the complete result to: .claude/docs/codebase-map/frontend-state.md
```

### Step 5 — Verify Completeness

After ALL 6 agents complete, verify that every file from Step 1 appears in exactly one map file. Read each generated map file and extract all `### \`path\`` entries. Compare against Step 1 file list.

If any files are missing:
1. Log them as warnings
2. Read the missing files yourself
3. Append their entries to the most relevant map file

### Step 6 — Assemble INDEX.md

Read all 6 generated map files and create `INDEX.md`:

```markdown
# Codebase Map Index

> Auto-generated codebase index. Use `/map-codebase` to update.
> Last mapped: {YYYY-MM-DD HH:MM UTC}

## Quick Reference

| Domain | Map File | Key Contents |
|--------|----------|-------------|
| Backend Core | [backend-core.md](backend-core.md) | App entry, config, DB, auth, middleware |
| Backend Routes | [backend-routes.md](backend-routes.md) | All API endpoints with methods |
| Backend Models | [backend-models.md](backend-models.md) | ORM models, Pydantic schemas |
| Backend Services | [backend-services.md](backend-services.md) | Business logic, CRUD ops |
| Frontend Components | [frontend-components.md](frontend-components.md) | App entry, pages, layout, board, task UI |
| Frontend State | [frontend-state.md](frontend-state.md) | Hooks, stores, types, API client |

## File Count
- Backend: {N} files mapped
- Frontend: {N} files mapped
- Total: {N} files

## How to Use
- **Find a file**: Search this index or the relevant map file
- **Find a function**: Open the domain-specific map and Ctrl+F
- **Update after changes**: Run `/map-codebase`
```

### Step 7 — Update CLAUDE.md

Read `CLAUDE.md`. If it does NOT already contain a "Codebase Map" section, append this block at the end:

```markdown

## Codebase Map

Auto-indexed codebase map at `.claude/docs/codebase-map/INDEX.md`. Contains structured maps of every source file, class, function, and API endpoint. Consult these maps BEFORE exploring the codebase — they provide instant lookup:

| Map File | Contents |
|----------|----------|
| `backend-core.md` | App entry, config, database, security, middleware |
| `backend-routes.md` | All API route handlers with HTTP methods and paths |
| `backend-models.md` | SQLAlchemy models and Pydantic schemas with fields |
| `backend-services.md` | Business logic services and CRUD operations |
| `frontend-components.md` | App entry, React pages, layout, board, and task components |
| `frontend-state.md` | Hooks, Zustand stores, types, and API client |

**Usage**: When you need to find or modify code, read the relevant map file first. Run `/map-codebase` to update after structural changes.
```

If the section already exists, update only the timestamp line.

### Step 8 — Report

Print a summary:
- Mode used (full or incremental)
- Number of files mapped per domain (6 rows)
- Total files mapped
- Any files that were unassigned and where they were placed
- Any files that failed to map (with reasons)
- Path to INDEX.md

## Merge Strategy (Incremental Mode)

When in incremental mode, pass this additional instruction to each agent:

```
INCREMENTAL MODE: Read the existing map file at <path> first. Then:
1. For each changed file in your list: replace its entire `### path` section with the new mapping
2. For each NEW file in your list: append its section in alphabetical position
3. For files in the existing map that are marked as DELETED: remove their sections
4. Keep all other existing sections untouched
5. Write the complete merged result back to the same file

DELETED FILES: <list_of_deleted_file_paths_or_NONE>
```
