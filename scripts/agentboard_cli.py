#!/usr/bin/env python3
"""AgentBoard CLI — token-efficient task management for AI agents.

Config resolution (highest priority first):
    1. CLI flags (-p, -b, etc.)
    2. Environment variables (AGENTBOARD_*)
    3. Config file (~/.agentboard.json)
"""

import argparse
import json
import mimetypes
import os
import sys
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import uuid4

CONFIG_PATH = os.path.expanduser("~/.agentboard.json")


def _load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_config(cfg):
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2)


_cfg = _load_config()

API_URL = (os.environ.get("AGENTBOARD_URL") or _cfg.get("url", "http://localhost:8000")) + "/api/v1"
API_KEY = os.environ.get("AGENTBOARD_API_KEY") or _cfg.get("api_key", "")
DEFAULT_PROJECT = os.environ.get("AGENTBOARD_PROJECT") or _cfg.get("project", "")
DEFAULT_BOARD = os.environ.get("AGENTBOARD_BOARD") or _cfg.get("board", "")
DEFAULT_AGENT = os.environ.get("AGENTBOARD_AGENT") or _cfg.get("agent", "")


# ── Helpers ──────────────────────────────────────────────────────────────

def _die(msg):
    print(json.dumps({"error": msg}), file=sys.stderr)
    sys.exit(1)


def _req(method, path, data=None, params=None):
    url = f"{API_URL}{path}"
    if params:
        qs = {k: str(v) for k, v in params.items() if v is not None}
        if qs:
            url += "?" + urlencode(qs)

    body = json.dumps(data).encode() if data else None
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
    req = Request(url, data=body, headers=headers, method=method)

    try:
        with urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except HTTPError as e:
        raw = e.read().decode()
        try:
            err = json.loads(raw)
        except Exception:
            err = raw
        print(json.dumps({"error": err, "status": e.code}), file=sys.stderr)
        sys.exit(1)


def _out(data):
    print(json.dumps(data, indent=2, default=str))


def _pid(args):
    return getattr(args, "project", None) or DEFAULT_PROJECT or _die("-p/AGENTBOARD_PROJECT required")


def _bid(args):
    return getattr(args, "board", None) or DEFAULT_BOARD or _die("-b/AGENTBOARD_BOARD required")


def _split_ids(val):
    """Split comma-separated ID string into list."""
    return [v.strip() for v in val.split(",") if v.strip()] if val else []


def _add_pb(parser):
    """Add common -p/-b flags."""
    parser.add_argument("-p", "--project", help="project ID")
    parser.add_argument("-b", "--board", help="board ID")


def _add_pbt(parser):
    """Add common -p/-b/-t flags."""
    _add_pb(parser)
    parser.add_argument("-t", "--task", required=True, help="task ID")


# ── Handlers ─────────────────────────────────────────────────────────────

# Config
def config_show(args):
    cfg = _load_config()
    cfg["_path"] = CONFIG_PATH
    _out(cfg)


def config_set(args):
    global API_URL, API_KEY, DEFAULT_PROJECT, DEFAULT_BOARD
    cfg = _load_config()
    if args.api_key is not None:
        cfg["api_key"] = args.api_key
    if args.url is not None:
        cfg["url"] = args.url
    if args.project is not None:
        cfg["project"] = args.project
    if args.board is not None:
        cfg["board"] = args.board
    if args.agent is not None:
        cfg["agent"] = args.agent
    _save_config(cfg)
    _out({"saved": CONFIG_PATH, **{k: v for k, v in cfg.items() if k != "api_key"}, "api_key": "***"})


# Projects
def projects_list(args):
    _out(_req("GET", "/projects/"))


def projects_create(args):
    data = {"name": args.name}
    if args.description:
        data["description"] = args.description
    _out(_req("POST", "/projects/", data))


# Boards
def boards_list(args):
    _out(_req("GET", f"/projects/{_pid(args)}/boards/"))


def boards_create(args):
    data = {"name": args.name}
    if args.description:
        data["description"] = args.description
    _out(_req("POST", f"/projects/{_pid(args)}/boards/", data))


