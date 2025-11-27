import os
import sys
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.database import init_extensions, get_database_uri, db


def create_app():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    load_dotenv(os.path.join(project_root, ".env"))

    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = get_database_uri(base_dir)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
    )

    init_extensions(app)

    from routes.auth import auth_bp
    from routes.admin import admin_bp
    from routes.chatbot import chatbot_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(chatbot_bp)

    frontend_dir = os.path.join(project_root, "frontend")

    @app.route("/")
    def serve_index():
        return send_from_directory(frontend_dir, "index.html")

    @app.route("/login") 
    def serve_login():
        return send_from_directory(frontend_dir, "login.html")

    @app.route("/admin")
    def serve_admin():
        return send_from_directory(frontend_dir, "admin.html")

    @app.route("/widget")
    def serve_widget():
        return send_from_directory(frontend_dir, "widget.html")

    @app.route("/<path:path>")
    def serve_static(path):
        full_path = os.path.join(frontend_dir, path)
        if os.path.exists(full_path):
            return send_from_directory(frontend_dir, path)
        return jsonify({"error": "Not found"}), 404

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "ok"}), 200

    with app.app_context():
        db.create_all()

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
