import os
import logging
from typing import Optional
from langchain.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain.schema.output_parser import StrOutputParser
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if Groq API key is set
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

def extract_topic_from_transcription(transcription: str, lang: str = "ar") -> str:
    """
    Generate an intelligent, concise title from a video transcription.
    
    Args:
        transcription: The text transcription of the video
        lang: Language code (ar for Arabic, en for English)
    
    Returns:
        A concise, descriptive title for the video
    """
    # Truncate transcription if too long (limit to ~2000 chars to save tokens)
    max_length = 2000
    if len(transcription) > max_length:
        text_for_analysis = transcription[:max_length] + "..."
    else:
        text_for_analysis = transcription
        
    try:
        # If Groq API key is available, use it for better titles
        if GROQ_API_KEY:
            # Create a prompt for title generation
            if lang == "ar":
                system_prompt = """
                أنت خبير في تلخيص وتحليل النصوص الإسلامية. مهمتك هي استخلاص الموضوع الرئيسي من النص التالي وتقديمه كعنوان دقيق وموجز.
                - يجب أن يكون العنوان بين 5 و 8 كلمات.
                - يجب أن يعكس العنوان جوهر المحتوى بدقة، مع التركيز على المصطلحات والمفاهيم الأساسية المذكورة.
                - تجنب أي إضافات غير ضرورية مثل الرموز التعبيرية أو علامات الترقيم الزائدة.
                - يجب أن يكون العنوان باللغة العربية الفصحى.
                """
                human_prompt = """
                النص التالي هو تفريغ لمحاضرة أو درس إسلامي. الرجاء إنشاء عنوان مناسب ومختصر له:
                
                {transcription}
                
                الرجاء تقديم العنوان فقط بدون أقواس أو علامات ترقيم إضافية.
                """
            else:
                system_prompt = """
                You are an expert in summarizing and analyzing Islamic texts. Your task is to extract the main topic from the following text and present it as an accurate and concise title.
                - The title must be between 5 and 8 words.
                - The title must accurately reflect the essence of the content, focusing on the key terms and concepts mentioned.
                - Avoid any unnecessary additions like emojis or extra punctuation.
                - The title must be in formal English.
                """
                human_prompt = """
                The following text is a transcript of an Islamic lecture or lesson. Please create a suitable and concise title for it:
                
                {transcription}
                
                Please provide only the title without any brackets or additional punctuation.
                """
                
            # Create the prompt template
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("human", human_prompt),
            ])
            
            # Initialize the model - using Groq's LLM-J model which is great for multilingual content
            model = ChatGroq(model_name="llama3-70b-8192", temperature=0.3)
            
            # Create the chain
            chain = prompt | model | StrOutputParser()
            
            # Execute the chain
            title = chain.invoke({"transcription": text_for_analysis})
            
            # Clean up the title
            title = title.strip().strip('"').strip("'").strip()            
            logger.info(f"Generated title using AI: {title}")
            return title
            
        # Fallback method if no API key
        else:
            # Extract the first line that has meaningful content
            lines = [line.strip() for line in text_for_analysis.split('\n') if line.strip()]
            if lines:
                first_line = lines[0]
                # Truncate to a reasonable title length
                if len(first_line) > 50:
                    title = first_line[:47] + "..."
                else:
                    title = first_line
                    
                logger.info(f"Generated title using first line: {title}")
                return title
            
            # Extract first sentence as fallback
            sentences = re.split(r'[.!?]', text_for_analysis)
            first_sentence = sentences[0].strip()
            if first_sentence:
                if len(first_sentence) > 50:
                    title = first_sentence[:47] + "..."
                else:
                    title = first_sentence
                    
                logger.info(f"Generated title using first sentence: {title}")
                return title
            
            # Last resort fallback
            if lang == "ar":
                return "درس إسلامي من يوتيوب"
            else:
                return "Islamic lesson from YouTube"
            
    except Exception as e:
        logger.error(f"Error generating title: {e}")
        # Fallback title
        if lang == "ar":
            return "درس إسلامي من يوتيوب"
        else:
            return "Islamic lesson from YouTube"
