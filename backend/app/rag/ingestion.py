"""
RAG Ingestion Pipeline
Loads PDFs from knowledge_base/, chunks them, and stores in ChromaDB.
Also seeds built-in knowledge when no PDFs are present so the system
still works out of the box.
"""

import os
import uuid
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.rag.embeddings import get_collection

# Collection names per role
ROLE_COLLECTIONS = {
    "AI/ML Engineer": "aiml_knowledge",
    "Backend Engineer": "backend_knowledge",
    "Data Scientist": "datascience_knowledge",
}

# Map filename keywords → role
ROLE_KEYWORDS = {
    "aiml": "AI/ML Engineer",
    "ml": "AI/ML Engineer",
    "machine_learning": "AI/ML Engineer",
    "deep_learning": "AI/ML Engineer",
    "backend": "Backend Engineer",
    "system_design": "Backend Engineer",
    "api": "Backend Engineer",
    "data_science": "Data Scientist",
    "statistics": "Data Scientist",
    "analytics": "Data Scientist",
}

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 800))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 150))

# Built-in seed knowledge (used when no PDFs exist)
SEED_KNOWLEDGE = {
    "AI/ML Engineer": [
        "Machine learning models learn patterns from data without being explicitly programmed. "
        "Supervised learning uses labeled data (X, y pairs) to train models. Common algorithms "
        "include linear/logistic regression, decision trees, random forests, gradient boosting "
        "(XGBoost, LightGBM), support vector machines, and neural networks.",

        "Deep learning uses multi-layer neural networks. Convolutional Neural Networks (CNNs) "
        "excel at image tasks. Recurrent Neural Networks (RNNs) and LSTMs handle sequential data. "
        "Transformers with attention mechanisms now dominate NLP tasks (BERT, GPT, T5).",

        "Overfitting occurs when a model memorizes training data but generalizes poorly. "
        "Techniques to combat it: dropout, L1/L2 regularization, early stopping, data augmentation, "
        "cross-validation, reducing model complexity.",

        "MLOps encompasses model versioning (MLflow, DVC), experiment tracking, CI/CD pipelines "
        "for ML, model serving (FastAPI, TorchServe, TF Serving), monitoring for data drift "
        "and model degradation, and feature stores.",

        "Retrieval-Augmented Generation (RAG) combines a retrieval system (vector database) "
        "with an LLM. Documents are chunked, embedded, and stored. At inference, relevant chunks "
        "are retrieved and injected into the prompt context for grounded generation.",

        "Evaluation metrics: classification (accuracy, precision, recall, F1, AUC-ROC), "
        "regression (MAE, MSE, RMSE, R²), ranking (NDCG, MAP), generation (BLEU, ROUGE, BERTScore).",

        "Hyperparameter tuning approaches: Grid Search, Random Search, Bayesian Optimization "
        "(Optuna, Ray Tune), Population-Based Training. Learning rate schedulers: cosine annealing, "
        "warmup, cyclical LR.",

        "Transfer learning leverages pre-trained model weights. Fine-tuning adjusts all weights "
        "while feature extraction freezes the backbone. LoRA/QLoRA are parameter-efficient "
        "fine-tuning techniques for LLMs that reduce GPU memory requirements.",
    ],

    "Backend Engineer": [
        "RESTful APIs follow stateless request-response patterns. Use HTTP verbs semantically: "
        "GET (read), POST (create), PUT/PATCH (update), DELETE (remove). Status codes communicate "
        "results: 2xx success, 4xx client errors, 5xx server errors.",

        "Database design: normalization removes redundancy (1NF, 2NF, 3NF). Indexes speed up reads "
        "but slow writes. B-tree indexes suit range queries; hash indexes suit equality checks. "
        "EXPLAIN ANALYZE reveals query execution plans.",

        "Microservices decompose monoliths into independently deployable services. Communication "
        "patterns: synchronous (REST, gRPC) and asynchronous (message queues: Kafka, RabbitMQ). "
        "Service mesh (Istio) handles observability, retries, and mutual TLS.",

        "Caching strategies: cache-aside (application fetches from cache, writes on miss), "
        "write-through (writes update cache and DB simultaneously), write-behind (async DB writes). "
        "Redis supports strings, hashes, lists, sets, sorted sets, and pub/sub.",

        "System design: load balancers distribute traffic (L4/L7). Horizontal scaling adds "
        "replicas; vertical scaling increases resources. CAP theorem: Consistency, Availability, "
        "Partition tolerance — distributed systems can guarantee only two.",

        "SQL vs NoSQL: relational databases (Postgres, MySQL) for ACID transactions and complex "
        "queries. NoSQL: document (MongoDB), key-value (Redis, DynamoDB), column (Cassandra), "
        "graph (Neo4j). Choose based on access patterns, not hype.",

        "Docker packages apps in containers with their dependencies. Kubernetes (K8s) orchestrates "
        "containers: Pods, Deployments, Services, Ingress, ConfigMaps, Secrets, PersistentVolumes. "
        "Helm simplifies K8s deployments via charts.",

        "Security: OWASP Top 10 covers injection, broken auth, XSS, IDOR, SSRF. JWT for stateless "
        "auth (sign with RS256, short expiry + refresh tokens). HTTPS everywhere, parameterized "
        "queries, input validation, rate limiting, and least privilege principles.",
    ],

    "Data Scientist": [
        "Exploratory Data Analysis (EDA): examine distributions, detect outliers (IQR, Z-score), "
        "check missing values, compute correlation matrices, visualize with matplotlib/seaborn. "
        "Understand the data before modeling.",

        "Feature engineering: create domain-relevant features, encode categoricals "
        "(one-hot, label, target encoding), handle missing data (imputation vs. dropping), "
        "scale features (StandardScaler, MinMaxScaler), and generate interaction terms.",

        "A/B testing: define hypothesis (H₀, H₁), choose significance level (α=0.05), "
        "compute required sample size (power analysis), collect data, run statistical test "
        "(t-test, chi-square, Mann-Whitney U), check p-value, assess practical significance.",

        "SQL for data science: window functions (ROW_NUMBER, RANK, LAG, LEAD, SUM OVER), "
        "CTEs for readable queries, GROUP BY with HAVING, JOINs (INNER, LEFT, FULL OUTER), "
        "subqueries, and query optimization with indexes.",

        "Time series analysis: stationarity (ADF test), decomposition (trend, seasonal, residual), "
        "ARIMA/SARIMA for forecasting, Prophet for business time series, LSTM for deep learning "
        "approaches. Handle seasonality, autocorrelation, and non-stationarity.",

        "Model interpretability: SHAP values explain feature contributions globally and locally. "
        "LIME approximates model behavior locally. Partial Dependence Plots (PDP) show marginal "
        "effect of features. Feature importance from tree models.",

        "Data pipelines: ETL/ELT workflows, Apache Airflow for orchestration, dbt for "
        "transformation, Spark for large-scale processing, Pandas for moderate datasets. "
        "Data quality checks, lineage tracking, and monitoring are critical.",

        "Clustering: K-Means (choose k with elbow/silhouette), DBSCAN (density-based, handles "
        "noise), Hierarchical (dendrograms), Gaussian Mixture Models (soft assignments). "
        "Evaluate with silhouette score, Davies-Bouldin index.",
    ],
}


