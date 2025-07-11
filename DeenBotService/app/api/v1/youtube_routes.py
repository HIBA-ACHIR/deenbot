from fastapi import APIRouter, HTTPException, Query, Depends
import googleapiclient.discovery
import googleapiclient.errors
import os
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
import json
import re
import time
from pathlib import Path

router = APIRouter()

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# YouTube API setup
api_service_name = "youtube"
api_version = "v3"

# Models
class YouTubeVideo(BaseModel):
    id: str
    title: str
    description: str
    thumbnail: str
    relevance_score: float = 0.0
    playlist_id: Optional[str] = None

class YouTubeSearchResponse(BaseModel):
    items: List[YouTubeVideo]
    total_results: int
    next_page_token: Optional[str] = None

# List of playlist IDs for الدروس الحسنية
HASANIYA_PLAYLISTS = [
    'PLffkxBSUUPe2lDC0Ace2tY7njZ-MZW7Ai',  # Main playlist
    'PLffkxBSUUPe3r3HDn0C0P5a6hiyFdbYO3',  # رمضان
    'PLffkxBSUUPe0kyx_wWUsC3O7bWy1Y9Yxj',  # القرآن
    'PLffkxBSUUPe1ZoYpigc4v0lvY8CWBjzDj',  # الأخلاق
    'PLzaEQSUEu8vRv_0OrS33iN9oV3x_8r7Ho',  # ثوابت الهوية
    'PLNRAI_pCPpY4i32APEmydY8TBN9dQ_S5I',  # Various topics
    'PLzaEQSUEu8vTe5NarlbFaBsEzKAniOz6X'   # Additional playlist
]

# Keywords and their associated topics for improved matching
KEYWORD_TOPICS = {
    'رمضان': ['رمضان', 'صيام', 'صوم', 'شهر رمضان', 'الشهر الكريم'],
    'القرآن': ['قرآن', 'قران', 'مصحف', 'القرآن الكريم', 'تفسير', 'آيات', 'سورة'],
    'الأخلاق': ['أخلاق', 'خلق', 'أدب', 'سلوك', 'معاملة', 'فضائل'],
    'ثوابت الهوية': ['هوية', 'ثوابت', 'الهوية الإسلامية', 'الإسلام', 'المسلمين']
}

# Cache directory for storing API responses
CACHE_DIR = Path("cache")
CACHE_DIR.mkdir(exist_ok=True)

# Cache TTL in seconds (24 hours)
CACHE_TTL = 86400

def get_youtube_client():
    """Get YouTube API client with API key from environment variables"""
    youtube_api_key = os.getenv("YOUTUBE_API_KEY")
    
    if not youtube_api_key:
        logger.error("YouTube API key not found in environment variables")
        raise HTTPException(
            status_code=500, 
            detail="YouTube API key not configured. Please add YOUTUBE_API_KEY to your .env file."
        )
    
    return googleapiclient.discovery.build(
        api_service_name, api_version, developerKey=youtube_api_key
    )


def get_cache_path(cache_key: str) -> Path:
    """Get the path to a cached file based on the cache key"""
    return CACHE_DIR / f"{cache_key}.json"


