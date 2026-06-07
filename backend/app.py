import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from flask import send_from_directory
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from flask_caching import Cache

# Добавляем текущую директорию в путь поиска модулей
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

# Инициализация Flask
app = Flask(__name__)


# Конфигурация
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", "postgresql://postgres:localhost@localhost:5432/promptov_dev"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 60 * 60 * 24  # 24 часа
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 60 * 60 * 24 * 30  # 30 дней
app.config["JSON_AS_ASCII"] = False

# Настройки для cookie - ИСПРАВЛЕНО
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_COOKIE_SECURE"] = False  # True для HTTPS
app.config["JWT_COOKIE_CSRF_PROTECT"] = (
    False  # Отключаем CSRF для простоты (можно включить позже)
)
app.config["JWT_ACCESS_COOKIE_PATH"] = "/"
app.config["JWT_REFRESH_COOKIE_PATH"] = "/api/auth/refresh"
app.config["JWT_COOKIE_SAMESITE"] = "Lax"
app.config["JWT_COOKIE_HTTPONLY"] = True

# В конфигурацию (после JWT настроек)
# app.config["RATELIMIT_STORAGE_URL"] = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# app.config["RATELIMIT_STRATEGY"] = "fixed-window"
# app.config["RATELIMIT_HEADERS_ENABLED"] = True


app.config["UPLOAD_FOLDER"] = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
)

app.config["FRONTEND_URL"] = os.getenv("FRONTEND_URL", "http://localhost:3000")

# После инициализации app
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", 465))
app.config["MAIL_USE_SSL"] = os.getenv("MAIL_USE_SSL", "True") == "True"
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER")


# Инициализация расширений
from models.user import db

db.init_app(app)

# Настройка CORS - разрешаем отправку cookies
CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:3000"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"],
)

jwt = JWTManager(app)
mail = Mail(app)

from utils.rate_limit import init_limiter

limiter = init_limiter(app)

# Генератор токенов
# serializer = URLSafeTimedSerializer(app.config["JWT_SECRET_KEY"])

cache = None

# Пытаемся подключить Redis только если есть переменная окружения
if os.getenv("REDIS_URL"):
    try:
        cache = Cache(
            app,
            config={
                "CACHE_TYPE": "redis",
                "CACHE_REDIS_URL": os.getenv("REDIS_URL"),
                "CACHE_DEFAULT_TIMEOUT": 300,
            },
        )
        print("✅ Redis caching enabled")
    except Exception as e:
        print(f"⚠️ Redis not available, caching disabled: {e}")
        cache = Cache(app, config={"CACHE_TYPE": "simple"})
else:
    print("ℹ️ REDIS_URL not set, caching disabled")
    cache = Cache(app, config={"CACHE_TYPE": "simple"})

# Импорт маршрутов
from api.auth import register_routes

register_routes(app)

from api.prompts import register_prompt_routes

register_prompt_routes(app)


from api.admin import register_admin_routes

register_admin_routes(app)

from api.notifications import register_notifications_routes

register_notifications_routes(app)

from api.profile import register_profile_routes

register_profile_routes(app)

from api.leaderboard import register_leaderboard_routes

register_leaderboard_routes(app)

from api.pages import register_pages_routes

register_pages_routes(app)


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    """Раздача файлов из папки uploads в корне проекта"""
   # upload_folder = os.path.join(
   #     os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
   # )
   # return send_from_directory(upload_folder, filename)
    """Раздача файлов из папки uploads в контейнере"""
    return send_from_directory('/app/uploads', filename)


# Тестовый маршрут
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Flask работает!"})


@app.route("/api/test", methods=["GET"])
def test_db():
    try:
        db.session.execute("SELECT 1")
        return jsonify({"status": "ok", "message": "База данных подключена"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