# Statuses
def statuses_list(args):
    _out(_req("GET", f"/projects/{_pid(args)}/boards/{_bid(args)}/statuses/"))


# Agents
def agents_list(args):
    params = {}
    if args.all:
        params["include_inactive"] = "true"
    _out(_req("GET", f"/projects/{_pid(args)}/agents/", params=params))


def agents_create(args):
    data = {"name": args.name, "color": args.color}
    _out(_req("POST", f"/projects/{_pid(args)}/agents/", data))


# My Tasks
def my_tasks(args):
    params = {}
    if args.agent_id:
        params["agent_id"] = args.agent_id
    _out(_req("GET", "/dashboard/my-tasks", params=params))


# Tasks
def tasks_list(args):
    params = {
        "status_id": getattr(args, "status", None),
        "priority": getattr(args, "priority", None),
        "assignee_id": getattr(args, "assignee", None),
        "search": getattr(args, "search", None),
        "page": getattr(args, "page", None),
        "per_page": getattr(args, "per_page", None),
    }
    _out(_req("GET", f"/projects/{_pid(args)}/boards/{_bid(args)}/tasks/", params=params))


def tasks_get(args):
    _out(_req("GET", f"/projects/{_pid(args)}/boards/{_bid(args)}/tasks/{args.task}"))


def tasks_create(args):
    data = {"title": args.title}
    if args.description:
        data["description"] = args.description
    if args.status_id:
        data["status_id"] = args.status_id
    if args.priority:
        data["priority"] = args.priority
    if args.due:
        data["due_date"] = args.due
    if args.parent:
        data["parent_id"] = args.parent
    if args.user_assignees:
        data["assignee_user_ids"] = _split_ids(args.user_assignees)
    if args.agent_assignees:
        data["assignee_agent_ids"] = _split_ids(args.agent_assignees)
    elif DEFAULT_AGENT:
        data["assignee_agent_ids"] = [DEFAULT_AGENT]
    if args.labels:
        data["label_ids"] = _split_ids(args.labels)
    agent = getattr(args, "agent_creator", None) or DEFAULT_AGENT
    if agent:
        data["agent_creator_id"] = agent
    _out(_req("POST", f"/projects/{_pid(args)}/boards/{_bid(args)}/tasks/", data))


def tasks_update(args):
    data = {}
    if args.title:
        data["title"] = args.title
    if args.description:
        data["description"] = args.description
    if args.status_id:
        data["status_id"] = args.status_id
    if args.priority:
        data["priority"] = args.priority
    if args.due:
        data["due_date"] = args.due
    if args.user_assignees is not None:
        data["assignee_user_ids"] = _split_ids(args.user_assignees)
    if args.agent_assignees is not None:
        data["assignee_agent_ids"] = _split_ids(args.agent_assignees)
    if args.labels is not None:
        data["label_ids"] = _split_ids(args.labels)
    if not data:
        _die("nothing to update")
    _out(_req("PATCH", f"/projects/{_pid(args)}/boards/{_bid(args)}/tasks/{args.task}", data))


def tasks_move(args):
    data = {"status_id": args.status_id}
    if args.position is not None:
        data["position"] = args.position
    _out(_req("POST", f"/projects/{_pid(args)}/boards/{_bid(args)}/tasks/{args.task}/move", data))


# Search
def search(args):
    params = {"q": args.query}
    if args.type:
        params["type"] = args.type
    if args.project_id:
        params["project_id"] = args.project_id
    _out(_req("GET", "/search/", params=params))


# Comments
def comments_list(args):
    _out(_req("GET", f"/projects/{_pid(args)}/boards/{_bid(args)}/tasks/{args.task}/comments/"))


def comments_add(args):
    data = {"content": args.content}
    agent = getattr(args, "agent_id", None) or DEFAULT_AGENT
    if agent:
        data["agent_creator_id"] = agent
    _out(_req("POST", f"/projects/{_pid(args)}/boards/{_bid(args)}/tasks/{args.task}/comments/", data))


# Attachments
def attachments_list(args):
    _out(_req("GET", f"/projects/{_pid(args)}/boards/{_bid(args)}/tasks/{args.task}/attachments/"))