def get_cached_data(cache_key: str) -> Optional[Dict[str, Any]]:
    """Get cached data if it exists and is still valid"""
    cache_path = get_cache_path(cache_key)
    
    if not cache_path.exists():
        return None
    
    # Check if cache is still valid
    if time.time() - cache_path.stat().st_mtime > CACHE_TTL:
        return None
    
    try:
        with open(cache_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading cache: {str(e)}")
        return None


def save_to_cache(cache_key: str, data: Dict[str, Any]) -> None:
    """Save data to cache"""
    cache_path = get_cache_path(cache_key)
    
    try:
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving to cache: {str(e)}")


def calculate_relevance_score(query: str, title: str, description: str) -> float:
    """Calculate relevance score based on keyword matching in title and description"""
    query = query.lower()
    title = title.lower()
    description = description.lower()
    
    # Start with base score
    score = 0.0
    
    # Exact match in title is highly relevant
    if query in title:
        score += 10.0
        # Bonus if it's at the beginning of the title
        if title.startswith(query):
            score += 5.0
    
    # Partial match of words in title
    for word in query.split():
        if word in title:
            score += 2.0
    
    # Match in description
    if query in description:
        score += 3.0
    
    # Partial match of words in description
    for word in query.split():
        if word in description:
            score += 0.5
    
    # Check for related keywords/topics
    for topic, keywords in KEYWORD_TOPICS.items():
        if any(keyword in query for keyword in keywords):
            # If query relates to this topic, check if title/description has topic keywords
            for keyword in keywords:
                if keyword in title:
                    score += 3.0
                if keyword in description:
                    score += 1.0
    
    return score


async def fetch_videos_from_playlist(youtube, playlist_id: str) -> List[Dict[str, Any]]:
    """Fetch all videos from a playlist"""
    cache_key = f"playlist_{playlist_id}"
    cached_data = get_cached_data(cache_key)
    
    if cached_data:
        return cached_data
    
    try:
        videos = []
        next_page_token = None
        
        while True:
            # Get playlist items
            request = youtube.playlistItems().list(
                part="snippet,contentDetails",
                playlistId=playlist_id,
                maxResults=50,  # Maximum allowed by the API
                pageToken=next_page_token
            )
            response = request.execute()
            
            for item in response.get("items", []):
                snippet = item.get("snippet", {})
                content_details = item.get("contentDetails", {})
                
                # Skip deleted or private videos
                if snippet.get("title") == "Deleted video" or snippet.get("title") == "Private video":
                    continue
                
                video_id = content_details.get("videoId", "")
                if not video_id:
                    continue
                
                title = snippet.get("title", "")
                description = snippet.get("description", "")
                thumbnails = snippet.get("thumbnails", {})
                
                thumbnail_url = (
                    thumbnails.get("high", {}).get("url") or
                    thumbnails.get("medium", {}).get("url") or
                    thumbnails.get("default", {}).get("url", "")
                )
                
                videos.append({
                    "id": video_id,
                    "title": title,
                    "description": description,
                    "thumbnail": thumbnail_url,
                    "playlist_id": playlist_id
                })
            
            # Check if there are more pages
            next_page_token = response.get("nextPageToken")
            if not next_page_token:
                break
        
        # Cache the results
        save_to_cache(cache_key, videos)
        
        return videos
    except googleapiclient.errors.HttpError as e:
        logger.error(f"YouTube API error fetching playlist {playlist_id}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error fetching playlist {playlist_id}: {str(e)}")
        return []


@router.get("/search", response_model=YouTubeSearchResponse)
async def search_youtube_videos(
    q: str = Query(..., description="Search query"),
    max_results: int = Query(10, description="Maximum number of results to return"),
    youtube = Depends(get_youtube_client)
):
    """Search for الدروس الحسنية videos across specified playlists"""
    logger.info(f"Searching for videos with query: {q}")
    
    try:
        # Normalize query
        query = q.strip()
        
        # Return error if query is empty
        if not query:
            return {
                "items": [],
                "total_results": 0,
                "next_page_token": None
            }
        
        # Try to use cached search results
        cache_key = f"search_{query.replace(' ', '_')}"
        cached_results = get_cached_data(cache_key)
        
        if cached_results:
            logger.info(f"Returning cached results for query: {query}")
            return cached_results
        
        # Fetch all videos from all playlists
        all_videos = []
        for playlist_id in HASANIYA_PLAYLISTS:
            playlist_videos = await fetch_videos_from_playlist(youtube, playlist_id)
            all_videos.extend(playlist_videos)
        
        logger.info(f"Fetched a total of {len(all_videos)} videos from all playlists")
        
        # Calculate relevance scores for all videos based on the search query
        scored_videos = []
        for video in all_videos:
            relevance_score = calculate_relevance_score(query, video["title"], video["description"])
            video_with_score = {
                **video,
                "relevance_score": relevance_score
            }
            scored_videos.append(video_with_score)
        
        # Sort by relevance score (highest first)
        sorted_videos = sorted(scored_videos, key=lambda x: x["relevance_score"], reverse=True)
        
        # Get top results
        top_results = sorted_videos[:max_results]
        
        # If no results found with good relevance, try broader search
        if not top_results or all(video["relevance_score"] < 1.0 for video in top_results):
            # Fallback: direct YouTube search
            try:
                search_query = f"الدروس الحسنية {query}"
                request = youtube.search().list(
                    part="snippet",
                    q=search_query,
                    type="video",
                    maxResults=max_results,
                    relevanceLanguage="ar"
                )
                response = request.execute()
                
                for item in response.get("items", []):
                    video_id = item.get("id", {}).get("videoId", "")
                    snippet = item.get("snippet", {})
                    title = snippet.get("title", "")
                    description = snippet.get("description", "")
                    thumbnails = snippet.get("thumbnails", {})
                    
                    thumbnail_url = (
                        thumbnails.get("high", {}).get("url") or
                        thumbnails.get("medium", {}).get("url") or
                        thumbnails.get("default", {}).get("url", "")
                    )
                    
                    # Only add videos that have "الدروس الحسنية" in the title
                    if "الدروس الحسنية" in title:
                        top_results.append({
                            "id": video_id,
                            "title": title,
                            "description": description,
                            "thumbnail": thumbnail_url,
                            "relevance_score": 0.5,  # Lower score for fallback results
                            "playlist_id": None
                        })
            except Exception as e:
                logger.error(f"Error in fallback search: {str(e)}")
        
        # Format the response
        result = {
            "items": top_results,
            "total_results": len(sorted_videos),
            "next_page_token": None
        }
        
        # Cache the results
        save_to_cache(cache_key, result)
        
        return result
    
    except googleapiclient.errors.HttpError as e:
        logger.error(f"YouTube API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YouTube API error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/video/{video_id}", response_model=YouTubeVideo)
async def get_video_details(
    video_id: str,
    youtube = Depends(get_youtube_client)
):
    """Get details for a specific video"""
    try:
        # Try to use cached video details
        cache_key = f"video_{video_id}"
        cached_data = get_cached_data(cache_key)
        
        if cached_data:
            return cached_data
        
        # Fetch video details from YouTube API
        request = youtube.videos().list(
            part="snippet,contentDetails",
            id=video_id
        )
        response = request.execute()
        
        if not response.get("items"):
            raise HTTPException(status_code=404, detail=f"Video with ID {video_id} not found")
        
        item = response["items"][0]
        snippet = item.get("snippet", {})
        
        video = {
            "id": video_id,
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
            "relevance_score": 0.0,
            "playlist_id": None
        }
        
        # Cache the result
        save_to_cache(cache_key, video)
        
        return video
    
    except googleapiclient.errors.HttpError as e:
        logger.error(f"YouTube API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YouTube API error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
