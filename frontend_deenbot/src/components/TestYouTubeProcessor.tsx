import React, { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

const TestYouTubeProcessor = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const processVideo = async () => {
    if (!url.trim()) {
      alert('Please enter a YouTube URL');
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch('http://localhost:8006/api/v1/media/process-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtube_url: url }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        alert('Video processed successfully!');
        console.log(data);
      } else {
        throw new Error(data.error || 'An error occurred while processing the video');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      console.error('YouTube processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '40px auto', 
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: 'white'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
        YouTube Video Processor Test
      </h2>
      
      <div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter YouTube URL..."
          style={{
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            width: '100%',
            marginBottom: '15px'
          }}
        />
        
        <button
          onClick={processVideo}
          disabled={isProcessing}
          style={{
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 15px',
            width: '100%',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isProcessing ? 'Processing...' : 'Process Video'} 
          {!isProcessing && <span>→</span>}
        </button>
      </div>
      
      <div style={{ marginTop: '15px', fontSize: '14px', textAlign: 'center', color: '#666' }}>
        Note: Processing may take a while for longer videos
      </div>
    </div>
  );
};

export default TestYouTubeProcessor;
