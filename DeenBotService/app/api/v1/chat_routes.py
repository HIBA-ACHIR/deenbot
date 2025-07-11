from fastapi import APIRouter, Depends, Body, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from typing import List, Optional
from app.dependencies.fatwallm_rag import ask_question_with_rag
from app.dependencies.rag_chat import generate_answer_with_rag
import logging
import re
import uuid
from app.models.conversation import Conversation
from app.models.message import Message
from app.database import SessionLocal
from sqlalchemy.future import select
from sqlalchemy import desc, func
from fastapi.responses import JSONResponse
from app.dependencies.context_manager import get_context_by_id, answer_from_context_only, get_answer_from_context

# Pydantic models for request/response
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class MessageCreate(BaseModel):
    conversation_id: str # Keep as string for input, will be validated to UUID
    user_id: uuid.UUID # Expect a UUID for user messages
    question: str
    answer: Optional[str] = ""
    context_id: Optional[str] = None
    language: Optional[str] = None # Added language field

class MessageResponse(BaseModel):
    id: int
    conversation_id: uuid.UUID
    user_id: Optional[uuid.UUID] # Can be None for system messages
    question: str
    answer: str
    created_at: datetime
    context_extracts: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

async def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        await db.close()

@router.post("/conversations")
async def create_conversation(data: dict = Body(...), db: AsyncSession = Depends(get_db)):
    user_id_input = data.get("user_id", "guest")
    title = data.get("title", "محادثة جديدة")
    context_id = data.get("context_id")

    # Handle user_id conversion to UUID
    if user_id_input == "guest":
        # Utiliser un UUID fixe pour l'utilisateur "guest" pour la cohérence
        user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    else:
        try:
            user_id = uuid.UUID(user_id_input)
        except ValueError:
            logger.error(f"Invalid UUID format for user_id: {user_id_input}")
            raise HTTPException(status_code=400, detail=f"Invalid user ID format: {user_id_input}")

    logger.info(f"Creating new conversation for user_id: {user_id} with title: '{title}', context_id: {context_id}")

    new_conversation = Conversation(
        user_id=user_id,
        title=title,
        context_id=context_id
    )
    
    try:
        db.add(new_conversation)
        await db.commit()
        await db.refresh(new_conversation) # Load all attributes, including defaults like created_at and the UUID
        
        logger.info(f"Successfully committed and refreshed new conversation. ID: {new_conversation.id}, UserID: {new_conversation.user_id}, Title: '{new_conversation.title}', CreatedAt: {new_conversation.created_at}")
        
        # Prepare response data *after* successful commit and refresh
        response_data = {
            "id": str(new_conversation.id), # Ensure UUID is string for JSON
            "user_id": new_conversation.user_id,
            "title": new_conversation.title,
            "created_at": new_conversation.created_at.isoformat(), # Standard format for datetime
            "context_id": new_conversation.context_id,
            "messages": [] # New conversations start with no messages
        }
        return response_data
        
    except Exception as e:
        logger.error(f"Error during conversation creation or commit: {str(e)}")
        await db.rollback() # Explicitly rollback on error
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")

@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific conversation by its ID."""
    try:
        try:
            conv_uuid = uuid.UUID(conversation_id)
        except ValueError:
            logger.error(f"Invalid UUID format for conversation_id: {conversation_id}")
            raise HTTPException(status_code=400, detail=f"Invalid conversation ID format: {conversation_id}")
        
        logger.info(f"Fetching conversation with ID: {conv_uuid}")
        
        # Requête pour trouver la conversation par ID
        query = select(Conversation).where(Conversation.id == conv_uuid)
        result = await db.execute(query)
        conversation = result.scalars().first()
        
        if not conversation:
            logger.warning(f"Conversation with ID {conv_uuid} not found")
            raise HTTPException(status_code=404, detail=f"Conversation with ID {conv_uuid} not found")
        
        # Convertir en dictionnaire pour la réponse JSON
        return {
            "id": conversation.id,
            "user_id": conversation.user_id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "context_id": conversation.context_id
        }
        
    except HTTPException as http_exc:
        # If it's already an HTTPException (e.g., 404 Not Found, 400 Bad Request), re-raise it directly.
        raise http_exc
    except Exception as e:
        # For any other unexpected errors, log and raise a 500.
        logger.error(f"Unexpected error fetching conversation {conversation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error fetching conversation: {str(e)}")

@router.get("/user/{user_id}/conversations")
async def get_user_conversations(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get all conversations for a specific user."""
    logger.info(f"Attempting to fetch conversations for user_id: {user_id} (type: {type(user_id)})")
    try:
        # Handle user_id conversion to UUID
        if user_id == "guest":
            # Utiliser le même UUID fixe pour l'utilisateur "guest"
            user_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")
        else:
            try:
                user_uuid = uuid.UUID(user_id)
            except ValueError:
                logger.error(f"Invalid UUID format for user_id: {user_id}")
                raise HTTPException(status_code=400, detail=f"Invalid user ID format: {user_id}")

        query = select(Conversation).where(Conversation.user_id == user_uuid).order_by(Conversation.created_at.desc())
        result = await db.execute(query)
        conversations = result.scalars().all()
        
        if not conversations:
            logger.info(f"No conversations found for user_id: {user_id}")
        else:
            logger.info(f"Found {len(conversations)} conversations for user_id: {user_id}")
            for i, conv in enumerate(conversations):
                logger.debug(f"  Conv {i+1}: id={conv.id}, user_id={conv.user_id}, title='{conv.title}', created_at={conv.created_at}, context_id={conv.context_id}")

        # Convert to list of dicts for JSON response
        return [
            {
                "id": conv.id,
                "user_id": conv.user_id,
                "title": conv.title,
                "created_at": conv.created_at,
                "context_id": conv.context_id  # Added context_id to match frontend processing
            }
            for conv in conversations
        ]
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversations: {str(e)}")

