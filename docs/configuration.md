# Configuration Reference

All configuration is done through environment variables in `backend/.env`.
Copy `backend/.env.example` to `backend/.env` to get started.

---

## Complete Variable Reference

### LLM Provider

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LLM_PROVIDER` | string | `openai` | Which LLM API to use. Must be `openai` or `gemini`. |

---

### OpenAI (used when `LLM_PROVIDER=openai`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OPENAI_API_KEY` | string | — | **Required.** Your OpenAI API key (`sk-...`). |
| `OPENAI_MODEL` | string | `gpt-3.5-turbo` | Model name. Use `gpt-4` for higher quality at higher cost. |

**Supported models:**

| Model | Quality | Speed | Cost |
|-------|---------|-------|------|
| `gpt-3.5-turbo` | Good | Fast | Low |
| `gpt-4` | Excellent | Slower | High |
| `gpt-4o` | Excellent | Fast | Medium |
| `gpt-4o-mini` | Good | Very fast | Very low |

---

### Google Gemini (used when `LLM_PROVIDER=gemini`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GOOGLE_API_KEY` | string | — | **Required.** Your Google AI Studio API key. |
| `GEMINI_MODEL` | string | `gemini-pro` | Model name. |

**Supported models:**

| Model | Quality | Notes |
|-------|---------|-------|
| `gemini-pro` | Good | Stable, widely available |
| `gemini-1.5-pro` | Excellent | Longer context window |
| `gemini-1.5-flash` | Good | Faster, lower cost |
| `gemini-2.0-flash` | Excellent | Latest fast model |

---

### Flask

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FLASK_ENV` | string | `development` | Set to `production` before deploying |
| `FLASK_DEBUG` | string | `1` | `1` = debug mode on. Set to `0` in production. |
| `SECRET_KEY` | string | `dev-secret-key` | **Change this** before deploying. Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |

---

### Database

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | string | `sqlite:///interview.db` | SQLAlchemy connection URL. See examples below. |

**Connection URL examples:**

```bash
# SQLite (development — file created in backend/)
DATABASE_URL=sqlite:///interview.db

# SQLite with absolute path
DATABASE_URL=sqlite:////absolute/path/to/interview.db

# PostgreSQL (production)
DATABASE_URL=postgresql://user:password@localhost:5432/interview_db

# PostgreSQL with SSL
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

---

### Storage Paths

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CHROMA_DB_PATH` | string | `./chroma_db` | Where ChromaDB stores its vector data. Relative to `backend/`. |
| `KNOWLEDGE_BASE_PATH` | string | `./knowledge_base` | Directory scanned for PDF ingestion. Relative to `backend/`. |
| `UPLOAD_FOLDER` | string | `./uploads` | Where uploaded resume PDFs are saved. Relative to `backend/`. |

---

### Interview Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MAX_QUESTIONS` | integer | `8` | Number of questions per interview session. |
| `CHUNK_SIZE` | integer | `800` | Character count per RAG text chunk. |
| `CHUNK_OVERLAP` | integer | `150` | Character overlap between adjacent chunks. |
| `TOP_K_RESULTS` | integer | `5` | Number of knowledge chunks retrieved per question. |

**Tuning guidance:**

| Parameter | Increase to... | Decrease to... |
|-----------|---------------|----------------|
| `MAX_QUESTIONS` | Conduct deeper interviews | Keep sessions shorter |
| `CHUNK_SIZE` | Include more context per chunk | Improve retrieval precision |
| `CHUNK_OVERLAP` | Reduce boundary-split problems | Save storage space |
| `TOP_K_RESULTS` | Include more context in prompts | Reduce prompt length / cost |

---

## Example `.env` Files

### Minimal (OpenAI)
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-abc123...
```

### Minimal (Gemini)
```env
LLM_PROVIDER=gemini
GOOGLE_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
```

### Full development config
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=dev-only-not-for-production

DATABASE_URL=sqlite:///interview.db
CHROMA_DB_PATH=./chroma_db
KNOWLEDGE_BASE_PATH=./knowledge_base
UPLOAD_FOLDER=./uploads

MAX_QUESTIONS=8
CHUNK_SIZE=800
CHUNK_OVERLAP=150
TOP_K_RESULTS=5
```

### Production config (PostgreSQL + Gemini)
```env
LLM_PROVIDER=gemini
GOOGLE_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-pro

FLASK_ENV=production
FLASK_DEBUG=0
SECRET_KEY=<64-char-random-hex>

DATABASE_URL=postgresql://appuser:strongpassword@db-host:5432/interviewdb

MAX_QUESTIONS=10
TOP_K_RESULTS=5
```
