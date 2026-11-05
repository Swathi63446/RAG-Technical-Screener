"""
Question generation service.
Builds a prompt from resume + RAG context and calls the LLM to produce
a personalised, contextual interview question.
"""

import os
import random
from app.prompts.question_prompts import QUESTION_GENERATION_PROMPT, FOLLOWUP_PROMPT
from app.rag.retrieval import retrieve_context
from app.services.llm_client import invoke_llm
from app.utils.helpers import truncate_text

MAX_QUESTIONS = int(os.getenv("MAX_QUESTIONS", 8))

# Topic rotation per role — ensures varied coverage
ROLE_TOPICS = {
    "AI/ML Engineer": [
        "Model Training & Overfitting",
        "Deep Learning Architectures",
        "MLOps & Deployment",
        "Data Preprocessing",
        "Evaluation Metrics",
        "NLP & Transformers",
        "Computer Vision",
        "RAG & LLMs",
        "Hyperparameter Tuning",
        "Transfer Learning",
    ],
    "Backend Engineer": [
        "System Design",
        "Database Design",
        "API Design",
        "Caching Strategies",
        "Microservices",
        "Security",
        "Containerization & Orchestration",
        "Message Queues",
        "Performance Optimization",
        "Distributed Systems",
    ],
    "Data Scientist": [
        "Exploratory Data Analysis",
        "Feature Engineering",
        "Statistical Inference",
        "A/B Testing",
        "SQL & Data Pipelines",
        "Machine Learning",
        "Time Series",
        "Model Interpretability",
        "Data Visualization",
        "Business Analytics",
    ],
}

DIFFICULTY_PROGRESSION = ["easy", "easy", "medium", "medium", "hard", "hard", "expert", "expert"]

QUESTION_TYPE_ROTATION = [
    "conceptual", "implementation", "scenario",
    "implementation", "system_design", "debug",
    "scenario", "system_design",
]


def _build_qa_history_string(qa_pairs: list[dict]) -> str:
    if not qa_pairs:
        return "No previous questions."
    lines = []
    for i, qa in enumerate(qa_pairs, 1):
        lines.append(f"Q{i}: {qa['question']}")
        if qa.get("answer"):
            lines.append(f"A{i} (summary): {truncate_text(qa['answer'], 150)}")
    return "\n".join(lines)


def _pick_topic(role: str, asked_topics: list[str]) -> str:
    topics = ROLE_TOPICS.get(role, ["General Technical"])
    remaining = [t for t in topics if t not in asked_topics]
    if remaining:
        return random.choice(remaining)
    return random.choice(topics)


def generate_question(
    session_id: str,
    candidate_name: str,
    role: str,
    resume_data: dict,
    qa_history: list[dict],
    current_difficulty: str,
) -> dict:
    """
    Generate the next interview question.
    Returns a dict with keys: question, difficulty, question_type, topic, retrieved_context.
    """
    question_num = len(qa_history) + 1
    asked_topics = [qa.get("topic", "") for qa in qa_history]
    topic = _pick_topic(role, asked_topics)

    # Difficulty from adaptive progression or override
    if question_num <= len(DIFFICULTY_PROGRESSION):
        base_difficulty = DIFFICULTY_PROGRESSION[question_num - 1]
    else:
        base_difficulty = "expert"

    # Use the session's adaptive difficulty if it diverges from progression
    difficulty = current_difficulty if question_num > 2 else base_difficulty

    question_type = QUESTION_TYPE_ROTATION[(question_num - 1) % len(QUESTION_TYPE_ROTATION)]

    skills = resume_data.get("skills", [])
    projects = resume_data.get("projects", [])
    experience = resume_data.get("experience", [])

    # RAG context retrieval
    retrieved_chunks = retrieve_context(role, skills, projects, topic=topic)
    retrieved_context_str = "\n\n---\n\n".join(retrieved_chunks) if retrieved_chunks else \
        "No specific context retrieved — use your expertise."

    prompt = QUESTION_GENERATION_PROMPT.format(
        candidate_name=candidate_name,
        role=role,
        skills=", ".join(skills[:15]) or "Not specified",
        projects="\n- ".join(projects[:4]) or "Not specified",
        experience="\n- ".join(experience[:3]) or "Not specified",
        retrieved_context=truncate_text(retrieved_context_str, 2500),
        qa_history=_build_qa_history_string(qa_history),
        question_num=question_num,
        max_questions=MAX_QUESTIONS,
        difficulty=difficulty,
        question_type=question_type,
    )

    try:
        question_text = invoke_llm(prompt)
    except Exception as exc:
        print(f"[LLM] Question generation failed: {exc}")
        question_text = _fallback_question(role, topic, difficulty, skills)

    return {
        "question": question_text,
        "difficulty": difficulty,
        "question_type": question_type,
        "topic": topic,
        "retrieved_context": retrieved_chunks,
    }


def generate_followup_question(question: str, answer: str, quality: str, score: float) -> str:
    """Generate a targeted follow-up based on the quality of the previous answer."""
    prompt = FOLLOWUP_PROMPT.format(
        question=question,
        answer=answer,
        quality=quality,
        score=round(score, 2),
    )
    try:
        return invoke_llm(prompt)
    except Exception:
        return "Can you elaborate further on that point?"


def _fallback_question(role: str, topic: str, difficulty: str, skills: list[str]) -> str:
    """Template-based fallback when the LLM is unavailable."""
    skill = skills[0] if skills else "your primary technology"
    templates = {
        "easy": f"Can you explain the core concepts behind {topic} and why they matter for a {role}?",
        "medium": f"How would you apply {topic} concepts in a real project using {skill}?",
        "hard": f"Walk me through how you would design a system that handles {topic} at scale.",
        "expert": f"What are the common failure modes and edge cases you'd watch for when dealing with {topic} in production?",
    }
    return templates.get(difficulty, templates["medium"])
