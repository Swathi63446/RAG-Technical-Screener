"""
Resume processing service.
Parses PDF text and extracts structured information using regex + keyword heuristics.
"""

import re
import json
from app.utils.pdf_parser import extract_text_from_pdf

# ── Skill keyword lists ──────────────────────────────────────────────────────

TECH_SKILLS = {
    # Languages
    "python", "java", "javascript", "typescript", "golang", "go", "rust", "c++",
    "c#", "ruby", "php", "kotlin", "swift", "scala", "r", "matlab", "julia",
    # ML / Data
    "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "xgboost",
    "lightgbm", "catboost", "pandas", "numpy", "scipy", "matplotlib", "seaborn",
    "plotly", "hugging face", "transformers", "langchain", "openai", "llm",
    "bert", "gpt", "t5", "stable diffusion", "computer vision", "nlp",
    "deep learning", "machine learning", "reinforcement learning",
    "neural network", "cnn", "rnn", "lstm", "transformer", "attention",
    "rag", "vector database", "embeddings", "fine-tuning",
    # Backend / Cloud
    "flask", "fastapi", "django", "express", "spring", "node.js", "nodejs",
    "graphql", "rest", "grpc", "microservices", "docker", "kubernetes", "k8s",
    "aws", "azure", "gcp", "terraform", "ansible", "ci/cd", "github actions",
    "jenkins", "redis", "kafka", "rabbitmq", "celery",
    # Databases
    "postgresql", "postgres", "mysql", "sqlite", "mongodb", "cassandra",
    "dynamodb", "elasticsearch", "neo4j", "pinecone", "chromadb", "weaviate",
    "faiss", "qdrant",
    # Frontend
    "react", "vue", "angular", "svelte", "next.js", "nuxt", "tailwind",
    "html", "css", "webpack", "vite",
    # Tools / Other
    "git", "linux", "bash", "shell", "spark", "hadoop", "airflow", "dbt",
    "mlflow", "wandb", "dvc", "jupyter", "sql",
}

# Section header patterns
SECTION_PATTERNS = {
    "experience": r"(work\s*experience|professional\s*experience|employment|experience)",
    "education": r"(education|academic|qualification)",
    "projects": r"(project|portfolio|work\s*sample)",
    "skills": r"(skill|technolog|competenc|proficienc)",
}


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_skills(text: str) -> list[str]:
    """Extract technical skills by keyword matching against a curated list."""
    lower = text.lower()
    found = set()
    for skill in TECH_SKILLS:
        # Use word-boundary matching for short tokens
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, lower):
            found.add(skill.title() if len(skill) <= 3 else skill.capitalize())
    return sorted(found)


def _extract_section(text: str, section_key: str) -> str:
    """Extract text content belonging to a resume section."""
    pattern = SECTION_PATTERNS.get(section_key, "")
    if not pattern:
        return ""

    # Find the section header
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return ""

    start = match.end()
    # The next section starts where another header appears
    other_patterns = "|".join(
        v for k, v in SECTION_PATTERNS.items() if k != section_key
    )
    next_section = re.search(other_patterns, text[start:], re.IGNORECASE)
    end = start + next_section.start() if next_section else len(text)

    return _clean(text[start:end])


def extract_projects(text: str) -> list[str]:
    """Pull project names / descriptions from the projects section."""
    section = _extract_section(text, "projects")
    if not section:
        # Fallback: look for lines with known project signal words
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        section = " ".join(
            l for l in lines
            if any(w in l.lower() for w in ("built", "developed", "created", "implemented",
                                             "designed", "deployed", "trained", "fine-tuned"))
        )

    # Split into bullet-like segments
    bullets = re.split(r"[•●▪\-\*]|\n(?=[A-Z])", section)
    projects = [_clean(b) for b in bullets if len(b.strip()) > 30]
    return projects[:8]


def extract_experience(text: str) -> list[str]:
    """Extract job titles / company lines from the experience section."""
    section = _extract_section(text, "experience")
    if not section:
        return []

    lines = [_clean(l) for l in section.split("\n") if _clean(l)]
    # Keep lines that look like role descriptions (contain a date or company signal)
    experience_lines = [
        l for l in lines
        if re.search(r"\d{4}|present|current|intern|engineer|scientist|analyst|developer|manager",
                     l, re.IGNORECASE)
    ]
    return experience_lines[:6]


def extract_education(text: str) -> list[str]:
    """Extract education entries."""
    section = _extract_section(text, "education")
    if not section:
        return []
    lines = [_clean(l) for l in section.split("\n") if len(_clean(l)) > 10]
    return lines[:4]


def parse_resume(file_path: str) -> dict:
    """
    Full resume parsing pipeline.
    Returns a dict with raw text and all extracted fields.
    """
    raw_text = extract_text_from_pdf(file_path)
    return {
        "raw_text": raw_text,
        "skills": extract_skills(raw_text),
        "projects": extract_projects(raw_text),
        "experience": extract_experience(raw_text),
        "education": extract_education(raw_text),
        "technologies": extract_skills(raw_text),  # alias — same extraction
    }
