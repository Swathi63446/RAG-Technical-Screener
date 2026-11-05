# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React + Vite)                         │
│                                                                         │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────┐  ┌──────────┐  │
│  │ LandingPage  │→ │ ProcessingPage   │→ │Interview  │→ │ Summary  │  │
│  │ (upload+role)│  │ (animated steps) │  │ (chat UI) │  │Dashboard │  │
│  └──────────────┘  └──────────────────┘  └───────────┘  └──────────┘  │
│          │                  │                   │               │       │
│          └──────────────────┴───────────────────┴───────────────┘       │
│                                   │ Axios (REST)                         │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │         FLASK BACKEND          │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │         Routes          │  │
                    │  │  /upload_resume         │  │
                    │  │  /start_interview       │  │
                    │  │  /next_question/<id>    │  │
                    │  │  /submit_answer         │  │
                    │  │  /end_interview         │  │
                    │  │  /summary/<id>          │  │
                    │  └───────────┬─────────────┘  │
                    │              │                 │
                    │  ┌───────────▼─────────────┐  │
                    │  │        Services         │  │
                    │  │  resume_service    ─────┼──┼──► PyMuPDF
                    │  │  question_service  ─────┼──┼──► LLM Client
                    │  │  evaluation_service─────┼──┼──► LLM Client
                    │  │  llm_client             │  │
                    │  └───────────┬─────────────┘  │
                    │              │                 │
                    │  ┌───────────▼─────────────┐  │
                    │  │      RAG Pipeline       │  │
                    │  │  ingestion.py           │  │
                    │  │  retrieval.py      ─────┼──┼──► ChromaDB
                    │  │  embeddings.py     ─────┼──┼──► sentence-transformers
                    │  └─────────────────────────┘  │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │  SQLAlchemy (SQLite)    │  │
                    │  │  InterviewSession       │  │
                    │  │  InterviewQA            │  │
                    │  │  ResumeData             │  │
                    │  └─────────────────────────┘  │
                    └───────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │         LLM Provider           │
                    │  OpenAI (gpt-3.5-turbo / gpt-4)│
                    │  Google Gemini Pro              │
                    │  (selected via LLM_PROVIDER env)│
                    └───────────────────────────────┘
```

---

## Request / Data Flow

### 1 · Resume Upload

```
Browser                     Flask                  Disk / DB
──────────────────────────────────────────────────────────────
POST /upload_resume ──────►  resume_routes.py
(multipart PDF + name)       │
                             ├─► secure_filename()  → uploads/
                             ├─► parse_resume()     → PyMuPDF
                             │    ├─ extract_text()
                             │    ├─ extract_skills()
                             │    ├─ extract_projects()
                             │    └─ extract_experience()
                             ├─► InterviewSession   → SQLite
                             └─► ResumeData         → SQLite
                                                       │
◄──────── 201 { session_id, resume_data } ────────────┘
```

### 2 · Interview Start

```
Browser                     Flask                      LLM / ChromaDB
──────────────────────────────────────────────────────────────────────
POST /start_interview ────►  interview_routes.py
{ session_id, role }         │
                             ├─► load ResumeData from DB
                             ├─► retrieve_context()  ──► ChromaDB query
                             │    └─ top-5 chunks returned
                             ├─► generate_question()  ──► LLM prompt
                             │    └─ personalised Q returned
                             └─► InterviewQA (unanswered) → SQLite

◄──── 200 { question_id, question, difficulty, topic, context } ────
```

### 3 · Answer Submission Loop

```
Browser                     Flask                   LLM
──────────────────────────────────────────────────────
POST /submit_answer ──────►  interview_routes.py
{ session_id, q_id, answer}  │
                             ├─► evaluate_answer()  ──► LLM (EVALUATION_PROMPT)
                             │    └─ { score, quality, strengths, weaknesses }
                             ├─► next_difficulty()  (adaptive: score → level)
                             ├─► generate_question()  ──► LLM (next Q)
                             │    └─ uses updated difficulty + history
                             ├─► persist answer + eval  → SQLite
                             └─► persist next Q         → SQLite

