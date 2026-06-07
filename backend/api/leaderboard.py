# backend/api/leaderboard.py
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User, db
from models.prompt import Prompt
from sqlalchemy import func, desc


def register_leaderboard_routes(app):
    @app.route("/api/leaderboard/top-prompts", methods=["GET"])
    def top_by_prompts():
        """Топ пользователей по количеству опубликованных промптов"""
        limit = request.args.get("limit", 10, type=int)

        results = (
            db.session.query(
                User.id,
                User.username,
                User.avatar_url,
                func.count(Prompt.id).label("prompts_count"),
            )
            .join(Prompt, User.id == Prompt.user_id)
            .filter(Prompt.status == "published")
            .group_by(User.id)
            .order_by(desc("prompts_count"))
            .limit(limit)
            .all()
        )

        leaderboard = []
        for idx, row in enumerate(results, 1):
            leaderboard.append(
                {
                    "rank": idx,
                    "user_id": row.id,
                    "username": row.username,
                    "avatar_url": row.avatar_url,
                    "value": row.prompts_count,
                }
            )

        return jsonify({"leaderboard": leaderboard}), 200

    @app.route("/api/leaderboard/top-likes", methods=["GET"])
    def top_by_likes():
        """Топ пользователей по сумме лайков на их промптах"""
        limit = request.args.get("limit", 10, type=int)

        results = (
            db.session.query(
                User.id,
                User.username,
                User.avatar_url,
                func.sum(Prompt.ratings_count).label("total_likes"),
            )
            .join(Prompt, User.id == Prompt.user_id)
            .filter(Prompt.status == "published")
            .group_by(User.id)
            .having(func.sum(Prompt.ratings_count) > 0)
            .order_by(desc("total_likes"))
            .limit(limit)
            .all()
        )

        leaderboard = []
        for idx, row in enumerate(results, 1):
            leaderboard.append(
                {
                    "rank": idx,
                    "user_id": row.id,
                    "username": row.username,
                    "avatar_url": row.avatar_url,
                    "value": int(row.total_likes or 0),
                }
            )

        return jsonify({"leaderboard": leaderboard}), 200

    @app.route("/api/user/badges/<int:user_id>", methods=["GET"])
    def get_user_badges(user_id):
        """Получить бейджи пользователя (топ-3 по промптам и лайкам)"""
        # Топ по промптам
        prompts_rank = (
            db.session.query(
                User.id,
                func.rank().over(order_by=desc(func.count(Prompt.id))).label("rank"),
            )
            .join(Prompt, User.id == Prompt.user_id)
            .filter(Prompt.status == "published")
            .group_by(User.id)
            .subquery()
        )

        top_prompts = (
            db.session.query(prompts_rank.c.rank)
            .filter(prompts_rank.c.id == user_id)
            .first()
        )

        # Топ по лайкам
        likes_rank = (
            db.session.query(
                User.id,
                func.rank()
                .over(order_by=desc(func.sum(Prompt.ratings_count)))
                .label("rank"),
            )
            .join(Prompt, User.id == Prompt.user_id)
            .filter(Prompt.status == "published")
            .group_by(User.id)
            .subquery()
        )

        top_likes = (
            db.session.query(likes_rank.c.rank)
            .filter(likes_rank.c.id == user_id)
            .first()
        )

        badges = []

        if top_prompts and top_prompts.rank <= 3:
            badges.append(
                {
                    "type": "prompts",
                    "rank": top_prompts.rank,
                    "title": f"Топ-{top_prompts.rank} по промптам",
                    "icon": get_medal_icon(top_prompts.rank),
                }
            )

        if top_likes and top_likes.rank <= 3:
            badges.append(
                {
                    "type": "likes",
                    "rank": top_likes.rank,
                    "title": f"Топ-{top_likes.rank} по лайкам",
                    "icon": get_medal_icon(top_likes.rank),
                }
            )

        return jsonify({"badges": badges}), 200


def get_medal_icon(rank):
    """Возвращает иконку для медали"""
    icons = {1: "🥇", 2: "🥈", 3: "🥉"}
    return icons.get(rank, "🏅")
