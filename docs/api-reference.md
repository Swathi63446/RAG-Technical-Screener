# API Reference

Base URL: `http://localhost:5000/api`

All request bodies are JSON unless noted. All responses are JSON.

---

## Health Check

### `GET /health`

Verify the server is running.

**Response `200`**
```json
{
  "status": "ok",
  "message": "AI Interview System running"
}
```

---

## Resume

### `POST /upload_resume`

Upload a candidate's PDF resume. Creates an `InterviewSession` and `ResumeData` record.

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (PDF) | ✓ | Resume PDF, max 16 MB |
| `candidate_name` | string | ✓ | Candidate's full name |

**Example (curl)**
```bash
curl -X POST http://localhost:5000/api/upload_resume \
  -F "file=@/path/to/resume.pdf" \
  -F "candidate_name=Alex Johnson"
```

**Response `201`**
```json
{
  "session_id": "a86fd3b6-3e97-4009-9aa0-4063594ed089",
  "candidate_name": "Alex Johnson",
  "message": "Resume uploaded and parsed successfully",
  "resume_data": {
    "id": 1,
    "session_id": "a86fd3b6-...",
    "extracted_skills": ["Python", "PyTorch", "Docker", "FastAPI"],
    "extracted_projects": [
      "Built CNN-based image classifier achieving 94% accuracy on CIFAR-10...",
      "Developed RAG pipeline using LangChain and ChromaDB for document Q&A..."
    ],
    "extracted_experience": [
      "ML Engineer at Acme Corp (2022–present)",
      "Data Science Intern at StartupXYZ (2021)"
    ],
    "extracted_education": [
      "B.Sc. Computer Science, MIT, 2021"
    ],
    "extracted_technologies": ["Python", "PyTorch", "Docker", "FastAPI"],
    "raw_resume_text": "Alex Johnson\nML Engineer..."
  }
}
```

**Error responses**

| Code | Condition |
|------|-----------|
| `400` | Missing `file` field |
| `400` | Missing `candidate_name` |
| `422` | File is not a valid PDF |

---

### `POST /ingest`

*(Admin)* Re-scan `knowledge_base/` and upsert any new PDFs into ChromaDB.

**Response `200`**
```json
{
  "message": "Ingestion complete",
  "chunks_ingested": {
    "AI/ML Engineer": 42,
    "Backend Engineer": 0,
    "Data Scientist": 35
  }
}
```

---

## Interview

### `POST /start_interview`

Begin the interview. Assigns a role to the session, generates the first question, and
stores it as an unanswered `InterviewQA` record.

**Request body**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `session_id` | string | ✓ | UUID from `/upload_resume` |
| `role` | string | ✓ | `"AI/ML Engineer"` · `"Backend Engineer"` · `"Data Scientist"` |

**Example**
```json
{
  "session_id": "a86fd3b6-3e97-4009-9aa0-4063594ed089",
  "role": "AI/ML Engineer"
}
```

**Response `200`**
```json
{
  "session_id": "a86fd3b6-...",
  "question_id": 1,
  "question": "You mentioned building a CNN-based image classifier achieving 94% accuracy on CIFAR-10. How would you approach reducing overfitting when your training dataset has only 2,000 images?",
  "question_number": 1,
  "total_questions": 8,
  "difficulty": "easy",
  "question_type": "conceptual",
  "topic": "Model Training & Overfitting",
  "retrieved_context": [
    "Overfitting occurs when a model memorizes training data but generalizes poorly...",
    "Techniques to combat overfitting: dropout, L1/L2 regularization, early stopping..."
  ]
}
```

**Error responses**

| Code | Condition |
|------|-----------|
| `400` | Missing `session_id` or `role` |
| `400` | Invalid role value |
| `404` | Session not found |

---

### `GET /next_question/<session_id>`

Returns the current unanswered question for the session. Useful if the page is refreshed.

**Path parameter:** `session_id` — UUID string

**Response `200` — question pending**
```json
{
  "session_id": "a86fd3b6-...",
  "question_id": 3,
  "question": "Walk me through how you would design a distributed model training pipeline...",
  "question_number": 3,
  "total_questions": 8,
  "difficulty": "medium",
  "question_type": "system_design",
  "topic": "MLOps & Deployment",
  "retrieved_context": ["..."]
}
```

**Response `200` — interview complete**
```json
{
  "interview_complete": true,
  "message": "All questions answered."
}
```

---

### `POST /submit_answer`

Record a candidate's answer, evaluate it with the LLM, and generate the next question.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | ✓ | UUID |
| `question_id` | integer | ✓ | `id` from the question response |
| `answer` | string | ✓ | Candidate's free-text answer |

**Example**
```json
{
  "session_id": "a86fd3b6-...",
  "question_id": 1,
  "answer": "I would use dropout layers (p=0.5) after each fully connected layer and apply aggressive data augmentation — random crops, horizontal flips, colour jitter. I'd also add L2 weight decay and use early stopping based on validation loss."
}
```

