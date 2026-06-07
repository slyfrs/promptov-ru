from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import db, User, Notification
from datetime import datetime
# from api.sse import send_realtime_notification


def register_notifications_routes(app):
    """Регистрирует все эндпоинты для работы с уведомлениями"""

    # Получить все уведомления текущего пользователя
    @app.route("/api/notifications", methods=["GET"])
    @jwt_required()
    def get_notifications():
        user_id = get_jwt_identity()

        # Получаем параметры пагинации
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        # Запрашиваем уведомления пользователя
        notifications = (
            Notification.query.filter_by(user_id=user_id)
            .order_by(Notification.created_at.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

        return jsonify(
            {
                "notifications": [n.to_dict() for n in notifications.items],
                "total": notifications.total,
                "page": page,
                "pages": notifications.pages,
                "unread_count": Notification.query.filter_by(
                    user_id=user_id, is_read=False
                ).count(),
            }
        ), 200

    # Отметить уведомление как прочитанное
    @app.route("/api/notifications/<int:notification_id>/read", methods=["POST"])
    @jwt_required()
    def mark_as_read(notification_id):
        user_id = get_jwt_identity()

        notification = Notification.query.get(notification_id)

        if not notification:
            return jsonify({"error": "Уведомление не найдено"}), 404

        if notification.user_id != int(user_id):
            return jsonify({"error": "Доступ запрещён"}), 403

        notification.is_read = True
        db.session.commit()

        return jsonify({"message": "Уведомление отмечено как прочитанное"}), 200

    # Отметить все уведомления как прочитанные
    @app.route("/api/notifications/read-all", methods=["POST"])
    @jwt_required()
    def mark_all_as_read():
        user_id = get_jwt_identity()

        Notification.query.filter_by(user_id=user_id, is_read=False).update(
            {"is_read": True}
        )
        db.session.commit()

        return jsonify({"message": "Все уведомления отмечены как прочитанные"}), 200

    # Удалить уведомление
    @app.route("/api/notifications/<int:notification_id>", methods=["DELETE"])
    @jwt_required()
    def delete_notification(notification_id):
        user_id = get_jwt_identity()

        notification = Notification.query.get(notification_id)

        if not notification:
            return jsonify({"error": "Уведомление не найдено"}), 404

        if notification.user_id != int(user_id):
            return jsonify({"error": "Доступ запрещён"}), 403

        db.session.delete(notification)
        db.session.commit()

        return jsonify({"message": "Уведомление удалено"}), 200

    # Получить количество непрочитанных уведомлений
    @app.route("/api/notifications/unread-count", methods=["GET"])
    @jwt_required()
    def get_unread_count():
        user_id = get_jwt_identity()

        count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

        return jsonify({"unread_count": count}), 200


def create_notification(user_id: int, title: str, message: str):
    """Хелпер для создания уведомления"""
    from models.user import Notification, db
    from datetime import datetime

    notification = Notification(
        user_id=user_id, title=title, message=message, created_at=datetime.utcnow()
    )
    db.session.add(notification)
    db.session.commit()

    return notification


def notify_all_admins(title, message, exclude_user_id=None):
    """Отправить уведомление всем администраторам (включая суперадмина)"""
    admins = User.query.filter(User.role == "admin").all()

    notifications = []
    for admin in admins:
        if exclude_user_id and admin.id == exclude_user_id:
            continue
        notification = Notification(
            user_id=admin.id, title=title, message=message, created_at=datetime.utcnow()
        )
        notifications.append(notification)

    if notifications:
        db.session.add_all(notifications)
        db.session.commit()

    return len(notifications)
