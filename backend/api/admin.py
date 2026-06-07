from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User, db
from models.prompt import Prompt, Tag, Comment
from api.notifications import create_notification
from datetime import datetime
from utils.roles import role_required, is_super_admin, SUPER_ADMIN_ID


def register_admin_routes(app):
    """Регистрирует все админ-эндпоинты"""

    # Проверка прав админа
    # def admin_required():
    #     user_id = get_jwt_identity()
    #     if not user_id:
    #         return False
    #     user = User.query.get(int(user_id))
    #     return user and user.role == "admin"

    # ==================== Управление промптами ====================

    # Получить все промпты на модерацию
    @app.route("/api/admin/prompts/pending", methods=["GET"])
    @jwt_required()
    @role_required(["moderator", "admin"])
    def get_pending_prompts():
        # print("=== get_pending_prompts called ===")
        # user_id = get_jwt_identity()
        # print(f"User ID: {user_id}")
        # user = User.query.get(int(user_id))
        # print(f"User role: {user.role}")

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        prompts = (
            Prompt.query.filter_by(status="pending")
            .order_by(Prompt.created_at.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

        return jsonify(
            {
                "prompts": [p.to_dict(include_user=True) for p in prompts.items],
                "total": prompts.total,
                "page": page,
                "pages": prompts.pages,
            }
        ), 200

    # Получить все промпты (с фильтрацией по статусу)
    @app.route("/api/admin/prompts", methods=["GET"])
    @jwt_required()
    @role_required(["admin"])
    def get_all_prompts():
        status = request.args.get("status", None)
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        query = Prompt.query
        if status:
            query = query.filter_by(status=status)

        prompts = query.order_by(Prompt.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify(
            {
                "prompts": [p.to_dict(include_user=True) for p in prompts.items],
                "total": prompts.total,
                "page": page,
                "pages": prompts.pages,
            }
        ), 200

    # Одобрить промпт
    @app.route("/api/admin/prompts/<int:prompt_id>/approve", methods=["POST"])
    @jwt_required()
    @role_required(["moderator", "admin"])
    def approve_prompt(prompt_id):
        prompt = Prompt.query.get(prompt_id)
        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        if prompt.status != "pending":
            return jsonify(
                {
                    "error": f'Промпт уже имеет статус "{prompt.status}". Можно одобрить только промпты на модерации.'
                }
            ), 400

        prompt.status = "published"
        prompt.published_at = datetime.utcnow()
        db.session.commit()

        # Отправляем уведомление автору
        create_notification(
            user_id=prompt.user_id,
            title="✅ Промпт опубликован!",
            message=f'Ваш промпт "{prompt.title}" успешно прошёл модерацию и теперь доступен всем пользователям.',
        )

        return jsonify({"message": "Промпт опубликован"}), 200

    # Отклонить промпт
    @app.route("/api/admin/prompts/<int:prompt_id>/reject", methods=["POST"])
    @jwt_required()
    @role_required(["moderator", "admin"])
    def reject_prompt(prompt_id):
        prompt = Prompt.query.get(prompt_id)
        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        if prompt.status != "pending":
            return jsonify(
                {
                    "error": f'Промпт уже имеет статус "{prompt.status}". Можно отклонить только промпты на модерации.'
                }
            ), 400

        data = request.get_json()
        reason = data.get("reason", "Не указана причина")

        prompt.status = "rejected"
        db.session.commit()

        # Отправляем уведомление автору
        create_notification(
            user_id=prompt.user_id,
            title="❌ Промпт отклонён",
            message=f'Ваш промпт "{prompt.title}" не прошёл модерацию.\nПричина: {reason}\nВы можете отредактировать промпт и отправить его на модерацию снова.',
        )

        return jsonify({"message": "Промпт отклонён"}), 200

    # Удалить любой промпт (админское удаление)
    @app.route("/api/admin/prompts/<int:prompt_id>", methods=["DELETE"])
    @jwt_required()
    @role_required(["admin"])
    def admin_delete_prompt(prompt_id):
        prompt = Prompt.query.get(prompt_id)
        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        title = prompt.title
        db.session.delete(prompt)
        db.session.commit()

        # Отправляем уведомление автору
        from api.notifications import create_notification

        create_notification(
            user_id=prompt.user_id,
            title="🗑️ Промпт удалён администратором",
            message=f'Ваш промпт "{title}" был удалён администратором.',
        )

        return jsonify({"message": f'Промпт "{title}" удалён'}), 200

    # ==================== Управление пользователями ====================
    # Получить всех пользователей (только админ)
    @app.route("/api/admin/users", methods=["GET"])
    @jwt_required()
    @role_required(["admin"])
    def get_users():
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        users = User.query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        users_list = []
        for u in users.items:
            user_dict = u.to_dict()
            user_dict["email"] = u.email  # принудительно добавляем email
            users_list.append(user_dict)

        return jsonify(
            {
                # "users": [u.to_dict() for u in users.items],
                "users": users_list,
                "total": users.total,
                "page": page,
                "pages": users.pages,
            }
        ), 200

    # Получить конкретного пользователя (только админ)
    @app.route("/api/admin/users/<int:user_id>", methods=["GET"])
    @jwt_required()
    @role_required(["admin"])
    def get_user(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        return jsonify({"user": user.to_dict()}), 200

    # Назначить модератора (только админ)
    @app.route("/api/admin/users/<int:user_id>/make-moderator", methods=["POST"])
    @jwt_required()
    @role_required(["admin"])
    def make_moderator(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        # Защита суперадмина
        if is_super_admin(user_id):
            return jsonify({"error": "Невозможно изменить роль суперадмина"}), 400

        if user.id == int(get_jwt_identity()):
            return jsonify({"error": "Нельзя изменить свою роль"}), 400

        if user.role == "admin":
            return jsonify({"error": "Нельзя изменить роль администратора"}), 400

        user.role = "moderator"
        db.session.commit()

        from api.notifications import create_notification

        create_notification(
            user_id=user.id,
            title="👮 Назначен модератором",
            message=f"Поздравляем! Вы были назначены модератором Promptov.ru.",
        )

        return jsonify(
            {"message": f"Пользователь {user.username} назначен модератором"}
        ), 200

    # Снять права модератора (только админ)
    @app.route("/api/admin/users/<int:user_id>/remove-moderator", methods=["POST"])
    @jwt_required()
    @role_required(["admin"])
    def remove_moderator(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        # Защита суперадмина
        if is_super_admin(user_id):
            return jsonify({"error": "Невозможно изменить роль суперадмина"}), 400

        if user.role != "moderator":
            return jsonify({"message": "Пользователь не является модератором"}), 200

        user.role = "user"
        db.session.commit()

        from api.notifications import create_notification

        create_notification(
            user_id=user.id,
            title="👤 Права модератора сняты",
            message=f"Ваши права модератора были сняты.",
        )

        return jsonify(
            {"message": f"Права модератора сняты с пользователя {user.username}"}
        ), 200

    # Назначить администратора (только админ)
    @app.route("/api/admin/users/<int:user_id>/make-admin", methods=["POST"])
    @jwt_required()
    @role_required(["admin"])
    def make_admin(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        if is_super_admin(user_id):
            return jsonify({"error": "Суперадмин уже является администратором"}), 400

        if user.id == int(get_jwt_identity()):
            return jsonify({"error": "Нельзя изменить свою роль"}), 400

        user.role = "admin"
        db.session.commit()

        from api.notifications import create_notification

        create_notification(
            user_id=user.id,
            title="👑 Назначен администратором",
            message=f"Поздравляем! Вы были назначены администратором Promptov.ru.",
        )

        return jsonify(
            {"message": f"Пользователь {user.username} назначен администратором"}
        ), 200

    # Снять права администратора (только админ)
    @app.route("/api/admin/users/<int:user_id>/remove-admin", methods=["POST"])
    @jwt_required()
    @role_required(["admin"])
    def remove_admin(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        # Защита суперадмина
        if is_super_admin(user_id):
            return jsonify(
                {"error": "Невозможно снять права администратора с суперадмина"}
            ), 400

        if user.id == int(get_jwt_identity()):
            return jsonify(
                {"error": "Нельзя снять права администратора с самого себя"}
            ), 400

        if user.role != "admin":
            return jsonify({"message": "Пользователь не является администратором"}), 200

        user.role = "user"
        db.session.commit()

        from api.notifications import create_notification

        create_notification(
            user_id=user.id,
            title="👤 Права администратора сняты",
            message=f"Ваши права администратора были сняты.",
        )

        return jsonify(
            {"message": f"Права администратора сняты с пользователя {user.username}"}
        ), 200

    # Заблокировать/разблокировать пользователя (только админ)
    @app.route("/api/admin/users/<int:user_id>/block", methods=["POST"])
    @jwt_required()
    @role_required(["admin"])
    def toggle_block_user(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        # Защита суперадмина
        if is_super_admin(user_id):
            return jsonify({"error": "Невозможно заблокировать суперадмина"}), 400

        if user.id == int(get_jwt_identity()):
            return jsonify({"error": "Нельзя заблокировать самого себя"}), 400

        user.is_blocked = not user.is_blocked
        db.session.commit()

        status = "заблокирован" if user.is_blocked else "разблокирован"

        from api.notifications import create_notification

        if user.is_blocked:
            create_notification(
                user_id=user.id,
                title="🔒 Аккаунт заблокирован",
                message=f"Ваш аккаунт был заблокирован администратором.",
            )
        else:
            create_notification(
                user_id=user.id,
                title="🔓 Аккаунт разблокирован",
                message=f"Ваш аккаунт был разблокирован администратором.",
            )

        return jsonify({"message": f"Пользователь {status}"}), 200

    # ==================== Управление тегами (нейросетями) ====================
    # В функцию get_tags добавь фильтр по типу (или создай отдельный эндпоинт)

    @app.route("/api/admin/categories", methods=["GET"])
    @jwt_required()
    @role_required(["moderator", "admin"])
    def get_categories():
        lang = request.args.get("lang", "ru")
        categories = Tag.query.filter_by(type="category").all()
        return jsonify({"categories": [c.to_dict(lang) for c in categories]}), 200

    # Получить все теги
    @app.route("/api/admin/tags", methods=["GET"])
    @jwt_required()
    @role_required(["moderator", "admin"])
    def get_tags():
        # tag_type = request.args.get("type", "ai_model")  # по умолчанию нейросети
        # tags = Tag.query.filter_by(type=tag_type).all()
        # return jsonify({"tags": [t.to_dict() for t in tags]}), 200
        tag_type = request.args.get("type", "ai_model")
        lang = request.args.get("lang", "ru")
        tags = Tag.query.filter_by(type=tag_type).all()
        return jsonify({"tags": [t.to_dict(lang) for t in tags]}), 200

    # Добавить новый тег (нейросеть)
    @app.route("/api/admin/tags", methods=["POST"])
    @jwt_required()
    @role_required(["admin"])
    def add_tag():
        data = request.get_json()
        # name = data.get("name")
        name_ru = data.get("name_ru")
        name_en = data.get("name_en")
        tag_type = data.get("type", "ai_model")
        icon = data.get("icon", None)  # ← новое поле

        if not name_ru or not name_en:
            return jsonify({"error": "Русское и английское названия обязательны"}), 400

        existing = Tag.query.filter_by(name_ru=name_ru).first()
        if existing:
            return jsonify(
                {"error": "Тег с таким русским названием уже существует"}
            ), 409

        existing_en = Tag.query.filter_by(name_en=name_en).first()
        if existing_en:
            return jsonify(
                {"error": "Тег с таким английским названием уже существует"}
            ), 409

        tag = Tag(
            name=name_ru, name_ru=name_ru, name_en=name_en, type=tag_type, icon=icon
        )
        db.session.add(tag)
        db.session.commit()

        return jsonify({"tag": tag.to_dict(), "message": "Тег добавлен"}), 201

    @app.route("/api/admin/tags/<int:tag_id>", methods=["PUT"])
    @jwt_required()
    @role_required(["admin"])
    def update_tag(tag_id):
        """Обновить тег (иконку или название)"""

        tag = Tag.query.get(tag_id)
        if not tag:
            return jsonify({"error": "Тег не найден"}), 404

        data = request.get_json()
        if "icon" in data:
            tag.icon = data["icon"]
        # if "name" in data:
        #     tag.name = data["name"]
        if "name_ru" in data:
            tag.name_ru = data["name_ru"]
        if "name_en" in data:
            tag.name_en = data["name_en"]

        db.session.commit()
        return jsonify({"tag": tag.to_dict(), "message": "Тег обновлён"}), 200

    # эндпоинт для получения статистики по тегу
    @app.route("/api/admin/tags/<int:tag_id>/stats", methods=["GET"])
    @jwt_required()
    @role_required(["admin"])
    def get_tag_stats(tag_id):
        tag = Tag.query.get(tag_id)
        if not tag:
            return jsonify({"error": "Тег не найден"}), 404

        if tag.type == "category":
            prompts_count = Prompt.query.filter_by(theme=tag.name).count()
        else:
            prompts_count = len(tag.prompts)

        return jsonify(
            {"tag_name": tag.name, "tag_type": tag.type, "prompts_count": prompts_count}
        ), 200

    # Удалить тег
    @app.route("/api/admin/tags/<int:tag_id>", methods=["DELETE"])
    @jwt_required()
    @role_required(["admin"])
    def delete_tag(tag_id):
        tag = Tag.query.get(tag_id)
        if not tag:
            return jsonify({"error": "Тег не найден"}), 404

        # Проверка для категорий (type = 'category')
        if tag.type == "category":
            # Считаем промпты с этой темой
            prompts_with_theme = Prompt.query.filter_by(theme=tag.name).count()
            if prompts_with_theme > 0:
                return jsonify(
                    {
                        "error": f'Невозможно удалить категорию "{tag.name}". Существует {prompts_with_theme} промпт(ов) с этой темой. Сначала измените тему у этих промптов.'
                    }
                ), 400

        # Проверка для нейросетей (type = 'ai_model')
        if tag.type == "ai_model":
            # Считаем промпты, у которых есть этот тег
            prompts_with_tag = len(tag.prompts)  # через relationship
            if prompts_with_tag > 0:
                return jsonify(
                    {
                        "error": f'Невозможно удалить нейросеть "{tag.name}". Существует {prompts_with_tag} промпт(ов) с этим тегом. Сначала удалите тег у этих промптов.'
                    }
                ), 400

        db.session.delete(tag)
        db.session.commit()

        return jsonify({"message": f'Тег "{tag.name}" удалён'}), 200

    # ==================== Статистика ====================

    # Получить общую статистику
    @app.route("/api/admin/stats", methods=["GET"])
    @jwt_required()
    @role_required(["admin"])
    def get_stats():
        total_users = User.query.count()
        total_prompts = Prompt.query.count()
        published_prompts = Prompt.query.filter_by(status="published").count()
        pending_prompts = Prompt.query.filter_by(status="pending").count()
        private_prompts = Prompt.query.filter_by(status="private").count()
        rejected_prompts = Prompt.query.filter_by(status="rejected").count()

        # Топ-10 промптов по рейтингу
        top_prompts = (
            Prompt.query.filter_by(status="published")
            .order_by(Prompt.ratings_count.desc())
            .limit(10)
            .all()
        )

        return jsonify(
            {
                "stats": {
                    "total_users": total_users,
                    "total_prompts": total_prompts,
                    "published_prompts": published_prompts,
                    "pending_prompts": pending_prompts,
                    "private_prompts": private_prompts,
                    "rejected_prompts": rejected_prompts,
                },
                "top_prompts": [p.to_dict() for p in top_prompts],
            }
        ), 200

    # ==================== Модерация комментариев ====================

    @app.route("/api/admin/comments/pending", methods=["GET"])
    @jwt_required()
    @role_required(["moderator", "admin"])
    def get_pending_comments():
        """Получить комментарии на модерации"""

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        comments = (
            Comment.query.filter_by(is_approved=False)
            .order_by(Comment.created_at.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

        return jsonify(
            {
                "comments": [c.to_dict() for c in comments.items],
                "total": comments.total,
                "page": page,
                "pages": comments.pages,
            }
        ), 200

    @app.route("/api/admin/comments/<int:comment_id>/approve", methods=["POST"])
    @jwt_required()
    @role_required(["moderator", "admin"])
    def approve_comment(comment_id):
        """Одобрить комментарий"""

        comment = Comment.query.get(comment_id)
        if not comment:
            return jsonify({"error": "Комментарий не найден"}), 404

        comment.is_approved = True
        db.session.commit()

        # Уведомление автору комментария
        from api.notifications import create_notification

        create_notification(
            user_id=comment.user_id,
            title="✅ Ваш комментарий одобрен",
            message=f'Ваш комментарий к промпту "{comment.prompt.title}" прошёл модерацию и теперь виден всем.',
        )

        return jsonify({"message": "Комментарий одобрен"}), 200
