"""Render email templates as HTML files and open in browser for preview."""

import webbrowser
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "backend" / "app" / "templates" / "email"
OUTPUT_DIR = Path(__file__).resolve().parent / "email_preview"
OUTPUT_DIR.mkdir(exist_ok=True)

env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)

RECIPIENT = "ibrahimalbayrak812@gmail.com"


def render_instant():
    tmpl = env.get_template("notification.html")
    html = tmpl.render(
        title="Task Assigned",
        message='Ahmet assigned you to "Fix authentication redirect loop" in Project Alpha.',
        type="task_assigned",
        app_name="AgentBoard",
    )
    out = OUTPUT_DIR / "instant_notification.html"
    out.write_text(html, encoding="utf-8")
    print(f"[instant] Rendered -> {out}")
    return out


def render_weekly_digest():
    tmpl = env.get_template("digest.html")
    html = tmpl.render(
        app_name="AgentBoard",
        period="Weekly",
        greeting=f"Hi Ibrahim,",
        total_count=7,
        since_date="Jan 27, 2026",
        groups=[
            {
                "label": "Tasks Assigned",
                "entries": [
                    {"title": "Fix authentication redirect loop", "message": "Assigned by Ahmet — Project Alpha"},
                    {"title": "Update user profile API validation", "message": "Assigned by Elif — Project Beta"},
                    {"title": "Add dark mode toggle to settings", "message": "Assigned by Mehmet — Project Alpha"},
                ],
            },
            {
                "label": "Task Updates",
                "entries": [
                    {"title": "Refactor WebSocket handler", "message": "Priority changed to High — Project Alpha"},
                    {"title": "Database migration script", "message": "Moved to In Review by Elif — Project Beta"},
                ],
            },
            {
                "label": "Comments",
                "entries": [
                    {"title": "Fix login timeout issue", "message": 'Ahmet: "Looks good, just one edge case to handle"'},
                    {"title": "API rate limiting", "message": 'Elif: "Can we add Redis caching for this?"'},
                ],
            },
        ],
    )
    out = OUTPUT_DIR / "weekly_digest.html"
    out.write_text(html, encoding="utf-8")
    print(f"[weekly]  Rendered -> {out}")
    return out


if __name__ == "__main__":
    print(f"Recipient: {RECIPIENT}\n")

    instant_path = render_instant()
    digest_path = render_weekly_digest()

    print("\nOpening in browser...")
    webbrowser.open(f"file://{instant_path}")
    webbrowser.open(f"file://{digest_path}")
