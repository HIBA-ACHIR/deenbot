import os
import json
import logging
import re
from typing import List, Dict, Any, Optional, Tuple
import datetime
import uuid
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import LangChain components
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_groq import ChatGroq
# NEW IMPORTS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from langchain_community.embeddings import HuggingFaceEmbeddings
from pathlib import Path


try:
    subprocess.run(["ffmpeg", "-version"], check=True)
    logger.debug("FFmpeg est correctement installé")
except Exception as e:
    logger.error(f"Erreur FFmpeg: {str(e)}")
    raise RuntimeError("FFmpeg non installé ou mal configuré")

# Import custom exceptions from audio_processor
from app.dependencies.audio_processor import AudioProcessorError, AudioSplittingError, DiskSpaceError

# Try to import Chroma, fall back to DocArrayInMemorySearch if dependencies are missing
try:
    from langchain_community.vectorstores import Chroma
    _VECTOR_BACKEND = "chroma"
    logger.info("Using Chroma as vector store backend with persistence")
except ImportError:
    # Fall back to a pure-Python vector store that doesn't need C++ binaries
    from langchain_community.vectorstores import DocArrayInMemorySearch
    _VECTOR_BACKEND = "docarray"
    logger.info("Using DocArrayInMemorySearch as vector store backend (in-memory only)")

# Simple language detection will be implemented without external dependencies

# Load environment variables
groq_api_key = os.getenv("GROQ_API_KEY", "")
if not groq_api_key:
    logger.warning("GROQ_API_KEY not found in environment variables")

# Dictionary of common Islamic questions and answers for fallback

# Dictionary of multi-language response templates
LANGUAGE_RESPONSES = {
    'ar': {
        'no_answer': "لم أجد إجابة محددة لسؤالك في النص المتوفر. يرجى طرح سؤال أكثر تحديداً أو إعادة صياغته.",
        'error': "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.",
        'greeting': "وعليكم السلام ورحمة الله وبركاته. كيف يمكنني مساعدتك اليوم؟",
        'fallback': "عذراً، لا يمكنني الإجابة على هذا السؤال حالياً. يرجى طرح سؤال آخر."
    },
    'en': {
        'no_answer': "I couldn't find a specific answer to your question in the available text. Please ask a more specific question or rephrase it.",
        'error': "Sorry, an error occurred while processing your request. Please try again.",
        'greeting': "Peace be upon you. How can I assist you today?",
        'fallback': "Sorry, I cannot answer this question at the moment. Please ask another question."
    },
    'fr': {
        'no_answer': "Je n'ai pas trouvé de réponse précise à votre question dans le texte disponible. Veuillez poser une question plus spécifique ou la reformuler.",
        'error': "Désolé, une erreur s'est produite lors du traitement de votre demande. Veuillez réessayer.",
        'greeting': "Que la paix soit sur vous. Comment puis-je vous aider aujourd'hui ?",
        'fallback': "Désolé, je ne peux pas répondre à cette question pour le moment. Veuillez poser une autre question."
    },
    'es': {
        'no_answer': "No encontré una respuesta específica a tu pregunta en el texto disponible. Por favor, haz una pregunta más específica o reformúlala.",
        'error': "Lo siento, ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo.",
        'greeting': "La paz sea contigo. ¿Cómo puedo ayudarte hoy?",
        'fallback': "Lo siento, no puedo responder a esta pregunta en este momento. Por favor, haz otra pregunta."
    },
    'de': {
        'no_answer': "Ich konnte keine spezifische Antwort auf Ihre Frage im verfügbaren Text finden. Bitte stellen Sie eine spezifischere Frage oder formulieren Sie sie um.",
        'error': "Entschuldigung, bei der Bearbeitung Ihrer Anfrage ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        'greeting': "Friede sei mit dir. Wie kann ich dir heute helfen?",
        'fallback': "Es tut mir leid, ich kann diese Frage im Moment nicht beantworten. Bitte stellen Sie eine andere Frage."
    }
}

# Add additional languages as needed

def detect_language(text: str) -> str:
    """
    Detect the language of a given text using character pattern matching and common words.
    
    Args:
        text: Text to detect language for
        
    Returns:
        ISO language code (e.g., 'en', 'ar', 'fr', 'es', 'de', etc.)
    """
    import re
    
    if not text or len(text.strip()) < 2:
        return 'en'  # Default to English for very short or empty text
    
    # Normalize text for better detection
    text = text.lower()
    text_with_spaces = f' {text} '  # Add spaces for better word matching
    
    # Normalize text by removing punctuation and other non-alphanumeric characters
    clean_text = re.sub(r'[^\w\s]', '', text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    
    # Explicit check for very common French words/phrases and informal variants
    french_greetings = ['bonjour', 'salut', 'bonsoir', 'merci', 'au revoir', 'comment ca va', 'comment ça va', 'ca va', 'ça va', 'cava', 'enchanté', 's\'il vous plait', 's\'il te plait', 'pardon', 'oui', 'non']
    if any(greeting in clean_text or greeting in text for greeting in french_greetings):
        logger.info(f"Detected French based on common greeting/phrase: {text}")
        return 'fr'
    
    # Check for common French phrases and patterns (including informal variants)
    french_phrases = ['je suis', 'je ne', 'je veux', 'je peux', 'pouvez-vous', 'pourriez-vous', 'j\'ai', 'c\'est', 'répond', 'français', 'francais', 'repond', 'moi', 'en', 'va', 'bien', 'comment']
    if any(phrase in text for phrase in french_phrases):
        logger.info(f"Detected French based on common phrase: {text}")
        return 'fr'
    
    # Special case for short informal French expressions
    if 'cava' in text.replace(' ', '').replace('?', '') or 'çava' in text.replace(' ', '').replace('?', ''):
        logger.info(f"Detected French based on informal expression: {text}")
        return 'fr'
    
    # Count characters from different scripts
    arabic_chars = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]', text))
    latin_chars = len(re.findall(r'[a-zA-Z]', text))
    french_chars = len(re.findall(r'[àáâäæçèéêëîïôœùûüÿ]', text))
    spanish_chars = len(re.findall(r'[áéíóúüñ¿¡]', text))
    
    # Check for common words in different languages - with improved matching
    german_words = ['wie', 'viele', 'gibt', 'ist', 'und', 'der', 'die', 'das', 'ein', 'eine', 'zu', 'im', 'für', 'mit', 'was', 'wer', 'wo', 'wann', 'warum', 'bitte', 'danke', 'hallo', 'guten', 'morgen', 'tag', 'abend']
    french_words = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'est', 'sont', 'et', 'ou', 'mais', 'donc', 'car', 'pour', 'avec', 'sans', 'dans', 'sur', 'sous', 'combien', 'pourquoi', 'comment', 'quand', 'où', 'qui', 'que', 'quoi', 'lequel', 'mon', 'ton', 'son', 'ce', 'cette', 'ces', 'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'moi', 'toi', 'lui', 'eux', 'veux', 'peux', 'doit', 'parle', 'dit', 'fait']
    spanish_words = ['yo', 'tu', 'el', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'es', 'son', 'y', 'o', 'pero', 'para', 'con', 'sin', 'en', 'sobre', 'bajo', 'cuantos', 'porque', 'como', 'cuando', 'donde', 'quien', 'que', 'cual', 'mi', 'tu', 'su', 'este', 'esta', 'estos', 'estas', 'hola', 'gracias', 'adios', 'buenos', 'dias', 'tardes', 'noches']
    english_words = ['i', 'you', 'he', 'she', 'we', 'they', 'is', 'are', 'and', 'or', 'but', 'for', 'with', 'without', 'in', 'on', 'under', 'how', 'why', 'what', 'when', 'where', 'who', 'which', 'hello', 'hi', 'thanks', 'thank', 'please', 'goodbye', 'bye', 'good', 'morning', 'afternoon', 'evening', 'night']
    
    # Count word matches (more thorough approach)
    german_indicators = 0
    french_indicators = 0
    spanish_indicators = 0
    english_indicators = 0
    
    # Check each word in the text against our language word lists
    for word in re.findall(r'\b\w+\b', text):
        if word in german_words:
            german_indicators += 1
        if word in french_words:
            french_indicators += 1
        if word in spanish_words:
            spanish_indicators += 1
        if word in english_words:
            english_indicators += 1
    
    # Log detection attempt
    logger.info(f"Language detection: Arabic={arabic_chars}, Latin={latin_chars}, French={french_chars}/{french_indicators}, Spanish={spanish_chars}/{spanish_indicators}, German={german_indicators}, English={english_indicators}")
    
    # Determine language based on character counts, patterns, and word indicators
    if arabic_chars > 0 and arabic_chars > latin_chars * 0.5:
        return 'ar'
    elif french_chars > 0 or french_indicators > 0:
        # Prioritize French if we have any French characters or word indicators
        return 'fr'
    elif german_indicators >= 1 and german_indicators >= french_indicators and german_indicators >= spanish_indicators and german_indicators >= english_indicators:
        return 'de'
    elif spanish_chars > 0 or spanish_indicators >= 1:
        return 'es'
    else:
        return 'en'  # Default to English for any other script

