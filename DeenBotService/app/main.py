from fastapi import FastAPI, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
import os
import logging
from datetime import datetime

# Import your existing routes
from app.api.v1.moufti_routes import router as moufti_router
from app.api.v1.media_routes import router as media_router
from app.api.v1.youtube_routes import router as youtube_router
from app.api.v1.chat_routes import router as chat_router
from app.api.v1.auth_routes import router as auth_router
from pydantic import BaseModel # Added for GenerateTitleRequest
from app.dependencies.fatwallm_rag import ask_question_with_video_auto

# Import database for initialization
from app.database import engine, Base

# Load environment variables
from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="DeenBot API",
    description="DeenBot API with Authentication",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Custom middleware for large requests
from starlette.middleware.base import BaseHTTPMiddleware

class LargeRequestMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Increase the maximum size limit for the request body
        request._body_size_limit = 1024 * 1024 * 1024 * 2  # 2GB (increased for longer videos)
        response = await call_next(request)
        return response

app.add_middleware(LargeRequestMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.100.164:3000",
        "http://localhost:3002",
        "http://192.168.100.164:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(moufti_router, prefix="/api/v1")
app.include_router(media_router)
app.include_router(youtube_router, prefix="/api/v1/media", tags=["youtube"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])

# Startup event to create database tables
@app.on_event("startup")
async def startup_db_client():
    """Create database tables on startup if they don't exist."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

# Add direct fatwaask endpoint for backward compatibility
@app.post("/fatwaask")
async def fatwaask_endpoint(
    request: Request,
    question: str = Body(...),
    video_id: str = Body(...),
):
    """
    Process a fatwa question and return an answer.
    Direct endpoint for backward compatibility with frontend.
    """
    try:
        logger.info(f"Received question: {question}")
        answer = ask_question_with_video_auto(question)
        
        if not answer or len(answer.strip()) < 5:
            answer = "عذراً، لم أتمكن من الإجابة على سؤالك. يرجى إعادة صياغة السؤال أو طرح سؤال آخر."
            
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Error in fatwaask_endpoint: {str(e)}")
        return {"answer": "عذراً، حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى بعد قليل."}

# Custom middleware for proper UTF-8 encoding
@app.middleware("http")
async def arabic_encoding_middleware(request, call_next):
    response = await call_next(request)
    if not isinstance(response, StreamingResponse) and hasattr(response, 'body') and response.body:
        try:
            body = response.body.decode('utf-8') if isinstance(response.body, bytes) else response.body
            return Response(content=body, media_type="application/json; charset=utf-8")
        except Exception as e:
            logger.error(f"Encoding middleware error: {e}")
    return response


# Generate Title endpoint (restored from memory 547a7a5c-9e31-455e-ac44-a4be26881540)
class GenerateTitleRequest(BaseModel):
    user_message: str
    assistant_response: str

@app.post("/generate-title")
async def generate_title_endpoint(request_data: GenerateTitleRequest):
    # Generate title from the first 5 words of the user_message
    title_words = request_data.user_message.split()[:5]
    title = " ".join(title_words)
    if not title.strip(): # Ensure title is not just whitespace or empty
        # Fallback if user_message is empty or very short
        # Use first few words of assistant_response if available and user_message was not useful
        if request_data.assistant_response:
            assistant_title_words = request_data.assistant_response.split()[:5]
            title = " ".join(assistant_title_words)
        if not title.strip(): # If still no title (e.g. both messages empty)
            title = "New Chat" 
    return {"title": title}
# End of Generate Title endpoint

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to DeenBot API", "status": "running", "version": "1.0.0"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="localhost",
        port=8006, 
        reload=True,
        timeout_keep_alive=1800,  # Increased to 30 minutes for longer videos
        h11_max_incomplete_event_size=1024*1024*1024*2,  # 2GB
        workers=1,
        limit_concurrency=10,
        limit_max_requests=25000
    )