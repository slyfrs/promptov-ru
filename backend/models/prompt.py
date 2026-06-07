from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from models.user import db


class Prompt(db.Model):
    __tablename__ = "prompts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    example_usage = db.Column(db.Text)
    status = db.Column(
        db.String(20), default="private"
    )  # private/pending/published/rejected
    theme_id = db.Column(db.Integer, db.ForeignKey("tags.id"), nullable=True)
    theme = db.Column(db.String(50))  # Для дефолтной картинки
    custom_image_url = db.Column(db.String(500))
    result_image_url = db.Column(db.String(500), nullable=True)  # ← НОВОЕ ПОЛЕ
    version = db.Column(db.Integer, default=1)
    parent_prompt_id = db.Column(db.Integer, db.ForeignKey("prompts.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    published_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    ratings_count = db.Column(db.Integer, default=0)

    # Отношения
    user = db.relationship("User", backref=db.backref("prompts", lazy=True))
    parent = db.relationship("Prompt", remote_side=[id], backref="forks")
    tags = db.relationship(
        "Tag", secondary="prompt_tags", backref=db.backref("prompts", lazy=True)
    )
    ratings = db.relationship(
        "Rating", backref="prompt", lazy=True, cascade="all, delete-orphan"
    )
    comments = db.relationship(
        "Comment", backref="prompt", lazy=True, cascade="all, delete-orphan"
    )

    def to_dict(
        self, include_user=False, current_user_id=None, liked_prompt_ids=None, lang="ru"
    ):
        # Получаем локализованное имя категории
        theme_name = None
        theme_icon = None
        if self.theme_id:
            category = Tag.query.get(self.theme_id)
            if category:
                theme_name = category.name_ru if lang == "ru" else category.name_en
                theme_icon = category.icon

        data = {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "description": self.description,
            "example_usage": self.example_usage,
            "status": self.status,
            "theme": self.theme,
            "theme_id": self.theme_id,
            "theme_name": theme_name,
            "theme_icon": theme_icon,
            "result_image_url": self.result_image_url,
            "custom_image_url": self.custom_image_url,
            "version": self.version,
            "parent_prompt_id": self.parent_prompt_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "published_at": self.published_at.isoformat()
            if self.published_at
            else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "tags": [tag.to_dict(lang) for tag in self.tags],
            "likes_count": self.ratings_count,
            "comments_count": len([c for c in self.comments if c.is_approved]),
        }

        # ✅ ОПТИМИЗАЦИЯ: используем переданный set вместо отдельного запроса
        if current_user_id and liked_prompt_ids is not None:
            data["user_liked"] = self.id in liked_prompt_ids
        elif current_user_id:
            # fallback на случай, если set не передан
            liked = (
                Rating.query.filter_by(
                    user_id=current_user_id, prompt_id=self.id
                ).first()
                is not None
            )
            data["user_liked"] = liked
        else:
            data["user_liked"] = False

        if include_user:
            data["user"] = self.user.to_dict()

        return data

        # if current_user_id:
        #     liked = (
        #         Rating.query.filter_by(
        #             user_id=current_user_id, prompt_id=self.id
        #         ).first()
        #         is not None
        #     )
        #     data["user_liked"] = liked
        # else:
        #     data["user_liked"] = False

        # if include_user:
        #     data["user"] = self.user.to_dict()

        # return data

    def update_ratings_count(self):
        """Обновить количество лайков"""
        self.ratings_count = len(self.ratings)
        db.session.commit()

    def get_average_rating(self):
        """Возвращает количество лайков (популярность)"""
        return len(self.ratings)  # теперь просто количество лайков

    def __repr__(self):
        return f"<Prompt {self.title}>"


class Tag(db.Model):
    __tablename__ = "tags"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=True)  # для обратной совместимости
    name_ru = db.Column(db.String(100), unique=True, nullable=False)
    name_en = db.Column(db.String(100), unique=True, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # category, ai_model
    icon = db.Column(db.String(50), nullable=True)  # icon

    def to_dict(self, lang="ru"):
        """Возвращает тег с названием на нужном языке"""
        name = self.name_ru if lang == "ru" else self.name_en
        return {
            "id": self.id,
            "name": name,
            "name_ru": self.name_ru,
            "name_en": self.name_en,
            "type": self.type,
            "icon": self.icon,
        }

    def get_name(self, lang="ru"):
        return self.name_ru if lang == "ru" else self.name_en

    def _get_default_icon(self):
        """Дефолтные иконки для категорий на основе названия"""
        defaults = {
            "Копирайтинг": "✍️",
            "Программирование": "💻",
            "Дизайн": "🎨",
            "Маркетинг": "📈",
            "Образование": "📚",
            "Творчество": "🎭",
            "Аналитика": "📊",
            "Перевод": "🌐",
            "HR и Резюме": "👔",
            "Развлечения": "🎮",
        }
        return defaults.get(self.name_ru, "🏷️")


class PromptTag(db.Model):
    __tablename__ = "prompt_tags"

    prompt_id = db.Column(db.Integer, db.ForeignKey("prompts.id"), primary_key=True)
    tag_id = db.Column(db.Integer, db.ForeignKey("tags.id"), primary_key=True)


class Rating(db.Model):
    __tablename__ = "ratings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    prompt_id = db.Column(db.Integer, db.ForeignKey("prompts.id"), nullable=False)
    # score больше не нужен, убираем
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "prompt_id", name="unique_user_prompt_like"),
    )


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    prompt_id = db.Column(db.Integer, db.ForeignKey("prompts.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_approved = db.Column(db.Boolean, default=False)  # ← новое поле
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user = db.relationship("User", backref=db.backref("comments", lazy=True))

    def to_dict(self, include_user=True):
        data = {
            "id": self.id,
            "content": self.content,
            "is_approved": self.is_approved,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "prompt_id": self.prompt_id,  # ← добавить
        }
        if include_user:
            data["user"] = {"id": self.user.id, "username": self.user.username}
        return data
