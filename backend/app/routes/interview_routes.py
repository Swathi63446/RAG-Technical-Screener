"""
POST /api/start_interview      — begins the interview, returns the first question
GET  /api/next_question/<sid>  — returns the current unanswered question
POST /api/submit_answer        — records the answer, evaluates it, prepares next question
POST /api/end_interview        — marks session completed
"""

import json
import os
from flask import Blueprint, request, jsonify

from app.database.db import db
from app.database.models import InterviewSession, InterviewQA
from app.services.question_service import generate_question
from app.services.evaluation_service import evaluate_answer
from app.utils.helpers import next_difficulty

interview_bp = Blueprint("interview", __name__)

MAX_QUESTIONS = int(os.getenv("MAX_QUESTIONS", 8))


def _get_session_or_404(session_id: str):
    session = InterviewSession.query.get(session_id)
    if not session:
        return None, jsonify({"error": "Session not found"}), 404
    return session, None, None


def _resume_dict(session) -> dict:
    if not session.resume:
        return {}
    r = session.resume
    return {
        "skills": json.loads(r.extracted_skills or "[]"),
        "projects": json.loads(r.extracted_projects or "[]"),
        "experience": json.loads(r.extracted_experience or "[]"),
        "education": json.loads(r.extracted_education or "[]"),
    }


def _qa_history(session) -> list[dict]:
    return [qa.to_dict() for qa in session.qa_pairs]


@interview_bp.route("/start_interview", methods=["POST"])
def start_interview():
    data = request.get_json(force=True)
    session_id = data.get("session_id", "").strip()
    role = data.get("role", "").strip()

    if not session_id or not role:
        return jsonify({"error": "session_id and role are required"}), 400

    valid_roles = {"AI/ML Engineer", "Backend Engineer", "Data Scientist"}
    if role not in valid_roles:
        return jsonify({"error": f"role must be one of: {', '.join(valid_roles)}"}), 400

    session, err, code = _get_session_or_404(session_id)
    if err:
        return err, code

    # Update role and reset
    session.role = role
    session.status = "active"
    session.question_count = 0
    session.current_difficulty = "easy"

    # Delete any previous Q&A for this session (allow restart)
    InterviewQA.query.filter_by(session_id=session_id).delete()
    db.session.commit()

    resume_data = _resume_dict(session)
    qa_history = []

    generated = generate_question(
        session_id=session_id,
        candidate_name=session.candidate_name,
        role=role,
        resume_data=resume_data,
        qa_history=qa_history,
        current_difficulty="easy",
    )

    qa_record = InterviewQA(
        session_id=session_id,
        question=generated["question"],
        difficulty=generated["difficulty"],
        question_type=generated["question_type"],
        topic=generated["topic"],
        retrieved_context=json.dumps(generated["retrieved_context"]),
    )
    session.question_count = 1
    db.session.add(qa_record)
    db.session.commit()

    return jsonify({
        "session_id": session_id,
        "question_id": qa_record.id,
        "question": generated["question"],
        "question_number": 1,
        "total_questions": MAX_QUESTIONS,
        "difficulty": generated["difficulty"],
        "question_type": generated["question_type"],
        "topic": generated["topic"],
        "retrieved_context": generated["retrieved_context"],
    }), 200


@interview_bp.route("/next_question/<session_id>", methods=["GET"])
def next_question(session_id: str):
    session, err, code = _get_session_or_404(session_id)
    if err:
        return err, code

    if session.status == "completed":
        return jsonify({"interview_complete": True,
                        "message": "Interview is complete. Check /summary."}), 200

    # Find the latest unanswered question
    unanswered = (InterviewQA.query
                  .filter_by(session_id=session_id)
                  .filter(InterviewQA.answer.is_(None))
                  .order_by(InterviewQA.id.desc())
                  .first())

    if not unanswered:
        return jsonify({"interview_complete": True,
                        "message": "All questions answered."}), 200

    return jsonify({
        "session_id": session_id,
        "question_id": unanswered.id,
        "question": unanswered.question,
        "question_number": session.question_count,
        "total_questions": MAX_QUESTIONS,
        "difficulty": unanswered.difficulty,
        "question_type": unanswered.question_type,
        "topic": unanswered.topic,
        "retrieved_context": json.loads(unanswered.retrieved_context or "[]"),
    }), 200


