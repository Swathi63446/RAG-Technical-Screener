"""
Answer evaluation and interview summary service.
Scores answers using the LLM with structured JSON output.
"""

import json
from app.prompts.evaluation_prompts import EVALUATION_PROMPT, SUMMARY_PROMPT
from app.services.llm_client import invoke_llm
from app.utils.helpers import extract_json_from_llm_response, truncate_text


def evaluate_answer(question: str, answer: str, role: str,
                    topic: str, difficulty: str) -> dict:
    """
    Score a candidate's answer.
    Returns a dict with: score, quality, strengths, weaknesses,
    key_concepts_covered, key_concepts_missing, next_difficulty, feedback, topic.
    """
    if not answer or len(answer.strip()) < 5:
        return _empty_answer_result(difficulty)

    prompt = EVALUATION_PROMPT.format(
        question=question,
        answer=truncate_text(answer, 2000),
        role=role,
        topic=topic,
        difficulty=difficulty,
    )

    try:
        raw = invoke_llm(prompt)
        result = extract_json_from_llm_response(raw)
        # Validate and clamp score
        result["score"] = max(0.0, min(1.0, float(result.get("score", 0.3))))
        result.setdefault("quality", "average")
        result.setdefault("strengths", [])
        result.setdefault("weaknesses", [])
        result.setdefault("key_concepts_covered", [])
        result.setdefault("key_concepts_missing", [])
        result.setdefault("next_difficulty", difficulty)
        result.setdefault("feedback", "")
        result.setdefault("topic", topic)
        return result
    except Exception as exc:
        print(f"[Evaluation] LLM evaluation failed: {exc}")
        return _keyword_fallback_eval(question, answer, difficulty, topic)


def generate_summary(candidate_name: str, role: str, qa_pairs: list[dict]) -> dict:
    """
    Generate a comprehensive final interview summary.
    Returns a rich analytics dict for the frontend dashboard.
    """
    if not qa_pairs:
        return _empty_summary(candidate_name, role)

    # Build compact interview data string
    interview_lines = []
    for i, qa in enumerate(qa_pairs, 1):
        interview_lines.append(
            f"Q{i} [{qa.get('difficulty', 'medium')} | {qa.get('topic', 'General')}]: {qa.get('question', '')}\n"
            f"Answer: {truncate_text(qa.get('answer', 'No answer'), 300)}\n"
            f"Score: {qa.get('score', 0):.2f} | Quality: {qa.get('quality', 'average')}\n"
            f"Strengths: {', '.join(qa.get('strengths', []))}\n"
            f"Weaknesses: {', '.join(qa.get('weaknesses', []))}"
        )

    prompt = SUMMARY_PROMPT.format(
        candidate_name=candidate_name,
        role=role,
        interview_data="\n\n".join(interview_lines),
    )

    try:
        raw = invoke_llm(prompt)
        summary = extract_json_from_llm_response(raw)
        # Clamp numeric fields
        summary["overall_score"] = max(0, min(100, float(summary.get("overall_score", 50))))
        summary["technical_depth_score"] = max(0, min(100, float(
            summary.get("technical_depth_score", 50))))
        summary["communication_score"] = max(0, min(100, float(
            summary.get("communication_score", 50))))
        return summary
    except Exception as exc:
        print(f"[Summary] LLM summary failed: {exc}")
        return _compute_fallback_summary(candidate_name, role, qa_pairs)


# ── Fallback helpers ─────────────────────────────────────────────────────────

def _empty_answer_result(difficulty: str) -> dict:
    return {
        "score": 0.0,
        "quality": "weak",
        "strengths": [],
        "weaknesses": ["No answer provided"],
        "key_concepts_covered": [],
        "key_concepts_missing": [],
        "next_difficulty": "easy" if difficulty != "easy" else "easy",
        "feedback": "The candidate did not provide an answer.",
        "topic": "Unknown",
    }


def _keyword_fallback_eval(question: str, answer: str, difficulty: str, topic: str) -> dict:
    """Simple keyword-based scoring when LLM is unavailable."""
    answer_lower = answer.lower()
    word_count = len(answer.split())
    # Length heuristic: longer answers tend to be more complete
    length_score = min(word_count / 150, 1.0)
    # Keyword density (very rough)
    technical_words = sum(1 for w in answer_lower.split()
                          if len(w) > 5 and w.isalpha())
    keyword_score = min(technical_words / 20, 1.0)
    score = (length_score * 0.4 + keyword_score * 0.6)

    if score < 0.25:
        quality = "weak"
    elif score < 0.5:
        quality = "average"
    elif score < 0.75:
        quality = "good"
    else:
        quality = "excellent"

    from app.utils.helpers import next_difficulty as nd
    return {
        "score": round(score, 2),
        "quality": quality,
        "strengths": ["Provided a response"],
        "weaknesses": [],
        "key_concepts_covered": [],
        "key_concepts_missing": [],
        "next_difficulty": nd(difficulty, score),
        "feedback": "Evaluation completed using keyword analysis.",
        "topic": topic,
    }


def _empty_summary(candidate_name: str, role: str) -> dict:
    return {
        "overall_score": 0,
        "performance_level": "Needs Improvement",
        "topics_covered": [],
        "strengths": [],
        "improvement_areas": ["No questions were answered"],
        "skill_gaps": [],
        "recommendations": ["Complete the interview to receive a full evaluation"],
        "hiring_recommendation": "No Hire",
        "summary_text": "The interview was not completed.",
        "difficulty_scores": [],
        "technical_depth_score": 0,
        "communication_score": 0,
        "skill_heatmap": {},
    }


def _compute_fallback_summary(candidate_name: str, role: str, qa_pairs: list[dict]) -> dict:
    """Compute a basic summary from stored scores when LLM is unavailable."""
    answered = [qa for qa in qa_pairs if qa.get("answer")]
    if not answered:
        return _empty_summary(candidate_name, role)

    scores = [qa.get("score", 0) for qa in answered]
    avg_score = sum(scores) / len(scores)
    overall = round(avg_score * 100)

    if overall >= 80:
        level, rec = "Strong", "Hire"
    elif overall >= 65:
        level, rec = "Good", "Hire"
    elif overall >= 45:
        level, rec = "Average", "Borderline"
    else:
        level, rec = "Needs Improvement", "No Hire"

    topics = {}
    for qa in answered:
        t = qa.get("topic", "General")
        if t not in topics:
            topics[t] = []
        topics[t].append(qa.get("score", 0))

    topics_covered = [
        {"topic": t, "score": round(sum(v) / len(v) * 100), "questions_asked": len(v)}
        for t, v in topics.items()
    ]

    return {
        "overall_score": overall,
        "performance_level": level,
        "topics_covered": topics_covered,
        "strengths": list({s for qa in answered for s in qa.get("strengths", [])}),
        "improvement_areas": list({w for qa in answered for w in qa.get("weaknesses", [])}),
        "skill_gaps": [],
        "recommendations": ["Continue practising weak areas identified during the interview"],
        "hiring_recommendation": rec,
        "summary_text": f"{candidate_name} completed a {len(answered)}-question {role} interview "
                        f"with an overall score of {overall}/100.",
        "difficulty_scores": [round(s * 100) for s in scores],
        "technical_depth_score": overall,
        "communication_score": overall,
        "skill_heatmap": {t["topic"]: t["score"] for t in topics_covered},
    }
