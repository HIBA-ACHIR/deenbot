"""
Module for extracting relevant answers from transcriptions.
Implements semantic chunking and scoring for better Q&A results.
"""

from typing import List, Dict, Tuple, Optional
import re
import logging
from difflib import SequenceMatcher
# Tentative d'importer NLTK, mais le rendre optionnel
try:
    import nltk
    from nltk.tokenize import sent_tokenize
    NLTK_AVAILABLE = True
    # Tentative de télécharger les ressources NLTK si elles ne sont pas déjà présentes
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        try:
            nltk.download('punkt', quiet=True)
        except:
            pass
except ImportError:
    NLTK_AVAILABLE = False
    print("NLTK n'est pas disponible. Utilisation de méthodes de base pour la tokenization.")
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fonction de tokenization alternative si NLTK n'est pas disponible
def basic_sentence_tokenize(text):
    """Simple sentence tokenizer when NLTK is not available"""
    # Remplacer les points communs de fin de phrase par des marqueurs
    text = text.replace('. ', '.<SPLIT>')
    text = text.replace('! ', '!<SPLIT>')
    text = text.replace('? ', '?<SPLIT>')
    text = text.replace('؟ ', '؟<SPLIT>')
    
    # Diviser le texte
    sentences = text.split('<SPLIT>')
    
    # Nettoyer
    sentences = [s.strip() for s in sentences if s.strip()]
    
    return sentences

def chunk_text_semantically(text: str, max_chunk_size: int = 500) -> List[str]:
    """
    Divise le texte en morceaux sémantiques (par paragraphes ou points).
    
    Args:
        text: Le texte à diviser
        max_chunk_size: Taille maximale de chaque morceau en caractères
        
    Returns:
        Une liste de morceaux de texte
    """
    if not text or not isinstance(text, str):
        return []
    
    # Diviser par paragraphes d'abord
    paragraphs = re.split(r'\n\s*\n', text)
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        # Si le paragraphe est très long, le diviser en phrases
        if len(para) > max_chunk_size:
            # Utiliser sent_tokenize de NLTK si disponible, sinon utiliser notre fonction basique
            if NLTK_AVAILABLE:
                sentences = sent_tokenize(para)
            else:
                sentences = basic_sentence_tokenize(para)
            for sentence in sentences:
                if len(current_chunk) + len(sentence) <= max_chunk_size:
                    current_chunk += sentence + " "
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = sentence + " "
        else:
            # Sinon, ajouter le paragraphe entier si possible
            if len(current_chunk) + len(para) <= max_chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"
    
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    return chunks

