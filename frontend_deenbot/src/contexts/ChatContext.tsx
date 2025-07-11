import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

// API endpoints
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8006' 
  : 'http://192.168.100.63:8006';

const API_ENDPOINTS = {
  CREATE_CONVERSATION: `${API_BASE_URL}/api/v1/chat/conversations`,
  GET_CONVERSATIONS: (userId: string) => `${API_BASE_URL}/api/v1/chat/user/${userId}/conversations`,
  CREATE_MESSAGE: `${API_BASE_URL}/api/v1/chat/messages`,
  GET_MESSAGES: (conversationId: string) => `${API_BASE_URL}/api/v1/chat/messages/${conversationId}`,
  DELETE_CONVERSATION: (conversationId: string) => `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}`,
  FATWA_ASK: `${API_BASE_URL}/fatwaask`,
  GENERATE_TITLE: `${API_BASE_URL}/generate-title`
};

export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context_extracts?: string[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  context_id?: string;
};

type ChatContextType = {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  showHasaniyaLessons: boolean;
  toggleHasaniyaLessons: () => void;
  createNewConversation: () => Promise<string>;
  createTempConversation: (initialTitle?: string) => string;
  selectConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  fetchConversationById: (id: string) => Promise<void>;
};

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHasaniyaLessons, setShowHasaniyaLessons] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    const handleLanguageChange = () => {
      const docLang = document.documentElement.lang || 'ar';
      setCurrentLanguage(docLang === 'en' ? 'en' : 'ar');
    };
    handleLanguageChange(); // Initial check
    const observer = new MutationObserver(handleLanguageChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      setIsLoading(true);
      try {
        if (user?.id) {
          const response = await fetch(API_ENDPOINTS.GET_CONVERSATIONS(user.id));
          if (response.ok) {
            const dbConversations = await response.json();
            const conversationsWithMessages = await Promise.all(
              dbConversations.map(async (conv: any) => {
                const msgResponse = await fetch(API_ENDPOINTS.GET_MESSAGES(conv.id));
                const messages: Message[] = [];
                if (msgResponse.ok) {
                  const messagesData = await msgResponse.json();
                  messagesData.forEach((msg: any) => {
                    // Use the stable backend ID for both question and answer
                    const messageId = msg.id;
                    
                    // Create user message from question
                    if (msg.question) {
                      messages.push({
                        id: messageId, // Use raw backend ID
                        content: msg.question,
                        role: 'user',
                        timestamp: new Date(msg.created_at)
                      });
                    }
                    
                    // Create assistant message from answer
                    if (msg.answer) {
                      messages.push({
                        id: messageId, // Same ID as the question for this turn
                        content: msg.answer,
                        role: 'assistant',
                        timestamp: new Date(msg.created_at),
                        context_extracts: msg.context_extracts || []
                      });
                    }
                  });
                  // Sort messages by timestamp
                  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                } else {
                  // Handle msgResponse not ok, perhaps log an error or set messages to empty
                  console.error(`Failed to fetch messages for conversation ${conv.id}: ${msgResponse.status}`);
                }
                
                return {
                  id: String(conv.id),
                  title: conv.title || (currentLanguage === 'ar' ? "محادثة جديدة" : "New Conversation"),
                  messages,
                  createdAt: new Date(conv.created_at),
                  updatedAt: new Date(conv.created_at),
                  context_id: conv.context_id
                };
              })
            );
            
            setConversations(conversationsWithMessages);
            if (conversationsWithMessages.length > 0) {
              setCurrentConversation(conversationsWithMessages[0]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [user?.id]);

  const createNewConversation = async (): Promise<string> => {
    try {
      const title = currentLanguage === 'ar' ? "محادثة جديدة" : "New Conversation";
      const userId = user?.id || 'guest';

      const response = await fetch(API_ENDPOINTS.CREATE_CONVERSATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newConversation: Conversation = {
          id: String(data.id),
          title,
          messages: [],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.created_at),
        };
        
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
        return newConversation.id;
      }
      throw new Error('Failed to create conversation');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Error creating conversation');
      
      // Fallback to local conversation
      const fallbackId = `conv_${Date.now().toString(36)}`;
      const fallbackConversation: Conversation = {
        id: fallbackId,
        title: currentLanguage === 'ar' ? "محادثة جديدة" : "New Conversation",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setConversations(prev => [fallbackConversation, ...prev]);
      setCurrentConversation(fallbackConversation);
      return fallbackId;
    }
  };

  // Create a temporary conversation that exists only in the UI until first message is sent
  const createTempConversation = (initialTitle?: string): string => {
    const title = initialTitle || (currentLanguage === 'ar' ? "محادثة جديدة" : "New Conversation");
    const tempId = `temp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    
    const tempConversation: Conversation = {
      id: tempId,
      title: title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Set as current conversation but don't add to sidebar list yet
    setCurrentConversation(tempConversation);
    console.log('Created temporary conversation:', tempConversation);
    
    return tempId;
  };

  const selectConversation = async (id: string) => {
    console.log(`Selecting conversation with ID: ${id}`);
    // First check if the conversation is in our state
    const conversation = conversations.find(conv => conv.id === id);
    
    if (conversation) {
      console.log('Found conversation in state:', conversation.title);
      setCurrentConversation(conversation);
      return;
    }
    
    // If not found in state, fetch from backend
    console.log('Conversation not found in state, fetching from backend...');
    try {
      await fetchConversationById(id);
      // Note: fetchConversationById already sets the conversation as current
      // and adds it to the conversations list
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const fetchConversationById = async (id: string) => {
    if (!id) return;

    try {
      setIsLoading(true);
      console.log(`Fetching conversation details for ID: ${id}`);
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${id}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');

      const conversationData = await response.json();
      console.log('Fetched conversation data:', conversationData);
      
      const msgResponse = await fetch(API_ENDPOINTS.GET_MESSAGES(id));
      let messages: Message[] = [];
      
      if (msgResponse.ok) {
        const messagesData = await msgResponse.json();
        console.log(`Fetched ${messagesData.length} messages for conversation ${id}`);
        
        // Create properly formatted message pairs from the API response
        messagesData.forEach((msg: any) => {
          // Use the stable backend ID for both question and answer
          const messageId = msg.id;
          
          // Create user message from question
          if (msg.question) {
            messages.push({
              id: messageId, // Use raw backend ID
              content: msg.question,
              role: 'user',
              timestamp: new Date(msg.created_at)
            });
          }
          
          // Create assistant message from answer
          if (msg.answer) {
            messages.push({
              id: messageId, // Same ID as the question for this turn
              content: msg.answer,
              role: 'assistant',
              timestamp: new Date(msg.created_at),
              context_extracts: msg.context_extracts || []
            });
          }
        });
        
        // Sort messages by timestamp
        messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      } else {
        console.error(`Failed to fetch messages for conversation ${id}: ${msgResponse.status}`);
      }

      const newConversation: Conversation = {
        id: String(conversationData.id),
        title: conversationData.title || (currentLanguage === 'ar' ? "محادثة جديدة" : "New Conversation"),
        messages,
        createdAt: new Date(conversationData.created_at),
        updatedAt: new Date(conversationData.created_at),
        context_id: conversationData.context_id
      };
      
      console.log('Created conversation object with title:', newConversation.title);

      // Add to conversations state, replacing if exists
      setConversations(prev => [
        newConversation, 
        ...prev.filter(c => c.id !== id)
      ]);
      
      // Set as current conversation
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast.error('Failed to load conversation');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      if (user) {
        await fetch(API_ENDPOINTS.DELETE_CONVERSATION(id), { method: 'DELETE' });
      }

      setConversations(prev => prev.filter(conv => conv.id !== id));
      
      if (currentConversation?.id === id) {
        const nextConversation = conversations.find(conv => conv.id !== id);
        setCurrentConversation(nextConversation || null);
        if (!nextConversation) {
          createNewConversation();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Error deleting conversation');
    }
  };

  // addMessageToConversation is no longer responsible for backend saving.
  // It was conflicting with the backend's expectation of a single question+answer payload.
  // sendMessage now handles the entire flow including UI updates for its messages.
  // This function can be kept for other potential UI-only message additions if needed, or removed.
  const addMessageToConversation = (conversationId: string, message: Message) => {
    // This function is now purely for UI updates if called from elsewhere.
    setConversations(prevConvs =>
      prevConvs.map(conv =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message], updatedAt: new Date() }
          : conv
      )
    );
    if (currentConversation?.id === conversationId) {
        setCurrentConversation(prevCurrentConv =>
            prevCurrentConv ? { ...prevCurrentConv, messages: [...prevCurrentConv.messages, message], updatedAt: new Date() } : null
        );
    }
  };

  const generateTitle = async (userMessage: string, botResponse: string): Promise<string> => {
    try {
      const defaultTitle = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
      
      // Check if userMessage or botResponse are empty, if so, return default title early
      if (!userMessage.trim() && !botResponse.trim()) {
        return currentLanguage === 'ar' ? "محادثة جديدة" : "New Conversation";
      }
      if (!userMessage.trim()) {
        return botResponse.slice(0,30) + (botResponse.length > 30 ? '...' : '');
      }

      const response = await fetch(API_ENDPOINTS.GENERATE_TITLE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_message: userMessage, assistant_response: botResponse })
      });
      
      return response.ok 
        ? (await response.json()).title || defaultTitle 
        : defaultTitle;
    } catch (error) {
      console.error("Error generating title:", error);
      // Fallback title if API call fails or other errors occur
      return userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '') || (currentLanguage === 'ar' ? "محادثة جديدة" : "New Conversation");
    }
  };

  const sendMessage = async (userInput: string) => {
    if (!user) {
      toast.error("User not available. Please ensure you are logged in.");
      return;
    }
    
    // If no conversation exists, create a temporary one
    if (!currentConversation) {
      createTempConversation();
      toast.error("No conversation selected. Created a new one.");
      return;
    }
    
    // Check if this is a temporary conversation that needs to be created on the backend
    const isTemporaryConversation = currentConversation.id.startsWith('temp_');
    let conversationId = currentConversation.id;

    const userMessageForUI: Message = {
      id: `msg_${Date.now()}_user_${Math.random().toString(36).substring(2, 9)}`,
      content: userInput,
      role: 'user',
      timestamp: new Date(),
    };
    
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, messages: [...conv.messages, userMessageForUI], updatedAt: new Date() } : conv
    ));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => prev ? { ...prev, messages: [...prev.messages, userMessageForUI], updatedAt: new Date() } : prev);
    }

    try {
      setIsLoading(true);
      
      // If this is a temporary conversation, create a real one in the backend first
      if (isTemporaryConversation) {
        console.log('Creating real conversation from temporary one before sending message...');
        const createResponse = await fetch(API_ENDPOINTS.CREATE_CONVERSATION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            title: currentConversation.title
          })
        });
        
        if (!createResponse.ok) {
          throw new Error('Failed to create conversation on backend');
        }
        
        const newConversationData = await createResponse.json();
        conversationId = String(newConversationData.id); // Use the real ID from now on
        console.log(`Temporary conversation converted to real one with ID: ${conversationId}`);
        
        // Create a real conversation object to replace the temporary one
        // IMPORTANT: Include the userMessageForUI in the messages array
        const realConversation: Conversation = {
          id: conversationId,
          title: currentConversation.title,
          messages: [...currentConversation.messages, userMessageForUI], // Include the current message
          createdAt: new Date(newConversationData.created_at),
          updatedAt: new Date(newConversationData.created_at),
          context_id: currentConversation.context_id
        };
        
        // Replace the temporary conversation with the real one in state
        setCurrentConversation(realConversation);
        
        // Add to conversations list now that it's real
        setConversations(prev => prev.filter(c => c.id !== currentConversation.id).concat([realConversation]));
        
        console.log('Real conversation now contains message:', realConversation.messages);
      }
      
      // Now send the message with the correct conversation ID
      const response = await fetch(API_ENDPOINTS.CREATE_MESSAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_id: user.id,
          question: userInput, 
          answer: "", 
          context_id: currentConversation.context_id || null,
          language: currentLanguage // Send detected language
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to send message and get response' }));
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId ? { ...conv, messages: conv.messages.filter(m => m.id !== userMessageForUI.id) } : conv
        ));
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(prev => prev ? { ...prev, messages: prev.messages.filter(m => m.id !== userMessageForUI.id)} : prev);
        }
        throw new Error(errorData.detail || 'Failed to send message');
      }

      const backendMessageData = await response.json(); 

      const assistantMessageForUI: Message = {
        id: backendMessageData.id, // Use the stable backend ID
        content: backendMessageData.answer,
        role: 'assistant',
        timestamp: new Date(backendMessageData.created_at),
        context_extracts: backendMessageData.context_extracts,
      };
      
      // Important: Ensure the user message (userMessageForUI) is correctly handled if backend returns the question too.
      // The backend's create_message saves the question and answer. The frontend's loadConversations splits them.
      // Here, we optimistically added userMessageForUI. If backendMessageData.question is the same as userInput,
      // we just need to add the assistantMessageForUI.

      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages: [...conv.messages, assistantMessageForUI], updatedAt: new Date() } 
            : conv
        )
      );

      setCurrentConversation(prevCurrentConversation => {
        if (prevCurrentConversation && prevCurrentConversation.id === conversationId) {
          return { 
            ...prevCurrentConversation, 
            messages: [...prevCurrentConversation.messages, assistantMessageForUI], 
            updatedAt: new Date() 
          };
        }
        return prevCurrentConversation;
      });
      
      // Check messages count after state updates have likely propagated
      // Use a slight delay or a more robust way to get the updated count if necessary
      const finalConversation = conversations.find(c => c.id === conversationId);
      const assistantMessagesCount = finalConversation?.messages.filter(m => m.role === 'assistant').length ?? 0;

      // Generate title only for temporary conversations after the first message
      if (isTemporaryConversation && assistantMessagesCount === 1 && userInput && backendMessageData.answer) {
        const title = await generateTitle(userInput, backendMessageData.answer);
        await updateConversationTitle(conversationId, title); 
      }

    } catch (error) {
      console.error('Error sending message or getting response:', error);
      toast.error((error as Error).message || 'Failed to process message');
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, messages: conv.messages.filter(m => m.id !== userMessageForUI.id) } : conv
      ));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, messages: prev.messages.filter(m => m.id !== userMessageForUI.id)} : prev);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateConversationTitle = async (conversationId: string, title: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, title } : conv
    ));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => prev ? { ...prev, title } : prev);
    }
    // TODO: Add backend call to persist title change if an endpoint exists
    // Example: await fetch(`/api/v1/chat/conversations/${conversationId}/title`, { method: 'PUT', body: JSON.stringify({ title }) });
  };

  const toggleHasaniyaLessons = () => {
    setShowHasaniyaLessons(prev => !prev);
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      currentConversation,
      isLoading,
      showHasaniyaLessons,
      toggleHasaniyaLessons,
      createNewConversation,
      createTempConversation,
      selectConversation,
      sendMessage,
      deleteConversation,
      updateConversationTitle,
      fetchConversationById
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};