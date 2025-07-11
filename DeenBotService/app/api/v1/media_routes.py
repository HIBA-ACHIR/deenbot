from fastapi import APIRouter, File, UploadFile, Request, Depends, HTTPException
from app.models.user import (
    User,
)  # Assuming User model is needed, or remove if only ID is used
import uuid
import os
import logging
import shutil
import re
from app.dependencies.rag_chat import generate_answer_with_rag
from app.dependencies.fatwallm_rag import (
    transcribe_uploaded_audio,
    vectorize_transcription_with_chroma,
    get_translated_answer_with_context,
    save_question_to_history,
)
from app.dependencies.title_generator import extract_topic_from_transcription
import yt_dlp
from pytube import YouTube
from app.dependencies.youtube_processor import YouTubeProcessor
from app.dependencies.audio_processor import AudioProcessor
from datetime import datetime

# Initialize router
router = APIRouter(prefix="/api/v1/media", tags=["media"])

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configure paths
FFMPEG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "ffmpeg",
    "ffmpeg-master-latest-win64-gpl",
    "bin",
)
# Add FFmpeg to PATH
os.environ["PATH"] += os.pathsep + FFMPEG_PATH
logger.info(f"Added FFmpeg path: {FFMPEG_PATH}")


@router.post("/upload-media")
async def upload_media_file(file: UploadFile = File(...)):
    """
    Upload an audio/video file (mp3, wav, mp4), transcribe it, and save for later questions.
    """
    allowed_types = [
        "audio/mpeg",
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        "video/mp4",
    ]
    content_type = file.content_type or ""

    # Check file type
    if not any(allowed in content_type.lower() for allowed in ["audio", "video"]):
        return {
            "error": "File type not allowed. Please upload MP3, WAV, or MP4 files only."
        }

    # Create temp directory if it doesn't exist
    if not os.path.exists("temp_media"):
        os.makedirs("temp_media")

    # Save file to disk using chunked reading for large files
    file_path = f"temp_media/{file.filename}"
    try:
        with open(file_path, "wb") as f:
            # Read file in chunks to handle large files
            chunk_size = 1024 * 1024  # 1MB chunks
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        return {"error": f"Error saving file: {str(e)}"}

    # Log file details
    file_size = os.path.getsize(file_path)
    logger.info(
        f"Uploaded file: {file_path}, Size: {file_size} bytes, Type: {content_type}"
    )

    if file_size < 1000:  # Less than 1KB
        return {"error": "الملف صغير جدًا أو فارغ. يرجى تحميل ملف صالح."}

    # Transcribe the audio
    try:
        logger.info(f"Starting transcription for {file_path}...")
        transcription = transcribe_uploaded_audio(file_path)

        # Check for specific error messages from transcription
        if "مساحة كافية على القرص" in transcription:
            logger.error(
                f"Disk space error during transcription for {file_path}: {transcription}"
            )
            raise HTTPException(
                status_code=507, detail=transcription
            )  # Insufficient Storage
        if "خطأ في تقسيم الملف" in transcription:
            logger.error(
                f"Audio splitting error during transcription for {file_path}: {transcription}"
            )
            raise HTTPException(status_code=500, detail=transcription)
        if (
            not transcription
            or transcription.strip() == ""
            or "تعذر تحويل" in transcription
            or "حدث خطأ" in transcription
        ):
            logger.error(f"Transcription failed for {file_path}: {transcription}")
            raise HTTPException(
                status_code=500,
                detail=(
                    transcription
                    if transcription and "تعذر تحويل" in transcription
                    else "تعذر تحويل الملف الصوتي إلى نص. يرجى المحاولة مرة أخرى باستخدام ملف آخر."
                ),
            )
            logger.error("Transcription failed or returned empty result")
            return {
                "error": "تعذر تحويل الملف الصوتي إلى نص. يرجى المحاولة مرة أخرى باستخدام ملف آخر."
            }

        # Store the transcription for later retrieval
        transcription_id = vectorize_transcription_with_chroma(transcription)

        # Extract the topic from the transcription
        topic = "الدروس الإسلامية"
        try:
            topic = extract_topic_from_transcription(transcription)
            logger.info(f"Extracted topic: {topic}")
        except Exception as e:
            logger.error(f"Error extracting topic: {e}")

        # Créer automatiquement une conversation liée à ce context_id
        try:
            # Importer ici pour éviter les imports circulaires
            import httpx
            import uuid
            from app.models.conversation import Conversation
            from app.database import SessionLocal

            # Créer un titre basé sur le topic extrait
            title = f"🎧 {topic}" if topic else "🎧 Transcription audio"

            # Créer un UUID par défaut pour l'utilisateur invité
            # Utiliser un UUID fixe pour l'utilisateur "guest" pour la cohérence
            guest_user_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")

            # Créer une nouvelle conversation avec le context_id dans la base de données
            async with SessionLocal() as db:
                new_conversation = Conversation(
                    user_id=guest_user_uuid,  # Utiliser un UUID valide pour l'utilisateur invité
                    title=title,
                    context_id=transcription_id,
                )

                db.add(new_conversation)
                await db.commit()
                await db.refresh(new_conversation)

                conversation_id = new_conversation.id
                logger.info(
                    f"Conversation créée automatiquement: {conversation_id} avec context_id: {transcription_id}"
                )
        except Exception as e:
            logger.error(
                f"Erreur lors de la création automatique de la conversation: {e}"
            )
            conversation_id = None

        # Return success with transcription and topic
        preview = (
            transcription[:200] + "..." if len(transcription) > 200 else transcription
        )
        logger.info(
            f"Transcription successful. ID: {transcription_id}, Length: {len(transcription)}"
        )

        return {
            "success": True,
            "message": "تمت معالجة الملف بنجاح",
            "transcription_id": transcription_id,
            "conversation_id": conversation_id,  # Retourner l'ID de la conversation créée
            "transcription_preview": preview,
            "topic": topic,
        }

    except Exception as e:
        logger.error(f"Media upload error: {e}")
        return {"error": f"حدث خطأ أثناء معالجة الملف: {str(e)}"}
    finally:
        # Clean up the uploaded file to save space
        try:
            if os.path.exists(file_path):
                # Don't delete immediately as it might be needed for debugging
                # os.remove(file_path)
                pass
        except Exception as e:
            logger.error(f"Error cleaning up file: {e}")