@router.post("/messages", response_model=MessageResponse)
async def create_message(message_data: MessageCreate, db: AsyncSession = Depends(get_db)):
    """Create a new message in a conversation."""
    try:
        logger.debug(f"create_message called with data: {message_data.dict()}")
        try:
            conv_uuid = uuid.UUID(message_data.conversation_id)
        except ValueError:
            logger.error(f"Invalid UUID format for conversation_id: {message_data.conversation_id}")
            raise HTTPException(status_code=400, detail=f"Invalid conversation ID format: {message_data.conversation_id}")

        user_id = message_data.user_id
        question = message_data.question
        answer = message_data.answer if message_data.answer is not None else ""
        context_id = message_data.context_id # This is request_context_id
        context_extracts = None # Initialize context_extracts
        
        # Log each field for debugging
        logger.info(f"Parsed fields - conversation_id: {conv_uuid} (type: {type(conv_uuid)}), "
                  f"user_id: {user_id}, question: {question}, answer: {answer}, context_id: {context_id}")
        
        # Fournir des valeurs par défaut pour question et answer si nécessaires
        if not question:
            question = "Message système"
            logger.warning(f"Using default value for empty question")
        # answer will be handled later, allowing for generation if empty
        
        # Verify conversation exists
        query = select(Conversation).where(Conversation.id == conv_uuid) # Use conv_uuid
        result = await db.execute(query)
        conversation = result.scalars().first()
        
        if not conversation:
            logger.error(f"Conversation with ID {conv_uuid} not found.")
            raise HTTPException(status_code=404, detail=f"Conversation {conv_uuid} not found") # Use conv_uuid
        
        # Determine the final context_id to use
        conversation_context_id = conversation.context_id
        # request_context_id is message_data.context_id, already assigned to 'context_id' variable
        final_context_id = context_id if context_id else conversation_context_id
        
        logger.info(f"Context ID for response generation: {final_context_id}")
        
        generated_answer = None
        if (answer is None or answer == "") and question and final_context_id:
            try:
                logger.info(f"Génération de réponse pour context_id: {final_context_id}")
                # Use client-provided language if available, otherwise detect
                if message_data.language and message_data.language in ["ar", "en", "fr"]:
                    lang_code = message_data.language
                    logger.info(f"Using client-provided language: {lang_code}")
                else:
                    logger.info(f"Client language not provided or invalid. Detecting from question...")
                    lang_code = "fr"  # Default
                    arabic_chars = re.findall(r'[\u0600-\u06FF]', question)
                    if len(arabic_chars) > len(question) / 3:
                        lang_code = "ar"
                    logger.info(f"Detected language: {lang_code}")
                
                # Ensure get_answer_from_context and other context functions are imported or defined
                # from dependencies.context_manager import get_context_by_id, answer_from_context_only, get_answer_from_context
                # This import might be missing if it's not at the top of the file.
                # Assuming it's available in the scope:
                generated_answer, context_extracts = get_answer_from_context(
                    question=question, 
                    context_id=final_context_id,
                    use_llm=True,
                    lang_code=lang_code,
                    return_sources=True
                )
                logger.info(f"Réponse générée avec succès ({len(generated_answer)} caractères)")
                
                if not generated_answer or len(generated_answer) < 20:
                    logger.warning("Réponse trop courte, fallback sur méthode simple")
                    # Assuming get_context_by_id is available
                    retrieved_context = get_context_by_id(final_context_id)
                    if retrieved_context:
                        generated_answer, context_extracts = answer_from_context_only(question, retrieved_context, lang_code, return_sources=True)
                        logger.info(f"Réponse de secours générée ({len(generated_answer)} caractères)")
            except Exception as gen_error:
                logger.error(f"Erreur lors de la génération de réponse: {gen_error}")
                generated_answer = "Désolé, une erreur s'est produite lors de la génération de la réponse."
        elif (answer is None or answer == "") and question and not final_context_id:
            logger.info("Mode sans contexte, utilisation du LLM")
            try:
                # Determine language for non-contextual LLM call
                llm_lang_code = "en" # Default for general LLM if not specified
                if message_data.language and message_data.language in ["ar", "en", "fr"]:
                    llm_lang_code = message_data.language
                else:
                    arabic_chars = re.findall(r'[\u0600-\u06FF]', question)
                    if len(arabic_chars) > len(question) / 3:
                        llm_lang_code = "ar"
                    # else, it remains 'en' or 'fr' based on a more robust detection if added
                
                logger.info(f"Using language {llm_lang_code} for non-contextual LLM call.")
                # Assuming ask_question_with_rag can take a lang_code or is language-agnostic
                # If ask_question_with_rag needs a specific language parameter, it should be added here.
                # For now, we're just logging the determined llm_lang_code.
                # If your RAG system or LLM can be instructed on language, pass llm_lang_code to it.
                generated_answer = ask_question_with_rag(question=question)
                logger.info(f"Réponse générée (mode sans contexte): {generated_answer}")
            except Exception as llm_error:
                logger.error(f"Erreur lors de la génération de la réponse sans contexte: {str(llm_error)}")
                generated_answer = "Erreur lors de la génération de la réponse."
        final_answer = generated_answer if generated_answer else (answer if answer else "En attente de réponse...")
        
        # user_id is now expected to be a uuid.UUID object from MessageCreate
        # and Message.user_id is UUID(as_uuid=True), nullable=True
        new_message = Message(
            conversation_id=conv_uuid,
            user_id=user_id,  # Directly use the UUID object
            question=question,
            answer=final_answer
        )
        
        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)
        
        logger.info(f"Created new message in conversation {conv_uuid}, with context_id: {final_context_id}")
        
        response_model_data = MessageResponse.from_orm(new_message)
        if context_extracts:
            response_model_data.context_extracts = context_extracts
        return response_model_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create message: {str(e)}")