def _detect_role_from_filename(filename: str) -> str | None:
    """Guess the role from the PDF filename using keyword matching."""
    lower = filename.lower().replace(" ", "_")
    for keyword, role in ROLE_KEYWORDS.items():
        if keyword in lower:
            return role
    return None


def _chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def ingest_pdf(pdf_path: str, role: str) -> int:
    """Parse a PDF, chunk it, and upsert into the role's ChromaDB collection."""
    collection = get_collection(ROLE_COLLECTIONS[role])

    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()

    if not full_text.strip():
        return 0

    chunks = _chunk_text(full_text)
    source = os.path.basename(pdf_path)

    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [{"source": source, "role": role, "chunk_index": i}
                 for i, _ in enumerate(chunks)]

    collection.upsert(documents=chunks, ids=ids, metadatas=metadatas)
    return len(chunks)


def _seed_role(role: str) -> None:
    """Insert built-in seed knowledge for a role if the collection is empty."""
    collection = get_collection(ROLE_COLLECTIONS[role])
    if collection.count() > 0:
        return  # already populated

    chunks = SEED_KNOWLEDGE.get(role, [])
    if not chunks:
        return

    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [{"source": "built-in-seed", "role": role, "chunk_index": i}
                 for i, _ in enumerate(chunks)]
    collection.upsert(documents=chunks, ids=ids, metadatas=metadatas)
    print(f"[RAG] Seeded {len(chunks)} built-in chunks for '{role}'")


def ingest_knowledge_base() -> dict:
    """
    Scan knowledge_base/ for PDFs and ingest them.
    Always seeds built-in knowledge for roles with empty collections.
    """
    kb_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "knowledge_base")
    )
    os.makedirs(kb_path, exist_ok=True)

    results = {role: 0 for role in ROLE_COLLECTIONS}

    # Ingest user-provided PDFs
    for fname in os.listdir(kb_path):
        if not fname.lower().endswith(".pdf"):
            continue
        role = _detect_role_from_filename(fname)
        if role is None:
            print(f"[RAG] Skipping '{fname}' — cannot detect role from filename")
            continue
        try:
            count = ingest_pdf(os.path.join(kb_path, fname), role)
            results[role] += count
            print(f"[RAG] Ingested {count} chunks from '{fname}' → {role}")
        except Exception as exc:
            print(f"[RAG] Error ingesting '{fname}': {exc}")

    # Always ensure built-in seed knowledge exists
    for role in ROLE_COLLECTIONS:
        _seed_role(role)

    return results
