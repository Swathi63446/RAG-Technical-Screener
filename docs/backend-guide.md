# Backend Guide

## Module Map

```
backend/app/
├── main.py               Flask app factory
├── database/
│   ├── db.py             SQLAlchemy singleton
│   └── models.py         ORM table definitions
├── routes/               HTTP boundary — thin, validates, delegates
│   ├── resume_routes.py
│   ├── interview_routes.py
│   └── summary_routes.py
├── services/             Business logic
│   ├── resume_service.py
│   ├── question_service.py
│   ├── evaluation_service.py
│   └── llm_client.py
├── rag/                  Vector storage and retrieval
│   ├── embeddings.py
│   ├── ingestion.py
│   └── retrieval.py
├── utils/
│   ├── pdf_parser.py
│   └── helpers.py
└── prompts/
    ├── question_prompts.py
    └── evaluation_prompts.py
```

---

## `app/main.py` — App Factory

Uses the **application factory pattern** so the app can be instantiated multiple times
(useful for testing). Key responsibilities:

1. Load `.env` (via `python-dotenv`)
2. Configure Flask (`SECRET_KEY`, `UPLOAD_FOLDER`, `MAX_CONTENT_LENGTH`)
3. Init SQLAlchemy with `db.init_app(app)`
4. **Import models before `db.create_all()`** — this is critical; without it, SQLAlchemy
   has no tables registered and `create_all()` silently creates nothing
5. Register blueprints under the `/api` prefix
6. Trigger RAG ingestion in the app context

```python
# The critical import — must precede db.create_all()
from app.database import models  # noqa: F401

with app.app_context():
    db.create_all()
```

---

## `services/resume_service.py` — Resume Parsing

### `parse_resume(file_path) → dict`

Full pipeline: PDF → raw text → structured fields.

```python
{
    "raw_text": "...",
    "skills":      ["Python", "PyTorch", ...],
    "projects":    ["Built CNN classifier...", ...],
    "experience":  ["ML Engineer at Acme Corp...", ...],
    "education":   ["B.Sc. Computer Science...", ...],
    "technologies": ["Python", "PyTorch", ...]
}
```

### Skill extraction

Matches against `TECH_SKILLS` — a curated set of ~70 technology keywords spanning
languages, frameworks, databases, cloud tools, and ML libraries.

Uses word-boundary regex (`\bskill\b`) to avoid false positives (e.g. "rust" inside
"frustrated").

### Section extraction

Uses regex to find section headers (`experience`, `projects`, `education`, `skills`)
then slices the text between consecutive headers.

---

## `services/llm_client.py` — LLM Factory

```python
get_llm()   → LangChain ChatModel (OpenAI or Gemini), cached with @lru_cache
invoke_llm(prompt: str) → str
```

The provider is selected at startup via `LLM_PROVIDER` env var. The `@lru_cache`
ensures the client is constructed only once per process — no repeated auth overhead.

**Switching providers** requires only `.env` changes; no code changes.

---

## `services/question_service.py` — Question Generation

### `generate_question(...) → dict`

Core function. Orchestrates:

1. **Topic selection** — picks from a role-specific topic list, avoiding already-covered topics
2. **Difficulty selection** — follows the `DIFFICULTY_PROGRESSION` ladder, then applies adaptive override
3. **Question type rotation** — cycles through `conceptual → implementation → scenario → ...`
4. **RAG retrieval** — calls `retrieve_context()` with the selected topic
5. **LLM call** — fills `QUESTION_GENERATION_PROMPT` and calls `invoke_llm()`
6. **Fallback** — if LLM fails, returns a template-based question

### Difficulty ladder

```python
DIFFICULTY_PROGRESSION = [
    "easy", "easy",     # Q1, Q2
    "medium", "medium", # Q3, Q4
    "hard", "hard",     # Q5, Q6
    "expert", "expert", # Q7, Q8
]
```

After Q2, the *adaptive* difficulty from `session.current_difficulty` overrides
the base progression.

### Topic rotation

```python
ROLE_TOPICS = {
    "AI/ML Engineer": [
        "Model Training & Overfitting",
        "Deep Learning Architectures",
        "MLOps & Deployment", ...
    ],
    ...
}
```

The function tracks `asked_topics` from the Q&A history and prefers unvisited topics.

---

## `services/evaluation_service.py` — Answer Scoring

### `evaluate_answer(question, answer, role, topic, difficulty) → dict`

Calls `EVALUATION_PROMPT` with the LLM. Returns:

```python
{
    "score": 0.78,           # float 0.0–1.0
    "quality": "good",
    "strengths": [...],
    "weaknesses": [...],
    "key_concepts_covered": [...],
    "key_concepts_missing": [...],
    "next_difficulty": "hard",
    "feedback": "...",
    "topic": "..."
}
```

Uses `extract_json_from_llm_response()` to robustly parse LLM output that may
include markdown fences or surrounding prose.

### Fallback scoring (`_keyword_fallback_eval`)

If the LLM is unavailable, scores are computed heuristically:
- **Length score** — longer answers score higher (capped at 150 words = 1.0)
- **Keyword density** — technical words (length > 5) as a proxy for depth
- Final: `length_score * 0.4 + keyword_score * 0.6`

### `generate_summary(candidate_name, role, qa_pairs) → dict`

Compiles all Q&A into a structured prompt and calls the LLM for a holistic summary.
Falls back to `_compute_fallback_summary()` which aggregates stored scores
statistically without an LLM call.

---

## `utils/helpers.py` — Utility Functions

| Function | Description |
|----------|-------------|
| `safe_json_loads(text, default)` | Parse JSON, return default on failure |
| `extract_json_from_llm_response(text)` | Strip markdown fences, find JSON block |
| `truncate_text(text, max_chars)` | Word-boundary-aware truncation |
| `difficulty_to_score(difficulty)` | `easy→25`, `medium→50`, `hard→75`, `expert→100` |
| `next_difficulty(current, score)` | Adaptive difficulty: up if score>0.65, down if <0.35 |

---

## Error Handling Strategy

| Layer | How errors are handled |
|-------|----------------------|
| Routes | Catch domain exceptions, return JSON `{"error": "..."}` with appropriate HTTP code |
| Services | Try/except around LLM calls with fallback logic; never propagate LLM errors to routes |
| RAG | Returns empty list on any retrieval failure; question generation continues |
| PDF parsing | Raises `ValueError` with message; route catches and returns 422 |

---

## Extending the System

### Adding a new role

1. Add the role to `ROLE_COLLECTIONS` in `ingestion.py`
2. Add seed knowledge to `SEED_KNOWLEDGE`
3. Add topic list to `ROLE_TOPICS` in `question_service.py`
4. Add the role to `valid_roles` in `interview_routes.py`
5. Add the role card to `ROLES` in `LandingPage.jsx`

### Swapping the LLM

Edit `llm_client.py`. Any LangChain-compatible chat model works:

```python
# Example: use Anthropic Claude
from langchain_anthropic import ChatAnthropic
return ChatAnthropic(model="claude-3-5-sonnet-20241022", ...)
```

### Swapping the vector store

Edit `embeddings.py`. Replace the ChromaDB client with any store that
exposes `.query()` returning documents. Pinecone, Qdrant, and Weaviate all
have LangChain wrappers.
