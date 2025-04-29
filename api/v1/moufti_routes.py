from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from models.schemas import (
    RagQueryRequest,
    TranslateRequest,
    TranslatedQueryRequest,
    AskFromTranscriptRequest,
    AskRAGRequest,
    VectorizeOllamaRequest,
    YouTubeTranscriptionRequest,
)
from dependencies.fatwallm_rag import (
    get_llm_client,
    translate_answer,
    get_translated_answer_with_context,
    transcribe_uploaded_audio,
    get_last_transcription_preview,
    ask_from_transcription,
    vectorize_transcription,
    vectorize_transcription_with_chroma,
    vectorize_transcription_with_ollama,
    ask_question_with_rag,
    ask_question_with_video_auto,
    log_question_history,
    save_question_to_history,
    detect_video_id_from_question,
)
from database import SessionLocal
from dependencies.auth import get_current_user, TokenData
from pydantic import BaseModel
import os
import logging
import httpx
from models.conversation import Conversation
from models.message import Message
from schemas.conversation import ConversationCreate, ConversationOut
from schemas.message import MessageCreate, MessageOut
from sqlalchemy.future import select
from fastapi import status
from sqlalchemy import delete

# Initialize router
router = APIRouter(prefix="/fatwaaskes", tags=["fatwaaskes"])

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configure upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Route for asking a question
@router.post("/fatwaask")
async def ask_agent(
    request: RagQueryRequest,
    current_user: TokenData = Depends(get_current_user),
):
    question = request.question
    context = request.context
    llm_chain = get_llm_client(question, context)

    # Generate response with Groq
    result1 = llm_chain.invoke({"context": context, "question": question})
    return {"response": result1}


# Route for translating text
@router.post("/translate")
async def translate_text(
    request: TranslateRequest,
    current_user: TokenData = Depends(get_current_user),
):
    translated = translate_answer(request.answer, request.language)
    return {"translated": translated}


# Route for asking and translating a question
@router.post("/fatwaask/translated")
async def ask_and_translate(
    request: TranslatedQueryRequest,
    current_user: TokenData = Depends(get_current_user),
):
    result = get_translated_answer_with_context(
        context=request.context,
        question=request.question,
        language=request.language,
    )
    return {"translated_response": result}


# Route for transcribing local audio file
@router.post("/transcribe-local-audio")
async def transcribe_local_audio(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
):
    try:
        upload_path = f"uploads/{file.filename}"
        with open(upload_path, "wb") as f:
            f.write(await file.read())

        result = transcribe_uploaded_audio(upload_path)
        return {"transcription": result}
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Route for getting transcription preview
@router.get("/transcription-preview")
async def transcription_preview(
    current_user: TokenData = Depends(get_current_user),
):
    preview = get_last_transcription_preview()
    return {"preview": preview}


# Route for asking a question from transcript
@router.post("/ask-from-transcript")
async def ask_from_transcript(
    request: AskFromTranscriptRequest,
    current_user: TokenData = Depends(get_current_user),
):
    try:
        answer = ask_from_transcription(request.question)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Erreur dans ask_from_transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Route for getting transcription documents
@router.get("/transcription-docs")
async def get_transcription_docs(
    current_user: TokenData = Depends(get_current_user),
):
    from dependencies.fatwallm_rag import load_transcription_as_documents

    docs = load_transcription_as_documents()
    return {"documents": [d.page_content for d in docs]}


# Route for getting transcription chunks
@router.get("/transcription-chunks")
async def get_transcription_chunks(
    current_user: TokenData = Depends(get_current_user),
):
    from dependencies.fatwallm_rag import split_transcription_into_chunks
    chunks = split_transcription_into_chunks()
    return {"chunks": [c.page_content for c in chunks]}


