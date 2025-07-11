from pydantic import BaseModel


class QueryRequest(BaseModel):
    query: str
    lat: float = 34.0231865  # Default: NYC
    lng: float = -6.8274907


class RagQueryRequest(BaseModel):
    question: str
    context : str

class TranslateRequest(BaseModel):
    answer: str
    language: str
    
class TranslatedQueryRequest(BaseModel):
    context: str
    question: str
    language: str

class YouTubeTranscriptionRequest(BaseModel):
    youtube_url: str
    model_size: str = "base"

class AskFromTranscriptRequest(BaseModel):
    question: str

class AskRAGRequest(BaseModel):
    question: str
    video_id: str 


class VectorizeOllamaRequest(BaseModel):

    video_id: str

class QuestionHistoryCreate(BaseModel):
    question: str
    answer: str