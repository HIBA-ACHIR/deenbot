
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import ChatContainer from '../components/ChatContainer';
import ChatInput from '../components/ChatInput';
import HasaniyaLessons from '../components/HasaniyaLessons';
import { useChat } from '../contexts/ChatContext';
import SuggestedQuestions from '../components/SuggestedQuestions';

const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { sendMessage, showHasaniyaLessons, currentConversation, selectConversation, fetchConversationById, createTempConversation } = useChat();
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  
  // Handle conversation ID from URL parameter
  useEffect(() => {
    // When the component mounts or conversation ID changes
    const loadConversation = async () => {
      if (conversationId) {
        console.log('ChatPage: Loading conversation from URL parameter:', conversationId);
        
        // Check if this is the current conversation already
        const currentId = currentConversation?.id;
        if (currentId !== conversationId) {
          console.log('ChatPage: Setting new conversation ID:', conversationId);
          
          try {
            // SelectConversation now handles both finding in state and fetching from API
            await selectConversation(conversationId);
            console.log('ChatPage: Conversation loaded successfully');
          } catch (error) {
            console.error('ChatPage: Error loading conversation:', error);
            // Navigate to main chat page if conversation couldn't be loaded
            navigate('/chat');
          }
        }
      } else if (!currentConversation) {
        // If we're on /chat without an ID and no current conversation, create a temporary one
        console.log('ChatPage: No conversation ID and no current conversation, creating temporary conversation');
        try {
          // Create a temp conversation - will be saved when user sends first message
          createTempConversation();
        } catch (error) {
          console.error('ChatPage: Error creating temporary conversation:', error);
        }
      }
    };
    
    loadConversation();
  }, [conversationId, currentConversation, selectConversation, fetchConversationById, navigate, createTempConversation]);
  
  // Questions suggérées en fonction de la langue
  const suggestedQuestions = language === 'ar' ? [
    "أخبرني عن أركان الإسلام الخمسة",
    "ما هو معنى الحج؟",
    "هل يمكنك شرح ما هو رمضان؟"
  ] : [
    "Tell me about the five pillars of Islam",
    "What is the meaning of Hajj?",
    "Can you explain what is Ramadan?"
  ];
  
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
  
  // Set up event listener for suggested prompts
  useEffect(() => {
    const handleSuggestedPrompt = (e: CustomEvent<string>) => {
      sendMessage(e.detail);
    };
    
    document.addEventListener('suggest-prompt', handleSuggestedPrompt as EventListener);
    
    return () => {
      document.removeEventListener('suggest-prompt', handleSuggestedPrompt as EventListener);
    };
  }, [sendMessage]);
  
  return (
    <Layout>
      <div className="flex h-[calc(100vh-2rem)]">
        <Sidebar />
        <div className="flex flex-col flex-1 h-full">
          {showHasaniyaLessons ? (
            <div className="flex-1 overflow-hidden">
              <HasaniyaLessons isVisible={true} />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-hidden">
                <ChatContainer />
              </div>
              <ChatInput />
              {/* Questions suggérées placées en dessous de la barre de saisie, comme HumainOS */}
              <div className="bg-white border-t border-gray-100 pb-3 pt-1">
                <SuggestedQuestions suggestions={suggestedQuestions} />
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ChatPage;
