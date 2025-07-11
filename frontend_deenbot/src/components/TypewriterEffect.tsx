import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterEffectProps {
  text: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  dir?: 'ltr' | 'rtl';
}

const TypewriterEffect: React.FC<TypewriterEffectProps> = ({ 
  text, 
  speed = 8, // Faster speed for better user experience
  className = '',
  style = {},
  dir = 'ltr'
}) => {
  // Start empty to show animation
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isFastForward, setIsFastForward] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset effect when text changes
  useEffect(() => {
    // Start animation from beginning
    setDisplayedText('');
    setIsComplete(false);
    setIsFastForward(false);
  }, [text]);
  
  const fastForward = useCallback(() => {
    // If the user clicks/presses a key, show the full text immediately
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setDisplayedText(text);
    setIsComplete(true);
    setIsFastForward(true);
  }, [text]);
  
  // Typewriter effect
  useEffect(() => {
    if (displayedText === text) {
      setIsComplete(true);
      return;
    }
    
    if (isFastForward) return;
    
    const nextChar = () => {
      setDisplayedText(prev => {
        const nextCharIndex = prev.length;
        return prev + text.charAt(nextCharIndex);
      });
    };
    
    timeoutRef.current = setTimeout(nextChar, speed);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [displayedText, text, speed, isFastForward]);
  
  // Handle click to fast forward
  const handleInteraction = useCallback(() => {
    if (!isComplete) {
      fastForward();
    }
  }, [isComplete, fastForward]);
  
  // Add keyboard listener for fast forward
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isComplete) {
        fastForward();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isComplete, fastForward]);
  
  return (
    <div 
      className={className} 
      onClick={handleInteraction}
      style={{
        cursor: isComplete ? 'auto' : 'pointer',
        ...style
      }}
      dir={dir}
    >
      {displayedText}
      {!isComplete && (
        <span className="animate-pulse">▌</span>
      )}
    </div>
  );
};

export default TypewriterEffect;
