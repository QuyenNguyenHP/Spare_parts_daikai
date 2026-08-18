from __future__ import annotations

from dataclasses import dataclass
from email.message import EmailMessage
import logging
import os
import smtplib
import ssl


LOGGER = logging.getLogger(__name__)
DEFAULT_SALES_EMAIL = "duyquyenbk97@gmail.com"


def env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class EmailSettings:
    host: str
    port: int
    username: str
    password: str
    from_email: str
    sales_email: str
    use_ssl: bool
    start_tls: bool

    @classmethod
    def from_environment(cls) -> "EmailSettings":
        username = os.getenv("SMTP_USERNAME", "").strip()
        use_ssl = env_flag("SMTP_USE_SSL", False)
        return cls(
            host=os.getenv("SMTP_HOST", "").strip(),
            port=int(os.getenv("SMTP_PORT", "465" if use_ssl else "587")),
            username=username,
            password=os.getenv("SMTP_PASSWORD", ""),
            from_email=os.getenv("SMTP_FROM_EMAIL", username).strip(),
            sales_email=os.getenv("PARTS_REQUEST_SALES_EMAIL", DEFAULT_SALES_EMAIL).strip(),
            use_ssl=use_ssl,
            start_tls=env_flag("SMTP_STARTTLS", not use_ssl),
        )

    def is_configured(self) -> bool:
        credentials_complete = not self.username or bool(self.password)
        return bool(self.host and self.from_email and self.sales_email and credentials_complete)


def item_lines(request_data: dict) -> str:
    return "\n".join(
        f"- Parts code: {item['partNumber']} | Name: {item['name']} | "
        f"Number: {item['item']} | Quantity: {item['quantity']}"
        for item in request_data["items"]
    )


def build_customer_email(request_data: dict, from_email: str) -> EmailMessage:
    customer = request_data["customer"]
    message = EmailMessage()
    message["From"] = from_email
    message["To"] = customer["email"]
    message["Subject"] = f"Daikai parts request confirmation - {request_data['requestId']}"
    message.set_content(
        f"Dear {customer['name']},\n\n"
        "Thank you for your parts request. Daikai Engineering has received the request below.\n\n"
        f"Request ID: {request_data['requestId']}\n"
        f"Drawing: {request_data['drawingTitle']}\n"
        f"Vessel: {customer['vesselName']}\n"
        f"IMO No.: {customer['imoNumber']}\n"
        f"Engine: {customer['engineName']}\n"
        f"Engine S/N: {customer['engineSerialNumber']}\n\n"
        f"Requested parts:\n{item_lines(request_data)}\n\n"
        "Our sales team will review your request and contact you.\n\n"
        "Daikai Engineering"
    )
    return message


def build_sales_email(request_data: dict, settings: EmailSettings) -> EmailMessage:
    customer = request_data["customer"]
    message = EmailMessage()
    message["From"] = settings.from_email
    message["To"] = settings.sales_email
    message["Reply-To"] = customer["email"]
    message["Subject"] = f"New parts request - {request_data['requestId']}"
    message.set_content(
        "A new parts request has been submitted.\n\n"
        f"Request ID: {request_data['requestId']}\n"
        f"Created at: {request_data['createdAt']}\n"
        f"Customer: {customer['name']}\n"
        f"Company: {customer['company']}\n"
        f"Email: {customer['email']}\n"
        f"Phone: {customer['phone']}\n"
        f"Vessel: {customer['vesselName']}\n"
        f"IMO No.: {customer['imoNumber']}\n"
        f"Engine: {customer['engineName']}\n"
        f"Engine S/N: {customer['engineSerialNumber']}\n"
        f"Drawing: {request_data['drawingTitle']}\n\n"
        f"Requested parts:\n{item_lines(request_data)}\n"
    )
    return message


def send_request_emails(request_data: dict) -> dict:
    try:
        settings = EmailSettings.from_environment()
    except ValueError:
        LOGGER.exception("Invalid SMTP configuration")
        return {
            "status": "failed",
            "message": "SMTP configuration is invalid",
        }
    if not settings.is_configured():
        return {
            "status": "not_configured",
            "message": "SMTP email is not configured",
        }

    messages = [
        build_customer_email(request_data, settings.from_email),
        build_sales_email(request_data, settings),
    ]
    try:
        context = ssl.create_default_context()
        if settings.use_ssl:
            connection = smtplib.SMTP_SSL(
                settings.host,
                settings.port,
                timeout=15,
                context=context,
            )
        else:
            connection = smtplib.SMTP(settings.host, settings.port, timeout=15)
        with connection as smtp:
            if not settings.use_ssl and settings.start_tls:
                smtp.starttls(context=context)
            if settings.username:
                smtp.login(settings.username, settings.password)
            for message in messages:
                smtp.send_message(message)
    except (OSError, smtplib.SMTPException, ValueError):
        LOGGER.exception("Parts request %s was saved but email delivery failed", request_data["requestId"])
        return {
            "status": "failed",
            "message": "The request was saved, but email delivery failed",
        }

    return {
        "status": "sent",
        "message": "Confirmation and sales emails sent",
        "recipients": [request_data["customer"]["email"], settings.sales_email],
    }
