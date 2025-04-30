from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain.prompts import ChatPromptTemplate
from operator import itemgetter
import os
import whisper 
from pytube import YouTube
import tempfile
import yt_dlp

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import FAISS, Chroma
from langchain.embeddings import OpenAIEmbeddings, HuggingFaceEmbeddings
from langchain_community.embeddings import OllamaEmbeddings
from langchain.schema.runnable import RunnablePassthrough
from dotenv import load_dotenv
from sqlalchemy import insert

import re


load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")

client = ChatGroq(temperature=0, groq_api_key=groq_api_key, model_name="deepseek-r1-distill-llama-70b")

def get_llm_client(context, question):
    parser = StrOutputParser()
    prompt = ChatPromptTemplate.from_template(
        """
        Answer the question based on the context below. If you can't 
        answer the question, reply "I don't know".

        Context: {context}

        Question: {question}
        """
    )
    prompt.format(context=context, question=question)
    chain = prompt | client | parser
    return chain

# Traduction avec le modèle LLM via prompt
translation_prompt = ChatPromptTemplate.from_template("Translate {answer} to {language}")

def translate_answer(answer: str, language: str):
    parser = StrOutputParser()
    chain = translation_prompt | client | parser
    return chain.invoke({"answer": answer, "language": language})

def get_translated_answer_with_context(context: str, question: str, language: str):
    parser = StrOutputParser()
    prompt = ChatPromptTemplate.from_template(
        """
        Answer the question based on the context below. If you can't 
        answer the question, reply "I don't know".
        
        Context: {context}
        Question: {question}
        """
    )
    base_chain = prompt | client | parser
    translation_chain = (
        {"answer": base_chain, "language": itemgetter("language")}
        | translation_prompt
        | client
        | parser
    )
    return translation_chain.invoke({"context": context, "question": question, "language": language})

def transcribe_uploaded_audio(file_path: str, model_size="base") -> str:
    whisper_model = whisper.load_model(model_size)
    result = whisper_model.transcribe(file_path, fp16=False)
    transcription = result["text"].strip()
    with open("transcription.txt", "w", encoding="utf-8") as f:
        f.write(transcription)
    return transcription

def get_last_transcription_preview(n_chars: int = 100) -> str:
    try:
        with open("transcription.txt", "r", encoding="utf-8") as f:
            return f.read()[:n_chars]
    except FileNotFoundError:
        return "Aucune transcription disponible."

def ask_from_transcription(question: str) -> str:
    try:
        with open("transcription.txt", "r", encoding="utf-8") as f:
            context = f.read()[:5000]
    except FileNotFoundError:
        return "Aucune transcription disponible."
    prompt = ChatPromptTemplate.from_template("""
        Answer the question based on the context below. 
        If you can't answer it, say 'I Don't know'.

        Context: {context}
        Question: {question}
        """)
    parser = StrOutputParser()
    chain = prompt | client | parser
    return chain.invoke({"context": context, "question": question})

def load_transcription_as_documents():
    try:
        return TextLoader("transcription.txt", encoding="utf-8").load()
    except FileNotFoundError:
        return []

def split_transcription_into_chunks(chunk_size=1000, overlap=20):
    try:
        docs = TextLoader("transcription.txt", encoding="utf-8").load()
        return RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap).split_documents(docs)
    except FileNotFoundError:
        return []

def vectorize_transcription():
    chunks = split_transcription_into_chunks()
    if not chunks:
        return "Aucune transcription à vectoriser."
    db = FAISS.from_documents(chunks, OpenAIEmbeddings())
    db.save_local("faiss_index")
    return f"{len(chunks)} chunks vectorisés dans FAISS."

