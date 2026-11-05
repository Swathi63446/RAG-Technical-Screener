"""
GET /api/summary/<session_id>  — returns the full interview summary & analytics
"""

import json
from flask import Blueprint, jsonify

from app.database.models import InterviewSession
from app.services.evaluation_service import generate_summary

summary_bp = Blueprint("summary", __name__)


@summary_bp.route("/summary/<session_id>", methods=["GET"])
def get_summary(session_id: str):
    session = InterviewSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    qa_pairs = []
    for qa in session.qa_pairs:
        d = qa.to_dict()
        # Only include answered questions in summary
        if d.get("answer"):
            qa_pairs.append(d)

    summary = generate_summary(
        candidate_name=session.candidate_name,
        role=session.role,
        qa_pairs=qa_pairs,
    )

    return jsonify({
        "session": session.to_dict(),
        "summary": summary,
        "qa_pairs": qa_pairs,
        "resume": session.resume.to_dict() if session.resume else {},
    }), 200
