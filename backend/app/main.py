import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # SQLAlchemy config — instance folder sits next to run.py
    db_url = os.getenv("DATABASE_URL", "sqlite:///interview.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
    app.config["UPLOAD_FOLDER"] = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "uploads")
    )
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

    # Ensure upload directory exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    from app.database.db import db
    db.init_app(app)

    # Models must be imported before db.create_all() so SQLAlchemy knows the schema
    from app.database import models  # noqa: F401

    with app.app_context():
        db.create_all()
        # Trigger RAG ingestion for any new PDFs in knowledge_base/
        _maybe_ingest_knowledge_base()

    from app.routes.resume_routes import resume_bp
    from app.routes.interview_routes import interview_bp
    from app.routes.summary_routes import summary_bp

    app.register_blueprint(resume_bp, url_prefix="/api")
    app.register_blueprint(interview_bp, url_prefix="/api")
    app.register_blueprint(summary_bp, url_prefix="/api")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "AI Interview System running"}

    return app


def _maybe_ingest_knowledge_base():
    """Ingest knowledge base PDFs into ChromaDB if not already done."""
    try:
        from app.rag.ingestion import ingest_knowledge_base
        ingest_knowledge_base()
    except Exception as exc:
        print(f"[WARNING] Knowledge base ingestion skipped: {exc}")