def attachments_upload(args):
    pid, bid = _pid(args), _bid(args)
    path = f"/projects/{pid}/boards/{bid}/tasks/{args.task}/attachments/"
    boundary = uuid4().hex
    filename = os.path.basename(args.file)
    mime = mimetypes.guess_type(args.file)[0] or "application/octet-stream"

    with open(args.file, "rb") as f:
        file_data = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: {mime}\r\n\r\n"
    ).encode() + file_data + f"\r\n--{boundary}--\r\n".encode()

    url = f"{API_URL}{path}"
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }
    req = Request(url, data=body, headers=headers, method="POST")
    try:
        with urlopen(req) as r:
            _out(json.loads(r.read()))
    except HTTPError as e:
        print(json.dumps({"error": e.read().decode(), "status": e.code}), file=sys.stderr)
        sys.exit(1)


def attachments_download(args):
    url = f"{API_URL}/attachments/{args.attachment}/download"
    req = Request(url, headers={"X-API-Key": API_KEY})
    try:
        with urlopen(req) as r:
            out = args.output or "download"
            with open(out, "wb") as f:
                f.write(r.read())
            print(json.dumps({"saved": out}))
    except HTTPError as e:
        print(json.dumps({"error": str(e.code)}), file=sys.stderr)
        sys.exit(1)


# Stats & Activity
def stats(args):
    _out(_req("GET", f"/projects/{_pid(args)}/stats/"))


def activity(args):
    params = {"page": getattr(args, "page", None), "per_page": getattr(args, "per_page", None)}
    _out(_req("GET", f"/projects/{_pid(args)}/activity/tasks/{args.task}", params=params))


# ── Parser ───────────────────────────────────────────────────────────────