# Route for vectorizing transcription
@router.post("/vectorize")
async def vectorize(
    current_user: TokenData = Depends(get_current_user),
):
    try:
        result = vectorize_transcription()
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Route for vectorizing transcription with Chroma
@router.post("/vectorize/chroma")
async def vectorize_chroma(
    current_user: TokenData = Depends(get_current_user),
):
    try:
        result = vectorize_transcription_with_chroma()
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Route for vectorizing transcription with Ollama
@router.post("/vectorize/ollama")
async def vectorize_with_ollama(
    request: VectorizeOllamaRequest,
    current_user: TokenData = Depends(get_current_user),
):
    try:
        result = vectorize_transcription_with_ollama(request.video_id)
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Route for asking question with RAG
@router.post("/ask-rag")
async def ask_rag(
    request: AskRAGRequest,
    current_user: TokenData = Depends(get_current_user),
):
    try:
        answer = ask_question_with_rag(request.question, request.video_id)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"ask-rag failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Route for proxy to Fatwa API
FATWA_API_URL = "http://0.0.0.0:8004/fatwaaskes/ask-rag"
FATWA_API_TOKEN = os.getenv("FATWA_API_TOKEN")


@router.post("/proxy/fatwa")
async def proxy_fatwa_question(request: Request):
    try:
        data = await request.json()
        question = data.get("question")

        if not question:
            raise HTTPException(status_code=400, detail="Question is required.")

        headers = {
            "Authorization": FATWA_API_TOKEN,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(FATWA_API_URL, json={"question": question}, headers=headers)

        return response.json()

    except Exception as e:
        logger.error(f"Proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Route for getting user question history
@router.get("/history")
async def get_user_history(
    current_user: TokenData = Depends(get_current_user)
):
    query = """
        SELECT question, answer, video_id, timestamp
        FROM question_history
        WHERE user_id = :user_id
        ORDER BY timestamp DESC
        LIMIT 20
    """
    rows = await database.fetch_all(query=query, values={"user_id": current_user.sub})
    return {"history": [dict(row) for row in rows]}


# Route for saving question history
@router.post("/ask-rag-auto")
async def ask_rag_auto(
    request: AskFromTranscriptRequest,
    current_user: TokenData = Depends(get_current_user)
):
    try:
        question = request.question
        video_id = detect_video_id_from_question(question)
        answer = ask_question_with_video_auto(question)

        # Save to DB
        await save_question_to_history(
            question=question,
            answer=answer,
            user_id=current_user.sub,
            video_id=video_id
        )

        return {"answer": answer}
    except Exception as e:
        logger.error(f"ask-rag-auto failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Conversation & Message Endpoints ---
# Create a new conversation
@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation: ConversationCreate,
    current_user: TokenData = Depends(get_current_user),
):
    new_convo = Conversation(user_id=current_user.sub, title=conversation.title)
    async with SessionLocal() as session:
        session.add(new_convo)
        await session.commit()
        await session.refresh(new_convo)
    return new_convo

# List all conversations for the current user
@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    current_user: TokenData = Depends(get_current_user),
):
    async with SessionLocal() as session:
        result = await session.execute(select(Conversation).where(Conversation.user_id == current_user.sub).order_by(Conversation.created_at.desc()))
        return result.scalars().all()

# Add a message to a conversation
@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def add_message(
    conversation_id: int,
    message: MessageCreate,
    current_user: TokenData = Depends(get_current_user),
):
    from dependencies.fatwallm_rag import ask_question_with_rag
    answer = ask_question_with_rag(question=message.question)
    import re
    answer = re.sub(r"<think>.*?</think>", "", answer, flags=re.DOTALL).strip()

    new_msg = Message(
        conversation_id=conversation_id,
        user_id=current_user.sub,
        question=message.question,
        answer=answer
    )
    async with SessionLocal() as session:
        session.add(new_msg)
        await session.commit()
        await session.refresh(new_msg)
    return new_msg

# List all messages in a conversation
@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    async with SessionLocal() as session:
        result = await session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        return result.scalars().all()

# Delete a conversation and all associated messages
@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: int, current_user: TokenData = Depends(get_current_user)):
    async with SessionLocal() as session:
        # Ensure the conversation belongs to the current user
        convo = await session.get(Conversation, conversation_id)
        if not convo or convo.user_id != current_user.sub:
            raise HTTPException(status_code=404, detail="Conversation not found")
        # Delete all messages for this conversation
        await session.execute(
            delete(Message).where(Message.conversation_id == conversation_id)
        )
        # Delete the conversation itself
        await session.delete(convo)
        await session.commit()
    return None