# Knowledge Base

Place role-specific PDF files in this directory.

The filename **must contain a role keyword** so the ingestion pipeline routes it to the correct ChromaDB collection:

| Keyword in filename | Role |
|---------------------|------|
| `ml`, `aiml`, `deep_learning`, `machine_learning` | AI/ML Engineer |
| `backend`, `system_design`, `api` | Backend Engineer |
| `data_science`, `statistics`, `analytics` | Data Scientist |

## Examples

```
knowledge_base/aiml_foundations.pdf
knowledge_base/deep_learning_book.pdf
knowledge_base/backend_system_design.pdf
knowledge_base/data_science_handbook.pdf
```

## Built-in Seed Knowledge

If this directory is empty, the system automatically seeds built-in knowledge
for all three roles so interviews work out of the box without any PDFs.

Adding your own PDFs enriches the RAG context with domain-specific content,
making questions even more accurate and detailed.

## Re-ingesting

After adding new PDFs, restart the backend or call:
```
POST http://localhost:5000/api/ingest
```
