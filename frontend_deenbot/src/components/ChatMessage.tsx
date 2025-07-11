import React, { useState, useEffect, useContext } from 'react';
import { Message } from '../contexts/ChatContext';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import TypewriterEffect from './TypewriterEffect';
import { useAnimationContext } from '../contexts/AnimationContext';

// Create a composite key for React rendering
const getCompositeKey = (message: Message): string => {
  return `${message.id}-${message.role}`;
};

// Function to check if a message has been displayed already
const hasMessageBeenDisplayed = (messageId: string): boolean => {
  try {
    const displayedMessageIds = localStorage.getItem('deenbot_displayed_messages');
    console.log(`[hasMessageBeenDisplayed] Checking for ID: ${messageId}. Storage:`, displayedMessageIds);
    if (!displayedMessageIds) return false;
    
    const messageIds = JSON.parse(displayedMessageIds) as string[];
    const result = messageIds.includes(messageId);
    console.log(`[hasMessageBeenDisplayed] ID ${messageId} found?`, result);
    return result;
  } catch (error) {
    console.error('Error checking displayed messages:', error);
    return false;
  }
};

// Function to mark a message as displayed
const markMessageAsDisplayed = (messageId: string): void => {
  try {
    console.log(`[markMessageAsDisplayed] Attempting to mark ID: ${messageId}`);
    const displayedMessageIds = localStorage.getItem('deenbot_displayed_messages');
    let messageIds: string[] = [];
    
    if (displayedMessageIds) {
      messageIds = JSON.parse(displayedMessageIds) as string[];
    }
    
    if (!messageIds.includes(messageId)) {
      messageIds.push(messageId);
      localStorage.setItem('deenbot_displayed_messages', JSON.stringify(messageIds));
      console.log(`[markMessageAsDisplayed] Successfully marked ID: ${messageId}. New storage:`, localStorage.getItem('deenbot_displayed_messages'));
    } else {
      console.log(`[markMessageAsDisplayed] ID ${messageId} was already marked.`);
    }
  } catch (error) {
    console.error('Error marking message as displayed:', error);
  }
};

const isArabic = (text: string) => {
  const arabicRegex = /[\u0600-\u06ff]/;
  return arabicRegex.test(text);
};

type ChatMessageProps = {
  message: Message;
};

// Composant pour afficher les extraits de contexte
const ContextExtracts: React.FC<{ extracts: string[] }> = ({ extracts }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!extracts || extracts.length === 0) return null;
  
  return (
    <div className="mt-3 border-t border-primary/10 pt-3 text-sm">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center text-primary/70 hover:text-primary font-medium mb-2"
      >
        <span className="mr-1">{expanded ? '▼' : '►'}</span>
        Sources ({extracts.length})
      </button>
      
      {expanded && (
        <div className="bg-slate-50 rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
          {extracts.map((extract, index) => (
            <div key={index} className="text-xs text-slate-700 leading-relaxed border-l-2 border-primary/30 pl-2">
              {extract.length > 300 ? `${extract.substring(0, 300)}...` : extract}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const compositeKey = getCompositeKey(message);
  console.log(`[ChatMessage] Rendering message with ID: ${message.id}, role: ${message.role}, composite key: ${compositeKey}`);
  
  const isUser = message.role === 'user';
  
  // Use animation context for tracking displayed messages
  const { displayedMessages, markMessageDisplayed } = useAnimationContext();
  
  // Check if message should animate
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(false);
  
  useEffect(() => {
    // Only animate assistant messages that haven't been displayed
    if (!isUser && !displayedMessages.includes(message.id)) {
      setShouldAnimate(true);
      
      // Mark as displayed after animation completes
      const messageLength = message.content.length;
      const estimatedDuration = Math.min(messageLength * 8, 8000);
      
      setTimeout(() => {
        markMessageDisplayed(message.id);
      }, estimatedDuration);
    }
  }, [message.id, isUser, displayedMessages, markMessageDisplayed]);

  return (
    <div
      className={cn(
        "flex w-full items-start gap-4 px-4 py-6 relative",
        isUser ? "bg-white" : "bg-white border-b border-primary/5"
      )}
    >
      {/* Pas d'élément décoratif */}
      
      <div className={cn(
        "flex shrink-0 select-none items-center justify-center shadow border",
        isUser 
          ? "h-8 w-8 rounded-full bg-secondary/10 border-secondary/20" 
          : "h-9 w-9 rounded-full bg-[#00695C] border-[#00695C]/20"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-secondary-foreground" />
        ) : (
          <Bot className="h-5 w-5 text-primary-foreground" />
        )}
      </div>
      
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex justify-between items-center">
          <p className={cn(
            "font-semibold",
            isUser ? "text-secondary-foreground" : "text-[#00695C] font-['Aref_Ruqaa',_serif] text-lg"
          )}>
            {isUser ? "You" : "DeenBot"}
          </p>
          <time className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/30">
            {format(message.timestamp, "h:mm a")}
          </time>
        </div>
        
        {isUser ? (
          <div 
            className={cn(
              "max-w-none p-3 rounded-lg", 
              isUser && "bg-white border border-secondary/10"
            )}
            dir={isArabic(message.content) ? "rtl" : "ltr"}
            style={{ 
              textAlign: isArabic(message.content) ? 'right' : 'left',
              fontFamily: isArabic(message.content) ? '"Noto Sans Arabic", "Tajawal", "Cairo", Arial, sans-serif' : 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              fontStyle: 'normal',
              fontSize: '16px',
              lineHeight: '1.5',
              color: 'rgb(55, 65, 81)',
              letterSpacing: 'normal',
              fontWeight: '400'
            }}
          >
            {message.content}
          </div>
        ) : (
          <div className="relative">
            {shouldAnimate ? (
              <TypewriterEffect 
                text={message.content}
                speed={10}
                className={cn(
                  "max-w-none p-3 rounded-lg", 
                  !isUser && "bg-white border border-primary/10"
                )}
                dir={isArabic(message.content) ? "rtl" : "ltr"}
                style={{ 
                  textAlign: isArabic(message.content) ? 'right' : 'left',
                  fontFamily: isArabic(message.content) ? '"Noto Sans Arabic", "Tajawal", "Cairo", Arial, sans-serif' : 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  fontStyle: 'normal',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  color: 'rgb(55, 65, 81)',
                  letterSpacing: 'normal',
                  fontWeight: '400'
                }}
              />
            ) : (
              <div
                className={cn(
                  "max-w-none p-3 rounded-lg", 
                  !isUser && "bg-white border border-primary/10"
                )}
                dir={isArabic(message.content) ? "rtl" : "ltr"}
                style={{ 
                  textAlign: isArabic(message.content) ? 'right' : 'left',
                  fontFamily: isArabic(message.content) ? '"Noto Sans Arabic", "Tajawal", "Cairo", Arial, sans-serif' : 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  fontStyle: 'normal',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  color: 'rgb(55, 65, 81)',
                  letterSpacing: 'normal',
                  fontWeight: '400'
                }}
              >
                {message.content}
                
                {/* Afficher les extraits de contexte s'ils existent */}
                {message.context_extracts && message.context_extracts.length > 0 && (
                  <ContextExtracts extracts={message.context_extracts} />
                )}
              </div>
            )}
            
            {/* Pas d'étoile décorative */}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
