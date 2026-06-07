# backend/api/pages.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.pages import Page, db
from utils.roles import role_required


def register_pages_routes(app):
    @app.route("/api/pages/<slug>", methods=["GET"])
    def get_page(slug):
        """Получить страницу по slug"""
        page = Page.query.filter_by(slug=slug).first()
        if not page:
            return jsonify({"error": "Страница не найдена"}), 404
        return jsonify({"page": page.to_dict()}), 200

    @app.route("/api/pages/<slug>", methods=["PUT"])
    @jwt_required()
    @role_required(["admin"])
    def update_page(slug):
        """Обновить страницу (только для админов)"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if user.role != "admin":
            return jsonify({"error": "Доступ запрещён"}), 403

        page = Page.query.filter_by(slug=slug).first()
        if not page:
            return jsonify({"error": "Страница не найдена"}), 404

        data = request.get_json()
        if "title" in data:
            page.title = data["title"]
        if "content" in data:
            page.content = data["content"]

        db.session.commit()
        return jsonify({"page": page.to_dict(), "message": "Страница обновлена"}), 200
