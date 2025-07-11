from fastapi import APIRouter, Request, Body
import os
import logging
import traceback
from app.dependencies.fatwallm_rag import ask_question_with_video_auto

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/v1/moufti", tags=["moufti"])

@router.post("/fatwaask")
async def fatwaask_endpoint(
    request: Request,
    question: str = Body(...),
    video_id: str = Body(...)
):
    """
    Process a fatwa question and return an answer.
    """
    try:
        # Log the incoming request
        logger.info(f"Received question: {question}, video_id: {video_id}")
        
        # Call the question answering function
        answer = ask_question_with_video_auto(question)
        
        # Log the answer for debugging
        logger.info(f"Generated answer (first 100 chars): {answer[:100] if answer else 'None'}")
        
        # Make sure we return a valid answer
        if not answer or len(answer.strip()) < 5:
            # Use the appropriate language template
            from dependencies.fatwallm_rag import detect_language, get_response_template
            lang_code = detect_language(question)
            answer = get_response_template(lang_code, 'no_answer')
            
        return {"answer": answer}
    except Exception as e:
        # Log the full error with traceback
        logger.error(f"Error in fatwaask_endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return a friendly error message in the appropriate language
        from dependencies.fatwallm_rag import detect_language, get_response_template
        lang_code = detect_language(question)
        error_message = get_response_template(lang_code, 'error')
        return {"answer": error_message}

# Add a simple endpoint for direct questions (no video_id required)
@router.post("/ask")
async def ask_endpoint(
    request: Request,
    question: str = Body(...)
):
    """
    Process a simple question and return an answer.
    """
    try:
        # Log the incoming request
        logger.info(f"Received simple question: {question}")
        
        # Call the question answering function
        answer = ask_question_with_video_auto(question)
        
        # Log the answer for debugging
        logger.info(f"Generated answer (first 100 chars): {answer[:100] if answer else 'None'}")
        
        # Make sure we return a valid answer
        if not answer or len(answer.strip()) < 5:
            # Use the appropriate language template
            from dependencies.fatwallm_rag import detect_language, get_response_template
            lang_code = detect_language(question)
            answer = get_response_template(lang_code, 'no_answer')
            
        return {"answer": answer}
    except Exception as e:
        # Log the full error with traceback
        logger.error(f"Error in ask_endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return a friendly error message in the appropriate language
        from dependencies.fatwallm_rag import detect_language, get_response_template
        lang_code = detect_language(question)
        error_message = get_response_template(lang_code, 'error')
        return {"answer": error_message}