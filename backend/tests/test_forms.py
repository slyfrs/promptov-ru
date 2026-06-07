# backend/tests/test_forms.py
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import json
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

from app import app
from models.user import db, User
from models.prompt import Prompt, Tag, Comment


# Добавь в начало файла
from werkzeug.datastructures import Headers


def get_token_from_response(response):
    """Извлекает access_token из cookies ответа"""
    for header in response.headers.getlist("Set-Cookie"):
        if "access_token_cookie" in header:
            # Извлекаем значение токена
            start = header.find("access_token_cookie=") + len("access_token_cookie=")
            end = header.find(";", start)
            return header[start:end]
    return None


@pytest.fixture
def client():
    """Тестовый клиент Flask с тестовой БД"""

    # Используем тестовую БД
    test_db_url = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:test15347/promptov_test",
    )

    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = test_db_url
    app.config["JWT_SECRET_KEY"] = "test-secret-key-32-bytes-long!!!!!"
    app.config["WTF_CSRF_ENABLED"] = False
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]

    with app.test_client() as client:
        with app.app_context():
            # Очищаем тестовую БД перед каждым тестом (но не удаляем структуру)
            _clean_test_db()

            # Создаём тестовые данные
            _create_test_data()

            yield client

            # Очищаем тестовую БД после тестов
            _clean_test_db()


def _clean_test_db():
    """Очистка тестовой БД (без удаления таблиц)"""
    from sqlalchemy import text

    # Очищаем таблицы в правильном порядке (из-за внешних ключей)
    db.session.execute(text("TRUNCATE TABLE comments CASCADE;"))
    db.session.execute(text("TRUNCATE TABLE ratings CASCADE;"))
    db.session.execute(text("TRUNCATE TABLE prompt_tags CASCADE;"))
    db.session.execute(text("TRUNCATE TABLE prompts CASCADE;"))
    db.session.execute(text("TRUNCATE TABLE tags CASCADE;"))
    db.session.execute(text("TRUNCATE TABLE users CASCADE;"))
    db.session.commit()


def _create_test_data():
    """Создание тестовых данных"""

    # Создаём теги (нейросети)
    tags = [
        Tag(name="ChatGPT", type="ai_model", icon="Bot"),
        Tag(name="DeepSeek", type="ai_model", icon="Cpu"),
        Tag(name="Midjourney", type="ai_model", icon="Zap"),
    ]
    for tag in tags:
        db.session.add(tag)
    db.session.flush()

    # Создаём тестового пользователя
    user = User(
        email="test@example.com",
        username="testuser",
        email_confirmed=True,
        is_blocked=False,
        role="user",
        privacy_settings={
            "bio": True,
            "birth_date": False,
            "city": True,
            "telegram": True,
            "github": True,
            "website": True,
        },
    )
    user.set_password("test123")
    db.session.add(user)

    # Создаём тестового админа
    admin = User(
        email="admin@test.com",
        username="admintest",
        email_confirmed=True,
        is_blocked=False,
        role="admin",
        privacy_settings={
            "bio": True,
            "birth_date": False,
            "city": True,
            "telegram": True,
            "github": True,
            "website": True,
        },
    )
    admin.set_password("admin123")
    db.session.add(admin)

    db.session.flush()

    # Создаём тестовый промпт
    prompt = Prompt(
        user_id=user.id,
        title="Test Prompt",
        content="Test content for prompt",
        description="Test description",
        status="published",
        theme="Программирование",
        ratings_count=10,
    )
    db.session.add(prompt)

    db.session.commit()
    print("✅ Тестовые данные созданы в БД promptov_test")


# ============ ТЕСТЫ РЕГИСТРАЦИИ ============
class TestRegistrationForm:
    def test_empty_form(self, client):
        response = client.post("/api/auth/register", json={})
        assert response.status_code == 400
        assert "error" in response.json

    def test_invalid_email(self, client):
        data = {"email": "invalid", "username": "testuser2", "password": "test123"}
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 400
        assert "Неверный формат email" in response.json["error"]

    def test_short_username(self, client):
        data = {"email": "test2@example.com", "username": "ab", "password": "test123"}
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 400
        assert "от 3 до 50" in response.json["error"]

    def test_long_username(self, client):
        data = {
            "email": "test2@example.com",
            "username": "a" * 51,
            "password": "test123",
        }
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 400
        assert "от 3 до 50" in response.json["error"]

    def test_short_password(self, client):
        data = {
            "email": "test2@example.com",
            "username": "testuser2",
            "password": "12345",
        }
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 400
        assert "не менее 6 символов" in response.json["error"]

    def test_duplicate_email(self, client):
        data = {
            "email": "test@example.com",
            "username": "testuser2",
            "password": "test123",
        }
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 409
        assert "уже существует" in response.json["error"]

    def test_duplicate_username(self, client):
        data = {
            "email": "new@example.com",
            "username": "testuser",
            "password": "test123",
        }
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 409
        assert "уже существует" in response.json["error"]

    def test_valid_registration(self, client):
        data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "test123",
        }
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 201
        assert "Регистрация успешна" in response.json["message"]


