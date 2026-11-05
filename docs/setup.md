# Setup Guide

## Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Python | 3.10 | `python --version` |
| pip | 23+ | `pip --version` |
| Node.js | 18 | `node --version` |
| npm | 9+ | `npm --version` |

---

## 1 · Clone / Download

If you downloaded the project as a ZIP, extract it. The root folder should contain `backend/`, `frontend/`, `docs/`, and `README.md`.

---

## 2 · Backend Setup

### 2a · Create a virtual environment

```bash
cd backend

# Create venv
python -m venv venv

# Activate — Windows
venv\Scripts\activate

# Activate — macOS / Linux
source venv/bin/activate
```

> You will see `(venv)` in your terminal prompt when the environment is active.

### 2b · Install dependencies

```bash
pip install -r requirements.txt
```

> **First install note:** `sentence-transformers` will download the `all-MiniLM-L6-v2` model
> (~90 MB) on the first run. This is a one-time download; it is cached locally afterwards.

### 2c · Configure environment variables

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` in any editor and set at minimum:

```env
# Choose your LLM provider
LLM_PROVIDER=openai          # or: gemini

# If using OpenAI
OPENAI_API_KEY=sk-...

# If using Gemini
GOOGLE_API_KEY=AIza...
```

All other values have sensible defaults and do not need to change for local development.

### 2d · (Optional) Add knowledge-base PDFs

Drop PDF files into `backend/knowledge_base/`. The filename must contain a role keyword:

| Filename contains | Routes to |
|-------------------|----------|
| `ml`, `aiml`, `machine_learning`, `deep_learning` | AI/ML Engineer |
| `backend`, `system_design`, `api` | Backend Engineer |
| `data_science`, `statistics`, `analytics` | Data Scientist |

If you skip this step, the system uses built-in seed knowledge and works fine.

### 2e · Start the backend

```bash
python run.py
```

Expected output:
```
[RAG] Seeded 8 built-in chunks for 'AI/ML Engineer'
[RAG] Seeded 8 built-in chunks for 'Backend Engineer'
[RAG] Seeded 8 built-in chunks for 'Data Scientist'
Starting AI Interview System on http://localhost:5000
 * Debugger is active!
```

Verify the server is running:
```bash
curl http://localhost:5000/api/health
# → {"message":"AI Interview System running","status":"ok"}
```

---

## 3 · Frontend Setup

Open a **new terminal** (keep the backend running).

```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in 300ms
  ➜  Local:   http://localhost:3000/
```

Open **http://localhost:3000** in your browser.

---

## 4 · Using the System

1. **Landing page** — enter your name, drag-and-drop a PDF resume, select a role
2. **Processing page** — wait ~3–5 seconds while the resume is parsed and the first question is generated
3. **Interview page** — answer questions in the chat interface; press `Enter` to submit
4. **Summary page** — view your score, analytics charts, and per-question feedback

---

## 5 · Re-ingesting the Knowledge Base

After adding new PDFs to `knowledge_base/`, either:

- Restart the backend (ingestion runs automatically on startup), or
- Call the admin endpoint without restarting:

```bash
curl -X POST http://localhost:5000/api/ingest
```

---

## Troubleshooting

### `no such table: interview_sessions`
**Cause:** The database was not created.
**Fix:** Ensure `from app.database import models` is present in `app/main.py` before `db.create_all()` is called. This import was the critical fix — see [Architecture](architecture.md) for why.

### `ModuleNotFoundError: No module named 'fitz'`
**Cause:** PyMuPDF is not installed.
**Fix:** `pip install PyMuPDF`

### `openai.AuthenticationError` / `google.auth.exceptions.TransportError`
**Cause:** Missing or wrong API key.
**Fix:** Check `.env` — ensure `OPENAI_API_KEY` or `GOOGLE_API_KEY` is set and valid. The key must match `LLM_PROVIDER`.

### `chromadb.errors.InvalidCollectionException`
**Cause:** ChromaDB schema version mismatch from a previous install.
**Fix:** Delete the `chroma_db/` directory and restart. It will be recreated and re-seeded.

### Port 5000 already in use
```bash
# Windows — find and kill the process
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

### Frontend shows "Network Error"
**Cause:** Backend is not running, or the Vite proxy is misconfigured.
**Fix:** Confirm `python run.py` is running on port 5000. The Vite config proxies `/api/*` to `http://localhost:5000` automatically.

### Slow first question generation
**Cause:** `sentence-transformers` is loading the model into memory for the first time.
**Fix:** This is normal on cold start. Subsequent requests are fast.

---

## Production Deployment Checklist

- [ ] Set `FLASK_DEBUG=0` and `FLASK_ENV=production`
- [ ] Generate a strong `SECRET_KEY`
- [ ] Switch `DATABASE_URL` to PostgreSQL
- [ ] Run Flask behind Gunicorn: `gunicorn -w 4 "app.main:create_app()"`
- [ ] Serve static frontend build (`npm run build`) via Nginx
- [ ] Store uploaded resumes in S3 / GCS (not local disk)
- [ ] Move ChromaDB to a managed vector store (Pinecone, Weaviate)
- [ ] Set CORS `origins` to your actual frontend domain in `main.py`
- [ ] Add rate limiting to `/upload_resume` and `/submit_answer`