def build_parser():
    p = argparse.ArgumentParser(prog="agentboard", description="AgentBoard CLI for AI agents")
    sub = p.add_subparsers(dest="command")

    # config
    cfg = sub.add_parser("config")
    cfs = cfg.add_subparsers(dest="action")
    cfs.add_parser("show").set_defaults(func=config_show)
    cs = cfs.add_parser("set")
    cs.add_argument("--api-key", help="API key")
    cs.add_argument("--url", help="base URL")
    cs.add_argument("--project", help="default project ID")
    cs.add_argument("--board", help="default board ID")
    cs.add_argument("--agent", help="default agent ID (auto-sets creator on tasks/comments)")
    cs.set_defaults(func=config_set)

    # projects
    proj = sub.add_parser("projects")
    ps = proj.add_subparsers(dest="action")
    ps.add_parser("list").set_defaults(func=projects_list)
    pc = ps.add_parser("create")
    pc.add_argument("--name", required=True)
    pc.add_argument("--description")
    pc.set_defaults(func=projects_create)

    # boards
    brd = sub.add_parser("boards")
    bs = brd.add_subparsers(dest="action")
    bl = bs.add_parser("list")
    bl.add_argument("-p", "--project")
    bl.set_defaults(func=boards_list)
    bc = bs.add_parser("create")
    bc.add_argument("-p", "--project")
    bc.add_argument("--name", required=True)
    bc.add_argument("--description")
    bc.set_defaults(func=boards_create)

    # statuses
    sts = sub.add_parser("statuses")
    ss = sts.add_subparsers(dest="action")
    sl = ss.add_parser("list")
    _add_pb(sl)
    sl.set_defaults(func=statuses_list)

    # agents
    agt = sub.add_parser("agents")
    ag = agt.add_subparsers(dest="action")
    al = ag.add_parser("list")
    al.add_argument("-p", "--project")
    al.add_argument("--all", action="store_true", help="include inactive")
    al.set_defaults(func=agents_list)
    ac = ag.add_parser("create")
    ac.add_argument("-p", "--project")
    ac.add_argument("--name", required=True, help="agent display name")
    ac.add_argument("--color", required=True, help="hex color e.g. #3B82F6")
    ac.set_defaults(func=agents_create)

    # my-tasks
    mt = sub.add_parser("my-tasks")
    mt.add_argument("--agent-id")
    mt.set_defaults(func=my_tasks)

    # tasks
    tsk = sub.add_parser("tasks")
    ts = tsk.add_subparsers(dest="action")

    tl = ts.add_parser("list")
    _add_pb(tl)
    tl.add_argument("--status", help="filter by status ID")
    tl.add_argument("--priority", choices=["none", "low", "medium", "high", "urgent"])
    tl.add_argument("--assignee", help="filter by assignee ID")
    tl.add_argument("--search", help="search in title/description")
    tl.add_argument("--page", type=int)
    tl.add_argument("--per-page", type=int)
    tl.set_defaults(func=tasks_list)

    tg = ts.add_parser("get")
    _add_pbt(tg)
    tg.set_defaults(func=tasks_get)

    tc = ts.add_parser("create")
    _add_pb(tc)
    tc.add_argument("--title", required=True)
    tc.add_argument("--description")
    tc.add_argument("--status-id")
    tc.add_argument("--priority", choices=["none", "low", "medium", "high", "urgent"])
    tc.add_argument("--user-assignees", help="comma-separated user IDs")
    tc.add_argument("--agent-assignees", help="comma-separated agent IDs")
    tc.add_argument("--labels", help="comma-separated label IDs")
    tc.add_argument("--due", help="due date ISO format")
    tc.add_argument("--parent", help="parent task ID")
    tc.add_argument("--agent-creator", help="agent ID as creator")
    tc.set_defaults(func=tasks_create)

    tu = ts.add_parser("update")
    _add_pbt(tu)
    tu.add_argument("--title")
    tu.add_argument("--description")
    tu.add_argument("--status-id")
    tu.add_argument("--priority", choices=["none", "low", "medium", "high", "urgent"])
    tu.add_argument("--user-assignees", help="comma-separated user IDs")
    tu.add_argument("--agent-assignees", help="comma-separated agent IDs")
    tu.add_argument("--labels", help="comma-separated label IDs")
    tu.add_argument("--due", help="due date ISO format")
    tu.set_defaults(func=tasks_update)

    tm = ts.add_parser("move")
    _add_pbt(tm)
    tm.add_argument("--status-id", required=True)
    tm.add_argument("--position", type=float)
    tm.set_defaults(func=tasks_move)

    # search
    srch = sub.add_parser("search")
    srch.add_argument("-q", "--query", required=True)
    srch.add_argument("--type", choices=["project", "task"])
    srch.add_argument("--project-id")
    srch.set_defaults(func=search)

    # comments
    cmt = sub.add_parser("comments")
    cs = cmt.add_subparsers(dest="action")
    cl = cs.add_parser("list")
    _add_pbt(cl)
    cl.set_defaults(func=comments_list)
    ca = cs.add_parser("add")
    _add_pbt(ca)
    ca.add_argument("--content", required=True)
    ca.add_argument("--agent-id", help="post as agent")
    ca.set_defaults(func=comments_add)

    # attachments
    att = sub.add_parser("attachments")
    ats = att.add_subparsers(dest="action")
    atl = ats.add_parser("list")
    _add_pbt(atl)
    atl.set_defaults(func=attachments_list)
    atu = ats.add_parser("upload")
    _add_pbt(atu)
    atu.add_argument("--file", required=True, help="file path to upload")
    atu.set_defaults(func=attachments_upload)
    atd = ats.add_parser("download")
    atd.add_argument("-a", "--attachment", required=True, help="attachment ID")
    atd.add_argument("-o", "--output", help="output file path")
    atd.set_defaults(func=attachments_download)

    # stats
    st = sub.add_parser("stats")
    st.add_argument("-p", "--project")
    st.set_defaults(func=stats)

    # activity
    act = sub.add_parser("activity")
    act.add_argument("-p", "--project")
    act.add_argument("-t", "--task", required=True)
    act.add_argument("--page", type=int)
    act.add_argument("--per-page", type=int)
    act.set_defaults(func=activity)

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(1)

    if not API_KEY and args.command != "config":
        _die("API key required. Run: agentboard config set --api-key <key>")

    args.func(args)


if __name__ == "__main__":
    main()
