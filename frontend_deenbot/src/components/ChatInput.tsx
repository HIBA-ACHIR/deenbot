import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, FileAudio, Youtube, Paperclip, Video, Image } from 'lucide-react';
import SpeechRecognition from './SpeechRecognition';
import MediaChat from './MediaChat';
import { motion, AnimatePresence } from 'framer-motion';

const ChatInput: React.FC = () => {
  const { sendMessage, isLoading } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [showMediaChat, setShowMediaChat] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  
  // Détecter la langue active
  useEffect(() => {
    const handleLanguageChange = () => {
      const docLang = document.documentElement.lang || 'ar';
      setLanguage(docLang === 'en' ? 'en' : 'ar');
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    sendMessage(inputValue.trim());
    setInputValue('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTranscriptChange = (transcript: string) => {
    setInputValue(transcript);
  };

  return (
    <div className="flex flex-col">
      <AnimatePresence>
        {showMediaChat && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white border-t border-gray-100 shadow-inner">
              <MediaChat onClose={() => setShowMediaChat(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="border-t bg-white p-4 shadow-lg">
        <form onSubmit={handleSubmit} className="container mx-auto max-w-2xl">
          <div className="relative flex items-center w-full gap-2">
            <Textarea
              ref={textareaRef}
              placeholder={language === 'ar' ? "اكتب سؤالك هنا..." : "Type your question here..."}
              dir={language === 'ar' ? "rtl" : "ltr"}
              className={`resize-none min-h-12 py-3 ${language === 'ar' ? 'pr-14 pl-14' : 'pl-14 pr-24'} rounded-2xl border-gray-200 focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 shadow-sm`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            
            {/* Bouton d'envoi animé */}
            <motion.div 
              className="absolute right-2 bottom-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                type="submit"
                size="icon"
                className={`h-9 w-9 rounded-full transition-colors ${inputValue.trim() ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-300'}`}
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="h-4 w-4 text-white" />
                <span className="sr-only">إرسال الرسالة</span>
              </Button>
            </motion.div>
            
            {/* Bouton d'upload avec menu accordéon */}
            <motion.div 
              className={`absolute ${language === 'ar' ? 'left-2' : 'right-12'} bottom-2 flex items-center gap-1`}
              whileHover={{ scale: 1.02 }}
            >
              <Button 
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full border-gray-300"
                onClick={() => setShowMediaChat(!showMediaChat)}
                title="تحميل ملف صوتي أو فيديو"
              >
                {showMediaChat ? (
                  <Youtube className="h-4 w-4 text-red-500" />
                ) : (
                  <Paperclip className="h-4 w-4 text-gray-500" />
                )}
              </Button>
              
              <SpeechRecognition onTranscriptChange={handleTranscriptChange} language="ar-SA" />
            </motion.div>
          </div>
          
          {/* Espace pour les suggestions */}
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
