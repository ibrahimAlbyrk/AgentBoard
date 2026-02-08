"""Send a real test email via Resend API to verify configuration."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from jinja2 import Environment, FileSystemLoader

from app.core.config import settings
from app.services.email_service import _send_email

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "backend" / "app" / "templates" / "email"
_jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)


async def main():
    to = "ibrahimalbayrak812@gmail.com"

    print(f"Sending weekly digest to: {to}\n")

    tmpl = _jinja_env.get_template("digest.html")
    html = tmpl.render(
        app_name="AgentBoard",
        period="Weekly",
        greeting="Hi Ibrahim,",
        total_count=7,
        since_date="Feb 1, 2026",
        groups=[
            {
                "label": "Tasks Assigned",
                "entries": [
                    {"title": "Fix authentication redirect loop", "message": "Assigned by Ahmet — Project Alpha"},
                    {"title": "Update user profile API", "message": "Assigned by Elif — Project Beta"},
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
                    {"title": "Fix login timeout issue", "message": 'Ahmet: "Looks good, just one edge case"'},
                    {"title": "API rate limiting", "message": 'Elif: "Can we add Redis caching?"'},
                ],
            },
        ],
    )
    await _send_email(to, "AgentBoard: Your Weekly Digest", html)
    print("Done! Check your inbox.")


asyncio.run(main())
