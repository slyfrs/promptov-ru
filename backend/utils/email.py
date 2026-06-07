# backend/utils/email.py
from flask import current_app
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer


def get_serializer():
    """Получить serializer для токенов"""
    return URLSafeTimedSerializer(current_app.config["JWT_SECRET_KEY"])


def generate_confirmation_token(email):
    """Генерация токена для подтверждения email"""
    serializer = get_serializer()
    return serializer.dumps(email, salt="email-confirm")


def confirm_token(token, expiration=3600):
    """Проверка токена подтверждения email"""
    serializer = get_serializer()
    try:
        email = serializer.loads(token, salt="email-confirm", max_age=expiration)
    except:
        return None
    return email


def generate_reset_token(email):
    """Генерация токена для сброса пароля"""
    serializer = get_serializer()
    return serializer.dumps(email, salt="password-reset")


def verify_reset_token(token, expiration=3600):
    """Проверка токена сброса пароля"""
    serializer = get_serializer()
    try:
        email = serializer.loads(token, salt="password-reset", max_age=expiration)
    except:
        return None
    return email


def send_email(to, subject, html_template):
    """Отправка письма"""
    from flask_mail import Message
    from app import mail

    msg = Message(
        subject,
        recipients=[to],
        html=html_template,
        sender=current_app.config.get("MAIL_DEFAULT_SENDER"),
    )
    mail.send(msg)


def send_verification_email(user):
    """Отправка письма с подтверждением регистрации"""
    token = generate_confirmation_token(user.email)
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    verify_url = f"{frontend_url}/verify-email?token={token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Подтверждение регистрации на Promptov.ru</h2>
            <p>Здравствуйте, {user.username}!</p>
            <p>Для завершения регистрации, пожалуйста, подтвердите свой email адрес:</p>
            <p><a href="{verify_url}" class="button">Подтвердить email</a></p>
            <p>Или перейдите по ссылке: <a href="{verify_url}">{verify_url}</a></p>
            <p>Ссылка действительна в течение 1 часа.</p>
            <p>С уважением,<br>Команда Promptov.ru</p>
        </div>
    </body>
    </html>
    """

    send_email(user.email, "Подтверждение регистрации на Promptov.ru", html)


def send_password_reset_email(user):
    """Отправка письма для сброса пароля"""
    token = generate_reset_token(user.email)
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Восстановление пароля на Promptov.ru</h2>
            <p>Здравствуйте, {user.username}!</p>
            <p>Мы получили запрос на сброс пароля для вашей учётной записи.</p>
            <p><a href="{reset_url}" class="button">Сбросить пароль</a></p>
            <p>Или перейдите по ссылке: <a href="{reset_url}">{reset_url}</a></p>
            <p>Ссылка действительна в течение 1 часа.</p>
            <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
            <p>С уважением,<br>Команда Promptov.ru</p>
        </div>
    </body>
    </html>
    """

    send_email(user.email, "Восстановление пароля на Promptov.ru", html)
