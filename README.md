# AI-Powered Role-Based Candidate Screening System

A production-style intelligent interview platform that dynamically generates personalised, role-specific technical interview questions using RAG (Retrieval-Augmented Generation), adaptive difficulty, and LLM-based evaluation.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
│  Landing → Processing → Interview (Chat UI) → Summary Dashboard  │
└───────────────────────────┬──────────────────────────────────────┘
                            │  REST API (Axios)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FLASK BACKEND                            │
│                                                                  │
│  Routes          Services               RAG Pipeline             │
│  ─────────       ────────               ────────────             │
│  /upload_resume  resume_service         ingestion.py             │
│  /start_inter..  question_service  ───► retrieval.py             │
│  /next_question  evaluation_service     embeddings.py            │
│  /submit_answer  llm_client                                      │
│  /summary        ↕                          ↕                    │
│                  SQLAlchemy (SQLite)    ChromaDB (local)          │
│                                        sentence-transformers      │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  LLM Provider (config.) │
              │  OpenAI (GPT-3.5/4)     │
              │  Google Gemini Pro       │
              └─────────────────────────┘
```

---

## RAG Pipeline

```
knowledge_base/*.pdf
        │
        ▼ PyMuPDF text extraction
        │
        ▼ RecursiveCharacterTextSplitter
          chunk_size=800, chunk_overlap=150
        │
        ▼ SentenceTransformer embeddings
          (all-MiniLM-L6-v2 — runs locally, no API key needed)
        │
        ▼ ChromaDB PersistentClient
          (one collection per role)
        │
At query time ──►  Dynamic query built from:
                   • Resume skills & projects
                   • Selected role
                   • Current topic
                      │
                      ▼ top_k=5 semantic retrieval
                      │
                      ▼ Injected into LLM prompt
                      │
                      ▼ Personalised, contextual question
```

---

## Folder Structure

```
root/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Upload + role selection
│   │   │   ├── ProcessingPage.jsx   # Animated loading
│   │   │   ├── InterviewPage.jsx    # Chat-style interview
│   │   │   └── SummaryPage.jsx      # Analytics dashboard
│   │   ├── components/
│   │   │   ├── ChatBubble.jsx       # AI / user / eval bubbles
│   │   │   ├── ProgressBar.jsx      # Question progress
│   │   │   ├── RoleCard.jsx         # Role selector card
│   │   │   └── SourceContext.jsx    # RAG chunk viewer
│   │   ├── services/
│   │   │   └── api.js               # Axios API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                # Tailwind + glassmorphism
│   ├── package.json
│   ├── vite.config.js               # Proxy → :5000
│   ├── tailwind.config.js
│   └── index.html
│
├── backend/
│   ├── app/
│   │   ├── main.py                  # Flask app factory
│   │   ├── database/
│   │   │   ├── db.py                # SQLAlchemy instance
│   │   │   └── models.py            # InterviewSession, InterviewQA, ResumeData
│   │   ├── routes/
│   │   │   ├── resume_routes.py     # POST /upload_resume
│   │   │   ├── interview_routes.py  # start / next / submit / end
│   │   │   └── summary_routes.py    # GET /summary/<id>
│   │   ├── services/
│   │   │   ├── resume_service.py    # PDF parse + skill extraction
│   │   │   ├── question_service.py  # LLM question generation
│   │   │   ├── evaluation_service.py# LLM answer scoring + summary
│   │   │   └── llm_client.py        # OpenAI / Gemini factory
│   │   ├── rag/
│   │   │   ├── embeddings.py        # ChromaDB client + embedding fn
│   │   │   ├── ingestion.py         # PDF chunking + ChromaDB upsert
│   │   │   └── retrieval.py         # Semantic retrieval
│   │   ├── utils/
│   │   │   ├── pdf_parser.py
│   │   │   └── helpers.py
│   │   └── prompts/
│   │       ├── question_prompts.py
│   │       └── evaluation_prompts.py
│   ├── knowledge_base/              # Add role-specific PDFs here
│   ├── uploads/                     # Auto-created on first run
│   ├── chroma_db/                   # Auto-created on first run
│   ├── requirements.txt
│   ├── run.py
│   └── .env.example
│
└── README.md
```

---

## Setup Instructions

### 1 · Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| pip | latest |

---

### 2 · Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Edit .env — add your API key:
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-...

# Start backend
python run.py
```

The backend starts on **http://localhost:5000**.

> **First run**: ChromaDB is created automatically and seeded with built-in knowledge for all three roles, so the system works even without any PDFs.

---

### 3 · Add Knowledge Base PDFs (Optional)

Drop role-relevant PDFs into `backend/knowledge_base/`. The filename must contain a role keyword so the ingestion pipeline can route it correctly:

| Keyword in filename | Routed to |
|---------------------|-----------|
| `ml`, `aiml`, `deep_learning` | AI/ML Engineer |
| `backend`, `system_design`, `api` | Backend Engineer |
| `data_science`, `statistics`, `analytics` | Data Scientist |

Examples:
```
knowledge_base/aiml_handbook.pdf
knowledge_base/backend_system_design.pdf
knowledge_base/data_science_guide.pdf
```

Then hit `POST /api/ingest` to re-ingest, or restart the server.

---

### 4 · Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Start dev server
npm run dev
```

The frontend starts on **http://localhost:3000** and proxies `/api/*` to the Flask backend automatically.

---

## API Reference

### `POST /api/upload_resume`

Upload a candidate's PDF resume to start a session.

**Request** — `multipart/form-data`
| Field | Type | Required |
|-------|------|----------|
| `file` | PDF file | ✓ |
| `candidate_name` | string | ✓ |

**Response**
```json
{
  "session_id": "uuid",
  "candidate_name": "Alex Johnson",
  "resume_data": {
    "extracted_skills": ["Python", "PyTorch", "Docker"],
    "extracted_projects": ["CNN image classifier..."],
    "extracted_experience": ["ML Engineer at Acme Corp..."],
    "extracted_education": ["BSc Computer Science..."]
  }
}
```

---

### `POST /api/start_interview`

Kick off the interview and receive the first question.

**Request**
```json
{
  "session_id": "uuid",
  "role": "AI/ML Engineer"
}
```

**Response**
```json
{
  "session_id": "uuid",
  "question_id": 1,
  "question": "You mentioned CNN-based classification in your projects...",
  "question_number": 1,
  "total_questions": 8,
  "difficulty": "easy",
  "question_type": "conceptual",
  "topic": "Model Training & Overfitting",
  "retrieved_context": ["chunk 1...", "chunk 2..."]
}
```

---

### `GET /api/next_question/<session_id>`

Retrieve the current unanswered question.

---

### `POST /api/submit_answer`

Submit an answer and receive the next question + evaluation.

**Request**
```json
{
  "session_id": "uuid",
  "question_id": 1,
  "answer": "I would use dropout and data augmentation to..."
}
```

**Response**
```json
{
  "evaluation": {
    "score": 0.78,
    "quality": "good",
    "strengths": ["Correctly identified dropout", "Mentioned augmentation"],
    "weaknesses": ["Did not mention L2 regularisation"],
    "feedback": "Strong answer. Consider also discussing early stopping..."
  },
  "interview_complete": false,
  "next_question": { ... }
}
```

---

### `GET /api/summary/<session_id>`

Retrieve the full analytics report.

**Response**
```json
{
  "session": { ... },
  "summary": {
    "overall_score": 74,
    "performance_level": "Good",
    "hiring_recommendation": "Hire",
    "topics_covered": [{ "topic": "Model Training", "score": 82, "questions_asked": 2 }],
    "strengths": ["Strong on deep learning theory"],
    "improvement_areas": ["System design at scale"],
    "recommendations": ["Study distributed training patterns"],
    "skill_heatmap": { "PyTorch": 85, "MLOps": 60 },
    "technical_depth_score": 72,
    "communication_score": 76,
    "summary_text": "Alex demonstrated solid ML fundamentals..."
  },
  "qa_pairs": [ ... ]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `openai` | `openai` or `gemini` |
| `OPENAI_API_KEY` | — | Required when using OpenAI |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | Model name |
| `GOOGLE_API_KEY` | — | Required when using Gemini |
| `GEMINI_MODEL` | `gemini-pro` | Gemini model name |
| `DATABASE_URL` | `sqlite:///interview.db` | SQLAlchemy DB URL |
| `CHROMA_DB_PATH` | `./chroma_db` | ChromaDB storage path |
| `KNOWLEDGE_BASE_PATH` | `./knowledge_base` | PDF input directory |
| `MAX_QUESTIONS` | `8` | Questions per session |
| `CHUNK_SIZE` | `800` | RAG chunk character size |
| `CHUNK_OVERLAP` | `150` | RAG chunk overlap |
| `TOP_K_RESULTS` | `5` | Retrieved chunks per query |

---

## Supported Roles

| Role | Topics Covered |
|------|---------------|
| **AI/ML Engineer** | Deep learning, MLOps, NLP, Computer Vision, RAG, Evaluation Metrics, Transfer Learning |
| **Backend Engineer** | System Design, Databases, APIs, Caching, Microservices, Security, Docker/K8s |
| **Data Scientist** | EDA, Feature Engineering, Statistics, A/B Testing, SQL, Time Series, Interpretability |

---

## Adaptive Difficulty System

```
Question 1-2  → easy
Question 3-4  → medium
Question 5-6  → hard
Question 7-8  → expert

After each answer, score is evaluated:
  score < 0.35  →  step down one level
  score 0.35-0.65 → stay at current level
  score > 0.65  →  step up one level
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide Icons |
| Backend | Flask 3, Flask-CORS, SQLAlchemy, SQLite |
| AI / LLM | LangChain, OpenAI API, Google Gemini API |
| RAG | ChromaDB, Sentence Transformers (all-MiniLM-L6-v2) |
| PDF | PyMuPDF (fitz) |

---

## Future Improvements

- [ ] Voice interview mode (Web Speech API + Whisper)
- [ ] Real-time collaborative review for hiring managers
- [ ] Multi-language interview support
- [ ] Plagiarism / memorised answer detection
- [ ] Structured coding question runner (Judge0 integration)
- [ ] Export interview report as PDF
- [ ] WebSocket streaming for LLM responses
- [ ] Fine-tuned evaluation model per role
- [ ] Candidate comparison dashboard
- [ ] ATS (Applicant Tracking System) integration

---

## Screenshots

> Add screenshots to `docs/screenshots/` after running the system.

| Page | Description |
|------|-------------|
| Landing | Resume upload + role selection |
| Processing | Animated RAG context building |
| Interview | Chat-style adaptive interview |
| Summary | Analytics radar, score charts, Q&A review |

---

## License

MIT
