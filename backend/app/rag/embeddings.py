import os
import chromadb
from chromadb.utils import embedding_functions

_client = None
_ef = None


def get_chroma_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        db_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db")
        )
        os.makedirs(db_path, exist_ok=True)
        _client = chromadb.PersistentClient(path=db_path)
    return _client


def get_embedding_function():
    global _ef
    if _ef is None:
        _ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
    return _ef


def get_collection(name: str):
    """Return (or create) a ChromaDB collection with the sentence-transformer EF."""
    client = get_chroma_client()
    ef = get_embedding_function()
    return client.get_or_create_collection(name=name, embedding_function=ef)
