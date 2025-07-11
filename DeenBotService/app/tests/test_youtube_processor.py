import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dependencies.youtube_processor import YouTubeProcessor

class TestYouTubeProcessor(unittest.TestCase):

    @patch('shutil.disk_usage')
    def test_download_audio_pytube_insufficient_space(self, mock_disk_usage):
        """Test that pytube download is aborted if disk space is insufficient."""
        # Arrange
        # Simulate a disk with 100 MB free space
        mock_disk_usage.return_value = (1024*1024*500, 1024*1024*400, 1024*1024*100) 
        
        processor = YouTubeProcessor()
        youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        # Mock the pytube.YouTube object and its streams
        mock_stream = MagicMock()
        mock_stream.filesize = 150 * 1024 * 1024  # 150 MB, larger than free space

        mock_youtube = MagicMock()
        mock_youtube.streams.filter.return_value.order_by.return_value.desc.return_value.first.return_value = mock_stream

        with patch('dependencies.youtube_processor.YouTube', return_value=mock_youtube):
            # Act
            result = processor.download_audio_pytube(youtube_url)

            # Assert
            self.assertIsNone(result)
            mock_stream.download.assert_not_called()

    @patch('shutil.disk_usage')
    @patch('yt_dlp.YoutubeDL')
    def test_download_audio_ytdlp_insufficient_space(self, mock_yt_dlp, mock_disk_usage):
        """Test that yt-dlp download is aborted if disk space is insufficient."""
        # Arrange
        # Simulate a disk with 100 MB free space
        mock_disk_usage.return_value = (1024*1024*500, 1024*1024*400, 1024*1024*100)

        processor = YouTubeProcessor()
        youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

        # Mock the yt-dlp info extraction to return a filesize
        mock_ydl_instance = MagicMock()
        mock_ydl_instance.extract_info.return_value = {
            'filesize': 150 * 1024 * 1024, # 150 MB
            'formats': [{'acodec': 'opus', 'vcodec': 'none', 'filesize': 150 * 1024 * 1024, 'abr': 160}]
        }
        mock_yt_dlp.return_value.__enter__.return_value = mock_ydl_instance

        # Act
        result = processor.download_audio_ytdlp(youtube_url)

        # Assert
        self.assertIsNone(result)
        # Ensure the download method was not called after the info extraction
        mock_ydl_instance.download.assert_not_called()

if __name__ == '__main__':
    unittest.main()