@router.get("/messages/{conversation_id}")
async def get_conversation_messages(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """Get all messages for a specific conversation."""
    try:
        try:
            conv_uuid = uuid.UUID(conversation_id)
        except ValueError:
            logger.error(f"Invalid UUID format for conversation_id: {conversation_id}")
            raise HTTPException(status_code=400, detail=f"Invalid conversation ID format: {conversation_id}")

        # Verify conversation exists
        logger.debug(f"Verifying existence of conversation_id: {conv_uuid}")
        conv_query = select(Conversation).where(Conversation.id == conv_uuid)
        conv_result = await db.execute(conv_query)
        conversation = conv_result.scalars().first()
        
        if not conversation:
            logger.warning(f"Conversation not found during message fetch: {conv_uuid}")
            raise HTTPException(status_code=404, detail=f"Conversation {conv_uuid} not found")
            
        # Requête pour trouver les messages par ID de conversation
        logger.info(f"Fetching messages for conversation_id: {conv_uuid}")
        query = select(Message).where(Message.conversation_id == conv_uuid).order_by(Message.created_at.asc())
        result = await db.execute(query)
        messages = result.scalars().all()
        
        # Convert to list of dicts for JSON response
        return [
            {
                "id": msg.id,
                "conversation_id": msg.conversation_id,
                # Ensure msg.user_id (which is Optional[UUID]) is handled; Pydantic should do this for MessageResponse
                "user_id": msg.user_id,
                "question": msg.question,
                "answer": msg.answer,
                "created_at": msg.created_at
            }
            for msg in messages
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a conversation and all its messages."""
    try:
        # Convert the incoming string ID to a UUID object
        try:
            conv_uuid = uuid.UUID(conversation_id)
        except ValueError:
            logger.error(f"Invalid UUID format for conversation_id: {conversation_id}")
            raise HTTPException(status_code=400, detail="Invalid conversation ID format.")

        # First, delete all messages associated with the conversation
        # Ensure Message.conversation_id is being compared with a UUID
        delete_messages_stmt = delete(Message).where(Message.conversation_id == conv_uuid)
        await db.execute(delete_messages_stmt)

        # Then, delete the conversation itself
        # Ensure Conversation.id is being compared with a UUID
        delete_conversation_stmt = delete(Conversation).where(Conversation.id == conv_uuid)
        result = await db.execute(delete_conversation_stmt)
        
        # Optional: Check if the conversation was actually found and deleted.
        # If result.rowcount == 0, it means no conversation with that ID was found.
        # Depending on idempotency requirements, you might raise a 404 or just log it.
        if result.rowcount == 0:
            logger.warning(f"Attempted to delete conversation with ID {conv_uuid}, but it was not found. It might have been already deleted.")
            # If you want to be strict and ensure it existed before deletion:
            # raise HTTPException(status_code=404, detail=f"Conversation with ID {conv_uuid} not found for deletion.")

        await db.commit()
        logger.info(f"Successfully deleted conversation {conv_uuid} and its messages.")
        return {"message": f"Conversation {conv_uuid} and all its messages deleted successfully"}
        
    except HTTPException as http_exc:
        # If it's an HTTPException we raised (e.g., 400 for bad UUID), rollback and re-raise.
        await db.rollback()
        raise http_exc
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not delete conversation: {str(e)}")
