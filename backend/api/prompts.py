from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User, db
from models.prompt import Prompt, Tag, PromptTag, Rating, Comment
from datetime import datetime
import os
import json
from werkzeug.utils import secure_filename
from PIL import Image
from schemas import CommentCreateSchema, ValidationError
# from app import cache
from utils.rate_limit import rate_limit

# Конфигурация для загрузки картинок
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def register_prompt_routes(app):
    """Регистрирует все эндпоинты для работы с промптами"""

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # ==================== ЛАЙКИ ====================

    # @rate_limit("30 per minute")
    @app.route("/api/prompts/<int:prompt_id>/like", methods=["POST"])
    @rate_limit("30 per minute")
    @jwt_required()
    def like_prompt(prompt_id):
        user_id = get_jwt_identity()
        prompt = Prompt.query.get(prompt_id)

        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        existing_like = Rating.query.filter_by(
            user_id=int(user_id), prompt_id=prompt_id
        ).first()

        if existing_like:
            db.session.delete(existing_like)
            prompt.ratings_count = len(prompt.ratings)
            db.session.commit()
            return jsonify({"liked": False, "likes_count": prompt.ratings_count}), 200
        else:
            like = Rating(user_id=int(user_id), prompt_id=prompt_id)
            db.session.add(like)
            prompt.ratings_count = len(prompt.ratings)
            db.session.commit()
            return jsonify({"liked": True, "likes_count": prompt.ratings_count}), 200

    # ==================== ПРОМПТЫ ====================

    # backend/api/prompts.py
    @app.route("/api/prompts", methods=["GET"])
    @jwt_required(optional=True)
    def get_prompts():
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 12, type=int)
        sort = request.args.get("sort", "newest")
        search = request.args.get("search", "")
        tag_name = request.args.get("tag", "")  # ← название нейросети (ru или en)
        category_name = request.args.get(
            "category", ""
        )  # ← название категории (ru или en)
        lang = request.args.get("lang", "ru")

        query = Prompt.query.filter_by(status="published")

        # Фильтр по категории (по названию с учётом языка)
        if category_name:
            # Ищем категорию по name_ru или name_en в зависимости от языка
            if lang == "ru":
                tag_obj = Tag.query.filter(
                    Tag.name_ru == category_name, Tag.type == "category"
                ).first()
            else:
                tag_obj = Tag.query.filter(
                    Tag.name_en == category_name, Tag.type == "category"
                ).first()

            if tag_obj:
                query = query.filter(Prompt.theme_id == tag_obj.id)

        # Фильтр по нейросети (по названию с учётом языка)
        if tag_name:
            if lang == "ru":
                tag_obj = Tag.query.filter(
                    Tag.name_ru == tag_name, Tag.type == "ai_model"
                ).first()
            else:
                tag_obj = Tag.query.filter(
                    Tag.name_en == tag_name, Tag.type == "ai_model"
                ).first()

            if tag_obj:
                query = query.filter(Prompt.tags.any(Tag.id == tag_obj.id))

        # Поиск
        if search:
            query = query.filter(
                db.or_(
                    Prompt.title.ilike(f"%{search}%"),
                    Prompt.content.ilike(f"%{search}%"),
                    Prompt.description.ilike(f"%{search}%"),
                )
            )

        # Сортировка
        if sort == "newest":
            query = query.order_by(Prompt.published_at.desc(), Prompt.id.desc())
        elif sort == "oldest":
            query = query.order_by(Prompt.published_at.asc(), Prompt.id.asc())
        elif sort == "popular":
            query = query.order_by(Prompt.ratings_count.desc(), Prompt.id.desc())
        else:
            query = query.order_by(Prompt.published_at.desc(), Prompt.id.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        current_user_id = get_jwt_identity()
        if current_user_id:
            current_user_id = int(current_user_id)

        # Оптимизация лайков
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

    @app.route("/api/prompts/<int:prompt_id>", methods=["GET"])
    @jwt_required(optional=True)
    def get_prompt(prompt_id):
        prompt = Prompt.query.get(prompt_id)
        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        current_user_id = get_jwt_identity()
        if current_user_id:
            current_user_id = int(current_user_id)
        else:
            current_user_id = None

        lang = request.args.get("lang", "ru")

        if prompt.status == "published":
            return jsonify(
                {
                    "prompt": prompt.to_dict(
                        include_user=True, current_user_id=current_user_id, lang=lang
                    )
                }
            ), 200

        if current_user_id:
            user = User.query.get(current_user_id)
            is_admin = user and user.role == "admin"
            if prompt.user_id == current_user_id or is_admin:
                return jsonify(
                    {
                        "prompt": prompt.to_dict(
                            include_user=True,
                            current_user_id=current_user_id,
                            lang=lang,
                        )
                    }
                ), 200

        return jsonify({"error": "Промпт не найден или недоступен"}), 404

    @app.route("/api/prompts", methods=["POST"])
    @rate_limit("10 per hour")
    @jwt_required()
    def create_prompt():
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        # ✅ Проверка подтверждения email
        if not user.email_confirmed:
            return jsonify(
                {
                    "error": "Подтвердите email для создания промптов. Проверьте вашу почту."
                }
            ), 403

        if user.is_blocked:
            return jsonify({"error": "Ваш аккаунт заблокирован"}), 403

        title = request.form.get("title", "")
        content = request.form.get("content", "")
        description = request.form.get("description", "")
        theme_id = request.form.get("theme_id", type=int)
        tags = json.loads(request.form.get("tags", "[]"))

        if not title or not content:
            return jsonify({"error": "Название и текст промпта обязательны"}), 400

        if not theme_id:
            return jsonify({"error": "Выберите категорию промпта"}), 400

        category = Tag.query.get(theme_id)
        if not category:
            return jsonify({"error": "Категория не найдена"}), 400

        prompt = Prompt(
            user_id=int(user_id),
            title=title,
            content=content,
            description=description,
            status="private",
            theme=category.name_ru,
            theme_id=theme_id,
        )

        for tag_name in tags:
            tag = Tag.query.filter(
                (Tag.name_ru == tag_name) | (Tag.name_en == tag_name)
            ).first()
            if tag:
                prompt.tags.append(tag)

        db.session.add(prompt)
        db.session.flush()

        if "result_image" in request.files:
            file = request.files["result_image"]
            if file and file.filename and allowed_file(file.filename):
                ext = file.filename.rsplit(".", 1)[1].lower()
                filename = secure_filename(
                    f"result_{prompt.id}_{int(datetime.utcnow().timestamp())}.{ext}"
                )
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                img = Image.open(file)
                img.thumbnail((800, 800))
                img.save(filepath)
                prompt.result_image_url = f"/uploads/{filename}"

        db.session.commit()

        return jsonify({"prompt": prompt.to_dict(), "message": "Промпт создан"}), 201

    @app.route("/api/prompts/<int:prompt_id>", methods=["PUT"])
    @jwt_required()
    def update_prompt(prompt_id):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        # ✅ Проверка подтверждения email (опционально, можно не блокировать редактирование)
        if not user.email_confirmed:
            return jsonify(
                {"error": "Подтвердите email для редактирования промптов"}
            ), 403

        prompt = Prompt.query.get(prompt_id)

        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        if prompt.user_id != int(user_id):
            return jsonify({"error": "Доступ запрещён"}), 403

        has_changes = False

        if request.is_json:
            data = request.get_json()
            if "title" in data and data["title"] != prompt.title:
                prompt.title = data["title"]
                has_changes = True
            if "content" in data and data["content"] != prompt.content:
                prompt.content = data["content"]
                has_changes = True
            if "description" in data and data["description"] != prompt.description:
                prompt.description = data["description"]
                has_changes = True
            if "theme_id" in data and data["theme_id"] != prompt.theme_id:
                theme_id = data["theme_id"]
                category = Tag.query.get(theme_id)
                if category:
                    prompt.theme_id = theme_id
                    prompt.theme = category.name_ru
                    has_changes = True
            if "tags" in data:
                new_tag_names = set(data["tags"])
                old_tag_names = set([tag.name_ru for tag in prompt.tags])
                if new_tag_names != old_tag_names:
                    prompt.tags = []
                    for tag_name in new_tag_names:
                        tag = Tag.query.filter(
                            (Tag.name_ru == tag_name) | (Tag.name_en == tag_name)
                        ).first()
                        if tag:
                            prompt.tags.append(tag)
                    has_changes = True

            if data.get("remove_existing_image") == True:
                if prompt.result_image_url:
                    old_path = os.path.join(
                        UPLOAD_FOLDER, prompt.result_image_url.replace("/uploads/", "")
                    )
                    if os.path.exists(old_path):
                        os.remove(old_path)
                    prompt.result_image_url = None
                    has_changes = True

        else:
            if "title" in request.form and request.form["title"] != prompt.title:
                prompt.title = request.form["title"]
                has_changes = True
            if "content" in request.form and request.form["content"] != prompt.content:
                prompt.content = request.form["content"]
                has_changes = True
            if (
                "description" in request.form
                and request.form["description"] != prompt.description
            ):
                prompt.description = request.form["description"]
                has_changes = True
            if "theme_id" in request.form:
                theme_id = int(request.form["theme_id"])
                if theme_id != prompt.theme_id:
                    category = Tag.query.get(theme_id)
                    if category:
                        prompt.theme_id = theme_id
                        prompt.theme = category.name_ru
                        has_changes = True
            if "tags" in request.form:
                new_tags = json.loads(request.form["tags"])
                new_tag_names = set(new_tags)
                old_tag_names = set([tag.name_ru for tag in prompt.tags])
                if new_tag_names != old_tag_names:
                    prompt.tags = []
                    for tag_name in new_tag_names:
                        tag = Tag.query.filter(
                            (Tag.name_ru == tag_name) | (Tag.name_en == tag_name)
                        ).first()
                        if tag:
                            prompt.tags.append(tag)
                    has_changes = True

            if "result_image" in request.files:
                file = request.files["result_image"]
                if file and file.filename and allowed_file(file.filename):
                    if prompt.result_image_url:
                        old_path = os.path.join(
                            UPLOAD_FOLDER,
                            prompt.result_image_url.replace("/uploads/", ""),
                        )
                        if os.path.exists(old_path):
                            os.remove(old_path)
                    ext = file.filename.rsplit(".", 1)[1].lower()
                    filename = secure_filename(
                        f"result_{prompt.id}_{int(datetime.utcnow().timestamp())}.{ext}"
                    )
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                    img = Image.open(file)
                    img.thumbnail((800, 800))
                    img.save(filepath)
                    prompt.result_image_url = f"/uploads/{filename}"
                    has_changes = True

            if (
                "remove_existing_image" in request.form
                and request.form["remove_existing_image"] == "true"
            ):
                if prompt.result_image_url:
                    old_path = os.path.join(
                        UPLOAD_FOLDER, prompt.result_image_url.replace("/uploads/", "")
                    )
                    if os.path.exists(old_path):
                        os.remove(old_path)
                    prompt.result_image_url = None
                    has_changes = True

        if has_changes and prompt.status in ["published", "pending", "rejected"]:
            prompt.status = "private"
            prompt.published_at = None

        prompt.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"prompt": prompt.to_dict(), "message": "Промпт обновлён"}), 200

    @app.route("/api/prompts/<int:prompt_id>/publish", methods=["POST"])
    @jwt_required()
    def publish_prompt(prompt_id):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        # ✅ Проверка подтверждения email
        if not user.email_confirmed:
            return jsonify({"error": "Подтвердите email для публикации промптов"}), 403

        prompt = Prompt.query.get(prompt_id)

        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        if prompt.user_id != int(user_id):
            return jsonify({"error": "Доступ запрещён"}), 403

        if prompt.status == "published":
            return jsonify({"error": "Промпт уже опубликован"}), 400

        prompt.status = "pending"
        db.session.commit()

        from api.notifications import notify_all_admins

        user = User.query.get(user_id)
        notify_all_admins(
            title="📝 Новый промпт на модерации",
            message=f'Пользователь {user.username} отправил промпт "{prompt.title}" на модерацию.',
        )

        return jsonify({"message": "Промпт отправлен на модерацию"}), 200

    @app.route("/api/my/prompts/filtered", methods=["GET"])
    @jwt_required()
    def get_my_prompts_filtered():
        user_id = get_jwt_identity()
        current_user_id = int(user_id)
        lang = request.args.get("lang", "ru")

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 12, type=int)
        sort = request.args.get("sort", "newest")
        search_query = request.args.get("search", "")
        neural_filter = request.args.get("neural", "")
        status_filter = request.args.get("status", "")

        query = Prompt.query.filter_by(user_id=current_user_id)

        if status_filter and status_filter != "all":
            query = query.filter_by(status=status_filter)

        if search_query:
            query = query.filter(
                db.or_(
                    Prompt.title.ilike(f"%{search_query}%"),
                    Prompt.content.ilike(f"%{search_query}%"),
                    Prompt.description.ilike(f"%{search_query}%"),
                )
            )

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

        if sort == "newest":
            query = query.order_by(Prompt.created_at.desc(), Prompt.id.desc())
        elif sort == "oldest":
            query = query.order_by(Prompt.created_at.asc(), Prompt.id.asc())
        elif sort == "popular":
            query = query.order_by(Prompt.ratings_count.desc(), Prompt.id.desc())
        else:
            query = query.order_by(Prompt.created_at.desc(), Prompt.id.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # В конце эндпоинта, перед возвратом:
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
                        include_user=False,
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

    # ==================== КОММЕНТАРИИ ====================

    @app.route("/api/prompts/<int:prompt_id>/comments", methods=["GET"])
    def get_comments(prompt_id):
        prompt = Prompt.query.get(prompt_id)
        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

        comments = (
            Comment.query.filter_by(prompt_id=prompt_id, is_approved=True)
            .order_by(Comment.created_at.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

        return jsonify(
            {
                "comments": [c.to_dict() for c in comments.items],
                "total": comments.total,
                "page": page,
                "pages": comments.pages,
                "per_page": per_page,
            }
        ), 200

    # @rate_limit("10 per minute")
    @app.route("/api/prompts/<int:prompt_id>/comments", methods=["POST"])
    @rate_limit("5 per minute")
    @jwt_required()
    def add_comment(prompt_id):
        user_id = get_jwt_identity()
        data = request.get_json()

        # Валидация
        try:
            CommentCreateSchema().load(data)
        except ValidationError as err:
            return jsonify({"error": err.messages}), 400

        if not data or not data.get("content"):
            return jsonify({"error": "Текст комментария обязателен"}), 400

        content = data["content"].strip()

        if not content:
            return jsonify({"error": "Комментарий не может быть пустым"}), 400
        if len(content) < 2:
            return jsonify(
                {"error": "Комментарий должен содержать минимум 2 символа"}
            ), 400
        if len(content) > 2000:
            return jsonify(
                {"error": "Комментарий не должен превышать 2000 символов"}
            ), 400

        prompt = Prompt.query.get(prompt_id)
        if not prompt:
            return jsonify({"error": "Промпт не найден"}), 404

        user = User.query.get(user_id)

        if not user.email_confirmed:
            return jsonify(
                {"error": "Подтвердите email для добавления комментариев"}
            ), 403
        if user.is_blocked:
            return jsonify({"error": "Ваш аккаунт заблокирован"}), 403

        is_approved = user.role == "admin"

        comment = Comment(
            user_id=int(user_id),
            prompt_id=prompt_id,
            content=content,
            is_approved=is_approved,
        )

        db.session.add(comment)
        db.session.commit()

        if not is_approved and prompt.user_id != int(user_id):
            from api.notifications import create_notification

            create_notification(
                user_id=prompt.user_id,
                title="💬 Новый комментарий на модерации",
                message=f'Пользователь {user.username} оставил комментарий к вашему промпту "{prompt.title}". Ожидает проверки.',
            )
            from api.notifications import notify_all_admins

            notify_all_admins(
                title="💬 Новый комментарий на модерации",
                message=f'Пользователь {user.username} оставил комментарий к промпту "{prompt.title}". Требуется модерация.',
            )

        return jsonify(
            {
                "comment": comment.to_dict(),
                "message": "Комментарий добавлен и отправлен на модерацию",
            }
        ), 201

    @app.route("/api/comments/<int:comment_id>", methods=["DELETE"])
    @jwt_required()
    def delete_comment(comment_id):
        user_id = get_jwt_identity()
        comment = Comment.query.get(comment_id)

        if not comment:
            return jsonify({"error": "Комментарий не найден"}), 404

        user = User.query.get(user_id)

        if user.role != "admin" and comment.user_id != int(user_id):
            return jsonify({"error": "Доступ запрещён"}), 403

        db.session.delete(comment)
        db.session.commit()

        return jsonify({"message": "Комментарий удалён"}), 200

    # ==================== ТЕГИ ====================

    @app.route("/api/tags", methods=["GET"])
    def get_all_tags():
        tag_type = request.args.get("type", None)
        lang = request.args.get("lang", "ru")

        query = Tag.query
        if tag_type:
            query = query.filter_by(type=tag_type)

        tags = query.all()
        return jsonify({"tags": [tag.to_dict(lang) for tag in tags]}), 200

    @app.route("/api/categories", methods=["GET"])
    def get_public_categories():
        lang = request.args.get("lang", "ru")
        categories = Tag.query.filter_by(type="category").all()
        return jsonify({"categories": [c.to_dict(lang) for c in categories]}), 200

    @app.route("/api/my/favorites/filtered", methods=["GET"])
    @jwt_required()
    def get_favorites_filtered():
        user_id = get_jwt_identity()
        current_user_id = int(user_id)
        lang = request.args.get("lang", "ru")

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 12, type=int)
        sort = request.args.get("sort", "newest")
        search_query = request.args.get("search", "")
        neural_filter = request.args.get("neural", "")

        liked_prompt_ids = (
            db.session.query(Rating.prompt_id)
            .filter_by(user_id=current_user_id)
            .subquery()
        )
        query = Prompt.query.filter(Prompt.id.in_(liked_prompt_ids))

        if search_query:
            query = query.filter(
                db.or_(
                    Prompt.title.ilike(f"%{search_query}%"),
                    Prompt.content.ilike(f"%{search_query}%"),
                    Prompt.description.ilike(f"%{search_query}%"),
                )
            )

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

        if sort == "newest":
            query = query.order_by(Prompt.published_at.desc(), Prompt.id.desc())
        elif sort == "oldest":
            query = query.order_by(Prompt.published_at.asc(), Prompt.id.asc())
        elif sort == "popular":
            query = query.order_by(Prompt.ratings_count.desc(), Prompt.id.desc())
        else:
            query = query.order_by(Prompt.published_at.desc(), Prompt.id.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        # В конце эндпоинта, перед возвратом:
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
