from flask import request, jsonify, make_response
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from models.user import User, db
import re
import os
from werkzeug.utils import secure_filename
from PIL import Image
from schemas import UserRegisterSchema, UserLoginSchema, ValidationError
from utils.rate_limit import rate_limit

# В начале файла auth.py, замени импорт:
from utils.email import (
    send_verification_email,
    send_password_reset_email,
    confirm_token,
    verify_reset_token,
)
# from utils.rate_limit import rate_limit


def allowed_file(filename):
    """Проверка разрешённого расширения файла"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# Добавь в начало файла после импортов
UPLOAD_FOLDER = "uploads/avatars"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def register_routes(app):
    @rate_limit("5 per minute")
    @app.route("/api/auth/register", methods=["POST"])
    def register():
        """Регистрация нового пользователя с отправкой письма для подтверждения email"""
        data = request.get_json()

        # Валидация
        try:
            UserRegisterSchema().load(data)
        except ValidationError as err:
            return jsonify({"error": err.messages}), 400

        # Валидация обязательных полей
        if (
            not data
            or not data.get("email")
            or not data.get("password")
            or not data.get("username")
        ):
            return jsonify({"error": "Email, username и password обязательны"}), 400

        email = data["email"].lower()
        username = data["username"]
        password = data["password"]

        # Простая валидация email
        if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email):
            return jsonify({"error": "Неверный формат email"}), 400

        # Проверка длины username
        if len(username) < 3 or len(username) > 50:
            return jsonify({"error": "Username должен быть от 3 до 50 символов"}), 400

        # Проверка длины пароля
        if len(password) < 6:
            return jsonify({"error": "Пароль должен быть не менее 6 символов"}), 400

        # Проверка на уникальность email
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Пользователь с таким email уже существует"}), 409

        # Проверка на уникальность username
        if User.query.filter_by(username=username).first():
            return jsonify(
                {"error": "Пользователь с таким username уже существует"}
            ), 409

        # Создание пользователя
        user = User(email=email, username=username)
        user.set_password(password)
        user.email_confirmed = False  # Email не подтверждён

        db.session.add(user)
        db.session.commit()

        # Отправка письма с подтверждением (в фоне, чтобы не задерживать ответ)
        try:
            from api.email import send_verification_email

            send_verification_email(user)
        except Exception as e:
            print(f"Ошибка отправки письма: {e}")
            # Не возвращаем ошибку пользователю, просто логируем

        # Создаём токены для автоматического входа после регистрации (опционально)
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        response = make_response(
            jsonify(
                {
                    "message": "Регистрация успешна! На ваш email отправлено письмо с подтверждением.",
                    "user": user.to_dict(),
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                }
            ),
            201,
        )

        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)

        return response

    # Подтверждение email
    @app.route("/api/auth/verify-email", methods=["POST"])
    @rate_limit("10 per minute")
    def verify_email():
        """Подтверждение email по токену"""
        data = request.get_json()
        token = data.get("token")

        if not token:
            return jsonify({"error": "Токен не предоставлен"}), 400

        email = confirm_token(token)
        if not email:
            return jsonify({"error": "Неверный или истёкший токен"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        if user.email_confirmed:
            return jsonify({"message": "Email уже подтверждён"}), 200

        user.email_confirmed = True
        db.session.commit()

        return jsonify(
            {"message": "Email успешно подтверждён! Теперь вы можете войти."}
        ), 200

    # Запрос на восстановление пароля

    @app.route("/api/auth/forgot-password", methods=["POST"])
    @rate_limit("3 per minute")
    def forgot_password():
        """Отправка письма для сброса пароля"""
        data = request.get_json()
        email = data.get("email")

        if not email:
            return jsonify({"error": "Email обязателен"}), 400

        # Валидация формата email
        email_pattern = r"^[^\s@]+@([^\s@]+\.)+[^\s@]+$"
        if not re.match(email_pattern, email):
            return jsonify({"error": "Неверный формат email"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            # Безопасность: не сообщаем, что пользователь не найден
            return jsonify(
                {
                    "message": "Если пользователь с таким email существует, инструкция по сбросу пароля будет отправлена."
                }
            ), 200

        try:
            from utils.email import send_password_reset_email

            send_password_reset_email(user)
        except Exception as e:
            print(f"Ошибка отправки письма: {e}")

        return jsonify(
            {
                "message": "Если пользователь с таким email существует, инструкция по сбросу пароля будет отправлена."
            }
        ), 200

    # Сброс пароля
    @app.route("/api/auth/reset-password", methods=["POST"])
    def reset_password():
        """Сброс пароля по токену"""
        data = request.get_json()
        token = data.get("token")
        new_password = data.get("new_password")

        if not token or not new_password:
            return jsonify({"error": "Токен и новый пароль обязательны"}), 400

        if len(new_password) < 6:
            return jsonify({"error": "Пароль должен быть не менее 6 символов"}), 400

        email = verify_reset_token(token)
        if not email:
            return jsonify({"error": "Неверный или истёкший токен"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        user.set_password(new_password)
        db.session.commit()

        return jsonify(
            {"message": "Пароль успешно изменён! Теперь вы можете войти."}
        ), 200

    @app.route("/api/auth/resend-verification", methods=["POST"])
    @rate_limit("3 per minute")
    @jwt_required()
    def resend_verification():
        """Повторная отправка письма с подтверждением"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        if user.email_confirmed:
            return jsonify({"message": "Email уже подтверждён"}), 200

        try:
            from utils.email import send_verification_email

            send_verification_email(user)
        except Exception as e:
            print(f"Ошибка отправки письма: {e}")
            return jsonify({"error": "Ошибка при отправке письма"}), 500

        return jsonify({"message": "Письмо с подтверждением отправлено повторно"}), 200

    # @rate_limit("5 per minute")
    @app.route("/api/auth/login", methods=["POST"])
    @rate_limit("10 per minute")
    def login():
        data = request.get_json()

        try:
            UserLoginSchema().load(data)
        except ValidationError as err:
            return jsonify({"error": err.messages}), 400

        if not data or not data.get("password"):
            return jsonify({"error": "Password обязателен"}), 400

        login_input = data.get("email") or data.get("username")
        password = data["password"]

        if not login_input:
            return jsonify({"error": "Укажите email или username"}), 400

        user = User.query.filter(
            (User.email == login_input.lower()) | (User.username == login_input)
        ).first()

        if not user or not user.check_password(password):
            return jsonify({"error": "Неверные учётные данные"}), 401

        if user.is_blocked:
            return jsonify({"error": "Ваш аккаунт заблокирован"}), 403

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        response = make_response(
            jsonify({"message": "Вход успешен", "user": user.to_dict()}), 200
        )

        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)

        return response

    @app.route("/api/auth/refresh", methods=["POST"])
    @jwt_required(refresh=True)
    def refresh():
        current_user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user_id)

        response = make_response(jsonify({"message": "Токен обновлён"}), 200)
        set_access_cookies(response, new_access_token)

        return response

    @app.route("/api/auth/me", methods=["GET"])
    @jwt_required()
    def get_me():
        """Получение информации о текущем пользователе"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        if user.is_blocked:
            return jsonify({"error": "Аккаунт заблокирован"}), 403

        return jsonify({"user": user.to_dict()}), 200

    @app.route("/api/auth/logout", methods=["POST"])
    @jwt_required()
    def logout():
        response = make_response(jsonify({"message": "Выход выполнен"}), 200)
        unset_jwt_cookies(response)
        return response

    # Добавь эндпоинт в конец register_routes
    @app.route("/api/auth/avatar", methods=["POST"])
    @jwt_required()
    def upload_avatar():
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        if "avatar" not in request.files:
            return jsonify({"error": "Файл не найден"}), 400

        file = request.files["avatar"]
        if file.filename == "":
            return jsonify({"error": "Файл не выбран"}), 400

        if file and allowed_file(file.filename):
            # Создаём папку если нет
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)

            # Генерируем уникальное имя
            ext = file.filename.rsplit(".", 1)[1].lower()
            filename = secure_filename(f"avatar_{user_id}_{user.username}.{ext}")
            filepath = os.path.join(UPLOAD_FOLDER, filename)

            # Ресайзим изображение
            img = Image.open(file)
            img.thumbnail((200, 200))
            img.save(filepath)

            # Сохраняем URL
            user.avatar_url = f"/uploads/avatars/{filename}"
            db.session.commit()

            return jsonify({"avatar_url": user.avatar_url}), 200

        return jsonify(
            {"error": "Неподдерживаемый формат. Используйте PNG, JPG, JPEG, GIF"}
        ), 400