◄──── 200 { evaluation, interview_complete, next_question } ────────
```

### 4 · Summary Generation

```
Browser              Flask                           LLM
───────────────────────────────────────────────────────
GET /summary/<id> ►  summary_routes.py
                     ├─► load all InterviewQA rows
                     ├─► build interview_data string
                     └─► generate_summary() ──► LLM (SUMMARY_PROMPT)
                          └─ { overall_score, topics, heatmap, rec }

◄──── 200 { session, summary, qa_pairs, resume } ───────────────────
```

---

## Tech Stack Decisions

| Concern | Choice | Reason |
|---------|--------|--------|
| Web framework | Flask | Lightweight, easy to reason about, great ecosystem |
| ORM | SQLAlchemy | Mature, declarative models, supports multiple DBs |
| Database | SQLite | Zero-ops for development; swap DATABASE_URL for Postgres in production |
| Embeddings | `all-MiniLM-L6-v2` | Fast, 384-dim, runs locally — no API key or network required |
| Vector store | ChromaDB | Persistent, local, Python-native, no server needed |
| Text splitter | LangChain `RecursiveCharacterTextSplitter` | Respects semantic boundaries, tunable |
| LLM | OpenAI / Gemini (configurable) | Best-in-class instruction following; dual-provider keeps costs flexible |
| PDF parsing | PyMuPDF (fitz) | Fastest Python PDF library, excellent text extraction |
| Frontend | React 18 + Vite | Fast HMR, minimal config, ecosystem |
| Styling | Tailwind CSS | Utility-first, dark-mode-friendly, no runtime overhead |
| Animation | Framer Motion | Declarative, spring-physics, layout animations |
| Charts | Recharts | React-native, composable, no jQuery dependency |

---

## Directory Structure

```
root/
├── docs/                        ← You are here
│   ├── index.md
│   ├── architecture.md
│   ├── setup.md
│   ├── api-reference.md
│   ├── rag-pipeline.md
│   ├── database-schema.md
│   ├── frontend-guide.md
│   ├── backend-guide.md
│   └── configuration.md
│
├── backend/
│   ├── app/
│   │   ├── main.py              Flask app factory
│   │   ├── database/
│   │   │   ├── db.py            SQLAlchemy instance
│   │   │   └── models.py        ORM models
│   │   ├── routes/
│   │   │   ├── resume_routes.py
│   │   │   ├── interview_routes.py
│   │   │   └── summary_routes.py
│   │   ├── services/
│   │   │   ├── resume_service.py
│   │   │   ├── question_service.py
│   │   │   ├── evaluation_service.py
│   │   │   └── llm_client.py
│   │   ├── rag/
│   │   │   ├── embeddings.py
│   │   │   ├── ingestion.py
│   │   │   └── retrieval.py
│   │   ├── utils/
│   │   │   ├── pdf_parser.py
│   │   │   └── helpers.py
│   │   └── prompts/
│   │       ├── question_prompts.py
│   │       └── evaluation_prompts.py
│   ├── knowledge_base/          Add role PDFs here
│   ├── uploads/                 Auto-created, gitignored
│   ├── chroma_db/               Auto-created, gitignored
│   ├── requirements.txt
│   ├── run.py
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ProcessingPage.jsx
│   │   │   ├── InterviewPage.jsx
│   │   │   └── SummaryPage.jsx
│   │   ├── components/
│   │   │   ├── ChatBubble.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── RoleCard.jsx
│   │   │   └── SourceContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
└── README.md
```

---

## Scalability Notes

The current architecture is deliberately simple (SQLite, single Flask process, local ChromaDB).
Here is the migration path to scale:

| Component | Development | Production-scale |
|-----------|-------------|-----------------|
| Database | SQLite | PostgreSQL — change `DATABASE_URL` only |
| Flask server | `flask run` | Gunicorn + Nginx, or containerised |
| Vector DB | Local ChromaDB | Pinecone / Weaviate / Qdrant (swap `embeddings.py`) |
| LLM calls | Synchronous | Celery + Redis task queue for async generation |
| Sessions | SQLite | Redis session store |
| Files | Local `uploads/` | S3 / GCS |
