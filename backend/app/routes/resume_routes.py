"""
POST /api/upload_resume
Accepts a PDF file + candidate_name, extracts resume data, and creates an InterviewSession.
"""

import os
import uuid
import json
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from app.database.db import db
from app.database.models import InterviewSession, ResumeData
from app.services.resume_service import parse_resume

resume_bp = Blueprint("resume", __name__)

ALLOWED_EXTENSIONS = {"pdf"}


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@resume_bp.route("/upload_resume", methods=["POST"])
def upload_resume():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    candidate_name = request.form.get("candidate_name", "").strip()

    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not _allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are accepted"}), 400
    if not candidate_name:
        return jsonify({"error": "candidate_name is required"}), 400

    # Save the uploaded file
    filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
    save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(save_path)

    try:
        parsed = parse_resume(save_path)
    except ValueError as exc:
        os.remove(save_path)
        return jsonify({"error": str(exc)}), 422

    # Create session + resume record
    session_id = str(uuid.uuid4())
    session = InterviewSession(
        id=session_id,
        candidate_name=candidate_name,
        role="",  # set when the interview starts
    )
    resume_record = ResumeData(
        session_id=session_id,
        raw_resume_text=parsed["raw_text"],
        extracted_skills=json.dumps(parsed["skills"]),
        extracted_projects=json.dumps(parsed["projects"]),
        extracted_experience=json.dumps(parsed["experience"]),
        extracted_education=json.dumps(parsed["education"]),
        extracted_technologies=json.dumps(parsed["technologies"]),
    )

    db.session.add(session)
    db.session.add(resume_record)
    db.session.commit()

    return jsonify({
        "session_id": session_id,
        "candidate_name": candidate_name,
        "resume_data": resume_record.to_dict(),
        "message": "Resume uploaded and parsed successfully",
    }), 201


@resume_bp.route("/ingest", methods=["POST"])
def trigger_ingest():
    """Admin endpoint: re-run knowledge base ingestion."""
    from app.rag.ingestion import ingest_knowledge_base
    results = ingest_knowledge_base()
    return jsonify({"message": "Ingestion complete", "chunks_ingested": results})
