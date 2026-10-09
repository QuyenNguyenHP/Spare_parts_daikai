from __future__ import annotations

from dataclasses import dataclass
from email.message import EmailMessage
import logging
import os
import smtplib
import ssl


LOGGER = logging.getLogger(__name__)
DEFAULT_SALES_EMAIL = "quyen@daikai.com"


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
    sales_emails: tuple[str, ...]
    use_ssl: bool
    start_tls: bool

    @classmethod
    def from_environment(cls, recipient_emails: list[str] | None = None) -> "EmailSettings":
        username = os.getenv("SMTP_USERNAME", "").strip()
        use_ssl = env_flag("SMTP_USE_SSL", False)
        return cls(
            host=os.getenv("SMTP_HOST", "").strip(),
            port=int(os.getenv("SMTP_PORT", "465" if use_ssl else "587")),
            username=username,
            password=os.getenv("SMTP_PASSWORD", ""),
            from_email=os.getenv("SMTP_FROM_EMAIL", username).strip(),
            sales_emails=tuple(recipient_emails or [
                os.getenv("PARTS_REQUEST_SALES_EMAIL", DEFAULT_SALES_EMAIL).strip()
            ]),
            use_ssl=use_ssl,
            start_tls=env_flag("SMTP_STARTTLS", not use_ssl),
        )

    def is_configured(self) -> bool:
        credentials_complete = not self.username or bool(self.password)
        return bool(self.host and self.from_email and self.sales_emails and credentials_complete)


def item_lines(request_data: dict) -> str:
    return "\n".join(
        f"- Parts code: {item['partNumber']} | Name: {item['name']} | "
        f"Number: {item['item']} | Reference drawing: "
        f"{item.get('drawingLabel') or item.get('drawingTitle') or request_data.get('drawingTitle', '-')} | "
        f"Quantity: {item['quantity']}"
        for item in request_data["items"]
    )


def attach_pdf(message: EmailMessage, pdf_content: bytes, pdf_filename: str) -> None:
    message.add_attachment(
        pdf_content,
        maintype="application",
        subtype="pdf",
        filename=pdf_filename,
    )


def build_customer_email(request_data: dict, from_email: str, pdf_content: bytes, pdf_filename: str) -> EmailMessage:
    customer = request_data["customer"]
    message = EmailMessage()
    message["From"] = from_email
    message["To"] = customer["email"]
    message["Subject"] = f"Daikai parts request confirmation - {request_data['requestId']}"
    message.set_content(
        f"Dear {customer['name']},\n\n"
        "Thank you for your parts request. Daikai Engineering has received the request below.\n\n"
        f"Request ID: {request_data['requestId']}\n"
        f"Drawings: {request_data['drawingTitle']}\n"
        f"Vessel: {customer['vesselName']}\n"
        f"IMO No.: {customer['imoNumber']}\n"
        f"Engine: {customer['engineName']}\n"
        f"Engine S/N: {customer['engineSerialNumber']}\n\n"
        f"Requested parts:\n{item_lines(request_data)}\n\n"
        "Our sales team will review your request and contact you.\n\n"
        "Daikai Engineering"
    )
    attach_pdf(message, pdf_content, pdf_filename)
    return message


def build_sales_email(request_data: dict, settings: EmailSettings, pdf_content: bytes, pdf_filename: str) -> EmailMessage:
    customer = request_data["customer"]
    message = EmailMessage()
    message["From"] = settings.from_email
    message["To"] = ", ".join(settings.sales_emails)
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
        f"Drawings: {request_data['drawingTitle']}\n\n"
        f"Requested parts:\n{item_lines(request_data)}\n"
    )
    attach_pdf(message, pdf_content, pdf_filename)
    return message


def send_request_emails(
    request_data: dict,
    recipient_emails: list[str] | None = None,
    pdf_content: bytes | None = None,
    pdf_filename: str | None = None,
) -> dict:
    try:
        settings = EmailSettings.from_environment(recipient_emails)
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

    if not pdf_content or not pdf_filename:
        return {
            "status": "failed",
            "message": "The request PDF could not be created",
        }

    messages = [
        build_customer_email(request_data, settings.from_email, pdf_content, pdf_filename),
        build_sales_email(request_data, settings, pdf_content, pdf_filename),
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
        "message": "Confirmation and sales emails sent with the request PDF",
        "recipients": [request_data["customer"]["email"], *settings.sales_emails],
        "attachment": pdf_filename,
    }