**Response `200`**
```json
{
  "evaluation": {
    "score": 0.82,
    "quality": "excellent",
    "strengths": [
      "Correctly identified dropout and specified a sensible dropout probability",
      "Mentioned multiple augmentation techniques"
    ],
    "weaknesses": [
      "Did not mention transfer learning, which is highly effective for small datasets"
    ],
    "feedback": "Strong answer demonstrating solid regularisation knowledge. Consider also mentioning transfer learning from ImageNet pretrained models, which can dramatically reduce overfitting on small datasets.",
    "key_concepts_covered": ["dropout", "data augmentation", "L2 regularisation", "early stopping"],
    "key_concepts_missing": ["transfer learning", "batch normalisation"]
  },
  "interview_complete": false,
  "next_question": {
    "question_id": 2,
    "question": "Since you mentioned data augmentation, how would you implement a custom augmentation pipeline for a medical imaging dataset where standard flips might be clinically inappropriate?",
    "question_number": 2,
    "total_questions": 8,
    "difficulty": "hard",
    "question_type": "implementation",
    "topic": "Computer Vision",
    "retrieved_context": ["..."]
  }
}
```

**When `interview_complete` is `true`**, `next_question` is `null`. Navigate to `/summary`.

**Error responses**

| Code | Condition |
|------|-----------|
| `400` | Missing `session_id` or `question_id` |
| `404` | Question not found or belongs to different session |

---

### `POST /end_interview`

Manually end the interview early (marks session as `completed`).

**Request body**
```json
{ "session_id": "a86fd3b6-..." }
```

**Response `200`**
```json
{
  "message": "Interview ended",
  "session_id": "a86fd3b6-..."
}
```

---

## Summary

### `GET /summary/<session_id>`

Generate and return the complete interview analytics report.

> **Note:** This call invokes the LLM to produce the summary. Expect ~3–8 seconds latency.

**Path parameter:** `session_id` — UUID string

**Response `200`**
```json
{
  "session": {
    "id": "a86fd3b6-...",
    "candidate_name": "Alex Johnson",
    "role": "AI/ML Engineer",
    "status": "completed",
    "question_count": 8,
    "current_difficulty": "hard",
    "created_at": "2026-05-16T11:18:44.542190"
  },
  "resume": {
    "extracted_skills": ["Python", "PyTorch", "Docker"],
    "extracted_projects": ["CNN-based image classifier..."],
    "extracted_experience": ["ML Engineer at Acme Corp"],
    "extracted_education": ["B.Sc. Computer Science, MIT, 2021"]
  },
  "summary": {
    "overall_score": 76,
    "performance_level": "Strong",
    "hiring_recommendation": "Hire",
    "topics_covered": [
      { "topic": "Model Training & Overfitting", "score": 85, "questions_asked": 2 },
      { "topic": "Deep Learning Architectures",  "score": 70, "questions_asked": 2 },
      { "topic": "MLOps & Deployment",           "score": 65, "questions_asked": 2 },
      { "topic": "RAG & LLMs",                   "score": 80, "questions_asked": 2 }
    ],
    "strengths": [
      "Strong regularisation and overfitting mitigation knowledge",
      "Clear understanding of CNN architectures and training dynamics",
      "Good articulation of MLOps concepts"
    ],
    "improvement_areas": [
      "Transfer learning techniques for small datasets",
      "Distributed training at scale (multi-GPU / multi-node)"
    ],
    "skill_gaps": [
      "Kubernetes-based ML serving",
      "Model quantisation and optimisation"
    ],
    "recommendations": [
      "Study PyTorch DDP and FSDP for distributed training",
      "Build a project deploying a model on Kubernetes with autoscaling",
      "Read papers on PEFT / LoRA for efficient fine-tuning"
    ],
    "summary_text": "Alex demonstrated strong ML fundamentals with well-articulated answers on regularisation, data augmentation, and model evaluation. The candidate showed good practical depth but struggled with system-level MLOps questions. Overall, a solid hire for a mid-level ML Engineering role with room to grow in the DevOps/infrastructure dimension.",
    "difficulty_scores": [82, 78, 65, 70, 80, 75, 68, 72],
    "technical_depth_score": 74,
    "communication_score": 80,
    "skill_heatmap": {
      "Model Training": 85,
      "Deep Learning": 72,
      "MLOps": 62,
      "RAG & LLMs": 80,
      "Computer Vision": 75
    }
  },
  "qa_pairs": [
    {
      "id": 1,
      "session_id": "a86fd3b6-...",
      "question": "You mentioned building a CNN-based image classifier...",
      "answer": "I would use dropout layers (p=0.5)...",
      "score": 0.82,
      "quality": "excellent",
      "difficulty": "easy",
      "question_type": "conceptual",
      "topic": "Model Training & Overfitting",
      "strengths": ["Correctly identified dropout..."],
      "weaknesses": ["Did not mention transfer learning..."],
      "feedback": "Strong answer demonstrating...",
      "retrieved_context": ["..."],
      "created_at": "2026-05-16T11:20:10.000000"
    }
  ]
}
```

**Error responses**

| Code | Condition |
|------|-----------|
| `404` | Session not found |

---

## Response Field Glossary

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | UUID string | Unique interview session identifier |
| `question_id` | integer | Auto-increment ID for an `InterviewQA` row |
| `difficulty` | `easy` · `medium` · `hard` · `expert` | Adaptive difficulty level |
| `question_type` | `conceptual` · `implementation` · `scenario` · `system_design` · `debug` | Style of question |
| `topic` | string | Technical topic area (e.g. `"MLOps & Deployment"`) |
| `score` | float 0.0–1.0 | Per-answer LLM evaluation score |
| `quality` | `weak` · `average` · `good` · `excellent` | Human-readable quality label |
| `overall_score` | integer 0–100 | Session-level aggregated score |
| `performance_level` | string | `Needs Improvement` · `Average` · `Good` · `Strong` · `Exceptional` |
| `hiring_recommendation` | string | `Strong Hire` · `Hire` · `Borderline` · `No Hire` |