def get_response_template(lang_code: str, template_key: str) -> str:
    """
    Get a response template in the specified language.
    
    Args:
        lang_code: ISO language code (e.g., 'en', 'ar', 'fr', 'es', 'de')
        template_key: Key for the template to retrieve
        
    Returns:
        Response template string
    """
    # Log the language code and template key for debugging
    logger.info(f"Getting response template for language: {lang_code}, template: {template_key}")
    
    # Default to English if language not supported
    if lang_code not in LANGUAGE_RESPONSES:
        logger.warning(f"Language code {lang_code} not supported, defaulting to English")
        lang_code = 'en'
        
    # Default to fallback if template key not found
    if template_key not in LANGUAGE_RESPONSES[lang_code]:
        logger.warning(f"Template key {template_key} not found for language {lang_code}, using fallback")
        template_key = 'fallback'
        
    return LANGUAGE_RESPONSES[lang_code][template_key]

# Dictionary of common Islamic questions and answers for fallback
COMMON_ISLAMIC_QA = {
    "أركان الإسلام": """
    أركان الإسلام الخمسة هي:
    1. الشهادة: شهادة أن لا إله إلا الله وأن محمداً رسول الله
    2. الصلاة: إقامة الصلوات الخمس
    3. الزكاة: إعطاء نسبة من المال للفقراء
    4. الصوم: صيام شهر رمضان
    5. الحج: زيارة بيت الله الحرام لمن استطاع إليه سبيلاً
    """,
    
    "أركان الإيمان": """
    أركان الإيمان الستة هي:
    1. الإيمان بالله
    2. الإيمان بملائكته
    3. الإيمان بكتبه
    4. الإيمان برسله
    5. الإيمان باليوم الآخر
    6. الإيمان بالقدر خيره وشره
    """,
    
    "الصلوات الخمس": """
    الصلوات الخمس المفروضة هي:
    1. صلاة الفجر: ركعتان
    2. صلاة الظهر: أربع ركعات
    3. صلاة العصر: أربع ركعات
    4. صلاة المغرب: ثلاث ركعات
    5. صلاة العشاء: أربع ركعات
    """,
    
    "الوضوء": """
    خطوات الوضوء الصحيح:
    1. النية
    2. غسل الكفين
    3. المضمضة والاستنشاق
    4. غسل الوجه
    5. غسل اليدين إلى المرفقين
    6. مسح الرأس
    7. مسح الأذنين
    8. غسل الرجلين إلى الكعبين
    """,
    
    "رمضان": """
    شهر رمضان هو الشهر التاسع في التقويم الهجري، وهو شهر الصيام المفروض على المسلمين. يمتنع المسلمون فيه عن الطعام والشراب من الفجر حتى غروب الشمس. وهو الشهر الذي أنزل فيه القرآن الكريم.
    """
}

def detect_video_id_from_question(question: str) -> str:
    """
    Detect video ID from a question.
    
    Args:
        question: The question to analyze
        
    Returns:
        Video ID if found, empty string otherwise
    """
    # Check for common YouTube video ID patterns
    youtube_patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/[^\/]+\/[^\/]+\/|youtube\.com\/[^\/]+\/[^\/]+\/|youtube\.com\/verify_age\?next_url=\/watch%3Fv%3D)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
        r'youtu\.be\/([^&\n?#]+)',
    ]
    
    for pattern in youtube_patterns:
        match = re.search(pattern, question)
        if match:
            return match.group(1)
    
    # Check if there's a video ID in the question
    video_id_pattern = r'video_id[=:][\s"\']*([a-zA-Z0-9_-]+)'
    match = re.search(video_id_pattern, question)
    if match:
        return match.group(1)
    
    return ""