def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calcule la similarité entre deux textes.
    
    Args:
        text1: Premier texte
        text2: Deuxième texte
        
    Returns:
        Score de similarité entre 0 et 1
    """
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

def score_passage(query: str, passage: str) -> float:
    """
    Calcule un score de pertinence avancé entre la question et le passage.
    Utilise plusieurs métriques pour évaluer la pertinence sémantique.
    
    Args:
        query: La question posée
        passage: Le passage de texte à évaluer
        
    Returns:
        Score de pertinence entre 0 et 1
    """
    if not query or not passage:
        return 0.0
    
    # Nettoyer et normaliser les textes
    query = re.sub(r'[^\w\s]', ' ', query.lower()).strip()
    passage = re.sub(r'[^\w\s]', ' ', passage.lower()).strip()
    
    if not query or not passage:
        return 0.0
    
    # Tokenization
    query_words = set(query.split())
    passage_words = passage.split()
    
    if not query_words or not passage_words:
        return 0.0
    
    # 1. Score de correspondance exacte des mots
    exact_matches = sum(1 for word in query_words if word in passage_words)
    exact_score = exact_matches / len(query_words) if query_words else 0.0
    
    # 2. Score de densité des termes de la question
    total_words = len(passage_words)
    if total_words == 0:
        return 0.0
        
    # Position du premier et dernier mot de la question
    positions = [i for i, word in enumerate(passage_words) if word in query_words]
    if not positions:
        return 0.0
    
    # 3. Score de proximité (les mots proches sont mieux)
    min_pos = min(positions)
    max_pos = max(positions)
    span = max_pos - min_pos + 1
    
    # Plus le span est petit, mieux c'est (les mots sont proches)
    proximity_score = 1.0 / (1.0 + span / len(query_words))
    
    # 4. Score de densité (combien de mots de la question sont dans la fenêtre)
    window_size = min(20, max(10, len(query_words) * 3))  # Fenêtre dynamique
    window_score = min(1.0, len(positions) / window_size)
    
    # 5. Score de longueur (pénaliser les passages trop courts ou trop longs)
    ideal_length = 15  # Longueur idéale d'une phrase en mots
    length_score = 1.0 - (abs(len(passage_words) - ideal_length) / (ideal_length * 2))
    length_score = max(0.1, min(1.0, length_score))  # Garder entre 0.1 et 1.0
    
    # Combinaison des scores avec des poids
    final_score = (
        0.4 * exact_score +
        0.3 * proximity_score +
        0.2 * window_score +
        0.1 * length_score
    )
    
    # Ajustement final basé sur la position (les premiers passages sont légèrement favorisés)
    position_in_doc = 1.0 - (min(positions) / max(1, total_words))
    final_score = (final_score * 0.9) + (position_in_doc * 0.1)
    
    return min(max(final_score, 0.0), 1.0)

def extract_relevant_answer(question: str, transcription: str, use_llm: bool = True) -> str:
    """
    Extrait une réponse pertinente et concise du texte transcrit.
    
    Args:
        question: La question posée
        transcription: Le texte transcrit complet
        use_llm: Utiliser le LLM pour reformuler si disponible
        
    Returns:
        La réponse extraite, concise et pertinente
    """
    if not question or not transcription:
        return ""
    
    # Découper le texte en phrases pour une analyse plus fine
    if NLTK_AVAILABLE:
        sentences = sent_tokenize(transcription)
    else:
        sentences = basic_sentence_tokenize(transcription)
    
    if not sentences:
        return ""
    
    # Calculer les scores de pertinence pour chaque phrase
    scored_sentences = []
    for sentence in sentences:
        score = score_passage(question, sentence)
        scored_sentences.append((sentence, score, len(sentence)))
    
    # Trier par score décroissant et par longueur de phrase (préférer les phrases plus longues à score égal)
    scored_sentences.sort(key=lambda x: (x[1], x[2]), reverse=True)
    
    # Prendre les phrases les plus pertinentes (limitées à 3-5 phrases max)
    relevant_sentences = []
    total_length = 0
    max_length = 500  # Limiter la longueur totale de la réponse
    
    for sentence, score, length in scored_sentences:
        if score < 0.1:  # Seuil de pertinence minimum
            continue
        if total_length + length > max_length and relevant_sentences:
            break
        relevant_sentences.append(sentence)
        total_length += length
    
    if not relevant_sentences:
        return ""
    
    # Concaténer les phrases pertinentes
    context = " ".join(relevant_sentences)
    
    # Nettoyer l'espace blanc supplémentaire
    context = re.sub(r'\s+', ' ', context).strip()
    
    # Si LLM est disponible et demandé, l'utiliser pour reformuler de manière concise
    if use_llm and generate_answer_with_context != globals().get('generate_answer_with_context'):
        try:
            # Demander une réponse courte et ciblée
            prompt = f"Réponds de manière concise et précise à la question suivante en te basant uniquement sur le contexte fourni. Réponse courte :\n\nQuestion: {question}\n\nContexte: {context}"
            return generate_answer_with_context("Réponds en une ou deux phrases maximum, de manière claire et concise.", prompt)
        except Exception as e:
            logger.error(f"Erreur lors de la génération avec LLM: {e}")
            # Continuer avec la méthode sans LLM en cas d'erreur
    
    # Méthode sans LLM : retourner la phrase la plus pertinente
    return format_answer_without_llm(question, relevant_sentences[0])

def format_answer_without_llm(question: str, text: str) -> str:
    """
    Formate une réponse concise et pertinente sans utiliser le LLM.
    Utilise des techniques avancées d'extraction pour fournir une réponse ciblée.
    
    Args:
        question: La question posée
        text: Le texte à partir duquel extraire la réponse
        
    Returns:
        La réponse formatée de manière concise et pertinente
    """
    if not text:
        return ""
    
    # Nettoyer le texte
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Si le texte est déjà court, le retourner tel quel
    if len(text) <= 200:
        return text
    
    # Détecter le type de question
    question_lower = question.lower()
    
    # Tokenizer les phrases
    if NLTK_AVAILABLE:
        sentences = sent_tokenize(text)
    else:
        sentences = basic_sentence_tokenize(text)
    
    if not sentences:
        return text[:200] + "..." if len(text) > 200 else text
    
    # Trouver la phrase la plus pertinente
    best_sentence = ""
    best_score = 0
    
    for sentence in sentences:
        score = score_passage(question, sentence)
        if score > best_score:
            best_score = score
            best_sentence = sentence
    
    # Si on a trouvé une phrase pertinente
    if best_score > 0.1:
        return best_sentence
    
    # Sinon, retourner la première phrase
    return sentences[0]

def generate_answer_with_context(question: str, context: str) -> str:
    """
    Fonction placeholder pour générer une réponse avec le LLM.
    Cette fonction sera remplacée par celle de fatwallm_rag.
    
    Args:
        question: La question posée
        context: Le contexte pour la réponse
        
    Returns:
        La réponse générée
    """
    # Cette fonction ne sera jamais appelée directement
    return "Réponse générée avec le contexte."
