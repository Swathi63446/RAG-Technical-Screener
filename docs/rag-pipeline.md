# RAG Pipeline

RAG (Retrieval-Augmented Generation) is the technique that keeps interview questions
technically grounded and specific to the role. Without it, the LLM might hallucinate
concepts or ask generic questions. With it, every question is anchored in retrieved,
factual knowledge chunks.

---

## End-to-End Flow

```
INGESTION (runs once on startup / on demand)
────────────────────────────────────────────────────────────────────────
knowledge_base/*.pdf
        │
        ▼  PyMuPDF  (app/utils/pdf_parser.py)
        │  Extract raw text page by page
        │
        ▼  RecursiveCharacterTextSplitter  (langchain_text_splitters)
        │  chunk_size=800, chunk_overlap=150
        │  separators=["\n\n", "\n", ". ", " ", ""]
        │
        ▼  SentenceTransformer  (all-MiniLM-L6-v2)
        │  Converts each chunk → 384-dimensional float vector
        │  Runs locally — no API key, cached after first download
        │
        ▼  ChromaDB PersistentClient  (app/rag/embeddings.py)
           Upserts { id, document, metadata, embedding } into
           role-specific collection:
             aiml_knowledge
             backend_knowledge
             datascience_knowledge


RETRIEVAL (happens for every question generated)
────────────────────────────────────────────────────────────────────────
Resume skills + role + topic
        │
        ▼  build_retrieval_query()  (app/rag/retrieval.py)
        │  "Technical interview question about {role} relevant to
        │   skills: {skills}. Focusing on the topic: {topic}"
        │
        ▼  ChromaDB .query()  (top_k=5)
        │  The query string is embedded with the same model
        │  Cosine similarity search over the collection
        │
        ▼  Returns list[str]  — the 5 most relevant text chunks
        │
        ▼  Injected into QUESTION_GENERATION_PROMPT
           under "RETRIEVED TECHNICAL CONTEXT"
```

---

## Key Files

| File | Responsibility |
|------|---------------|
| `app/rag/embeddings.py` | ChromaDB client singleton; embedding function factory |
| `app/rag/ingestion.py` | PDF loading, chunking, upsert, built-in seed knowledge |
| `app/rag/retrieval.py` | Dynamic query construction and similarity search |

---

## Chunking Strategy

```python
RecursiveCharacterTextSplitter(
    chunk_size    = 800,   # characters per chunk
    chunk_overlap = 150,   # characters shared between adjacent chunks
    separators    = ["\n\n", "\n", ". ", " ", ""]
)
```

**Why these values?**

- **800 chars** ≈ ~130 words — enough context for a meaningful concept, small enough for
  precise retrieval
- **150 char overlap** — prevents concepts from being split at chunk boundaries
- **Recursive separators** — tries paragraph breaks first, then sentence boundaries,
  then word boundaries, preserving semantic units

---

## Collections

One ChromaDB collection per role ensures retrieval is always role-scoped.
Cross-role contamination is impossible.

| Role | Collection Name | Typical Content |
|------|----------------|----------------|
| AI/ML Engineer | `aiml_knowledge` | ML theory, DL architectures, MLOps, RAG, evaluation metrics |
| Backend Engineer | `backend_knowledge` | System design, databases, APIs, microservices, security |
| Data Scientist | `datascience_knowledge` | Statistics, EDA, A/B testing, SQL, feature engineering |

---

## Built-in Seed Knowledge

When `knowledge_base/` contains no PDFs (or none match a role's keywords),
the system seeds each collection with 8 curated knowledge paragraphs covering
the most important topics for that role.

This means the system works **out of the box, with no files required**.

```python
# app/rag/ingestion.py — seed is injected if collection.count() == 0
def _seed_role(role: str) -> None:
    collection = get_collection(ROLE_COLLECTIONS[role])
    if collection.count() > 0:
        return   # already populated — skip
    chunks = SEED_KNOWLEDGE.get(role, [])
    collection.upsert(documents=chunks, ids=..., metadatas=...)
```

---

## Retrieval Query Construction

The query is deliberately written as natural language so the embedding model
can match it semantically against knowledge chunks:

```python
def build_retrieval_query(role, skills, projects, topic):
    parts = [f"Technical interview question about {role}"]
    if skills:
        parts.append(f"relevant to skills: {', '.join(skills[:8])}")
    if projects:
        parts.append(f"and projects involving {', '.join(projects[:3])}")
    if topic:
        parts.append(f"focusing on the topic: {topic}")
    return ". ".join(parts)
```

**Example output:**
```
Technical interview question about AI/ML Engineer relevant to skills:
PyTorch, CNN, Docker, FastAPI. Focusing on the topic: Model Training & Overfitting.
```

This query is embedded by `all-MiniLM-L6-v2` and compared (cosine similarity)
against all stored chunk embeddings.

---

## Adding Your Own Knowledge Base

1. Find high-quality PDFs for the role (textbooks, papers, company wikis)
2. Name the file with a role keyword in it (see [Setup Guide](setup.md))
3. Drop into `backend/knowledge_base/`
4. Restart the server **or** `POST /api/ingest`

**Recommended PDFs by role:**

| Role | Suggested Content |
|------|-----------------|
| AI/ML Engineer | Deep Learning textbook (Goodfellow), Hugging Face course PDFs, MLOps guides |
| Backend Engineer | Designing Data-Intensive Applications (Kleppmann), AWS whitepapers, system design resources |
| Data Scientist | Practical Statistics for Data Scientists, SQL guides, A/B testing research papers |

---

## Traceability

Every `InterviewQA` row stores the exact chunks that were retrieved when the question
was generated, under `retrieved_context` (JSON array). This means you can always
audit *why* a particular question was asked and which source documents informed it.

The frontend's **Source Context viewer** on the interview page exposes this to
candidates in real time.

---

## Embedding Model Details

| Property | Value |
|----------|-------|
| Model | `sentence-transformers/all-MiniLM-L6-v2` |
| Dimensions | 384 |
| Max sequence length | 256 tokens |
| Similarity metric | Cosine |
| License | Apache 2.0 |
| Download size | ~90 MB (one-time) |
| Inference speed | ~2 ms/chunk on CPU |

The model runs **entirely locally**. No data is sent to any embedding API.
