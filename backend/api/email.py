# backend/api/email.py
from utils.email import (
    send_verification_email,
    send_password_reset_email,
    confirm_token,
    verify_reset_token,
)

# Для обратной совместимости
__all__ = [
    "send_verification_email",
    "send_password_reset_email",
    "confirm_token",
    "verify_reset_token",
]
