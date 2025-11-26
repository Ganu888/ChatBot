import os
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()


def init_extensions(app):
    """
    Bind Flask extensions to the given application instance.
    """
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.session_protection = "strong"

    @login_manager.user_loader
    def load_user(admin_id):
        from backend.models import Admin

        if admin_id is None:
            return None
        return Admin.query.get(int(admin_id))

    return app


def get_database_uri(base_dir: str) -> str:
    """
    Resolve the SQLAlchemy database URI for MySQL or SQLite.
    """
    from urllib.parse import quote_plus
    
    uri = os.getenv("DATABASE_URL")
    
    if uri:
        # If MySQL URI is provided, use it directly
        if uri.startswith("mysql://") or uri.startswith("mysql+pymysql://"):
            return uri
        # Handle SQLite for backward compatibility
        if uri.startswith("sqlite:///"):
            db_name = uri.replace("sqlite:///", "", 1)
            absolute_path = os.path.join(base_dir, db_name)
            return f"sqlite:///{absolute_path}"
        return uri
    
    # Default to MySQL if DATABASE_URL not set, but check for MySQL env vars
    mysql_user = os.getenv("MYSQL_USER", "root")
    mysql_password = os.getenv("MYSQL_PASSWORD", "")
    mysql_host = os.getenv("MYSQL_HOST", "localhost")
    mysql_port = os.getenv("MYSQL_PORT", "3306")
    mysql_database = os.getenv("MYSQL_DATABASE", "college_chatbot")
    
    if mysql_user and mysql_database:
        # URL-encode the password to handle special characters
        encoded_password = quote_plus(mysql_password) if mysql_password else ""
        return f"mysql+pymysql://{mysql_user}:{encoded_password}@{mysql_host}:{mysql_port}/{mysql_database}"
    
    # Fallback to SQLite if MySQL not configured
    default_path = os.path.join(base_dir, "college.db")
    return f"sqlite:///{default_path}"
