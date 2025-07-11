import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import ChatMessage from './ChatMessage';

import { Button } from '@/components/ui/button';
import { MessageSquare, Bot, Upload, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';
import SuggestedQuestions from './SuggestedQuestions';

// No icon pattern

const ChatContainer: React.FC = () => {
  const { currentConversation, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRenderTimestamp = useRef<number>(Date.now());
  

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
  
  // We no longer clear animation history to prevent messages from re-animating
  // Animation state is persistent across page reloads
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Update last render timestamp for animation tracking
    lastRenderTimestamp.current = Date.now();
  }, [currentConversation?.messages]);
  


  if (!currentConversation || currentConversation.messages.length === 0) {
    // Questions suggérées en fonction de la langue
    const suggestedQuestionsAr = [
      "أخبرني عن أركان الإسلام الخمسة",
      "ما هو معنى الحج؟",
      "هل يمكنك شرح ما هو رمضان؟"
    ];
    
    const suggestedQuestionsEn = [
      "Tell me about the five pillars of Islam",
      "What is the meaning of Hajj?",
      "Can you explain what is Ramadan?"
    ];

    // Contenu en arabe
    const arabicContent = (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px-160px)] max-w-2xl mx-auto px-4 text-center p-6 relative">
        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Titre principal style HumainOS */}
          <h1 
            className="w-full text-2xl font-bold my-4 mx-auto text-center" 
            style={{ color: '#00695C', fontFamily: '"Amiri", "Noto Sans Arabic", sans-serif', fontSize: '2.5rem' }}
          >
            بسم الله الرحمن الرحيم
          </h1>
          
          <h2 
            className="w-full text-2xl font-semibold mb-6 text-center"
            style={{ color: '#00695C', fontFamily: '"Amiri", "Noto Sans Arabic", sans-serif'}}
            dir="rtl"
          >
            مرحباً بك في مساعدك لفهم الدروس الحسنية
          </h2>
          
          {/* Espace entre le titre et le contenu */}
          <div className="my-6"></div>
        </div>
      </div>
    );
    
    // Contenu en anglais
    const englishContent = (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px-160px)] max-w-2xl mx-auto px-4 text-center p-6 relative">
        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Titre principal style HumainOS */}
          <h1 
            className="w-full text-2xl font-bold my-4 mx-auto text-center" 
            style={{ color: '#00695C', fontFamily: '"Poppins", "Roboto", sans-serif', fontSize: '2.5rem' }}
          >
            In the name of Allah, the Most Gracious, the Most Merciful
          </h1>
          
          <h2 
            className="w-full text-2xl font-semibold mb-6 text-center"
            style={{ color: '#00695C', fontFamily: '"Poppins", "Roboto", sans-serif'}}
          >
            Welcome to your Hassani Lessons Assistant
          </h2>
          
          {/* Espace entre le titre et le contenu */}
          <div className="my-6"></div>
        </div>
      </div>
    );
    
    // Afficher le contenu selon la langue sélectionnée
    return language === 'ar' ? arabicContent : englishContent;
  }

  return (
    <div className="flex flex-col h-full relative bg-white pb-[120px] min-h-[calc(100vh-56px-80px)]">
      {/* Zone de conversation avec défilement */}
      <div className="absolute inset-0 overflow-y-auto" style={{ scrollPaddingBottom: '140px' }}>
        <div className="min-h-full pb-[120px]">

          
          {/* Padding added to prevent chat input overlap */}
          {currentConversation.messages.map((message) => (
            <ChatMessage key={`${message.id}-${message.role}`} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex items-center px-4 py-6 bg-white border-t border-primary/10">
              <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full border border-[#00695C]/20 shadow bg-[#00695C]">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="ml-4 flex space-x-2">
                <div className="h-3 w-3 rounded-full bg-[#00695C]/40 animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-3 w-3 rounded-full bg-[#00695C]/40 animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-3 w-3 rounded-full bg-[#00695C]/40 animate-bounce"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