@interview_bp.route("/submit_answer", methods=["POST"])
def submit_answer():
    data = request.get_json(force=True)
    session_id = data.get("session_id", "").strip()
    question_id = data.get("question_id")
    answer = data.get("answer", "").strip()

    if not session_id or not question_id:
        return jsonify({"error": "session_id and question_id are required"}), 400

    session, err, code = _get_session_or_404(session_id)
    if err:
        return err, code

    qa_record = InterviewQA.query.get(question_id)
    if not qa_record or qa_record.session_id != session_id:
        return jsonify({"error": "Question not found"}), 404

    # Evaluate the answer
    eval_result = evaluate_answer(
        question=qa_record.question,
        answer=answer,
        role=session.role,
        topic=qa_record.topic or "General",
        difficulty=qa_record.difficulty,
    )

    # Persist answer + evaluation
    qa_record.answer = answer
    qa_record.score = eval_result["score"]
    qa_record.quality = eval_result["quality"]
    qa_record.strengths = json.dumps(eval_result.get("strengths", []))
    qa_record.weaknesses = json.dumps(eval_result.get("weaknesses", []))
    qa_record.feedback = eval_result.get("feedback", "")

    # Update session difficulty adaptively
    new_difficulty = next_difficulty(session.current_difficulty, eval_result["score"])
    session.current_difficulty = new_difficulty

    # Check whether to generate next question or end
    interview_complete = session.question_count >= MAX_QUESTIONS
    next_q_data = None

    if not interview_complete:
        resume_data = _resume_dict(session)
        qa_history = _qa_history(session)
        # Include this answer in history
        qa_history_with_current = qa_history + [{
            "question": qa_record.question,
            "answer": answer,
            "topic": qa_record.topic,
        }]

        generated = generate_question(
            session_id=session_id,
            candidate_name=session.candidate_name,
            role=session.role,
            resume_data=resume_data,
            qa_history=qa_history_with_current,
            current_difficulty=new_difficulty,
        )

        new_qa = InterviewQA(
            session_id=session_id,
            question=generated["question"],
            difficulty=generated["difficulty"],
            question_type=generated["question_type"],
            topic=generated["topic"],
            retrieved_context=json.dumps(generated["retrieved_context"]),
        )
        session.question_count += 1
        db.session.add(new_qa)
        db.session.flush()  # get the auto-incremented id

        next_q_data = {
            "question_id": new_qa.id,
            "question": generated["question"],
            "question_number": session.question_count,
            "total_questions": MAX_QUESTIONS,
            "difficulty": generated["difficulty"],
            "question_type": generated["question_type"],
            "topic": generated["topic"],
            "retrieved_context": generated["retrieved_context"],
        }
    else:
        session.status = "completed"

    db.session.commit()

    return jsonify({
        "evaluation": {
            "score": eval_result["score"],
            "quality": eval_result["quality"],
            "strengths": eval_result.get("strengths", []),
            "weaknesses": eval_result.get("weaknesses", []),
            "feedback": eval_result.get("feedback", ""),
            "key_concepts_covered": eval_result.get("key_concepts_covered", []),
            "key_concepts_missing": eval_result.get("key_concepts_missing", []),
        },
        "interview_complete": interview_complete,
        "next_question": next_q_data,
    }), 200


@interview_bp.route("/end_interview", methods=["POST"])
def end_interview():
    data = request.get_json(force=True)
    session_id = data.get("session_id", "").strip()

    session, err, code = _get_session_or_404(session_id)
    if err:
        return err, code

    session.status = "completed"
    db.session.commit()
    return jsonify({"message": "Interview ended", "session_id": session_id}), 200
