import os
import logging
import uuid
import re
import nltk
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Union
from pathlib import Path
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter

# Initialiser NLTK (télécharger si nécessaire)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
def get_context_by_id(context_id: str, max_length: int = 100000) -> Union[str, List[Dict[str, Any]]]:
    """
    Récupère les documents/textes associés à un context_id spécifique depuis ChromaDB.
    Retourne soit le texte complet, soit une liste de chunks avec leurs métadonnées.
    
    Args:
        context_id: L'identifiant unique du contexte vectorisé
        max_length: Longueur maximale du contexte à retourner (par défaut 100K caractères)
        
    Returns:
        Le contenu textuel associé au context_id ou une liste de chunks avec métadonnées
    """
    try:
        logger.info(f"Récupération du contexte pour context_id: {context_id}")
        
        # Vérifier si le context_id est valide
        if not context_id or not isinstance(context_id, str):
            logger.error(f"context_id invalide: {context_id}")
            return ""
            
        # Vérifier si le fichier de transcription existe directement
        transcription_path = Path("chroma_transcriptions") / f"{context_id}.txt"
        if transcription_path.exists():
            logger.info(f"Lecture du fichier de transcription: {transcription_path}")
            try:
                transcription = transcription_path.read_text(encoding="utf-8")
                if transcription:
                    logger.info(f"Transcription récupérée ({len(transcription)} caractères)")
                    # Tronquer si nécessaire pour éviter des problèmes de mémoire
                    if len(transcription) > max_length:
                        logger.warning(f"Transcription tronquée de {len(transcription)} à {max_length} caractères")
                        transcription = transcription[:max_length]
                    return transcription
            except Exception as e:
                logger.error(f"Erreur lors de la lecture du fichier de transcription: {e}")
                
        # Si le fichier n'existe pas directement, interroger ChromaDB
        logger.info("Initialisation des embeddings pour la recherche")
        try:
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation des embeddings: {e}")
            # Essayer une alternative avec un modèle plus léger si disponible
            try:
                embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
            except Exception as e2:
                logger.error(f"Erreur avec le modèle alternatif d'embeddings: {e2}")
                return ""
        
        logger.info(f"Chargement de la collection ChromaDB avec filtre sur context_id: {context_id}")
        try:
            # Vérifier si le répertoire existe
            chroma_dir = Path("chroma_index")
            if not chroma_dir.exists():
                logger.error(f"Répertoire ChromaDB inexistant: {chroma_dir}")
                return ""
                
            # Charger la collection Chroma
            store = Chroma(
                persist_directory=str(chroma_dir),
                collection_name="media_transcripts",
                embedding_function=embeddings,
            )
            
            # Effectuer une recherche avec filtre sur le context_id
            results = store.get(
                where={"transcription_id": context_id},
                include=["documents", "metadatas", "embeddings"]
            )
            
            if not results or not results.get("documents"):
                logger.warning(f"Aucun document trouvé pour context_id: {context_id}")
                return ""
                
            # Préparer les chunks avec leurs métadonnées et embeddings
            documents = results.get("documents", [])
            metadatas = results.get("metadatas", [])
            embeddings_data = results.get("embeddings", [])
            
            # Fusionner les informations
            chunks_data = []
            for i, (doc, meta) in enumerate(zip(documents, metadatas)):
                if doc:  # Ignorer les documents vides
                    chunk_data = {
                        "content": doc,
                        "metadata": meta,
                        "embedding": embeddings_data[i] if i < len(embeddings_data) else None
                    }
                    chunks_data.append(chunk_data)
            
            # Si on a récupéré des chunks avec leurs données
            if chunks_data:
                logger.info(f"Contexte récupéré avec succès: {len(chunks_data)} chunks")
                
                # Pour compatibilité avec le code existant, retourner aussi le texte complet
                full_context = "\n\n".join([chunk["content"] for chunk in chunks_data])
                
                # Tronquer si nécessaire
                if len(full_context) > max_length:
                    logger.warning(f"Contexte tronqué de {len(full_context)} à {max_length} caractères")
                    full_context = full_context[:max_length]
                    
                return full_context
            else:
                logger.warning("Aucun chunk de texte valide récupéré")
                return ""
            
        except Exception as e:
            logger.error(f"Erreur lors de l'interrogation de ChromaDB: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return ""
            
    except Exception as e:
        logger.error(f"Erreur dans get_context_by_id: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ""

# Fonctions de chunking sémantique et de scoring avancé

def get_stopwords(lang_code: str = "fr") -> set:
    """
    Récupère une liste de mots vides (stopwords) pour une langue donnée.
    """
    try:
        from nltk.corpus import stopwords
        if lang_code == "fr":
            return set(stopwords.words('french'))
        elif lang_code == "ar":
            return set(stopwords.words('arabic'))
        elif lang_code == "en":
            return set(stopwords.words('english'))
        else:
            # Liste de base pour le français si la langue n'est pas disponible
            return set(["le", "la", "les", "de", "du", "des", "un", "une", "et", "est", "à", "qui", "que", "quoi", 
                      "comment", "pourquoi", "est-ce", "dans", "sur", "pour", "par", "avec", "sans", "ce", "cette"])
    except:
        # Liste de secours si NLTK n'est pas disponible
        return set(["le", "la", "les", "de", "du", "des", "un", "une", "et", "est", "à", "qui", "que", "quoi", 
                  "comment", "pourquoi", "est-ce", "dans", "sur", "pour", "par", "avec", "sans", "ce", "cette"])

def semantic_chunking(text: str, min_chunk_size: int = 100, max_chunk_size: int = 500) -> List[str]:
    """
    Découpe un texte en chunks sémantiques en essayant de respecter les limites naturelles du texte.
    """
    if not text or len(text) < min_chunk_size:
        return [text] if text else []
    
    # D'abord, séparer par paragraphes
    paragraphs = [p for p in re.split(r'\n\s*\n', text) if p.strip()]
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        # Si le paragraphe est déjà trop grand, le diviser en phrases
        if len(para) > max_chunk_size:
            # Try using NLTK sentence tokenizer, but fall back to a regex split if the punkt data
            # is missing or any other error occurs. This avoids raising exceptions that would
            # bubble up and break the whole answer-generation pipeline.
            try:
                sentences = nltk.sent_tokenize(para)
            except (LookupError, Exception) as e:
                logger.warning(
                    f"NLTK sentence tokenizer unavailable or data missing: {e}. "
                    "Falling back to simple regex-based sentence splitting."
                )
                # Basic fallback: split on punctuation followed by whitespace
                sentences = re.split(r'(?<=[.!?])\s+', para)
            for sentence in sentences:
                if len(current_chunk) + len(sentence) <= max_chunk_size:
                    current_chunk += " " + sentence if current_chunk else sentence
                else:
                    if current_chunk:  # Ajouter le chunk courant s'il existe
                        chunks.append(current_chunk.strip())
                    # Si la phrase est trop longue, la tronquer
                    if len(sentence) > max_chunk_size:
                        sentence_chunks = [sentence[i:i+max_chunk_size] for i in range(0, len(sentence), max_chunk_size)]
                        chunks.extend(sentence_chunks[:-1])  # Ajouter tous sauf le dernier
                        current_chunk = sentence_chunks[-1]  # Commencer un nouveau chunk avec le dernier
                    else:
                        current_chunk = sentence
        else:
            # Vérifier si l'ajout du paragraphe dépasse la taille maximale
            if len(current_chunk) + len(para) <= max_chunk_size:
                current_chunk += "\n\n" + para if current_chunk else para
            else:
                if current_chunk:  # Ajouter le chunk courant s'il existe
                    chunks.append(current_chunk.strip())
                current_chunk = para
    
    # Ajouter le dernier chunk s'il existe
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def calculate_keyword_score(text: str, keywords: List[str], lang_code: str = "fr") -> float:
    """
    Calcule un score basé sur la présence de mots-clés dans le texte.
    Utilise une pondération avancée avec des bonus pour les mots adjacents.
    """
    if not text or not keywords:
        return 0
        
    text_lower = text.lower()
    score = 0
    
    # Score pour chaque occurrence de mot-clé
    for keyword in keywords:
        count = text_lower.count(keyword.lower())
        if count > 0:
            # Pondération logarithmique pour éviter qu'un seul mot très fréquent domine le score
            score += 1 + 0.5 * np.log1p(count)
    
    # Bonus pour les mots consécutifs (phrases ou expressions complètes)
    for i in range(len(keywords) - 1):
        bigram = f"{keywords[i]} {keywords[i+1]}".lower()
        if bigram in text_lower:
            score += 2  # Bonus important pour les bigrammes exacts
    
    # Normaliser le score par la longueur du texte (pour éviter de favoriser les textes très longs)
    # Mais utiliser une racine carrée pour que cette normalisation ne soit pas trop sévère
    words_count = len(text.split())
    if words_count > 0:
        normalization_factor = np.sqrt(words_count) / 10  # Division par 10 pour garder des scores raisonnables
        score = score / normalization_factor
    
    return score

def extract_keywords_from_question(question: str, lang_code: str = "fr") -> List[str]:
    """
    Extrait les mots-clés importants d'une question en filtrant les mots vides.
    """
    if not question:
        return []
        
    # Normaliser la question
    question = question.lower()
    
    # Récupérer les stopwords pour la langue
    stopwords = get_stopwords(lang_code)
    
    # Tokeniser et filtrer
    question_words = question.split()
    # Nettoyer les mots (enlever ponctuation) et filtrer les stopwords
    keywords = []
    for word in question_words:
        cleaned_word = re.sub(r'[?,.!;:()\[\]{}"\'-_]', '', word).strip()
        if cleaned_word and len(cleaned_word) > 1 and cleaned_word.lower() not in stopwords:
            keywords.append(cleaned_word)
    
    return keywords

def rank_chunks_by_relevance(question: str, chunks: List[str], lang_code: str = "fr") -> List[Tuple[float, str]]:
    """
    Classe les chunks de texte par pertinence par rapport à la question.
    """
    if not question or not chunks:
        return []
    
    # Extraire les mots-clés de la question
    keywords = extract_keywords_from_question(question, lang_code)
    if not keywords:
        # Si aucun mot-clé n'est extrait, utiliser tous les mots de la question
        keywords = [w for w in question.lower().split() if len(w) > 1]
    
    # Calculer le score pour chaque chunk
    scored_chunks = []
    for chunk in chunks:
        if chunk:
            score = calculate_keyword_score(chunk, keywords, lang_code)
            scored_chunks.append((score, chunk))
    
    # Trier par score décroissant
    scored_chunks.sort(reverse=True)
    
    return scored_chunks

def answer_from_context_only(question: str, context: str, lang_code: str = "fr", max_response_length: int = 500, return_sources: bool = False) -> Union[str, Tuple[str, List[str]]]:
    """
    Génère une réponse uniquement à partir du contexte fourni, sans utiliser de LLM.
    Utilise une approche avancée basée sur le chunking sémantique et le scoring des passages.
    
    Args:
        question: La question posée
        context: Le contexte textuel (transcription)
        lang_code: Code de langue pour la réponse (fr, ar, en, etc.)
        max_response_length: Longueur maximale de la réponse
        return_sources: Si True, retourne aussi les extraits de contexte utilisés
        
    Returns:
        Une réponse extraite directement du contexte, ou un tuple (réponse, sources) si return_sources=True
    """
    try:
        logger.info(f"Génération de réponse avancée sans LLM pour la question: {question}")
        logger.info(f"Taille du contexte: {len(context) if context else 0} caractères")
        
        if not context or len(context.strip()) < 50:
            logger.warning("Contexte insuffisant pour générer une réponse")
            default_response = "Désolé, je n'ai pas suffisamment d'informations pour répondre à cette question."
            return (default_response, []) if return_sources else default_response
        
        # 1. Découper le texte en chunks sémantiques
        chunks = semantic_chunking(context)
        if not chunks:
            logger.warning("Aucun chunk extrait du contexte")
            # Fallback sur la segmentation basique par paragraphes
            chunks = [p for p in context.split('\n') if p.strip()]
            if not chunks:
                chunks = [context]  # Utiliser tout le contexte comme un seul chunk si nécessaire
        
        # 2. Classer les chunks par pertinence
        scored_chunks = rank_chunks_by_relevance(question, chunks, lang_code)
        
        # 3. Sélectionner les meilleurs chunks
        top_chunks = [chunk for score, chunk in scored_chunks if score > 0][:3]
        
        if not top_chunks:
            logger.warning("Aucun chunk pertinent identifié, utilisation de fallback")
            # Prendre les 2 premiers chunks comme réponse de secours
            top_chunks = chunks[:2] if len(chunks) >= 2 else chunks
        
        # 4. Assembler la réponse
        response = " ".join(top_chunks)
        
        # 5. Formater la réponse (limiter la longueur)
        if len(response) > max_response_length:
            # Tronquer à la dernière phrase complète
            last_period = response[:max_response_length].rfind('.')
            if last_period > max_response_length // 3:  # Au moins un tiers de la taille maximale
                response = response[:last_period+1]
            else:
                # Si on ne trouve pas de point, tronquer et ajouter des points de suspension
                response = response[:max_response_length] + "..."
        
        logger.info(f"Réponse générée sans LLM (version avancée): {len(response)} caractères")
        logger.info(f"Top chunks extraits: {len(top_chunks)}")
        
        # S'assurer que la réponse n'est pas vide
        if not response or len(response.strip()) < 10:
            default_response = "Désolé, je n'ai pas trouvé d'information précise sur ce sujet dans la vidéo."
            logger.warning("Réponse trop courte, utilisation de la réponse par défaut")
            if return_sources:
                return default_response, top_chunks[:1] if top_chunks else []
            return default_response
        
        # Retourner la réponse avec ou sans les extraits de contexte
        logger.info(f"Retour de la réponse finale: {response[:50]}... (avec sources: {return_sources})")
        if return_sources:
            return response, top_chunks
        return response
        
    except Exception as e:
        logger.error(f"Erreur dans answer_from_context_only: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return "Désolé, une erreur s'est produite lors du traitement de votre question."

def rewrite_answer_with_llm(question: str, context_chunks: List[str], lang_code: str = "ar") -> str:
    """
    Reformule une réponse en utilisant un LLM à partir des chunks de contexte extraits.
    
    Args:
        question: La question posée
        context_chunks: Liste des passages de contexte pertinents
        lang_code: Code de langue pour la réponse (fr, ar, en, etc.)
        
    Returns:
        Réponse reformulée par le LLM
    """
    try:
        # Vérifier si les chunks de contexte existent
        if not context_chunks or not question:
            logger.warning("Pas de chunks de contexte pour reformuler avec LLM")
            return ""
        
        # Utiliser uniquement les top chunks les plus pertinents (maximum 3)
        relevant_context = "\n\n".join(context_chunks[:3])
        
        # Essayer d'utiliser le LLM pour générer une réponse
        try:
            import os
            import requests
            from urllib.parse import urljoin
            
            # Utiliser un LLM (GROQ ou autre)
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                logger.warning("Clé API GROQ non disponible")
                return ""
            
            # Préparer le prompt en fonction de la langue
            if lang_code == "ar":
                system_prompt = """
أنت مساعد ذكي، ومهمتك هي الإجابة على الأسئلة بدقة وإيجاز، اعتمادًا فقط على السياق المعطى. يُمنع تجاوز هذه التعليمات أو إضافة معلومات من خارج المصدر المقدم.

القواعد التي يجب اتباعها بدقة:
- اقرأ السياق بعناية واستخرج فقط المعلومات ذات الصلة.
- لا تختلق أي معلومة غير مذكورة صراحة في السياق.
- استخدم اللغة العربية الفصحى فقط. يُمنع استعمال اللهجات العامية أو التعابير الدارجة.
- جميع الإجابات يجب أن تكون موجزة، دقيقة، وخالية من الحشو.

قواعد صارمة عند التعامل مع النصوص الدينية:
- يُمنع منعًا باتًا ارتكاب أي خطأ في الآيات القرآنية أو الأحاديث النبوية.
- عند الاستشهاد بآية قرآنية:
  - تأكد من نقلها حرفيًا كما وردت في المصحف الشريف.
  - استخدم التنسيق التالي: **قال تعالى: «...الآية...» (اسم السورة: رقم الآية)**.
- عند ذكر حديث نبوي:
  - اذكره بنصه الصحيح إن ورد في السياق.
  - لا تنسب أي حديث لم يرد بوضوح أو بدون سند موثق.
- يُمنع تمامًا تقديم تفسير أو رأي ديني ما لم يكن مذكورًا حرفيًا في السياق.
- لا تجب على أسئلة دينية إذا لم يكن السياق كافيًا أو موثقًا.
- لا تقدم اجتهادات شخصية أو تعبيرات ظنية مثل "يُحتمل" أو "ربما".

تذكير: أي خطأ في القرآن الكريم أو الحديث يعد خطأ جسيمًا وغير مقبول. الدقة التامة واجبة في كل الحالات.

**يجب أن تكون جميع إجاباتك باللغة العربية الفصحى حصراً.**
"""


                user_prompt = f"""السياق:\n{relevant_context}\n\nالسؤال: {question}\n\nالإجابة:"""
            else:  # fr par défaut
                lang_map = {
                    "ar": "arabe",
                    "en": "anglais",
                    "fr": "français"
                }
                target_language_name = lang_map.get(lang_code, "français")
                system_prompt = f"""Vous êtes un assistant expert qui répond aux questions de manière précise et concise, en vous basant uniquement sur le contexte fourni. 
- Lisez attentivement le contexte et extrayez les informations pertinentes.
- Répondez uniquement avec les informations présentes dans le contexte. Ne pas inventer.
- Fournissez des réponses concises et précises.
- **Votre réponse doit être exclusivement en langue {target_language_name}.**"""
                user_prompt = f"""Contexte:\n{relevant_context}\n\nQuestion: {question}\n\nRéponse:"""
            
            # Appel API
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "meta-llama/llama-4-maverick-17b-128e-instruct",  # Utiliser un modèle adapté
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.0,  # Température basse pour une réponse plus factuelle
                "max_tokens": 1024,
                "top_p": 0.1
            }
            
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                response_data = response.json()
                answer = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                if answer:
                    logger.info(f"Réponse reformulée avec LLM: {len(answer)} caractères")
                    return answer
                else:
                    logger.warning("Aucune réponse générée par le LLM")
            else:
                logger.error(f"Erreur API LLM: {response.status_code} - {response.text}")
                
            return ""
            
        except Exception as e:
            logger.error(f"Erreur lors de l'appel au LLM: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return ""
            
    except Exception as e:
        logger.error(f"Erreur dans rewrite_answer_with_llm: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ""

def get_answer_from_context(question: str, context_id: str, use_llm: bool = True, lang_code: str = "ar", return_sources: bool = False) -> Union[str, Tuple[str, List[str]]]:
    """
    Fonction principale pour générer une réponse à partir d'un contexte spécifique.
    Utilise d'abord l'extraction avancée de passages, puis optionnellement le LLM pour reformuler.
    
    Args:
        question: La question posée
        context_id: L'identifiant du contexte vectorisé
        use_llm: Si True, utilise le LLM pour reformuler la réponse si disponible
        lang_code: Code de langue pour la réponse
        return_sources: Si True, retourne aussi les extraits de contexte utilisés
        
    Returns:
        Réponse générée à partir du contexte, ou un tuple (réponse, sources) si return_sources=True
    """
    try:
        # 1. Récupérer le contexte complet
        context = get_context_by_id(context_id)
        if not context:
            return "Désolé, je n'ai pas pu trouver de contexte pour cette question."
        
        # 2. Découper le contexte en chunks sémantiques
        chunks = semantic_chunking(context)
        if not chunks:
            chunks = [context]  # Fallback si le chunking échoue
        
        # 3. Trouver les chunks les plus pertinents
        scored_chunks = rank_chunks_by_relevance(question, chunks, lang_code)
        relevant_chunks = [chunk for score, chunk in scored_chunks if score > 0][:3]
        
        if not relevant_chunks:
            relevant_chunks = chunks[:2]  # Fallback
        
        # 4. Générer une réponse
        if use_llm:
            # Essayer d'abord avec LLM
            llm_answer = rewrite_answer_with_llm(question, relevant_chunks, lang_code)
            if llm_answer:
                if return_sources:
                    return llm_answer, relevant_chunks
                return llm_answer
        
        # 5. Fallback sur la méthode sans LLM si nécessaire
        # S'assurer que la variable answer est correctement définie dans tous les cas
        if return_sources:
            answer, sources = answer_from_context_only(question, "\n\n".join(relevant_chunks), lang_code, return_sources=True)
            return answer, relevant_chunks
        else:
            answer = answer_from_context_only(question, "\n\n".join(relevant_chunks), lang_code)
            return answer
        
    except Exception as e:
        logger.error(f"Erreur dans get_answer_from_context: {e}")
        import traceback
        logger.error(traceback.format_exc())
        error_msg = "Désolé, une erreur s'est produite lors de la recherche de la réponse."
        
        # S'assurer de retourner le bon type selon le paramètre return_sources
        if return_sources:
            return error_msg, []
        return error_msg