# ============ ТЕСТЫ ВХОДА ============
class TestLoginForm:
    def test_empty_form(self, client):
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 400

    def test_wrong_password(self, client):
        data = {"email": "test@example.com", "password": "wrongpassword"}
        response = client.post("/api/auth/login", json=data)
        assert response.status_code == 401
        assert "Неверные учётные данные" in response.json["error"]

    def test_nonexistent_user(self, client):
        data = {"email": "nonexistent@example.com", "password": "test123"}
        response = client.post("/api/auth/login", json=data)
        assert response.status_code == 401

    def test_valid_login(self, client):
        data = {"email": "test@example.com", "password": "test123"}
        response = client.post("/api/auth/login", json=data)
        assert response.status_code == 200

        # Токен должен быть в cookies, а не в JSON
        token = get_token_from_response(response)
        assert token is not None, "Token not found in cookies"
        assert response.json["message"] == "Вход успешен"


# ============ ТЕСТЫ КОММЕНТАРИЕВ ============
class TestComments:
    def test_empty_comment(self, client):
        # Логинимся и получаем токен из cookies
        login_resp = client.post(
            "/api/auth/login", json={"email": "test@example.com", "password": "test123"}
        )
        token = get_token_from_response(login_resp)

        response = client.post(
            "/api/prompts/1/comments",
            json={"content": ""},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert "обязателен" in response.json["error"]

    def test_short_comment(self, client):
        login_resp = client.post(
            "/api/auth/login", json={"email": "test@example.com", "password": "test123"}
        )
        token = get_token_from_response(login_resp)

        response = client.post(
            "/api/prompts/1/comments",
            json={"content": "a"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert "минимум 2 символа" in response.json["error"]

    def test_long_comment(self, client):
        login_resp = client.post(
            "/api/auth/login", json={"email": "test@example.com", "password": "test123"}
        )
        token = get_token_from_response(login_resp)

        long_text = "x" * 2001
        response = client.post(
            "/api/prompts/1/comments",
            json={"content": long_text},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert "2000 символов" in response.json["error"]


# ============ ТЕСТЫ ПРОФИЛЯ ============
class TestProfileSettings:
    def test_get_my_profile(self, client):
        login_resp = client.post(
            "/api/auth/login", json={"email": "test@example.com", "password": "test123"}
        )
        token = get_token_from_response(login_resp)

        response = client.get(
            "/api/profile/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json["user"]["username"] == "testuser"

    def test_update_profile(self, client):
        login_resp = client.post(
            "/api/auth/login", json={"email": "test@example.com", "password": "test123"}
        )
        token = get_token_from_response(login_resp)

        data = {"bio": "New bio", "city": "New York"}
        response = client.put(
            "/api/profile/me", json=data, headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        # Проверяем, что обновилось
        get_response = client.get(
            "/api/profile/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.json["user"]["bio"] == "New bio"


# ============ ТЕСТЫ ВОССТАНОВЛЕНИЯ ПАРОЛЯ ============
class TestPasswordReset:
    def test_forgot_password_empty_email(self, client):
        response = client.post("/api/auth/forgot-password", json={})
        assert response.status_code == 400

    def test_forgot_password_valid_email(self, client):
        response = client.post(
            "/api/auth/forgot-password", json={"email": "test@example.com"}
        )
        assert response.status_code == 200

    def test_reset_password_short_new(self, client):
        data = {"token": "test-token", "new_password": "12345"}
        response = client.post("/api/auth/reset-password", json=data)
        assert response.status_code == 400
        assert "не менее 6 символов" in response.json["error"]


# ============ ЗАПУСК ============
def run_tests():
    """Запуск всех тестов"""
    print("\n" + "=" * 60)
    print("🚀 ЗАПУСК ТЕСТОВ ФОРМ")
    print("=" * 60 + "\n")
    print("📊 Используется БД: promptov_test")
    print("⚠️  ВНИМАНИЕ: Тестовая БД будет очищена перед каждым тестом!")
    print("   Ваша основная БД PostgreSQL НЕ будет затронута!\n")

    # Проверяем подключение к тестовой БД
    try:
        with app.app_context():
            from sqlalchemy import text

            db.session.execute(text("SELECT 1"))
            print("✅ Подключение к тестовой БД успешно\n")
    except Exception as e:
        print(f"❌ Ошибка подключения к тестовой БД: {e}")
        print("   Проверьте TEST_DATABASE_URL в .env")
        return 1

    # Запускаем тесты
    exit_code = pytest.main(["-v", "--tb=short", __file__])

    if exit_code == 0:
        print("\n✅ Все тесты пройдены успешно!")
    else:
        print("\n❌ Некоторые тесты не пройдены")

    return exit_code


if __name__ == "__main__":
    run_tests()
