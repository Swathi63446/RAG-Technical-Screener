# Database Schema

The system uses **SQLite** (via SQLAlchemy ORM) for development. The `DATABASE_URL`
environment variable can be changed to any SQLAlchemy-compatible database
(e.g. PostgreSQL) without touching application code.

---

## ER Diagram

```
┌──────────────────────────────────┐
│         InterviewSession         │
├──────────────────────────────────┤
│ id (PK, UUID string)             │
│ candidate_name (string 200)      │
│ role (string 100)                │
│ status (string 50)               │  "active" | "completed"
│ question_count (integer)         │
│ current_difficulty (string 20)   │
│ created_at (datetime)            │
└──────────┬───────────────────────┘
           │  1
           │
           ├─────────────────────────────── has many
           │  N
           ▼
┌──────────────────────────────────┐
│           InterviewQA            │
├──────────────────────────────────┤
│ id (PK, autoincrement integer)   │
│ session_id (FK → InterviewSession│
│ question (Text)                  │
│ answer (Text, nullable)          │  NULL = not yet answered
│ retrieved_context (Text/JSON)    │  JSON array of chunk strings
│ score (float, nullable)          │  0.0 – 1.0
│ quality (string 20)              │  weak|average|good|excellent
│ difficulty (string 20)           │  easy|medium|hard|expert
│ question_type (string 50)        │  conceptual|implementation|…
│ topic (string 100)               │
│ strengths (Text/JSON)            │  JSON array
│ weaknesses (Text/JSON)           │  JSON array
│ feedback (Text)                  │
│ created_at (datetime)            │
└──────────────────────────────────┘

           │  1
           │
           └─────────────────────────────── has one
                          1
                          ▼
┌──────────────────────────────────┐
│           ResumeData             │
├──────────────────────────────────┤
│ id (PK, autoincrement integer)   │
│ session_id (FK → InterviewSession│
│ raw_resume_text (Text)           │
│ extracted_skills (Text/JSON)     │  JSON array of strings
│ extracted_projects (Text/JSON)   │  JSON array of strings
│ extracted_experience (Text/JSON) │  JSON array of strings
│ extracted_education (Text/JSON)  │  JSON array of strings
│ extracted_technologies (Text/JSON│  JSON array of strings
│ created_at (datetime)            │
└──────────────────────────────────┘
```

---

## Table: `interview_sessions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | VARCHAR(36) | PK | UUID generated in application code |
| `candidate_name` | VARCHAR(200) | NOT NULL | Full name from the upload form |
| `role` | VARCHAR(100) | NOT NULL | Set when `/start_interview` is called |
| `status` | VARCHAR(50) | default `"active"` | `"active"` or `"completed"` |
| `question_count` | INTEGER | default `0` | Number of questions generated so far |
| `current_difficulty` | VARCHAR(20) | default `"easy"` | Adaptive difficulty tracker |
| `created_at` | DATETIME | default `utcnow` | Session creation time |

---

## Table: `interview_qa`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, autoincrement | |
| `session_id` | VARCHAR(36) | FK → `interview_sessions.id` | |
| `question` | TEXT | NOT NULL | LLM-generated question text |
| `answer` | TEXT | nullable | Candidate's answer; `NULL` = unanswered |
| `retrieved_context` | TEXT | nullable | JSON array of RAG chunk strings |
| `score` | FLOAT | nullable | LLM evaluation score 0.0–1.0 |
| `quality` | VARCHAR(20) | nullable | `weak` / `average` / `good` / `excellent` |
| `difficulty` | VARCHAR(20) | default `"easy"` | Difficulty at time of generation |
| `question_type` | VARCHAR(50) | default `"conceptual"` | Question category |
| `topic` | VARCHAR(100) | nullable | Topic label (e.g. `"MLOps & Deployment"`) |
| `strengths` | TEXT | nullable | JSON array of strength strings |
| `weaknesses` | TEXT | nullable | JSON array of weakness strings |
| `feedback` | TEXT | nullable | LLM-generated constructive feedback |
| `created_at` | DATETIME | default `utcnow` | |

**Cascade:** deleting an `InterviewSession` cascades to all its `InterviewQA` rows.

---

## Table: `resume_data`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, autoincrement | |
| `session_id` | VARCHAR(36) | FK → `interview_sessions.id` | |
| `raw_resume_text` | TEXT | nullable | Full extracted text from PDF |
| `extracted_skills` | TEXT | nullable | JSON array, e.g. `["Python", "PyTorch"]` |
| `extracted_projects` | TEXT | nullable | JSON array of project description strings |
| `extracted_experience` | TEXT | nullable | JSON array of experience line strings |
| `extracted_education` | TEXT | nullable | JSON array of education line strings |
| `extracted_technologies` | TEXT | nullable | JSON array (same extraction as skills) |
| `created_at` | DATETIME | default `utcnow` | |

**Relationship:** `uselist=False` — one-to-one with `InterviewSession`.
Deleting the session cascades to this record.

---

## JSON Column Pattern

SQLite does not have a native JSON type. JSON arrays are stored as `TEXT`
using Python's `json.dumps()` / `json.loads()` in the service layer and the
model's `to_dict()` method:

```python
# Writing
record.extracted_skills = json.dumps(["Python", "PyTorch"])

# Reading (in to_dict())
json.loads(self.extracted_skills) if self.extracted_skills else []
```

When migrating to PostgreSQL, these columns can be changed to `JSONB` for
indexing and query support without changing the Python code.

---

## Migrations

The project uses `db.create_all()` for simplicity. For production:

1. Install Alembic: `pip install alembic`
2. Initialise: `alembic init migrations`
3. Point `alembic.ini` at your `DATABASE_URL`
4. Generate migration: `alembic revision --autogenerate -m "initial"`
5. Apply: `alembic upgrade head`