def vectorize_transcription_with_chroma():
    chunks = split_transcription_into_chunks()
    if not chunks:
        return "Aucune transcription trouvée."
    db = Chroma.from_documents(chunks, HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"), persist_directory="chroma_index")
    db.persist()
    return f"{len(chunks)} chunks vectorisés dans Chroma."

def vectorize_transcription_with_ollama(video_id="default"):
    chunks = split_transcription_into_chunks()
    if not chunks:
        return "Aucune transcription trouvée."
    persist_directory = f"chroma_index_ollama_{video_id}"
    db = Chroma.from_documents(chunks, OllamaEmbeddings(model='nomic-embed-text'), persist_directory=persist_directory)
    db.persist()
    return f"{len(chunks)} chunks vectorisés dans Chroma pour {video_id}."

def ask_question_with_rag(question: str, video_id: str = "default") -> str:
    embedding = OllamaEmbeddings(model="nomic-embed-text")
    persist_directory = f"./chroma_index_ollama_{video_id}"
    vectorstore = Chroma(persist_directory=persist_directory, embedding_function=embedding)
    retriever = vectorstore.as_retriever()
    chat = ChatGroq(temperature=0, groq_api_key=groq_api_key, model_name="deepseek-r1-distill-llama-70b")
    prompt = ChatPromptTemplate.from_template("""
أجب على السؤال التالي فقط باستخدام السياق المقدم، وبلغة عربية فصحى واضحة.
يُمنع تمامًا تقديم مقدمات، أو شرح داخلي، أو تعليقات. لا تستخدم "<think>", ولا أي لغة أخرى غير العربية.

السياق:
{context}

السؤال:
{question}

الإجابة:
""")
    chain = ( {"context": retriever, "question": RunnablePassthrough()} | prompt | chat | StrOutputParser() )
    result = chain.invoke(question)
    if "<think>" in result:
        result = result.split("</think>")[-1].strip()
    return re.sub(r'[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s.,:؛؟!-]', '', result).strip()

# Inside your `fatwallm_rag.py`



def detect_video_id_from_question(question: str) -> str:
    """
    Dummy function to detect video ID from question.
    Replace with real logic: similarity check, keyword search, etc.
    """
    if "الهند" in question or "علماء الهند" in question:
        return "MS7_R5fycl4"
    # Default fallback video id
    return "default"


def ask_question_with_video_auto(question: str) -> str:
    """
    Automatically detects video ID from the question and answers based on related transcription context.
    """
    # Step 1: Detect the video context ID
    video_id = detect_video_id_from_question(question)
    persist_directory = f"chroma_index_ollama_{video_id}"

    # Step 2: Prepare Chroma retriever
    embedding = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = Chroma(persist_directory=persist_directory, embedding_function=embedding)
    retriever = vectorstore.as_retriever()

    # Step 3: Setup Groq client + Arabic prompt
    groq_api_key = os.getenv("GROQ_API_KEY")
    chat = ChatGroq(temperature=0, groq_api_key=groq_api_key, model_name="deepseek-r1-distill-llama-70b")

    prompt = ChatPromptTemplate.from_template(
        """
أجب على السؤال التالي فقط باستخدام السياق المقدم، وبلغة عربية فصحى واضحة.
يُمنع تمامًا تقديم مقدمات، أو شرح داخلي، أو تعليقات. لا تستخدم "<think>", ولا أي لغة أخرى غير العربية.

السياق:
{context}

السؤال:
{question}

الإجابة:
"""
    )

    # Step 4: Assemble chain
    chain = (
        {"context": retriever, "question": RunnablePassthrough()} |
        prompt |
        chat |
        StrOutputParser()
    )

    # Step 5: Run + Clean output
    result = chain.invoke(question)
    if "<think>" in result:
        result = result.split("</think>")[-1].strip()

    result = re.sub(r"[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s.,:؛؟!-]", "", result)
    return result.strip()



async def log_question_answer(question: str, answer: str):
    query = "INSERT INTO question_history (question, answer) VALUES (:question, :answer)"
    # Removed database.execute(query=query, values={"question": question, "answer": answer})

async def log_question_history(user_id: str, video_id: str, question: str, answer: str):
    query = insert("question_history").values(
        user_id=user_id,
        video_id=video_id,
        question=question,
        answer=answer,
        timestamp=datetime.utcnow()
    )
    # Removed database.execute(query)

from sqlalchemy import text
from datetime import datetime

async def save_question_to_history(question: str, answer: str, user_id: str, video_id: str):

    query = """

        INSERT INTO question_history (question, answer, user_id, video_id, created_at)

        VALUES (:question, :answer, :user_id, :video_id, :created_at)

    """

    values = {

        "question": question,

        "answer": answer,

        "user_id": user_id,

        "video_id": video_id,

        "created_at": datetime.utcnow()

    }
    # Removed database.execute(query=query, values=values)