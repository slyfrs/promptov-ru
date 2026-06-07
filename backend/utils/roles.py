# backend/utils/roles.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from models.user import User

# ID суперадмина, которого нельзя удалить или изменить роль
SUPER_ADMIN_ID = 1


def is_super_admin(user_id):
    """Проверка, является ли пользователь суперадмином"""
    return user_id == SUPER_ADMIN_ID


def get_current_user():
    """Получить текущего пользователя из JWT"""
    user_id = get_jwt_identity()
    if not user_id:
        return None
    return User.query.get(int(user_id))


def role_required(roles):
    """Декоратор для проверки роли"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Не авторизован"}), 401
            if user.role not in roles:
                print(f"Доступ запрещён. Роль {user.role} не в {roles}")  # Отладка
                return jsonify({"error": "Доступ запрещён. Недостаточно прав."}), 403
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def is_admin(user):
    return user and user.role == "admin"


def is_moderator_or_admin(user):
    return user and user.role in ["moderator", "admin"]


def can_moderate_prompts(user):
    return user and user.role in ["moderator", "admin"]


def can_moderate_comments(user):
    return user and user.role in ["moderator", "admin"]


def can_manage_users(user):
    return user and user.role == "admin"
