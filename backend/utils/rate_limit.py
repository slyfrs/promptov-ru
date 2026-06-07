# backend/utils/rate_limit.py
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = None


def init_limiter(app):
    global limiter
    # Для версии 4.1.1 синтаксис другой
    limiter = Limiter(
        get_remote_address,  # key_func как первый аргумент, не именованный
        app=app,
        default_limits=["200 per day", "50 per hour"],
        storage_uri=app.config.get("RATELIMIT_STORAGE_URL", "memory://"),
    )
    return limiter


def get_limiter():
    """Получить экземпляр лимитера"""
    return limiter


def rate_limit(limit_string):
    """Декоратор для применения лимитов к маршрутам"""

    def decorator(f):
        if limiter:
            return limiter.limit(limit_string)(f)
        return f

    return decorator
