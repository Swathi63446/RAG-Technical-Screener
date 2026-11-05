"""
RAG Retrieval — builds a dynamic query from resume + role, then fetches
the top-k most relevant chunks from ChromaDB.
"""

import os
from app.rag.embeddings import get_collection
from app.rag.ingestion import ROLE_COLLECTIONS

TOP_K = int(os.getenv("TOP_K_RESULTS", 5))


def build_retrieval_query(role: str, skills: list[str], projects: list[str],
                          topic: str = "") -> str:
    """Compose a natural-language query to drive semantic retrieval."""
    parts = [f"Technical interview question about {role}"]
    if skills:
        parts.append(f"relevant to skills: {', '.join(skills[:8])}")
    if projects:
        parts.append(f"and projects involving {', '.join(projects[:3])}")
    if topic:
        parts.append(f"focusing on the topic: {topic}")
    return ". ".join(parts)


def retrieve_context(role: str, skills: list[str], projects: list[str],
                     topic: str = "", top_k: int = TOP_K) -> list[str]:
    """
    Retrieve the top-k relevant chunks for a given role + candidate profile.
    Returns a list of text strings (chunks).
    """
    collection_name = ROLE_COLLECTIONS.get(role)
    if not collection_name:
        return []

    try:
        collection = get_collection(collection_name)
        if collection.count() == 0:
            return []

        query = build_retrieval_query(role, skills, projects, topic)
        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        documents = results.get("documents", [[]])[0]
        return [doc for doc in documents if doc]

    except Exception as exc:
        print(f"[RAG] Retrieval error: {exc}")
        return []
