import os
import tempfile
import whisper
from pydub import AudioSegment
import re
import string
import logging
from typing import List, Dict, Any, Tuple, Optional
import uuid
import subprocess # Added for CalledProcessError

# Configure logging

# Custom Exceptions
class AudioProcessorError(Exception):
    """Base class for exceptions in AudioProcessor."""
    pass

class AudioSplittingError(AudioProcessorError):
    """Raised when audio splitting fails for reasons other than disk space."""
    pass

class DiskSpaceError(AudioSplittingError):
    """Raised when audio splitting fails due to insufficient disk space."""
    pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set FFmpeg path
ffmpeg_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                        "ffmpeg", "ffmpeg-master-latest-win64-gpl", "bin")
os.environ["PATH"] += os.pathsep + ffmpeg_path
logger.info(f"Added FFmpeg path: {ffmpeg_path}")
logger.info(f"Full PATH: {os.environ['PATH']}")

# Also set the ffmpeg environment variables that PyDub might use
os.environ["FFMPEG_BINARY"] = os.path.join(ffmpeg_path, "ffmpeg.exe")
os.environ["FFPROBE_BINARY"] = os.path.join(ffmpeg_path, "ffprobe.exe")

class AudioProcessor:
    """Audio processor class for handling audio transcription with chunking."""
    
    def __init__(self, model_size: str = "base"):
        """
        Initialize the audio processor.
        
        Args:
            model_size: Size of the Whisper model to use ('tiny', 'base', 'small', 'medium', 'large')
        """
        self.model_size = model_size
        self.model = None
        self.temp_dir = None
        # Set chunk size to 5 minutes for efficient processing of longer files
        self.chunk_size_ms = 300000  # 5 minutes
        # Maximum audio duration supported (in hours)
        self.max_duration_hours = 3  # Support up to 3 hour videos
    
    def load_model(self):
        """Load the Whisper model if not already loaded."""
        if self.model is None:
            logger.info(f"Loading {self.model_size} Whisper model...")
            try:
                self.model = whisper.load_model(self.model_size)
                logger.info(f"Model {self.model_size} loaded successfully")
            except Exception as e:
                logger.error(f"Error loading model: {e}")
                # Fall back to tiny model if the requested one fails
                if self.model_size != "tiny":
                    logger.info("Falling back to tiny model")
                    self.model_size = "tiny"
                    self.model = whisper.load_model("tiny")
    
    def setup_temp_directory(self):
        """Create a temporary directory for audio chunks if needed."""
        if self.temp_dir is None:
            self.temp_dir = tempfile.mkdtemp(prefix="audio_chunks_")
            logger.info(f"Created temporary directory: {self.temp_dir}")
        return self.temp_dir
    
    def split_audio(self, audio_path: str) -> List[str]:
        """
        Split an audio file into smaller chunks.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            List of paths to the chunk files
        """
        logger.info(f"Splitting audio file: {audio_path}")
        temp_dir = self.setup_temp_directory()
        
        try:
            # Check if the file exists and has content
            if not os.path.exists(audio_path):
                logger.error(f"Audio file does not exist: {audio_path}")
                return []
                
            if os.path.getsize(audio_path) < 1000:  # Less than 1KB
                logger.error(f"Audio file too small: {audio_path}")
                return []
            
            # For very large files, use direct FFmpeg chunking instead of loading into memory
            # Check if file is very large (over 100MB)
            is_large_file = os.path.getsize(audio_path) > 100 * 1024 * 1024  # 100MB
            
            if is_large_file:
                logger.info("Large file detected. Using direct FFmpeg chunking instead of loading into memory")
                return self._split_large_file_with_ffmpeg(audio_path, temp_dir)
            
            # For smaller files, use standard pydub approach
            try:
                audio = AudioSegment.from_file(audio_path)
            except Exception as e:
                logger.error(f"Error loading audio with pydub: {e}")
                # Try to convert the file to a universal format first
                unique_id = uuid.uuid4().hex[:8]
                converted_path = os.path.join(temp_dir, f"converted_{unique_id}.wav")
                
                # Use ffmpeg directly
                import subprocess
                try:
                    ffmpeg_cmd = [
                        os.path.join(ffmpeg_path, "ffmpeg.exe"),
                        "-i", audio_path,
                        "-ar", "16000",  # Sample rate
                        "-ac", "1",      # Mono
                        "-c:a", "pcm_s16le",  # 16-bit PCM
                        converted_path
                    ]
                    logger.info(f"Running FFmpeg command: {' '.join(ffmpeg_cmd)}")
                    subprocess.run(ffmpeg_cmd, check=True)
                    
                    if os.path.exists(converted_path):
                        logger.info(f"Successfully converted to {converted_path}")
                        
                        # For big files, use direct FFmpeg chunking
                        if os.path.getsize(converted_path) > 100 * 1024 * 1024:  # 100MB
                            return self._split_large_file_with_ffmpeg(converted_path, temp_dir)
                        
                        audio = AudioSegment.from_wav(converted_path)
                    else:
                        logger.error("Conversion failed, output file not created")
                        return []
                except Exception as conv_error:
                    logger.error(f"FFmpeg conversion error: {conv_error}")
                    return []
            
            logger.info(f"Audio duration: {len(audio)/1000} seconds")
            
            # Split the audio into chunks
            chunk_paths = []
            for i, start_time in enumerate(range(0, len(audio), self.chunk_size_ms)):
                # Extract chunk
                end_time = min(start_time + self.chunk_size_ms, len(audio))
                chunk = audio[start_time:end_time]
                
                # Generate unique filename for the chunk
                chunk_path = os.path.join(temp_dir, f"chunk_{i+1}_{uuid.uuid4().hex[:8]}.wav")
                chunk.export(chunk_path, format="wav")
                
                # Verify the chunk was created successfully
                if os.path.exists(chunk_path) and os.path.getsize(chunk_path) > 1000:
                    chunk_paths.append(chunk_path)
                    logger.info(f"Saved chunk {i+1}: {chunk_path}")
                else:
                    logger.warning(f"Failed to create valid chunk at {chunk_path}")
            
            return chunk_paths
            
        except Exception as e:
            if isinstance(e, OSError) and e.errno == 28:
                logger.error(f"Disk space error during audio splitting: {e}")
                import traceback
                logger.error(traceback.format_exc())
                raise DiskSpaceError(f"No space left on device during audio splitting: {e}") from e
            else:
                logger.error(f"Error splitting audio: {e}")
                import traceback
                logger.error(traceback.format_exc())
                raise AudioSplittingError(f"Failed to split audio: {e}") from e
            
    def _split_large_file_with_ffmpeg(self, audio_path: str, temp_dir: str) -> List[str]:
        """
        Split large audio file using direct FFmpeg commands without loading into memory.
        Optimized for very long videos (1-2 hours).
        
        Args:
            audio_path: Path to the audio file
            temp_dir: Temporary directory to store chunks
        
        Returns:
            List of paths to the chunk files
        """
        import subprocess
        
        try:
            # First get duration with ffprobe
            ffprobe_cmd = [
                os.path.join(ffmpeg_path, "ffprobe.exe"),
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_path
            ]
            
            result = subprocess.run(ffprobe_cmd, capture_output=True, text=True, check=True)
            duration = float(result.stdout.strip())
            logger.info(f"Audio duration from ffprobe: {duration} seconds")
            
            # Verify the file is within our max duration
            max_duration_sec = self.max_duration_hours * 3600
            if duration > max_duration_sec:
                logger.warning(f"Audio duration ({duration} seconds) exceeds maximum supported duration ({max_duration_sec} seconds). Will process anyway but performance may be affected.")
            
            # Calculate number of chunks
            chunk_duration_sec = self.chunk_size_ms / 1000  # Convert ms to seconds
            num_chunks = max(1, int(duration / chunk_duration_sec) + 1)  # Add one to account for partial chunks
            
            logger.info(f"Splitting audio into {num_chunks} chunks of {chunk_duration_sec} seconds each")
            
            chunk_paths = []
            for i in range(num_chunks):
                start_time = i * chunk_duration_sec
                
                # Skip if we're past the end of the file
                if start_time >= duration:
                    break
                    
                # Generate unique chunk path
                chunk_path = os.path.join(temp_dir, f"chunk_{i+1}_{uuid.uuid4().hex[:8]}.wav")
                
                # FFmpeg command to extract segment
                ffmpeg_cmd = [
                    os.path.join(ffmpeg_path, "ffmpeg.exe"),
                    "-ss", f"{start_time}",
                    "-t", f"{chunk_duration_sec}",
                    "-i", audio_path,
                    "-ar", "16000",  # Sample rate
                    "-ac", "1",      # Mono channel
                    "-c:a", "pcm_s16le",  # 16-bit PCM 
                    "-y",             # Overwrite output files
                    chunk_path
                ]
                
                # Add progress logging
                if i % 10 == 0 or i == num_chunks - 1:
                    logger.info(f"Processing chunk {i+1}/{num_chunks} at timestamp {start_time:.2f}s")
                
                subprocess.run(ffmpeg_cmd, check=True)
                
                # Verify the chunk was created successfully
                if os.path.exists(chunk_path) and os.path.getsize(chunk_path) > 1000:
                    chunk_paths.append(chunk_path)
                    if i % 10 == 0 or i == num_chunks - 1:
                        logger.info(f"Saved chunk {i+1}/{num_chunks}: {chunk_path}")
                else:
                    logger.warning(f"Failed to create valid chunk at {chunk_path}")
            
            return chunk_paths
            
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg command failed during large file chunking: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise AudioSplittingError(f"FFmpeg command failed: {e.stderr.decode() if e.stderr else str(e)}") from e
        except Exception as e:
            logger.error(f"Error in direct FFmpeg chunking: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise AudioSplittingError(f"Failed to split large audio file with FFmpeg: {e}") from e
    
    def transcribe_chunks(self, chunk_paths: List[str], language: str = "ar") -> List[Dict[str, Any]]:
        """
        Transcribe a list of audio chunks.
        Optimized for handling a large number of chunks from long videos.
        
        Args:
            chunk_paths: List of paths to audio chunks
            language: Language code (default: ar for Arabic)
            
        Returns:
            List of transcription results with metadata
        """
        self.load_model()
        
        # Log total work to be done
        total_chunks = len(chunk_paths)
        logger.info(f"Beginning transcription of {total_chunks} audio chunks")
        
        # Process in batches of 10 chunks to reduce memory pressure and provide progress updates
        batch_size = 10
        transcriptions = []
        
        for batch_idx in range(0, len(chunk_paths), batch_size):
            batch_end = min(batch_idx + batch_size, len(chunk_paths))
            batch_chunks = chunk_paths[batch_idx:batch_end]
            
            logger.info(f"Processing batch {batch_idx//batch_size + 1} of {(len(chunk_paths)-1)//batch_size + 1} ({batch_idx+1}-{batch_end}/{len(chunk_paths)})")
            
            for i, chunk_path in enumerate(batch_chunks):
                chunk_idx = batch_idx + i
                try:
                    if chunk_idx % 5 == 0 or chunk_idx == len(chunk_paths) - 1:
                        logger.info(f"Transcribing chunk {chunk_idx+1}/{len(chunk_paths)} ({(chunk_idx+1)/len(chunk_paths)*100:.1f}%)")
                    
                    # Attempt transcription with specified language
                    result = self.model.transcribe(
                        chunk_path, 
                        language=language,
                        fp16=False,
                        verbose=False
                    )
                    
                    # Create metadata
                    chunk_time = chunk_idx * (self.chunk_size_ms / 1000)  # Convert to seconds
                    
                    # Add result to list
                    transcriptions.append({
                        "chunk_index": chunk_idx,
                        "start_time": chunk_time,
                        "text": result["text"],
                        "metadata": {
                            "language": language,
                            "chunk_path": chunk_path,
                            "confidence": result.get("confidence", 0)
                        }
                    })
                    
                    # Periodic logging to show progress
                    if chunk_idx % 5 == 0 or chunk_idx == len(chunk_paths) - 1:
                        logger.info(f"Transcription successful for chunk {chunk_idx+1}. Length: {len(result['text'])}")
                    
                    # Free memory after each chunk processing
                    import gc
                    gc.collect()
                    
                except Exception as e:
                    logger.error(f"Error transcribing chunk {chunk_idx+1}/{len(chunk_paths)}: {e}")
                    # Add an empty result to maintain order
                    transcriptions.append({
                        "chunk_index": chunk_idx,
                        "start_time": chunk_idx * (self.chunk_size_ms / 1000),
                        "text": "",
                        "error": str(e)
                    })
        
        return transcriptions
    
    def combine_transcriptions(self, transcriptions: List[Dict[str, Any]]) -> str:
        """
        Combine multiple transcriptions into a single text.
        
        Args:
            transcriptions: List of transcription results
            
        Returns:
            Combined transcription text
        """
        # Sort by chunk index
        sorted_transcriptions = sorted(transcriptions, key=lambda x: x["chunk_index"])
        
        # Combine texts
        combined_text = ""
        for t in sorted_transcriptions:
            text = t.get("text", "")
            if text:
                combined_text += text.strip() + " "
        
        return combined_text.strip()
    
    def clean_transcription(self, text: str) -> str:
        """
        Clean the transcription by removing noise and irrelevant content and correct common recognition errors.
        
        Args:
            text: Raw transcription text
            
        Returns:
            Cleaned transcription text
        """
        if not text:
            return text
    
        logger.info("Starting transcription cleaning and correction")
        
        # Remove filler words and audio artifacts
        text = re.sub(r'\b(um|uh|ah|like|you know)\b', '', text, flags=re.IGNORECASE)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove any timestamps
        text = re.sub(r'\[[\d:.]+\]', '', text)
        
        # Dictionary of common Arabic word corrections (misrecognized -> correct)
        arabic_corrections = {
            # Basic corrections for commonly misrecognized words
            "دلس": "درس",
            "سلى": "صلى",
            "سلاة": "صلاة",
            "سلام": "صلاة",  # Only when referring to prayer
            "الله على": "الله عليه",
            "أللة": "الله",
            "اللة": "الله",
            "هدا": "هذا",
            "دالك": "ذلك",
            "دلك": "ذلك",
            "الدي": "الذي",
            "هاده": "هذه",
            "هادا": "هذا",
            "طالب العلم": "طالب العلم",  # Ensure common phrases are preserved
            "عن النبى": "عن النبي",
            "صلى اللة علية وسلم": "صلى الله عليه وسلم",
            "صلى الله علية": "صلى الله عليه",
            "صلى الله على وسلم": "صلى الله عليه وسلم",
            "صلى اللة": "صلى الله",
            "السلة": "الصلاة",
            "كدا": "كذا",
            "كدلك": "كذلك",
            
            # Common religious terms
            "الزكه": "الزكاة",
            "زكه": "زكاة",
            "حج": "حج",
            "الرمدان": "رمضان",
            "رمدان": "رمضان",
            "رمظان": "رمضان",
            "الرمظان": "رمضان",
            "قرآن": "قرآن",
            "القرأن": "القرآن",
            "قرأن": "قرآن",
            "سره": "سورة",
            "الفاطحة": "الفاتحة",
            "فاطحة": "فاتحة",
            
            # Grammatical corrections
            "من هاده": "من هذه",
            "إنه": "إنه",
            "انه": "أنه",
            "لاكن": "لكن",
            "الاسلم": "الإسلام",
            "اسلم": "إسلام",
        }
        
        # Phrases that should always be corrected as a whole
        arabic_phrases = {
            "صلى الله عليه و سلم": "صلى الله عليه وسلم",
            "صلى الله عليه وسلم": "صلى الله عليه وسلم",
            "صلى الله عليه": "صلى الله عليه",
            "عليه السلام": "عليه السلام",
            "رضي الله عنه": "رضي الله عنه",
            "رضي الله عنهما": "رضي الله عنهما",
            "رضي الله عنها": "رضي الله عنها",
            "الحمد لله": "الحمد لله",
            "بسم الله": "بسم الله",
            "بسم الله الرحمن الرحيم": "بسم الله الرحمن الرحيم",
            "لا إله إلا الله": "لا إله إلا الله",
            "الله أكبر": "الله أكبر",
            "سبحان الله": "سبحان الله",
            "استغفر الله": "استغفر الله",
        }
        
        # First correct whole phrases (longer matches first)
        for phrase, correction in sorted(arabic_phrases.items(), key=lambda x: len(x[0]), reverse=True):
            text = text.replace(phrase, correction)
        
        # Then correct individual words
        # We'll use word boundaries to avoid partial replacements
        for error, correction in arabic_corrections.items():
            pattern = r'\b' + re.escape(error) + r'\b'
            text = re.sub(pattern, correction, text)
        
        # Contextual corrections
        # For example, context-specific corrections for words that might be correct in some contexts 
        # but incorrect in others
        
        # Correct "سلام" only when it should be "صلاة" (prayer context)
        # (but preserve as "سلام" when it means "peace")
        prayer_contexts = ["فرض", "أداء", "أوقات", "صلوات", "الفجر", "الظهر", "العصر", "المغرب", "العشاء", "الصبح"]
        for context in prayer_contexts:
            if context in text:
                # Version simple et sûre sans lambda
                pattern = r'\b(سلام)\b(?=[^\n.،؟!]*\b' + re.escape(context) + r'\b)'
                text = re.sub(pattern, "صلاة", text)
                
                # Recherche de contexte suivi de سلام et remplacement direct
                if context in text and "سلام" in text:
                    # On recherche et on remplace sans utiliser lambda
                    before_pattern = context + r'[^\n.،؟!]*سلام'
                    matches = re.findall(before_pattern, text)
                    for match in matches:
                        fixed = match.replace("سلام", "صلاة")
                        text = text.replace(match, fixed)
        
        # Fix "صلى الله على" to "صلى الله عليه" but only in prophet context
        prophet_contexts = ["النبي", "محمد", "الرسول", "صلى", "وسلم"]
        for context in prophet_contexts:
            if context in text:
                text = text.replace("صلى الله على", "صلى الله عليه")
        
        # Fix specific diacritical marks
        text = text.replace("أُمة", "أمة")
        
        # Final cleaning for any double spaces created during corrections
        text = re.sub(r'\s+', ' ', text).strip()
        
        logger.info("Completed transcription cleaning and correction")
        return text
    
    def process_audio_file(self, audio_path: str, language: str = "ar") -> Tuple[str, List[Dict]]:
        """
        Process an audio file: split, transcribe, and combine.
        
        Args:
            audio_path: Path to the audio file
            language: Language code
            
        Returns:
            Tuple of (combined transcription, list of chunk transcriptions)
        """
        # Log the start of processing
        logger.info(f"Starting audio processing for {audio_path} with language={language}")
        
        # Split audio into chunks
        try:
            chunk_paths = self.split_audio(audio_path)
        except DiskSpaceError as e:
            logger.error(f"Disk space error processing {audio_path}: {e}")
            # Re-raise to be caught by the API layer for a specific response
            raise
        except AudioSplittingError as e:
            logger.error(f"Audio splitting error for {audio_path}: {e}")
            # Re-raise to be caught by the API layer
            raise
        except Exception as e: # Catch any other unexpected errors during splitting
            logger.error(f"Unexpected error during audio splitting for {audio_path}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Re-raise as a generic AudioProcessorError or a more specific one if identifiable
            raise AudioSplittingError(f"An unexpected error occurred during audio splitting: {e}") from e

        if not chunk_paths: # Should ideally not be reached if errors are raised
            logger.error(f"Audio splitting returned no chunks for {audio_path}, and no exception was raised. This indicates an unexpected state.")
            # This case should be rare if exceptions are handled correctly above.
            # However, to maintain a similar structure to before for this unlikely path:
            return "Error: Failed to split audio file (unknown reason, no chunks produced)", []
        
        logger.info(f"Split audio into {len(chunk_paths)} chunks")
        
        # Transcribe each chunk
        transcriptions = self.transcribe_chunks(chunk_paths, language)
        
        # Check if we got any valid transcriptions
        valid_transcriptions = [t for t in transcriptions if t.get("text", "").strip()]
        if not valid_transcriptions:
            logger.error("No valid transcriptions found in any chunks")
            
            # Try direct transcription as a fallback
            try:
                logger.info("Attempting direct transcription as fallback...")
                self.load_model()
                result = self.model.transcribe(
                    audio_path, 
                    language=language,
                    fp16=False,
                    verbose=True
                )
                return result["text"], [{"text": result["text"], "direct": True}]
            except Exception as e:
                logger.error(f"Direct transcription failed: {e}")
                return "Error: Failed to transcribe audio", []
        
        # Combine and clean transcriptions
        combined_text = self.combine_transcriptions(transcriptions)
        cleaned_text = self.clean_transcription(combined_text)
        
        # Log the results
        logger.info(f"Transcription complete. Length: {len(cleaned_text)} characters")
        if len(cleaned_text) > 200:
            logger.info(f"First 200 chars: {cleaned_text[:200]}...")
        else:
            logger.info(f"Full transcription: {cleaned_text}")
        
        return cleaned_text, transcriptions
    
    def cleanup(self):
        """Clean up temporary files and directories."""
        import shutil
        if self.temp_dir and os.path.exists(self.temp_dir):
            logger.info(f"Cleaning up temporary directory: {self.temp_dir}")
            shutil.rmtree(self.temp_dir, ignore_errors=True)
            self.temp_dir = None

# Simple usage example
if __name__ == "__main__":
    processor = AudioProcessor(model_size="base")
    audio_path = "path/to/audio.mp3"
    
    transcription, chunks = processor.process_audio_file(audio_path)
    print(f"Transcription: {transcription[:100]}...")
    
    processor.cleanup()
