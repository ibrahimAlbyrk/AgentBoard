import asyncio
import logging
import ssl
from pathlib import Path

import aiohttp
import certifi
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

logger = logging.getLogger(__name__)

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"
_jinja_env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=True)

RESEND_API_URL = "https://api.resend.com/emails"


def email_configured() -> bool:
    return bool(settings.RESEND_API_KEY)


TYPE_BADGE_STYLES = {
    "task_assigned":    {"label": "Assigned",        "color": "#2563eb", "bg": "#dbeafe"},
    "assignee_added":   {"label": "Assigned",        "color": "#2563eb", "bg": "#dbeafe"},
    "assignee_removed": {"label": "Unassigned",      "color": "#ef4444", "bg": "#fee2e2"},
    "task_updated":     {"label": "Updated",         "color": "#d97706", "bg": "#fef3c7"},
    "task_moved":       {"label": "Moved",           "color": "#7c3aed", "bg": "#ede9fe"},
    "task_deleted":     {"label": "Deleted",         "color": "#ef4444", "bg": "#fee2e2"},
    "task_comment":     {"label": "Comment",         "color": "#059669", "bg": "#d1fae5"},
    "comment_deleted":  {"label": "Comment Deleted", "color": "#ef4444", "bg": "#fee2e2"},
    "task_reaction":    {"label": "Reaction",        "color": "#ec4899", "bg": "#fce7f3"},
    "mentioned":        {"label": "Mention",         "color": "#ea580c", "bg": "#ffedd5"},
    "subtask_created":  {"label": "Subtask Added",   "color": "#0d9488", "bg": "#ccfbf1"},
    "subtask_deleted":  {"label": "Subtask Removed", "color": "#ef4444", "bg": "#fee2e2"},
    "watcher_added":    {"label": "Watching",        "color": "#3b82f6", "bg": "#dbeafe"},
    "watcher_removed":  {"label": "Unwatched",       "color": "#71717a", "bg": "#f4f4f5"},
}


def _get_badge(notification_type: str) -> dict:
    return TYPE_BADGE_STYLES.get(notification_type, {"label": "Notification", "color": "#71717a", "bg": "#f4f4f5"})


def render_notification_email(title: str, message: str, notification_type: str) -> str:
    badge = _get_badge(notification_type)
    try:
        template = _jinja_env.get_template("notification_rich.html")
        return template.render(
            title=title,
            message=message,
            type=notification_type,
            type_label=badge["label"],
            badge_color=badge["color"],
            badge_bg=badge["bg"],
            task_title=None,
            action_url=None,
            app_name="AgentBoard",
        )
    except Exception:
        # Fallback to simple template
        template = _jinja_env.get_template("notification.html")
        return template.render(
            title=title,
            message=message,
            type=notification_type,
            app_name="AgentBoard",
        )


def render_digest_email(notifications: list[dict], total_count: int) -> str:
    """Render digest email with list of notification items."""
    items = []
    for n in notifications[:15]:
        badge = _get_badge(n.get("type", ""))
        items.append({
            "title": n.get("title", ""),
            "message": n.get("message", ""),
            "type_label": badge["label"],
            "badge_color": badge["color"],
            "badge_bg": badge["bg"],
            "time_ago": n.get("time_ago", ""),
        })
    template = _jinja_env.get_template("digest.html")
    return template.render(
        notifications=items,
        total_count=total_count,
        has_more=total_count > 15,
        more_count=total_count - 15,
        app_name="AgentBoard",
    )


MAX_RETRIES = 3
RETRY_DELAYS = [1, 3, 10]  # seconds


async def _send_email(to: str, subject: str, html_body: str) -> None:
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    for attempt in range(MAX_RETRIES):
        try:
            async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ssl_ctx)) as session:
                async with session.post(
                    RESEND_API_URL,
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": settings.EMAIL_FROM,
                        "to": [to],
                        "subject": subject,
                        "html": html_body,
                    },
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        logger.info("Email sent to %s: %s", to, subject)
                        return
                    body = await resp.text()
                    if resp.status >= 500:
                        logger.warning("Resend API 5xx (%s) attempt %d: %s", resp.status, attempt + 1, body)
                    else:
                        logger.error("Resend API error (%s): %s", resp.status, body)
                        return  # don't retry 4xx
        except Exception:
            logger.warning("Email send attempt %d failed for %s", attempt + 1, to)
        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(RETRY_DELAYS[attempt])
    logger.error("Email to %s failed after %d retries", to, MAX_RETRIES)


def fire_and_forget_email(to: str, subject: str, html_body: str) -> None:
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_send_email(to, subject, html_body))
    except RuntimeError:
        logger.warning("No running event loop; email to %s skipped", to)
