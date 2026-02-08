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


def render_notification_email(title: str, message: str, notification_type: str) -> str:
    template = _jinja_env.get_template("notification.html")
    return template.render(
        title=title,
        message=message,
        type=notification_type,
        app_name="AgentBoard",
    )


async def _send_email(to: str, subject: str, html_body: str) -> None:
    try:
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
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
                else:
                    body = await resp.text()
                    logger.error("Resend API error (%s): %s", resp.status, body)
    except Exception:
        logger.exception("Failed to send email to %s", to)


def fire_and_forget_email(to: str, subject: str, html_body: str) -> None:
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_send_email(to, subject, html_body))
    except RuntimeError:
        logger.warning("No running event loop; email to %s skipped", to)
