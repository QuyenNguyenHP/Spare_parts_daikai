from __future__ import annotations

import hashlib
import hmac
import os
from pathlib import Path
import secrets

try:
    from .storage import DATA_DIR, read_json, write_json
except ImportError:
    from storage import DATA_DIR, read_json, write_json


ADMIN_SETTINGS_PATH = DATA_DIR / "admin-settings.json"
DEFAULT_RECIPIENT_EMAIL = "quyen@daikai.com"
PASSWORD_ITERATIONS = 210_000
VALID_ROLES = {"Administrator", "User"}


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    password_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(password_salt),
        PASSWORD_ITERATIONS,
    )
    return password_salt, digest.hex()


def default_settings() -> dict:
    username = os.getenv("SPARE_PARTS_USERNAME", "admin").strip() or "admin"
    password = os.getenv("SPARE_PARTS_PASSWORD", "admin123")
    salt, password_hash = hash_password(password)
    return {
        "users": [
            {
                "username": username,
                "role": "Administrator",
                "active": True,
                "passwordSalt": salt,
                "passwordHash": password_hash,
            }
        ],
        "recipients": [DEFAULT_RECIPIENT_EMAIL],
    }


def load_admin_settings() -> dict:
    if not ADMIN_SETTINGS_PATH.exists():
        settings = default_settings()
        write_json(ADMIN_SETTINGS_PATH, settings)
        return settings
    return read_json(ADMIN_SETTINGS_PATH)


def save_admin_settings(settings: dict) -> None:
    write_json(ADMIN_SETTINGS_PATH, settings)


def public_user(user: dict) -> dict:
    return {
        "username": user["username"],
        "role": user["role"],
        "active": user.get("active", True),
        "profile": user.get("profile", {}),
    }


def find_user(username: str) -> dict | None:
    normalized_username = username.strip().lower()
    return next(
        (user for user in load_admin_settings()["users"] if user["username"].lower() == normalized_username),
        None,
    )


def authenticate_user(username: str, password: str) -> dict | None:
    user = find_user(username)
    if not user or not user.get("active", True):
        return None
    _, supplied_hash = hash_password(password, user["passwordSalt"])
    if not hmac.compare_digest(supplied_hash, user["passwordHash"]):
        return None
    return public_user(user)


def get_recipient_emails() -> list[str]:
    recipients = load_admin_settings().get("recipients", [])
    return recipients or [DEFAULT_RECIPIENT_EMAIL]
