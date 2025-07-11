"""rag_chat.py - Helper module to perform Retrieval-Augmented Generation (RAG)
using the existing Chroma vector store and the Fatwa LLM defined in
`dependencies.fatwallm_rag.get_llm_client`.

This module exposes a single function `generate_answer_with_rag` that
can be used by API endpoints to answer a user question given a
`context_id` (transcription identifier) or an explicit list of
`vector_ids`.
"""
from __future__ import annotations

import logging
from typing import List, Tuple, Dict, Any

from langchain.chains import RetrievalQA
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.schema.document import Document

from app.dependencies.fatwallm_rag import get_llm_client, get_fallback_answer

logger = logging.getLogger(__name__)

# Constants
CHROMA_DIR = "chroma_index"
COLLECTION_NAME = "media_transcripts"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def _build_retriever(context_id: str | None, vector_ids: List[int] | None, top_k: int) -> Any:
    """Internal helper that loads the Chroma collection and returns
    a LangChain *retriever* configured with the appropriate metadata
    filters (on ``transcription_id`` and/or ``chunk_index``).
    """
    # Load (or create) embedding model – using exactly the same model as
    # during the vectorisation step in `vectorize_transcription_with_chroma`.
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)

    # Load persistent Chroma store.  The collection **must** have the same
    # name that was used during vectorisation.
    store = Chroma(
        persist_directory=CHROMA_DIR,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
    )

    # Build metadata filter – Chroma supports a simple equality filter as a
    # dict.  For multiple conditions we supply them together in the dict.
    filter_: Dict[str, Any] = {}
    if context_id:
        filter_["transcription_id"] = context_id
    if vector_ids:
        # The chunk index is stored as an *int* in the metadata
        # (see `vectorize_transcription_with_chroma`).  The Chroma Python API
        # supports the special key "$in" to match *any* value in a list.
        # If several vector IDs are supplied, we retrieve documents whose
        # ``chunk_index`` is **in** that list.
        filter_["chunk_index"] = {"$in": vector_ids}

    search_kwargs: Dict[str, Any] = {"k": top_k}
    if filter_:
        search_kwargs["filter"] = filter_

    logger.debug(f"Building retriever with search_kwargs={search_kwargs}")

    return store.as_retriever(search_kwargs=search_kwargs)



def generate_answer_with_rag(
    question: str,
    *,
    context_id: str | None = None,
    vector_ids: List[int] | None = None,
    top_k: int = 5,
) -> Tuple[str, List[Document]]:
    """Run a full RAG pipeline and return the generated answer **and** the
    retrieved source documents.

    Parameters
    ----------
    question : str
        The user question.
    context_id : str | None, optional
        Identifier of the transcription whose chunks must be searched.
    vector_ids : list[int] | None, optional
        A more granular filter on specific chunk IDs within the above
        ``context_id``.  Useful when the client already knows which chunks
        are relevant.
    top_k : int, default 5
        Number of chunks to retrieve from the vector store.
    """
    if not question or not question.strip():
        raise ValueError("Question must be a non-empty string")

    # ---------- Build Retriever ----------
    try:
        retriever = _build_retriever(context_id, vector_ids, top_k)
    except Exception as e:  # pragma: no cover – defensive
        logger.exception("Failed to build retriever: %s", e)
        raise

    # ---------- Build RAG Chain ----------
    try:
        # Get the LLM client (FatwaLLM or fallback)
        llm = get_llm_client()
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",  # 'stuff' chain type includes all retrieved docs in the prompt
            retriever=retriever,
            return_source_documents=True,
        )
    except Exception as e:  # pragma: no cover – defensive
        logger.exception("Failed to build RAG chain: %s", e)
        raise

    # ---------- Run RAG Chain ----------
    try:
        logger.info(f"Running RAG for question: {question[:100]}...")
        result = qa_chain({"query": question})
        answer = result["result"]
        docs = result.get("source_documents", [])
        logger.info(f"RAG successful, retrieved {len(docs)} docs")
        return answer, docs
    except Exception as e:
        logger.exception("Failed to run RAG chain: %s", e)
        # Fallback to direct answer generation without RAG
        logger.warning("Falling back to direct answer without context")
        fallback_answer = get_fallback_answer(question)
        return fallback_answer, []
