from flask import Blueprint, jsonify, request
from flask_login import (
    login_user,
    logout_user,
    current_user,
)
from werkzeug.security import check_password_hash

from backend.database import db
from backend.models import Admin

auth_bp = Blueprint("auth", __name__, url_prefix="/api/admin")


def _extract_credentials():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username", "").strip()
    password = payload.get("password", "").strip()
    return username, password


@auth_bp.route("/login", methods=["POST"])
def admin_login():
    username, password = _extract_credentials()

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    admin = Admin.query.filter_by(username=username).first()
    if not admin or not check_password_hash(admin.password_hash, password):
        return jsonify({"error": "Invalid username or password."}), 401

    login_user(admin, remember=True)
    return (
        jsonify(
            {
                "message": "Login successful.",
                "admin": {"id": admin.id, "username": admin.username},
            }
        ),
        200,
    )


@auth_bp.route("/logout", methods=["POST"])
def admin_logout():
    if current_user.is_authenticated:
        logout_user()
    return jsonify({"message": "Logged out successfully."}), 200


@auth_bp.route("/check-auth", methods=["GET"])
def check_auth():
    if current_user.is_authenticated:
        return (
            jsonify(
                {
                    "authenticated": True,
                    "admin": {"id": current_user.id, "username": current_user.username},
                }
            ),
            200,
        )
    return jsonify({"authenticated": False}), 200
