import React, { useState } from 'react';
import { toast } from 'sonner';
import { Youtube, Link, ArrowRight } from 'lucide-react';
// Remove shadcn Button component as it may be causing issues
// import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface YouTubeInputProps {
  onProcessSuccess: (transcriptionId: string, preview: string, topic?: string) => void;
}

const YouTubeInput: React.FC<YouTubeInputProps> = ({ onProcessSuccess }) => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    setIsProcessing(true);
    
    // Start progress simulation
    setProgress(10);
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Cap progress at 95% until we get actual completion
        return prev < 95 ? prev + 5 : prev;
      });
    }, 1000);

    try {
      const response = await fetch('http://localhost:8006/api/v1/media/process-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtube_url: url }),
      });

      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        setProgress(100);
        toast.success('Video processed and transcribed successfully');
        console.log(data);
        onProcessSuccess(data.transcription_id, data.transcription_preview, data.topic);
        setUrl('');
      } else {
        throw new Error(data.error || 'An error occurred while processing the video');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error('Error: ' + error.message);
      } else {
        toast.error('An error occurred while processing the video');
      }
      console.error('YouTube processing error:', error);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <div className="relative group overflow-hidden">
      {/* Fond subtil islamique */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-primary">
          <pattern id="islamic-yt-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M10,0 L12,8 L20,10 L12,12 L10,20 L8,12 L0,10 L8,8 z" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#islamic-yt-pattern)" />
        </svg>
      </div>
      
      <div className="border-0 rounded-md mb-2">
        <div className="flex items-center gap-2 mb-2">
          <Youtube className="h-5 w-5 text-primary" />
          <h3 className="text-md font-['Aref_Ruqaa',_serif] text-primary">
            Islamic Video Content
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Enter a YouTube link to an Islamic lecture, Quran recitation, or educational video
        </p>
        
        <div className="flex flex-col gap-2">
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/50">
              <Link className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="p-2 pl-10 border border-primary/20 focus:border-primary/40 rounded-lg w-full bg-white/50 focus:bg-white"
              disabled={isProcessing}
            />
          </div>
          
          {/* Standard HTML button guaranteed to be clickable */}
          <button 
            type="button"
            onClick={(e) => {
              if (!isProcessing) handleSubmit(e);
            }}
            disabled={isProcessing}
            className="mt-1 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors p-2 flex justify-center items-center cursor-pointer text-center w-full border-0"
            style={{opacity: isProcessing ? 0.7 : 1}}
          >
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/20 border-t-white/90 rounded-full"
                  />
                  Processing...
                </span>
              ) : (
                <>
                  Process Video <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </div>
          </button>
        </div>
        
        {isProcessing && (
          <div className="mt-4 bg-primary/5 p-3 rounded-lg border border-primary/10">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-primary/80 font-medium">Processing Islamic content</span>
              <span className="text-xs text-primary/80 font-medium">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {progress < 30 ? "Downloading video..." :
               progress < 60 ? "Extracting audio..." :
               progress < 90 ? "Transcribing content..." :
               "Finalizing..."
              }
            </p>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-4 italic">
          Note: Processing may take a while for longer videos
        </div>
      </div>
    </div>
  );
};

export default YouTubeInput;
