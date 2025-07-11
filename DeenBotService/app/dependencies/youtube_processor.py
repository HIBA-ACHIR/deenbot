import os
import logging
from pytube import YouTube
from pathlib import Path
import tempfile
import yt_dlp
import uuid
import shutil
import re
from typing import Dict, Any, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YouTubeProcessor:
    """Helper class for downloading and processing YouTube videos."""
    
    def __init__(self, buffer_percentage: float = 0.2):
        self.temp_dir = None
        self.buffer_percentage = buffer_percentage

    def _has_sufficient_disk_space(self, file_size: int, download_path: str) -> bool:
        """Check if there is enough disk space for the download plus a buffer."""
        if file_size <= 0:
            return True  # No space check needed for unknown or zero size

        try:
            # Get disk usage for the partition where the download path is located
            total, used, free = shutil.disk_usage(os.path.dirname(download_path))
            required_space = file_size * (1 + self.buffer_percentage)

            if free < required_space:
                logger.error(
                    f"Insufficient disk space. Required: {required_space / (1024*1024):.2f} MB, "
                    f"Available: {free / (1024*1024):.2f} MB"
                )
                return False
            
            logger.info(
                f"Sufficient disk space found. Required: {required_space / (1024*1024):.2f} MB, "
                f"Available: {free / (1024*1024):.2f} MB"
            )
            return True
        except Exception as e:
            logger.error(f"Could not check disk space: {e}")
            # Fail open: assume there is space if the check fails
            return True
    
    def setup_temp_directory(self):
        """Create a temporary directory for downloaded files if needed."""
        if self.temp_dir is None:
            self.temp_dir = tempfile.mkdtemp(prefix="youtube_downloads_")
            logger.info(f"Created temporary directory: {self.temp_dir}")
        return self.temp_dir
    
    def extract_video_id(self, youtube_url: str) -> Optional[str]:
        """
        Extract the video ID from a YouTube URL using regex for better format support.
        Supports standard, short, embed, and live URLs.

        Args:
            youtube_url: YouTube URL

        Returns:
            Video ID or None if extraction fails
        """
        # Regex patterns to capture the video ID from various YouTube URL formats
        patterns = [
            # Order is important: more specific or common patterns first.
            # 1. Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID&feature=related
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]{11})',
            # 2. Shortened youtu.be URLs: https://youtu.be/VIDEO_ID or https://youtu.be/VIDEO_ID?t=123
            r'(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})',
            # 3. Embed URLs: https://www.youtube.com/embed/VIDEO_ID
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})',
            # 4. Live URLs: https://www.youtube.com/live/VIDEO_ID or https://www.youtube.com/live/VIDEO_ID?si=xxxx
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})',
            # 5. Shorts URLs: https://www.youtube.com/shorts/VIDEO_ID
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})',
            # 6. /v/ URLs (less common): https://www.youtube.com/v/VIDEO_ID
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, youtube_url)
            if match:
                # The video ID is in the first capturing group
                video_id = match.group(1)
                logger.info(f"Extracted video_id '{video_id}' from URL '{youtube_url}'")
                return video_id
                
        logger.error(f"Unrecognized YouTube URL format, could not extract video_id: {youtube_url}")
        return None
    
    def download_audio_pytube(self, youtube_url: str) -> Optional[str]:
        """
        Download audio from YouTube video using pytube.
        
        Args:
            youtube_url: YouTube URL
            
        Returns:
            Path to downloaded audio file or None if download fails
        """
        temp_dir = self.setup_temp_directory()
        video_id = self.extract_video_id(youtube_url)
        
        if not video_id:
            return None
        
        audio_path = os.path.join(temp_dir, f"youtube_{video_id}_{uuid.uuid4().hex[:8]}.mp3")
        
        try:
            logger.info(f"Downloading YouTube video {video_id} using pytube...")
            
            # Create a YouTube object
            yt = YouTube(
                youtube_url,
                use_oauth=False,
                allow_oauth_cache=False
            )
            
            # Get the best audio stream
            audio_stream = yt.streams.filter(only_audio=True).order_by('abr').desc().first()

            if not audio_stream:
                logger.error("No audio stream found for pytube download.")
                return None

            # Check for sufficient disk space before downloading
            if not self._has_sufficient_disk_space(audio_stream.filesize, audio_path):
                return None
            
            if not audio_stream:
                logger.error("No audio stream found")
                return None
            
            # Download the audio
            temp_file = audio_stream.download(
                output_path=os.path.dirname(audio_path),
                filename=os.path.basename(audio_path)
            )
            
            logger.info(f"Audio downloaded to {audio_path}")
            return audio_path
            
        except Exception as e:
            logger.error(f"Error downloading YouTube audio with pytube: {str(e)}")
            return None
    
    def download_audio_ytdlp(self, youtube_url: str) -> Optional[str]:
        """
        Download audio from a YouTube video using yt-dlp.
        
        Args:
            youtube_url: YouTube URL
            
        Returns:
            Path to downloaded audio file or None if download fails
        """
        # Create a temporary directory for downloads
        temp_dir = tempfile.mkdtemp(prefix="youtube_downloads_")
        logger.info(f"Created temporary directory: {temp_dir}")
        
        # Extract video ID from URL
        video_id = self.extract_video_id(youtube_url)
        if not video_id:
            logger.error("Could not extract video ID from URL")
            return None
        
        # Set output path for audio file
        audio_path = os.path.join(temp_dir, f"youtube_{video_id}_{uuid.uuid4().hex[:8]}")

        # First, get video info to check filesize
        try:
            logger.info(f"Fetching video info for {youtube_url}...")
            ydl_info_opts = {'quiet': True, 'noplaylist': True, 'ignoreerrors': True}
            with yt_dlp.YoutubeDL(ydl_info_opts) as ydl:
                info_dict = ydl.extract_info(youtube_url, download=False)
                if not info_dict:
                    raise Exception("Could not retrieve video information.")

                # Find the best audio format and its filesize
                best_audio = None
                if 'formats' in info_dict:
                    audio_formats = [f for f in info_dict['formats'] if f.get('acodec') != 'none' and f.get('vcodec') == 'none']
                    if audio_formats:
                        best_audio = max(audio_formats, key=lambda f: f.get('abr', 0))
                
                filesize = best_audio.get('filesize') or info_dict.get('filesize')

                if not filesize:
                     # Fallback for live streams or where filesize is not available in metadata
                    logger.warning("Could not determine filesize from metadata. Skipping disk space check.")
                elif not self._has_sufficient_disk_space(filesize, audio_path):
                    return None # Not enough space

        except Exception as e:
            logger.error(f"Could not fetch video info or check disk space: {e}")
            # Proceed with download attempt if info fetch fails, as it might still work
            pass
        
        try:
            logger.info(f"Downloading YouTube video {video_id} using yt-dlp...")
            
            # Set FFmpeg path for yt-dlp
            ffmpeg_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                     "ffmpeg", "ffmpeg-master-latest-win64-gpl", "bin", "ffmpeg.exe")
            if os.path.exists(ffmpeg_path):
                logger.info(f"FFmpeg found at: {ffmpeg_path}")
            else:
                logger.warning(f"FFmpeg not found at: {ffmpeg_path}. Audio extraction may fail.")
                # Check if ffmpeg is in PATH
                import shutil
                if shutil.which("ffmpeg"):
                    ffmpeg_path = shutil.which("ffmpeg")
                    logger.info(f"FFmpeg found in PATH at: {ffmpeg_path}")
                else:
                    logger.warning("FFmpeg not found in PATH. Will attempt download without post-processing.")
                    ffmpeg_path = None
        
            # yt-dlp options for audio download
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': audio_path,
                'quiet': False,
                'noplaylist': True,  # Ignore playlists
                'ignoreerrors': True,  # Continue on errors
                'socket_timeout': 600,  # Increased to 10 minutes
                'retries': 5,         # Increased retries
                'fragment_retries': 10, # Retry fragments for DASH/HLS
                'skip_unavailable_fragments': True # Skip if fragments are missing
            }
            
            if ffmpeg_path:
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
                ydl_opts['ffmpeg_location'] = ffmpeg_path
            else:
                # If no ffmpeg, try to download a format that's already audio
                ydl_opts['format'] = 'm4a/bestaudio/best'
                logger.info("No FFmpeg available, attempting to download direct audio format")
        
            # Try download with full processing
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])
                
                # Check for the actual file with possible extensions
                possible_extensions = [".mp3", ".m4a", ".webm", ".opus"]
                final_path = audio_path
                for ext in possible_extensions:
                    if os.path.exists(audio_path + ext):
                        final_path = audio_path + ext
                        break
                
                # Verify the file was created and has content
                if os.path.exists(final_path) and os.path.getsize(final_path) > 1000:
                    logger.info(f"Audio downloaded to {final_path}")
                    return final_path
                else:
                    logger.warning(f"Downloaded file missing or too small: {final_path}")
                    raise Exception("Downloaded file is missing or too small")
        except Exception as e:
            logger.error(f"Error downloading with yt-dlp: {str(e)}")
            
            # Try a simpler approach without postprocessing
            try:
                simple_opts = {
                    'format': 'm4a/bestaudio/best',
                    'outtmpl': audio_path + "_simple",
                    'quiet': False,
                    'noplaylist': True,
                    'ignoreerrors': True,
                    'socket_timeout': 600, # Increased to 10 minutes
                    'retries': 5, # Increased retries
                    'fragment_retries': 10,
                    'skip_unavailable_fragments': True
                }
                logger.info("Trying simpler download without postprocessing...")
                with yt_dlp.YoutubeDL(simple_opts) as ydl_simple:
                    ydl_simple.download([youtube_url])
                
                # Check for any file that might have been downloaded
                simple_path = audio_path + "_simple"
                for ext in [".m4a", ".webm", ".mp3", ".opus"]:
                    if os.path.exists(simple_path + ext):
                        simple_path = simple_path + ext
                        break
                
                # Verify the file was created and has content
                if os.path.exists(simple_path) and os.path.getsize(simple_path) > 1000:
                    logger.info(f"Audio downloaded with simple options to {simple_path}")
                    return simple_path
                else:
                    logger.warning(f"Simple download file missing or too small: {simple_path}")
                    raise Exception("Downloaded file is missing or too small")
            except Exception as e2:
                logger.error(f"Second attempt to download failed: {str(e2)}")
                return None
    
    def extract_captions(self, youtube_url: str, language_code: str = "ar") -> Optional[str]:
        """
        Extract captions from a YouTube video.
        
        Args:
            youtube_url: YouTube URL
            language_code: Language code for captions
        
        Returns:
            Extracted caption text or None if extraction fails
        """
        try:
            logger.info(f"Attempting to extract {language_code} captions from YouTube video...")
            
            # Create a YouTube object
            yt = YouTube(youtube_url)
            
            # Try different variations of language codes, especially for Arabic
            language_variations = [language_code]
            if language_code == "ar":
                language_variations.extend(["ar-SA", "ar-EG", "ar-AE"])
            
            caption_track = None
            for lang in language_variations:
                try:
                    logger.info(f"Trying language code: {lang}")
                    caption_track = yt.captions.get_by_language_code(lang)
                    if caption_track:
                        logger.info(f"Found captions for language code: {lang}")
                        break
                except Exception as lang_error:
                    logger.warning(f"Failed to get captions for {lang}: {str(lang_error)}")
                    # If we get a 400 error, no point in trying other variations
                    if "HTTP Error 400" in str(lang_error):
                        logger.warning("YouTube API returned HTTP 400, likely a persistent issue. Skipping further caption attempts.")
                        return None
                    continue
            
            if not caption_track:
                # Try to get any available caption if specific language not found
                logger.warning(f"No {language_code} captions found, trying any available captions")
                if yt.captions:
                    caption_track = next(iter(yt.captions.values()), None)
                    if caption_track:
                        logger.info(f"Using alternative captions: {caption_track.code}")
                if not caption_track:
                    logger.warning("No captions available in any language")
                    return None
            
            # Generate captions
            caption_text = caption_track.generate_srt_captions()
            
            # Clean up the SRT format
            import re
            cleaned_text = re.sub(r'\d+\n\d+:\d+:\d+,\d+ --> \d+:\d+:\d+,\d+\n', '', caption_text)
            cleaned_text = cleaned_text.replace('\n\n', ' ').strip()
            
            logger.info(f"Successfully extracted {len(cleaned_text)} characters of captions")
            return cleaned_text
            
        except Exception as e:
            logger.error(f"Error extracting captions: {str(e)}")
            return None
    
    def process_youtube_url(self, youtube_url: str) -> Tuple[Optional[str], Dict[str, Any]]:
        """
        Process a YouTube URL by extracting captions or downloading audio.
        
        Args:
            youtube_url: YouTube URL
            
        Returns:
            Tuple of (file path, metadata)
        """
        metadata = {
            "url": youtube_url,
            "video_id": self.extract_video_id(youtube_url),
            "captions_extracted": False,
            "download_method": None
        }
        
        # First try to extract captions
        try:
            captions = self.extract_captions(youtube_url, language_code="ar")
            if captions and len(captions.strip()) > 100:
                logger.info("Successfully extracted Arabic captions")
                
                # Save captions to a file
                temp_dir = self.setup_temp_directory()
                captions_file = os.path.join(temp_dir, f"captions_{metadata['video_id']}.txt")
                
                with open(captions_file, "w", encoding="utf-8") as f:
                    f.write(captions)
                
                metadata["captions_extracted"] = True
                metadata["download_method"] = "captions_only"
                
                return captions_file, metadata
        except Exception as e:
            logger.error(f"Error extracting captions: {e}")
        
        # If captions extraction fails, download audio
        try:
            # Try downloading with yt-dlp first
            audio_path = self.download_audio_ytdlp(youtube_url)
            
            # Verify the downloaded file
            if audio_path and os.path.exists(audio_path) and os.path.getsize(audio_path) > 10000:
                logger.info(f"Successfully downloaded audio using yt-dlp: {audio_path}")
                metadata["download_method"] = "yt-dlp"
                return audio_path, metadata
            else:
                logger.warning("yt-dlp download failed or file is too small")
                
                # Try with pytube as fallback
                audio_path = self.download_audio_pytube(youtube_url)
                if audio_path and os.path.exists(audio_path) and os.path.getsize(audio_path) > 10000:
                    logger.info(f"Successfully downloaded audio using pytube: {audio_path}")
                    metadata["download_method"] = "pytube"
                    return audio_path, metadata
                else:
                    logger.error("All download methods failed")
                    return None, metadata
                
        except Exception as e:
            logger.error(f"Error downloading audio: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None, metadata
    
    def cleanup(self):
        """Clean up temporary files and directories."""
        import shutil
        if self.temp_dir and os.path.exists(self.temp_dir):
            logger.info(f"Cleaning up temporary directory: {self.temp_dir}")
            shutil.rmtree(self.temp_dir, ignore_errors=True)
            self.temp_dir = None

# Simple usage example
if __name__ == "__main__":
    processor = YouTubeProcessor()
    youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    audio_path, metadata = processor.process_youtube_url(youtube_url)
    print(f"Audio path: {audio_path}")
    print(f"Metadata: {metadata}")
    
    processor.cleanup()
