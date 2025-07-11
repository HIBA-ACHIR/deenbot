import React, { useState, useEffect } from 'react';

// Define the interface for the SpeechRecognition component props
interface SpeechRecognitionProps {
  onTranscriptChange: (transcript: string) => void;
  language?: string;
}

// Create a type for the SpeechRecognition API
interface SpeechRecognitionAPI extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onstart: () => void;
  onend: () => void;
}

// Extend the window interface to include SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionAPI;
    webkitSpeechRecognition: new () => SpeechRecognitionAPI;
  }
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({ 
  onTranscriptChange, 
  language = 'ar-SA' // Default to Arabic
}) => {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [interfaceLanguage, setInterfaceLanguage] = useState<'ar' | 'en'>('ar');
  
  // Détecter la langue active de l'interface
  useEffect(() => {
    const handleLanguageChange = () => {
      const docLang = document.documentElement.lang || 'ar';
      setInterfaceLanguage(docLang === 'en' ? 'en' : 'ar');
    };
    
    // Initialiser avec la langue actuelle
    handleLanguageChange();
    
    // Observer les changements de langue
    const observer = new MutationObserver(handleLanguageChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setErrorMessage(interfaceLanguage === 'ar' ? 'المتصفح لا يدعم ميزة التعرف على الصوت.' : 'Your browser does not support speech recognition.');
      setIsSupported(false);
      return;
    }

    const SpeechRecognitionAPI = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    // Configure speech recognition
    recognition.continuous = false;
    recognition.interimResults = true;
    // Adapt recognition language based on interface language
    recognition.lang = interfaceLanguage === 'ar' ? 'ar-SA' : 'en-US';
    
    // Set up event handlers
    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage(null);
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      onTranscriptChange(transcript);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'denied') {
        setErrorMessage(interfaceLanguage === 'ar' ? 'تم رفض إذن الميكروفون. يرجى السماح بالوصول للميكروفون من إعدادات المتصفح.' : 'Microphone permission denied. Please allow microphone access in browser settings.');
      } else {
        setErrorMessage(interfaceLanguage === 'ar' ? `حدث خطأ في التعرف على الصوت: ${event.error}` : `Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };
    
    // Start/stop listening based on isListening state
    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }
    
    // Clean up
    return () => {
      recognition.stop();
    };
  }, [isListening, language, onTranscriptChange]);

  const toggleListening = () => {
    if (isSupported) setIsListening(!isListening);
  };

  if (!isSupported) return null;

  return (
    <div className="speech-recognition">
      <button 
        onClick={toggleListening}
        className={`mic-button ${isListening ? 'listening' : ''}`}
        title={isListening ? 
          (interfaceLanguage === 'ar' ? 'جاري الاستماع...' : 'Listening...') : 
          (interfaceLanguage === 'ar' ? 'اضغط للتحدث' : 'Click to speak')
        }
        disabled={!isSupported || errorMessage !== null}
      >
        {isListening ? (
          <span className="listening-indicator">🎤</span>
        ) : (
          <span>🎤</span>
        )}
      </button>
      {errorMessage && <div className="error-message text-red-600 text-xs mt-1">{errorMessage}</div>}
    </div>
  );
};

export default SpeechRecognition;
