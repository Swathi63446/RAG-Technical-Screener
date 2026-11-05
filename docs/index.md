# AI-Powered Candidate Screening System — Documentation

Welcome to the complete technical documentation for the **AI Interview System**, a production-style
platform that conducts role-specific, RAG-enhanced, adaptive technical interviews.

---

## Documentation Map

| Document | What It Covers |
|----------|---------------|
| [Architecture](architecture.md) | System design, data flow diagrams, tech stack decisions |
| [Setup Guide](setup.md) | Installation, configuration, running locally, troubleshooting |
| [API Reference](api-reference.md) | Every endpoint — request/response schemas with examples |
| [RAG Pipeline](rag-pipeline.md) | How Retrieval-Augmented Generation works end-to-end |
| [Database Schema](database-schema.md) | All tables, columns, relationships, and ER diagram |
| [Frontend Guide](frontend-guide.md) | Pages, components, state management, styling system |
| [Backend Guide](backend-guide.md) | Services, modules, error handling, extension points |
| [Configuration](configuration.md) | All environment variables with types and defaults |

---

## Quick Overview

```
User uploads PDF resume
        │
        ▼
Resume is parsed → skills, projects, experience extracted
        │
        ▼
Role selected (AI/ML Engineer / Backend Engineer / Data Scientist)
        │
        ▼
RAG pipeline retrieves role-specific knowledge chunks from ChromaDB
        │
        ▼
LLM generates personalised question using resume + RAG context
        │
        ▼
Candidate answers → LLM evaluates → adaptive difficulty adjusts
        │
        ▼  (repeats for up to 8 questions)
        │
        ▼
Summary dashboard: score, charts, strengths, weaknesses, hire recommendation
```

---

## Key Design Principles

1. **Personalisation over templates** — every question references the candidate's actual resume
2. **RAG grounding** — questions are anchored in retrieved technical knowledge, not LLM hallucination
3. **Adaptive difficulty** — the system responds to answer quality in real time
4. **Provider agnostic** — swap OpenAI ↔ Gemini with a single env var change
5. **Works offline-ish** — built-in seed knowledge means no PDFs required to get started