def transcribe_uploaded_audio(file_path: str, fast_mode: bool = True) -> str:
    """
    Transcribe an uploaded audio file.
    
    Args:
        file_path: Path to the audio file
        fast_mode: If True, use faster transcription settings (for YouTube)
        
    Returns:
        Transcribed text
    """
    try:
        logger.info(f"Transcribing audio file: {file_path} with fast_mode={fast_mode}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"Audio file not found: {file_path}")
            return "تعذر العثور على الملف الصوتي."
            
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size < 1000:  # Less than 1KB
            logger.error(f"Audio file too small: {file_path}, size: {file_size} bytes")
            return "الملف الصوتي صغير جدًا أو فارغ."
        
        # Import the AudioProcessor here to avoid circular imports
        from app.dependencies.audio_processor import AudioProcessor
        
        # Initialize audio processor with tiny model for speed in fast mode
        # or base model for better quality in normal mode
        model_size = "tiny" if fast_mode else "base"
        audio_processor = AudioProcessor(model_size=model_size)
        
        # Process the audio file using Whisper with language hint
        transcription, _ = audio_processor.process_audio_file(file_path, language="ar")
        
        # Clean up temporary files
        audio_processor.cleanup()
        
        if not transcription or len(transcription.strip()) < 20:
            logger.error("Transcription failed or returned empty result")
            return "تعذر تحويل الملف الصوتي إلى نص. يرجى المحاولة مرة أخرى باستخدام ملف آخر."
        
        logger.info(f"Transcription completed successfully. Length: {len(transcription)}")
        return transcription
    except DiskSpaceError as e:
        logger.error(f"Disk space error transcribing audio {file_path}: {e}")
        # Also ensure cleanup is attempted if it hasn't run due to early exit
        if 'audio_processor' in locals() and hasattr(audio_processor, 'cleanup'):
            audio_processor.cleanup()
        return "تعذر تحويل الملف الصوتي بسبب عدم وجود مساحة كافية على القرص. يرجى تفريغ بعض المساحة والمحاولة مرة أخرى."
    except AudioSplittingError as e:
        logger.error(f"Audio splitting error transcribing audio {file_path}: {e}")
        if 'audio_processor' in locals() and hasattr(audio_processor, 'cleanup'):
            audio_processor.cleanup()
        return "تعذر تحويل الملف الصوتي بسبب خطأ في تقسيم الملف. يرجى المحاولة مرة أخرى أو استخدام ملف مختلف."
    except AudioProcessorError as e: # Catch other audio processing specific errors
        logger.error(f"Audio processing error for {file_path}: {e}")
        if 'audio_processor' in locals() and hasattr(audio_processor, 'cleanup'):
            audio_processor.cleanup()
        return f"حدث خطأ أثناء معالجة الملف الصوتي: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error transcribing audio {file_path}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if 'audio_processor' in locals() and hasattr(audio_processor, 'cleanup'):
            audio_processor.cleanup()
        return f"تعذر تحويل الملف الصوتي إلى نص لسبب غير متوقع: {str(e)}"

def extract_topic_from_transcription(transcription: str) -> str:
    """
    Extract the main topic from a transcription.
    
    Args:
        transcription: The transcribed text
        
    Returns:
        A concise description of the topic
    """
    try:
        logger.info("Extracting topic from transcription")
        
        # Use Groq if available for better results
        if groq_api_key:
            logger.info("Using Groq LLM for topic extraction")
            try:
                
                llm = ChatGroq(model_name="meta-llama/llama-4-maverick-17b-128e-instruct", api_key=groq_api_key)
                
                # Create prompt for topic extraction
                prompt = ChatPromptTemplate.from_messages([
                   ("system", """
                    أنت مساعد ذكي متخصص في تحليل النصوص الإسلامية المستخرجة من محاضرات أو فيديوهات.
                    مهمتك هي استخراج الموضوع الرئيسي للنص فقط بناءً على محتوى النص المعطى.

                    - اقرأ النص بعناية.
                    - حدد عنوانًا دقيقًا ومباشرًا يعكس الموضوع الأساسي للنص.
                    - لا تستخدم كلمات مثل "الموضوع" أو "العنوان" في إجابتك.
                    - لا تخترع معلومات أو تفسيرات غير موجودة في النص.
                    - إذا تضمن النص آيات قرآنية أو أحاديث، يمكن الاستشهاد بها كما وردت في النص فقط.
                    - اجعل العنوان باللغة العربية، مختصرًا، ومحددًا.

                    """),
                        ("user", """
                    فيما يلي نص مستخرج من محاضرة إسلامية. استخرج منه الموضوع الرئيسي بدقة، بناءً فقط على ما هو موجود في النص:
                        
                    {transcription}

                    اكتب العنوان مباشرة:
                    """)
                    ])
                
                # Get max 1000 characters from transcription to keep prompt size reasonable
                transcription_sample = transcription[:5000] if len(transcription) > 5000 else transcription
                
                # Extract topic
                chain = prompt | llm | StrOutputParser()
                topic = chain.invoke({"transcription": transcription_sample})
                
                # Clean up topic
                topic = topic.strip().replace('"', '').replace("'", '')
                logger.info(f"Extracted topic using Groq: {topic}")
                return topic
                
            except Exception as e:
                logger.error(f"Error using Groq for topic extraction: {e}")
                # Fall back to rule-based approach
        
        # Rule-based approach if LLM is not available
        logger.info("Using rule-based approach for topic extraction")
        
        # Use the first 1000 characters as a sample
        sample = transcription[:1000]
        
        # Try to find common Islamic topics
        islamic_topics = [
            "القرآن", "الحديث", "الفقه", "العقيدة", "التوحيد", "الإيمان", "الصلاة", 
            "الصوم", "الزكاة", "الحج", "الأخلاق", "السيرة", "الدعوة", "الجهاد", 
            "الأسرة", "التربية", "العلم", "الحكمة", "الصبر", "التقوى", "الرحمة", 
            "العدل", "الشريعة", "المعاملات", "الذكر", "الدعاء", "التفسير", "رمضان"
        ]
        
        found_topics = []
        for topic in islamic_topics:
            if topic in sample:
                found_topics.append(topic)
        
        if found_topics:
            # Use the most frequent topic or combine multiple topics
            if len(found_topics) == 1:
                result = f"{found_topics[0]} في ضوء التعاليم الإسلامية"
            else:
                result = f"{found_topics[0]} و{found_topics[1]} في الإسلام"
            logger.info(f"Extracted topic using rule-based approach: {result}")
            return result
        else:
            # Default topic if no specific topic is found
            default_topic = "الدروس الإسلامية والتعاليم الدينية"
            logger.info(f"Using default topic: {default_topic}")
            return default_topic
            
    except Exception as e:
        logger.error(f"Error extracting topic: {e}")
        return "الدروس الإسلامية والتعاليم الدينية"

def vectorize_transcription_with_chroma(transcription: str) -> str:
    """
    Vectorize a transcription using vector embeddings. This now splits the transcription into
    semantically coherent chunks, embeds them with a local HuggingFace model, and
    stores them either in a persistent Chroma collection or in-memory store
    so that they can be retrieved later via similarity search.
    """
    try:
        logger.debug("=== Starting transcription vectorization ===")
        logger.debug(f"Input transcription length: {len(transcription)} characters")
        
        # Generate a unique ID for the transcription
        transcription_id = f"trans_{uuid.uuid4().hex[:8]}"
        logger.debug(f"Generated transcription ID: {transcription_id}")

        # Ensure persistence directories exist
        Path("chroma_transcriptions").mkdir(parents=True, exist_ok=True)
        logger.debug("Created chroma_transcriptions directory if it didn't exist")
        
        # Always save raw transcription for debugging / fallback
        transcript_path = f"chroma_transcriptions/{transcription_id}.txt"
        with open(transcript_path, "w", encoding="utf-8") as f:
            f.write(transcription)
        logger.debug(f"Saved raw transcription to {transcript_path}")

        # --- Create embeddings and store in vector DB ---
        logger.debug("Starting text splitting process...")
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
        chunks = splitter.split_text(transcription)
        logger.debug(f"Split transcription into {len(chunks)} chunks")

        if not chunks:
            logger.warning("No text chunks produced; skipping embedding step")
            return transcription_id

        logger.debug("Creating Document objects with metadata...")
        docs = [
            Document(page_content=chunk, metadata={"transcription_id": transcription_id, "chunk_index": i})
            for i, chunk in enumerate(chunks)
        ]
        logger.debug(f"Created {len(docs)} Document objects")

        # Use a lightweight, freely available model; no external key required
        logger.debug("Loading HuggingFace embedding model...")
        try:
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            logger.debug("Embedding model loaded successfully")
        except Exception as embed_error:
            logger.error(f"Failed to load HuggingFace embedding model: {embed_error}")
            raise embed_error

        # Create / load vector store based on available backend
        if _VECTOR_BACKEND == "chroma":
            # For Chroma backend with persistence
            logger.debug("Using Chroma backend with persistence")
            Path("chroma_index").mkdir(parents=True, exist_ok=True)
            logger.debug("Created chroma_index directory if it didn't exist")
            
            logger.debug("Initializing Chroma store...")
            store = Chroma(
                persist_directory="chroma_index",
                collection_name="media_transcripts",
                embedding_function=embeddings,
            )
            
            logger.debug(f"Adding {len(docs)} documents to Chroma store...")
            store.add_documents(docs)
            
            logger.debug("Persisting Chroma store to disk...")
            store.persist()
            logger.debug("Chroma store persisted successfully")
        else:
            # For DocArrayInMemorySearch (pure Python, no persistence)
            logger.debug("Using DocArrayInMemorySearch (in-memory) backend")
            # We'll store the in-memory instances in a global dict
            if not hasattr(vectorize_transcription_with_chroma, "docarray_stores"):
                vectorize_transcription_with_chroma.docarray_stores = {}
                logger.debug("Initialized docarray_stores dictionary")
            
            logger.debug("Creating DocArrayInMemorySearch store...")
            store = DocArrayInMemorySearch.from_documents(
                docs, 
                embeddings
            )
            # Save reference to this store for later retrieval
            vectorize_transcription_with_chroma.docarray_stores[transcription_id] = store
            logger.debug(f"DocArrayInMemorySearch store created and saved with key {transcription_id}")

        logger.info(f"Embedded and stored {len(docs)} chunks for transcription {transcription_id} using {_VECTOR_BACKEND} backend")
        logger.debug("=== Vectorization process completed successfully ===")

        return transcription_id
    except Exception as e:
        logger.error(f"Error vectorizing transcription: {e}")
        import traceback
        logger.error(traceback.format_exc())

        # Even if vectorization fails, we still need to return a valid transcription_id
        # so that the conversation gets properly categorized as a transcription
        fallback_id = f"trans_{uuid.uuid4().hex[:8]}"
        logger.warning(f"Vectorization failed, using fallback ID: {fallback_id}")

        # Save the raw transcription as fallback
        try:
            Path("chroma_transcriptions").mkdir(parents=True, exist_ok=True)
            transcript_path = f"chroma_transcriptions/{fallback_id}.txt"
            with open(transcript_path, "w", encoding="utf-8") as f:
                f.write(transcription)
            logger.info(f"Saved raw transcription to {transcript_path} as fallback")
        except Exception as save_error:
            logger.error(f"Failed to save fallback transcription: {save_error}")

        return fallback_id

def retrieve_passages(question: str, transcription_id: str, k: int = 5) -> str:
    """
    Retrieve the top-k most relevant chunks for a question from the vector store,
    limited to a single transcription.
    """
    try:
        logger.debug(f"=== Starting passage retrieval for question: '{question[:50]}...' ===")
        logger.debug(f"Looking for transcription_id: {transcription_id}, retrieving top {k} chunks")
        
        logger.debug("Loading embedding model...")
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        logger.debug("Embedding model loaded successfully")
        
        if _VECTOR_BACKEND == "chroma":
            # For Chroma backend with persistence
            logger.debug("Using Chroma backend for retrieval")
            logger.debug("Loading Chroma store from disk...")
            store = Chroma(
                persist_directory="chroma_index",
                collection_name="media_transcripts",
                embedding_function=embeddings,
            )
            logger.debug("Chroma store loaded successfully")
            
            logger.debug(f"Performing similarity search with filter: transcription_id={transcription_id}")
            results = store.similarity_search(
                question,
                k=k,
                filter={"transcription_id": transcription_id} if transcription_id else None,
            )
            logger.debug(f"Search completed, found {len(results)} results")
        else:
            # For DocArrayInMemorySearch (in-memory)
            logger.debug("Using DocArrayInMemorySearch backend for retrieval")
            if hasattr(vectorize_transcription_with_chroma, "docarray_stores") and \
               transcription_id in vectorize_transcription_with_chroma.docarray_stores:
                logger.debug(f"Found in-memory store for transcription {transcription_id}")
                store = vectorize_transcription_with_chroma.docarray_stores[transcription_id]
                logger.debug("Performing similarity search...")
                results = store.similarity_search(question, k=k)
                logger.debug(f"Search completed, found {len(results)} results")
            else:
                # No store found for this ID, return empty
                logger.warning(f"No in-memory vector store found for transcription {transcription_id}")
                return ""
        
        # Log preview of results
        if results:
            logger.debug("=== Search Results Preview ===")
            for i, doc in enumerate(results):
                preview = doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content
                logger.debug(f"Result {i+1}: {preview}")
            
            combined_results = "\n".join([doc.page_content for doc in results])
            logger.debug(f"Combined {len(results)} chunks into context ({len(combined_results)} chars)")
            return combined_results
        else:
            logger.debug("No relevant passages found")
            return ""
    except Exception as e:
        logger.error(f"Error retrieving passages: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ""

def vectorize_transcription(transcription: str) -> str:
    """
    Vectorize a transcription.
    
    Args:
        transcription: The transcription text
        
    Returns:
        Transcription ID
    """
    return vectorize_transcription_with_chroma(transcription)

def save_question_to_history(question: str, answer: str, user_id: str = "guest"):
    """
    Save a question and its answer to history.
    
    Args:
        question: The question asked
        answer: The answer provided
        user_id: ID of the user asking the question
    """
    try:
        # Create logs directory if it doesn't exist
        os.makedirs("logs", exist_ok=True)
        
        # Get current timestamp
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Create history entry
        history_entry = {
            "timestamp": timestamp,
            "user_id": user_id,
            "question": question,
            "answer": answer
        }
        
        # Append to history file
        with open("logs/question_history.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(history_entry, ensure_ascii=False) + "\n")
            
        logger.info(f"Saved question to history for user {user_id}")
    except Exception as e:
        logger.error(f"Error saving question to history: {e}")

def log_question_history(question: str, answer: str, user_id: str = "guest"):
    """
    Log a question and its answer.
    
    Args:
        question: The question asked
        answer: The answer provided
        user_id: ID of the user asking the question
    """
    save_question_to_history(question, answer, user_id)

def get_llm_client():
    """
    Get an LLM client.
    
    Returns:
        LLM client
    """
    try:
        if groq_api_key:
            # Try to initialize the Groq client
            return ChatGroq(temperature=0.2, model_name="meta-llama/llama-4-maverick-17b-128e-instruct", groq_api_key=groq_api_key)
        else:
            # If no API key is available, log the error
            logger.error("No GROQ_API_KEY available for LLM")
            return None
    except Exception as e:
        # If there's an error initializing the client, log it
        logger.error(f"Error initializing LLM client: {e}")
        return None

def get_fallback_answer(question: str, context: str = "") -> str:
    """
    Get a fallback answer when no LLM is available.
    
    Args:
        question: The question to answer
        context: Optional context for the question
        
    Returns:
        A fallback answer
    """
    # Convert question to lowercase for easier matching
    question_lower = question.lower()
    
    # Check if the context contains relevant information
    if context and len(context) > 100:
        # Use our improved extract_answer_from_context function instead of returning raw context
        return extract_answer_from_context(question, context)
    
    # Check for common Islamic topics in the question
    for key, answer in COMMON_ISLAMIC_QA.items():
        if key in question or key.lower() in question_lower:
            return answer
    
    # Check for greetings
    if any(greeting in question_lower for greeting in ["سلام", "مرحبا", "أهلا", "صباح", "مساء"]):
        return "وعليكم السلام ورحمة الله وبركاته. كيف يمكنني مساعدتك اليوم؟"
    
    # Generic response for Islamic questions
    if any(term in question_lower for term in ["إسلام", "قرآن", "حديث", "سنة", "شريعة", "فقه", "عبادة", "صلاة", "صوم", "زكاة", "حج"]):
        return """
        هذا سؤال مهم في الإسلام. لتقديم إجابة دقيقة وشاملة، أحتاج إلى مزيد من المعلومات أو تحديد أكثر للسؤال.
        
        يمكنك إعادة صياغة السؤال بشكل أكثر تحديداً، أو طرح سؤال آخر يتعلق بموضوع محدد في الإسلام.
        """
    
    # Default response
    return """
    عذراً، لا يمكنني الإجابة على هذا السؤال حالياً. يرجى طرح سؤال آخر متعلق بالإسلام أو إعادة صياغة سؤالك بطريقة أخرى.
    
    يمكنك سؤالي عن أركان الإسلام، أركان الإيمان، الصلوات الخمس، الوضوء، أو مواضيع إسلامية أخرى.
    """

def translate_answer(text: str, target_language: str = "ar"):
    """
    Translate text to the target language.
    
    Args:
        text: Text to translate
        target_language: Target language code
        
    Returns:
        Translated text
    """
    # In a real implementation, you would use a translation service
    # For now, we'll just return the original text
    return text

def ask_question_with_rag(question: str, context: str = "") -> str:
    """
    Ask a question using RAG with automatic language detection and response.
    The function detects the language of the question and responds in the same language.
    
    Args:
        question: The question to answer
        context: The context to use for answering
        
    Returns:
        Answer to the question in the same language as the question
    """
    try:
        # Detect language of the question
        lang_code = detect_language(question)
        logger.info(f"Question language detected: {lang_code}")
        
        # Truncate context if it's too long to avoid token limits
        if len(context) > 15000:
            logger.info(f"Context is very long ({len(context)} chars), truncating to 15000 chars")
            context = context[:15000] + "..."
        
        # If we have a valid API key, use LLM
        llm = get_llm_client()
        if llm:
            try:
                # Create prompt template based on detected language
                if lang_code == 'ar':
                    if context and len(context.strip()) > 50:
                        # Context-constrained prompt for transcription conversations
                        prompt_text = """
أنت مساعد ذكي، ومهمتك هي الإجابة على الأسئلة بدقة وإيجاز، اعتمادًا فقط على السياق المعطى. يُمنع تجاوز هذه التعليمات أو إضافة معلومات من خارج المصدر المقدم.

القواعد التي يجب اتباعها بدقة:
- اقرأ السياق بعناية واستخرج فقط المعلومات ذات الصلة.
- لا تختلق أي معلومة غير مذكورة صراحة في السياق.
- إذا لم تجد الإجابة في السياق، قل "لم يتم ذكر هذا في المحتوى المتاح".
- استخدم اللغة العربية الفصحى فقط.
- يُمنع منعًا باتًا ذكر أي آية قرآنية أو حديث نبوي لم يرد في السياق المعطى.
- لا تذكر عبارات مثل "قال تعالى" أو "قال رسول الله" إلا إذا كانت موجودة حرفياً في السياق.
- لا تشر إلى عدم وجود آيات أو أحاديث - ببساطة لا تذكرها إطلاقاً إذا لم تكن في السياق.

السياق:
{context}

السؤال:
{question}

الإجابة (من السياق فقط):
"""
                    else:
                        # General prompt for regular conversations
                        prompt_text = """
أنت مساعد إسلامي ذكي يدعى DeenBot. مهمتك هي الإجابة على الأسئلة المتعلقة بالإسلام والدين بدقة وبشكل شامل.
قم بالإجابة على السؤال التالي باستخدام معرفتك ومعلوماتك، وباللغة العربية الفصحى فقط.
يجب أن تكون الإجابة كاملة ودقيقة وواضحة.

إذا كان السؤال تحية مثل "مرحبا" أو "السلام عليكم" أو "هاي"، فرد بتحية إسلامية مناسبة.
إذا كان السؤال غير واضح أو قصير جداً، فاسأل المستخدم عن مزيد من التفاصيل.

السؤال:
{question}

الإجابة (باللغة العربية):
"""
                elif lang_code == 'fr':
                    if context and len(context.strip()) > 50:
                        # Context-constrained prompt for transcription conversations
                        prompt_text = """
Vous êtes un assistant expert qui répond aux questions de manière précise et concise, en vous basant uniquement sur le contexte fourni.

Règles strictes à suivre:
- Lisez attentivement le contexte et extrayez les informations pertinentes.
- Répondez uniquement avec les informations présentes dans le contexte. Ne pas inventer.
- Si vous ne trouvez pas la réponse dans le contexte, dites "Cette information n'est pas mentionnée dans le contenu disponible".
- Votre réponse doit être exclusivement en français.
- Il est interdit de citer des versets coraniques ou des hadiths qui ne sont pas dans le contexte fourni.
- Ne mentionnez pas des phrases comme "Dieu a dit" ou "Le Prophète a dit" sauf si elles sont littéralement présentes dans le contexte.
- Ne faites pas référence à l'absence de versets ou de hadiths - ne les mentionnez simplement pas du tout s'ils ne sont pas dans le contexte.

Contexte:
{context}

Question:
{question}

Réponse (du contexte uniquement):
"""
                    else:
                        # General prompt for regular conversations
                        prompt_text = """
Vous êtes DeenBot, un assistant islamique intelligent. Votre tâche est de répondre aux questions relatives à l'islam et à la religion avec précision et de manière complète.
Répondez à la question suivante STRICTEMENT ET UNIQUEMENT EN FRANÇAIS, quelle que soit la langue utilisée dans la question.
Il est ABSOLUMENT INTERDIT d'utiliser une autre langue que le français dans votre réponse.

Si la question est une salutation comme "bonjour" ou "salut", répondez avec une salutation islamique en français comme "As-salamu alaykum" (Que la paix soit sur vous) ou "Bonjour, que la paix soit sur vous".

Question:
{question}

Réponse (UNIQUEMENT en français, n'utilisez PAS d'anglais ni d'autres langues):
"""
                elif lang_code == 'es':
                    prompt_text = """
Usted es DeenBot, un asistente islámico inteligente. Su tarea es responder a preguntas relacionadas con el Islam y la religión con precisión y de manera completa.
Responda a la siguiente pregunta ESTRICTAMENTE Y SOLAMENTE EN ESPAÑOL, sin importar el idioma utilizado en la pregunta.
Está ABSOLUTAMENTE PROHIBIDO utilizar cualquier otro idioma que no sea español en su respuesta.

Si la pregunta es un saludo como "hola" o "buenos días", responda con un saludo islámico en español como "As-salamu alaykum" (La paz sea contigo) o "Hola, que la paz sea contigo".

Contexto (si está disponible):
{context}

Pregunta:
{question}

Respuesta (SOLAMENTE en español, NO utilice inglés ni otros idiomas):
"""
                elif lang_code == 'de':
                    prompt_text = """
Sie sind DeenBot, ein intelligenter islamischer Assistent. Ihre Aufgabe ist es, Fragen zum Islam und zur Religion genau und umfassend zu beantworten.
Beantworten Sie die folgende Frage AUSSCHLIEßLICH UND NUR AUF DEUTSCH, unabhängig von der in der Frage verwendeten Sprache.
Es ist ABSOLUT VERBOTEN, in Ihrer Antwort eine andere Sprache als Deutsch zu verwenden.

Wenn die Frage ein Gruß wie "Hallo" oder "Guten Tag" ist, antworten Sie mit einem islamischen Gruß auf Deutsch wie "As-salamu alaykum" (Friede sei mit dir) oder "Hallo, Friede sei mit dir".

Kontext (falls verfügbar):
{context}

Frage:
{question}

Antwort (NUR auf Deutsch, verwenden Sie KEIN Englisch oder andere Sprachen):
"""
                else:  # Default to English for all other languages
                    prompt_text = """
You are DeenBot, an intelligent Islamic assistant. Your task is to answer questions related to Islam and religion accurately and comprehensively.
Answer the following question STRICTLY AND ONLY IN ENGLISH, regardless of the language used in the question.
It is ABSOLUTELY FORBIDDEN to use any language other than English in your response.

If the question is a greeting like "hello" or "hi", respond with an Islamic greeting in English such as "As-salamu alaykum" (Peace be upon you) or "Hello, peace be upon you".

Context (if available):
{context}

Question:
{question}

Answer (ONLY in English, DO NOT use any other languages):
"""
                
                prompt = ChatPromptTemplate.from_template(prompt_text)
                
                # Create chain
                default_context = {
                    'ar': "معلومات عامة عن الإسلام والعبادات والأحكام الشرعية",
                    'en': "General information about Islam, worship, and religious rulings",
                    'fr': "Informations générales sur l'Islam, le culte et les règles religieuses",
                    'es': "Información general sobre el Islam, la adoración y las normas religiosas",
                    'de': "Allgemeine Informationen über den Islam, Gottesdienst und religiöse Vorschriften"
                }.get(lang_code, "General information about Islam")
                
                chain = (
                    {"context": lambda _: context if context else default_context, 
                     "question": lambda _: question}
                    | prompt
                    | llm
                    | StrOutputParser()
                )
                
                # Invoke chain with a timeout
                try:
                    answer = chain.invoke({})
                    
                    # Clean up the answer if needed
                    if not answer or len(answer.strip()) < 5:
                        return get_response_template(lang_code, 'error')
                    
                    # If language is Arabic, ensure it's properly formatted
                    if lang_code == 'ar':
                        import re
                        
                        # Function to check if a string contains mostly Arabic
                        def is_mostly_arabic(text):
                            # Count Arabic characters
                            arabic_count = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]', text))
                            # Count total non-whitespace, non-punctuation characters
                            total_chars = len(re.findall(r'[^\s\.,،:;\(\)؟!-]', text))
                            # Return True if at least 70% of characters are Arabic
                            return total_chars > 0 and arabic_count / total_chars >= 0.7
                        
                        # First, try to remove Latin (including extended Latin), Cyrillic, and other non-Arabic characters
                        minimal_filtered = re.sub(r'[a-zA-Z\u0100-\u017F\u0180-\u024F\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]', '', answer)
                        
                        # If the result is mostly Arabic, use it
                        if is_mostly_arabic(minimal_filtered):
                            return minimal_filtered
                        
                        # Otherwise, apply more aggressive filtering but preserve all Arabic characters
                        # This regex keeps Arabic characters, numbers, and punctuation
                        arabic_text = re.sub(r'[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0030-\u0039\s\.,،:;\(\)؟!-]', '', answer)
                        
                        # If the cleaning removed too much content, provide a default response
                        if len(arabic_text.strip()) < 5:
                            return get_response_template(lang_code, 'error')
                        
                        return arabic_text
                    
                    # For non-Arabic languages, return as is
                    return answer
                    
                except Exception as chain_error:
                    logger.error(f"Error invoking LLM chain: {chain_error}")
                    # Fall back to rule-based approach
                    logger.info("Falling back to improved extract_answer_from_context method")
                    return extract_answer_from_context(question, context, lang_code)
                    
            except Exception as prompt_error:
                logger.error(f"Error creating prompt or chain: {prompt_error}")
                # Fall back to rule-based approach
                return extract_answer_from_context(question, context)
        
        # Fallback to simple rule-based approach if no LLM is available
        return extract_answer_from_context(question, context)
        
    except Exception as e:
        logger.error(f"Error in ask_question_with_rag: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return extract_answer_from_context(question, context)

def extract_answer_from_context(question: str, context: str = "", lang_code: str = "ar") -> str:
    """
    Extract and reformulate an answer from context using semantic search and advanced parsing.
    
    Args:
        question: The question to answer
        context: The context to use for answering
        
    Returns:
        Extracted and reformulated answer
    """
    # Convert question to lowercase for case-insensitive matching
    question_lower = question.lower()
    
    # If we have context, try to extract relevant information
    if context and len(context.strip()) > 100:
        import re
        
        # Extract keywords from question (words with 3+ characters)
        question_words = re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]{3,}', question)
        
        # Split context into chunks/paragraphs for better semantic search
        # Arabic text often uses different paragraph markers
        paragraphs = re.split(r'\n{2,}', context)
        chunks = []
        
        # Create meaningful chunks from paragraphs
        current_chunk = ""
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            # If current chunk is getting too large, add it to chunks and start a new one
            if len(current_chunk) + len(para) > 1000:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para
            else:
                current_chunk += " " + para if current_chunk else para
                
        # Add the final chunk if not empty
        if current_chunk:
            chunks.append(current_chunk)
            
        # If we couldn't identify paragraphs, split by sentences
        if len(chunks) <= 1 and len(context) > 1000:
            sentences = re.split(r'[.!?؟،\n]+', context)
            chunks = []
            current_chunk = ""
            
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                    
                if len(current_chunk) + len(sentence) > 500:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = sentence
                else:
                    current_chunk += " " + sentence if current_chunk else sentence
                    
            if current_chunk:
                chunks.append(current_chunk)
        
        # Score chunks based on keyword matching and semantic relevance
        chunk_scores = {}
        
        for i, chunk in enumerate(chunks):
            # Basic keyword matching score
            score = 0
            for keyword in question_words:
                if keyword in chunk:
                    score += 1
            
            # Bonus for question words appearing close together
            for j in range(len(question_words)):
                for k in range(j+1, len(question_words)):
                    if question_words[j] in chunk and question_words[k] in chunk:
                        # Find positions of both keywords
                        pos1 = chunk.find(question_words[j])
                        pos2 = chunk.find(question_words[k])
                        # If they're within 50 characters of each other, add bonus score
                        if abs(pos1 - pos2) < 50:
                            score += 0.5
            
            # Store score if positive
            if score > 0:
                chunk_scores[i] = score
        
        # If we found relevant chunks, get the best one
        if chunk_scores:
            # Sort chunks by score (highest first)
            best_chunk_idx = sorted(chunk_scores.items(), key=lambda x: x[1], reverse=True)[0][0]
            best_chunk = chunks[best_chunk_idx]
            
            # Try to use LLM for reformulation if available
            llm = get_llm_client()
            if llm:
                try:
                    # Prepare prompt for the LLM to reformulate the answer
                    prompt = f"""
                    السؤال هو: {question}
                    
                    النص المتوفر هو:
                    {best_chunk}
                    
                    مهمتك هي:
                    1. الإجابة على السؤال بناءً على النص المتوفر فقط.
                    2. تقديم إجابة واضحة ومباشرة ومختصرة.
                    3. عدم إضافة أي معلومات ليست موجودة في النص.
                    4. إذا لم تجد إجابة في النص، قل "لم أجد إجابة لهذا السؤال في النص المتوفر".
                    
                    الإجابة:
                    """
                    
                    # Generate response using LLM
                    from langchain.schema.messages import HumanMessage
                    response = llm.invoke([HumanMessage(content=prompt)])
                    
                    # Extract only the generated answer from response
                    answer_text = response.content
                    
                    # Clean up the answer
                    answer_text = answer_text.strip()
                    
                    # If answer is empty or too short, fall back to rule-based
                    if not answer_text or len(answer_text) < 10:
                        raise Exception("LLM returned empty or too short response")
                        
                    return answer_text
                    
                except Exception as e:
                    logger.error(f"Error using LLM for answer reformulation: {e}")
                    # Fall back to rule-based reformulation
            
            # Rule-based reformulation if LLM isn't available or failed
            # Find the most relevant sentences in the best chunk
            sentences = re.split(r'[.!?؟،\n]+', best_chunk)
            relevant_sentences = []
            
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                    
                # Check if sentence contains any keywords
                for keyword in question_words:
                    if keyword in sentence:
                        relevant_sentences.append(sentence)
                        break
            
            # Combine relevant sentences into a concise answer
            if relevant_sentences:
                # Use only top 2 most relevant sentences to keep it concise
                return " ".join(relevant_sentences[:2])
            else:
                # If no specific sentences found, return the beginning of the best chunk
                return best_chunk[:250] + "..."
        
        # If no relevant chunks found
        return get_response_template(lang_code, 'no_answer')
    
    # Check for common Islamic topics in the question
    for key, answer in COMMON_ISLAMIC_QA.items():
        if key in question:
            return answer
    
    # Check for greetings
    if any(greeting in question_lower for greeting in ["سلام", "مرحبا", "أهلا", "صباح", "مساء"]):
        return "وعليكم السلام ورحمة الله وبركاته. كيف يمكنني مساعدتك اليوم؟"
    
    # Generic response for Islamic questions
    if any(term in question_lower for term in ["إسلام", "قرآن", "حديث", "سنة", "شريعة", "فقه", "عبادة", "صلاة", "صوم", "زكاة", "حج"]):
        return """
        هذا سؤال مهم في الإسلام. لتقديم إجابة دقيقة وشاملة، أحتاج إلى مزيد من المعلومات أو تحديد أكثر للسؤال.
        
        يمكنك إعادة صياغة السؤال بشكل أكثر تحديداً، أو طرح سؤال آخر يتعلق بموضوع محدد في الإسلام.
        """
    
    # Default response
    return """
    عذراً، لا يمكنني الإجابة على هذا السؤال حالياً. يرجى طرح سؤال آخر متعلق بالإسلام أو إعادة صياغة سؤالك بطريقة أخرى.
    
    يمكنك سؤالي عن أركان الإسلام، أركان الإيمان، الصلوات الخمس، الوضوء، أو مواضيع إسلامية أخرى.
    """

def ask_question_with_video_auto(question: str) -> str:
    """
    Ask a question about a video automatically detecting the video ID.
    
    Args:
        question: The question to answer
        
    Returns:
        Answer to the question
    """
    try:
        # Use the general question answering function with RAG
        return ask_question_with_rag(question)
    except Exception as e:
        logger.error(f"General error in ask_question_with_video_auto: {e}")
        return """
        عذراً، لم أتمكن من فهم سؤالك. يرجى إعادة صياغة السؤال أو طرح سؤال آخر.
        """

def get_translated_answer_with_context(question: str, transcription_id: str = None) -> str:
    """
    Get an answer to a question with context from a transcription.
    
    Args:
        question: The question to answer
        transcription_id: ID of the transcription to use as context
        
    Returns:
        Translated answer with context
    """
    try:
        # Log the question being asked
        logger.info(f"Processing question with transcription ID {transcription_id}: {question}")
        
        # Load the transcription from file
        transcription = ""
        if transcription_id:
            transcription_file = f"chroma_transcriptions/{transcription_id}.txt"
            
            if os.path.exists(transcription_file):
                # Try multiple encodings to read the file
                encodings_to_try = ["utf-8", "latin-1", "cp1256", "utf-16"]
                read_success = False
                
                for encoding in encodings_to_try:
                    try:
                        with open(transcription_file, "r", encoding=encoding) as f:
                            transcription = f.read()
                            logger.info(f"Successfully read transcription file with encoding: {encoding}")
                            read_success = True
                            break
                    except Exception as file_error:
                        logger.warning(f"Failed to read with encoding {encoding}: {file_error}")
                
                if not read_success:
                    logger.error("All encoding attempts failed for transcription file")
                    # Use fallback without context
                    return get_fallback_answer(question)
            else:
                logger.error(f"Transcription file not found: {transcription_file}")
                # Use fallback without context
                return get_fallback_answer(question, "")
            
            # Log transcription details
            logger.info(f"Transcription length: {len(transcription)} characters")
            if len(transcription) > 2000:
                logger.info(f"First 2000 chars of transcription: {transcription[:2000]}...")
            else:
                logger.info(f"Full transcription: {transcription}")
        
        if not transcription or len(transcription.strip()) < 20:
            logger.warning("Transcription is empty or too short")
            # Use fallback without context
            return get_fallback_answer(question, "")
        
        # Create a log entry for this question
        try:
            os.makedirs("logs", exist_ok=True)
            with open("logs/qa_logs.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"--- {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---\n")
                log_file.write(f"Question: {question}\n")
                log_file.write(f"Transcription ID: {transcription_id}\n")
                log_file.write(f"Transcription length: {len(transcription)} characters\n")
        except Exception as log_error:
            logger.warning(f"Failed to write to log file: {log_error}")
            
        # Build context from vector store using our new retrieval system
        context = transcription
        original_context_length = len(context)
        logger.debug(f"Original full transcription length: {original_context_length} characters")
        
        if transcription_id:
            logger.debug(f"Attempting to retrieve relevant passages for transcription_id: {transcription_id}")
            retrieved = retrieve_passages(question, transcription_id, k=5)
            if retrieved:
                logger.debug(f"Successfully retrieved {len(retrieved)} characters of focused context")
                context = retrieved
                logger.debug(f"Context reduction: {original_context_length} → {len(context)} chars ({(len(context)/max(1, original_context_length))*100:.1f}%)")
            else:
                logger.debug("No relevant passages retrieved, falling back to full transcription")
        else:
            logger.debug("No transcription_id provided, using full transcription as context")
        
        # Use the ask_question_with_rag function with the retrieved context
        try:
            logger.debug(f"Sending question to LLM with {len(context)} chars of context")
            answer = ask_question_with_rag(question, context)
            logger.debug(f"Received answer from LLM ({len(answer)} chars)")
            logger.info(f"Generated answer for question: '{question[:50]}...'")
            logger.debug(f"Answer preview: '{answer[:100]}...'" if len(answer) > 100 else f"Answer: '{answer}'")

            
            # Log the answer
            try:
                with open("logs/qa_logs.txt", "a", encoding="utf-8") as log_file:
                    log_file.write(f"Answer: {answer}\n\n")
            except Exception as log_error:
                logger.warning(f"Failed to write answer to log file: {log_error}")
                
            return answer
        except Exception as rag_error:
            logger.error(f"Error in ask_question_with_rag: {rag_error}")
            # Use fallback with context
            return get_fallback_answer(question, transcription)
            
    except Exception as e:
        logger.error(f"Error getting answer with context: {e}")
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Traceback: {error_trace}")
        
        # Log the error
        try:
            os.makedirs("logs", exist_ok=True)
            with open("logs/error_logs.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"--- {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---\n")
                log_file.write(f"Question: {question}\n")
                log_file.write(f"Transcription ID: {transcription_id}\n")
                log_file.write(f"Error: {str(e)}\n")
                log_file.write(f"Traceback: {error_trace}\n\n")
        except:
            pass
        
        # Always return an answer, even if there's an error
        return get_fallback_answer(question)

def get_last_transcription_preview():
    """
    Get a preview of the last transcription.
    
    Returns:
        Preview of the last transcription
    """
    return "بسم الله الرحمن الرحيم، الحمد لله رب العالمين..."

def ask_from_transcription(question: str, transcription: str):
    """
    Ask a question from a transcription.
    
    Args:
        question: The question to answer
        transcription: The transcription text
        
    Returns:
        Answer to the question
    """
    return ask_question_with_rag(question, transcription)

def vectorize_transcription_with_ollama(transcription: str) -> str:
    """
    Vectorize a transcription with Ollama.
    
    Args:
        transcription: The transcription text
        
    Returns:
        Transcription ID
    """
    return vectorize_transcription_with_chroma(transcription)