@router.post("/ask")
async def ask_about_media(request: Request):
    """
    Ask a question about previously uploaded and transcribed media.
    """
    data = await request.json()
    question = data.get("question")
    context_id = data.get("context_id")

    if not question or not context_id:
        return {"error": "Both question and context_id are required."}

    logger.info(f"Received question for context {context_id}: {question}")

    try:
        # Use RAG to generate answer based on vectorized content
        answer, source_docs = generate_answer_with_rag(question, context_id=context_id)
        logger.info(
            f"Generated answer for context {context_id} using RAG with {len(source_docs)} documents"
        )

        # Save question and answer to conversation history
        save_question_to_history(context_id, question, answer)

        return {"answer": answer}
    except Exception as e:
        logger.error(f"Error generating answer with RAG: {e}")
        return {"error": f"Error generating answer: {str(e)}"}


@router.post("/process-youtube")
async def process_youtube(request: Request):
    """
    Process a YouTube URL and extract audio for transcription.
    """
    data = await request.json()
    youtube_url = data.get("youtube_url", "")

    requesttitle = data.get("youtubeurltitle")
    logger.info(f"youtubeurl title: {requesttitle}")
    # Force the URL to be just the video without playlist
    if "youtube.com" in youtube_url and "v=" in youtube_url:
        video_id = youtube_url.split("v=")[1].split("&")[0]
        youtube_url = f"https://www.youtube.com/watch?v={video_id}"

    if not youtube_url:
        return {"error": "لم يتم تقديم رابط يوتيوب"}

    # Regex to validate YouTube URL
    youtube_regex = re.compile(
        r"(https?://)?(www\.)?(youtube\.com|youtu\.be)/"
        r"(watch\?v=|embed/|v/|shorts/|playlist\?|user/)?([^&=%\?]{11})"
    )

    match = youtube_regex.match(youtube_url)
    if not match:
        return {"error": "رابط يوتيوب غير صالح"}

    youtube_processor = (
        None  # Define youtube_processor here to ensure it's available in finally block
    )
    try:
        logger.info(f"Starting synchronous processing of YouTube video: {youtube_url}")

        # Initialize YouTube processor
        youtube_processor = YouTubeProcessor()

        # Process YouTube URL to get audio file
        audio_path, metadata = youtube_processor.process_youtube_url(youtube_url)
        logger.info(f"Processed YouTube audio metadata: {metadata}")
        if not audio_path:
            # No need to call cleanup here as it will be called in finally
            return {
                "error": "تعذر تنزيل الفيديو. تأكد من أن الرابط صحيح والفيديو متاح."
            }

        # Transcribe the audio
        logger.info(f"Transcribing YouTube audio from {audio_path}...")

        transcription = transcribe_uploaded_audio(
            audio_path, fast_mode=False
        )  # Use 'base' model for better accuracy

        # Clean up the audio file (will be handled by finally)
        # youtube_processor.cleanup() # Moved to finally

        # Check for specific error messages from transcription
        if "مساحة كافية على القرص" in transcription:
            logger.error(
                f"Disk space error during YouTube transcription: {transcription}"
            )
            # youtube_processor.cleanup() # Ensure cleanup before raising
            raise HTTPException(
                status_code=507, detail=transcription
            )  # Insufficient Storage
        if "خطأ في تقسيم الملف" in transcription:
            logger.error(
                f"Audio splitting error during YouTube transcription: {transcription}"
            )
            # youtube_processor.cleanup()
            raise HTTPException(status_code=500, detail=transcription)
        if (
            not transcription
            or transcription.strip() == ""
            or "تعذر تحويل" in transcription
            or "حدث خطأ" in transcription
        ):
            logger.error(f"YouTube transcription failed: {transcription}")
            # youtube_processor.cleanup()
            raise HTTPException(
                status_code=500,
                detail=(
                    transcription
                    if transcription and "تعذر تحويل" in transcription
                    else "تعذر تحويل الفيديو إلى نص. يرجى المحاولة مرة أخرى باستخدام فيديو آخر."
                ),
            )
            logger.error("YouTube transcription failed or returned empty result")
            return {
                "error": "تعذر تحويل الفيديو إلى نص. يرجى المحاولة مرة أخرى باستخدام فيديو آخر."
            }

        logger.info(f"Transcription successful. Length: {len(transcription)}")

        # Store the transcription for later retrieval
        transcription_id = vectorize_transcription_with_chroma(transcription)
        logger.info(f"Transcription vectorized with ID: {transcription_id}")

        # Extract the topic from the transcription to be used as a title
        title = "درس إسلامي من يوتيوب"  # Default title
        try:
            # Get the user's language preference from headers or default to Arabic
            lang = "ar"  # Default to Arabic
            generated_title = extract_topic_from_transcription(transcription, lang)
            if generated_title:
                title = generated_title
            logger.info(f"Generated intelligent title from YouTube video: {title}")
        except Exception as e:
            logger.error(f"Error generating title from YouTube video: {e}")

        # Create a conversation associated with this context
        conversation_id = None
        try:
            from app.models.conversation import Conversation
            from app.models.message import Message
            from app.database import SessionLocal  # Using async session

            async with SessionLocal() as db:
                # Use fixed guest UUID for consistency
                guest_user_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")
                new_conversation = Conversation(
                    user_id=guest_user_uuid,
                    title=requesttitle or title,
                    context_id=transcription_id,
                )

                db.add(new_conversation)
                await db.commit()
                await db.refresh(new_conversation)

                conversation_id = new_conversation.id
                logger.info(
                    f"Conversation created automatically for YouTube: {conversation_id} with context_id: {transcription_id}"
                )

                # Add welcome message
                welcome_question = ""
                welcome_message_text = "تم استخراج محتوى الفيديو بنجاح يمكنك الآن طرح أسئلتك، وسأجيبك فقط من المعلومات الموجودة في هذا الفيديو."

                welcome_message_obj = Message(
                    conversation_id=conversation_id,
                    user_id=None,  # Assistant messages now use NULL for user_id
                    question=welcome_question,
                    answer=welcome_message_text,
                )

                db.add(welcome_message_obj)
                await db.commit()
                logger.info(
                    f"Welcome message added to YouTube conversation {conversation_id}"
                )

        except Exception as e:
            logger.error(f"Error creating conversation automatically: {e}")

        # Return success result
        topic = title  # Ensure topic is defined for the response
        return {
            "success": True,
            "message": "تم معالجة الفيديو بنجاح",
            "transcription_id": transcription_id,
            "conversation_id": conversation_id,
            "transcription_preview": (
                transcription[:200] + "..."
                if len(transcription) > 200
                else transcription
            ),
            "topic": topic,
            "title": requesttitle,  # Include the generated intelligent title
        }

    except Exception as e:
        logger.error(f"YouTube processing error: {e}")
        return {"error": f"حدث خطأ أثناء معالجة فيديو يوتيوب: {str(e)}"}
    finally:
        if youtube_processor:
            youtube_processor.cleanup()
