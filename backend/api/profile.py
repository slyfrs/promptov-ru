# backend/api/profile.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User, db
from models.prompt import Prompt, Rating  # ← добавить Rating
from datetime import datetime
from models.prompt import Prompt, Rating, Tag


def register_profile_routes(app):
    # ==================== ПУБЛИЧНЫЙ ПРОФИЛЬ ====================

    @app.route("/api/profile/<int:user_id>", methods=["GET"])
    def get_public_profile(user_id):
        """Получить публичный профиль пользователя"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        # Получаем статистику пользователя (только опубликованные промпты)
        prompts_count = Prompt.query.filter_by(
            user_id=user_id, status="published"
        ).count()
        total_likes = sum(
            p.ratings_count
            for p in Prompt.query.filter_by(user_id=user_id, status="published")
        )

        return jsonify(
            {
                "user": user.to_dict(include_private=False),
                "stats": {"prompts_count": prompts_count, "total_likes": total_likes},
            }
        ), 200

    # ==================== ПРОМПТЫ ПОЛЬЗОВАТЕЛЯ ====================

    @app.route("/api/profile/<int:user_id>/prompts", methods=["GET"])
    @jwt_required(optional=True)
    def get_user_prompts(user_id):
        """Получить опубликованные промпты пользователя с фильтрацией"""
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 12, type=int)
        sort = request.args.get("sort", "newest")
        search_query = request.args.get("search", "")
        neural_filter = request.args.get("neural", "")
        lang = request.args.get("lang", "ru")

        # Проверяем, существует ли пользователь
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        query = Prompt.query.filter_by(user_id=user_id, status="published")

        # Поиск по названию, содержимому, описанию
        if search_query:
            query = query.filter(
                db.or_(
                    Prompt.title.ilike(f"%{search_query}%"),
                    Prompt.content.ilike(f"%{search_query}%"),
                    Prompt.description.ilike(f"%{search_query}%"),
                )
            )

        # Фильтр по нейросети
        if neural_filter:
            if lang == "ru":
                tag = Tag.query.filter(
                    Tag.name_ru == neural_filter, Tag.type == "ai_model"
                ).first()
            else:
                tag = Tag.query.filter(
                    Tag.name_en == neural_filter, Tag.type == "ai_model"
                ).first()

            if tag:
                query = query.filter(Prompt.tags.any(Tag.id == tag.id))

        # Сортировка
        if sort == "popular":
            query = query.order_by(Prompt.ratings_count.desc(), Prompt.id.desc())
        elif sort == "oldest":
            query = query.order_by(Prompt.published_at.asc(), Prompt.id.asc())
        else:  # newest
            query = query.order_by(Prompt.published_at.desc(), Prompt.id.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Получаем текущего пользователя для проверки лайков
        current_user_id = get_jwt_identity()
        if current_user_id:
            current_user_id = int(current_user_id)
        else:
            current_user_id = None

        # ✅ ОПТИМИЗАЦИЯ: загружаем все лайки текущего пользователя одним запросом
        liked_prompt_ids = set()
        if current_user_id:
            likes = (
                Rating.query.filter_by(user_id=current_user_id)
                .with_entities(Rating.prompt_id)
                .all()
            )
            liked_prompt_ids = {like[0] for like in likes}

        return jsonify(
            {
                "prompts": [
                    p.to_dict(
                        include_user=True,
                        current_user_id=current_user_id,
                        liked_prompt_ids=liked_prompt_ids,
                        lang=lang,
                    )
                    for p in paginated.items
                ],
                "total": paginated.total,
                "page": page,
                "per_page": per_page,
                "pages": paginated.pages,
            }
        ), 200

        # return jsonify(
        #     {
        #         "prompts": [
        #             p.to_dict(include_user=True, current_user_id=current_user_id)
        #             for p in paginated.items
        #         ],
        #         "total": paginated.total,
        #         "page": page,
        #         "pages": paginated.pages,
        #     }
        # ), 200

    # ==================== СМЕНА ПАРОЛЯ ====================

    @app.route("/api/profile/change-password", methods=["POST"])
    @jwt_required()
    def change_password():
        """Смена пароля"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        data = request.get_json()
        old_password = data.get("old_password")
        new_password = data.get("new_password")

        if not old_password or not new_password:
            return jsonify({"error": "Все поля обязательны"}), 400

        # Проверяем старый пароль
        if not user.check_password(old_password):
            return jsonify({"error": "Неверный текущий пароль"}), 401

        # Проверяем длину нового пароля
        if len(new_password) < 6:
            return jsonify(
                {"error": "Новый пароль должен быть не менее 6 символов"}
            ), 400

        # Устанавливаем новый пароль
        user.set_password(new_password)
        db.session.commit()

        return jsonify({"message": "Пароль успешно изменён"}), 200

    # ==================== ПРИВАТНЫЙ ПРОФИЛЬ (СВОЙ) ====================

    @app.route("/api/profile/me", methods=["GET"])
    @jwt_required()
    def get_my_profile():
        """Получить свой профиль (с приватными данными)"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        return jsonify({"user": user.to_dict(include_private=True)}), 200

    @app.route("/api/profile/me", methods=["PUT"])
    @jwt_required()
    def update_my_profile():
        """Обновить свой профиль"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        data = request.get_json()

        # Обновляем поля
        if "bio" in data:
            user.bio = data["bio"]
        if "birth_date" in data:
            user.birth_date = (
                datetime.strptime(data["birth_date"], "%Y-%m-%d").date()
                if data["birth_date"]
                else None
            )
        if "city" in data:
            user.city = data["city"]
        if "telegram" in data:
            user.telegram = data["telegram"]
        if "github" in data:
            user.github = data["github"]
        if "website" in data:
            user.website = data["website"]
        if "privacy_settings" in data:
            user.privacy_settings = data["privacy_settings"]

        db.session.commit()

        return jsonify({"user": user.to_dict(include_private=True)}), 200
