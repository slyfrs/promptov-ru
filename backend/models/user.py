from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user")  # user / moderator / admin
    trust_score = db.Column(db.Integer, default=0)
    is_blocked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Новые поля
    email_confirmed = db.Column(db.Boolean, default=False)
    email_confirmation_token = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)

    # Новые поля профиля
    bio = db.Column(db.Text, nullable=True)  # О себе
    birth_date = db.Column(db.Date, nullable=True)  # Дата рождения
    city = db.Column(db.String(100), nullable=True)  # Город
    telegram = db.Column(db.String(100), nullable=True)  # Telegram
    github = db.Column(db.String(255), nullable=True)  # GitHub
    website = db.Column(db.String(255), nullable=True)  # Сайт

    # Настройки приватности (храним как JSON)
    privacy_settings = db.Column(
        db.JSON,
        default={
            "bio": True,
            "birth_date": False,
            "city": True,
            "telegram": True,
            "github": True,
            "website": True,
        },
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def can_create_prompts(self):
        """Может ли пользователь создавать промпты"""
        return self.email_confirmed and not self.is_blocked

    def can_comment(self):
        """Может ли пользователь комментировать"""
        return self.email_confirmed and not self.is_blocked

    def to_dict(self, include_private=False, include_email=False):
        # Получаем privacy_settings с дефолтным значением, если None
        privacy = self.privacy_settings or {
            "bio": True,
            "birth_date": False,
            "city": True,
            "telegram": True,
            "github": True,
            "website": True,
        }

        data = {
            "id": self.id,
            "username": self.username,
            "email": self.email if (include_private or include_email) else None,
            "role": self.role,
            "trust_score": self.trust_score,
            "is_blocked": self.is_blocked,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "avatar_url": self.avatar_url,
            "email_confirmed": self.email_confirmed,
        }

        # Публичные поля профиля (используем privacy вместо self.privacy_settings)
        if include_private or privacy.get("bio", True):
            data["bio"] = self.bio
        if include_private or privacy.get("birth_date", False):
            data["birth_date"] = (
                self.birth_date.isoformat() if self.birth_date else None
            )
        if include_private or privacy.get("city", True):
            data["city"] = self.city
        if include_private or privacy.get("telegram", True):
            data["telegram"] = self.telegram
        if include_private or privacy.get("github", True):
            data["github"] = self.github
        if include_private or privacy.get("website", True):
            data["website"] = self.website

        if include_private:
            data["privacy_settings"] = privacy

        return data

    def __repr__(self):
        return f"<User {self.username}>"


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("notifications", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
