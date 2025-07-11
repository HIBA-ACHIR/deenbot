import React, { useState, useEffect, useRef } from 'react';
import { useChat, Conversation } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Menu, 
  X, 
  BookOpen,
  Tv
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import UploadButton from './UploadButton';
import { Link as RouterLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const { conversations, currentConversation, createTempConversation, selectConversation, deleteConversation, showHasaniyaLessons, toggleHasaniyaLessons, fetchConversationById } = useChat();
  const { isAuthenticated } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contextChatsExpanded, setContextChatsExpanded] = useState(true);
  const [noContextChatsExpanded, setNoContextChatsExpanded] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  
  // Références pour mesurer les hauteurs
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [conversationListHeight, setConversationListHeight] = useState('20vh');
  
  // Calcul dynamique de la hauteur maximale pour la liste des conversations
  useEffect(() => {
    const updateHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const buttonsHeight = 140; // Hauteur approximative des boutons
      const footerHeight = 60;   // Hauteur du footer
      
      // Calculer la hauteur disponible
      const availableHeight = windowHeight - headerHeight - buttonsHeight - footerHeight;
      setConversationListHeight(`${Math.max(200, availableHeight)}px`);
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
  // Suivre les changements de langue du document
  useEffect(() => {
    const handleLanguageChange = () => {
      const docLang = document.documentElement.lang || 'ar';
      setLanguage(docLang === 'en' ? 'en' : 'ar');
    };
    
    handleLanguageChange();
    document.addEventListener('languagechange', handleLanguageChange);
    
    // Observer les changements d'attribut lang
    const observer = new MutationObserver(() => {
      handleLanguageChange();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    
    return () => {
      document.removeEventListener('languagechange', handleLanguageChange);
      observer.disconnect();
    };
  }, []);
  
  // Toggle l'état d'expansion des conversations avec contexte
  const toggleContextChats = () => {
    setContextChatsExpanded(!contextChatsExpanded);
  };

  // Toggle l'état d'expansion des conversations sans contexte
  const toggleNoContextChats = () => {
    setNoContextChatsExpanded(!noContextChatsExpanded);
  };
  
  // Toggle l'état collapsed de la sidebar
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Filtrer les conversations avec contexte (YouTube/audio)
  const contextConversations = conversations.filter(conv => conv.context_id);

  // Filtrer les conversations sans contexte
  const noContextConversations = conversations.filter(conv => !conv.context_id);
  
  // Suppression de renderConversationItem comme fonction indépendante
  // À la place, nous allons intégrer directement le code dans les sections où il est nécessaire
  
  return (
    <div className={cn(
      "hidden md:flex flex-col border-r bg-card transition-all duration-300 h-[calc(100vh-3.5rem)] shadow-md",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* En-tête de la sidebar optimisé */}
      <div ref={headerRef} className="py-2 px-3 flex items-center justify-between border-b bg-accent/30">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="h-8 w-8 hover:bg-primary/20"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Contenu principal */}
      <div ref={contentRef} className="flex-1 flex flex-col overflow-hidden">
        {/* Boutons principaux */}
        <div className={cn(
          "space-y-2",
          isCollapsed ? "px-2 pt-3 pb-2" : "px-3 pt-3 pb-2"
        )}>
          {/* Bouton Upload pour Hassani Lessons - maintenant lien vers la nouvelle page */}
          <RouterLink to="/addourous-hassanya" className="w-full block">
            <UploadButton 
              isCollapsed={isCollapsed}
              onUploadSuccess={(transcriptionId, preview, topic, conversationId) => {
                // La navigation est gérée par RouterLink, on peut garder la logique de succès si besoin
                // ou la déplacer vers la nouvelle page.
                // Pour l'instant, on logue juste le succès.
                console.log('Upload success, redirecting to Addourous Hassanya page. Context ID:', transcriptionId, 'Conv ID:', conversationId);
                if (conversationId) {
                   toast.info(language === 'ar' ? 'سيتم توجيهك لصفحة الدروس الحسنية بعد قليل...' : 'Redirecting to Addourous Hassanya page shortly...');
                }
              }}
              buttonText={language === 'ar' ? "تحويل محتوى حسني" : "Convert Hassani Content"}
              isLink={true} // Ajout d'une prop pour indiquer que c'est un lien
            />
          </RouterLink>
        </div>
        
        {/* Liste des conversations */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden",
          isCollapsed ? "px-1 pt-6" : "px-2 pt-2"
        )}>
          {/* Section 1: Conversations avec contexte (YouTube/audio) */}
          <div className="mb-2">
            <div className={cn(
              "flex items-center justify-between",
              isCollapsed ? "justify-center px-0" : "px-3 py-1.5"
            )}>
              {isCollapsed ? (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                  <Tv className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <button
                  onClick={toggleContextChats}
                  disabled={contextConversations.length === 0}
                  aria-expanded={contextChatsExpanded}
                  className={cn(
                    "relative group w-full rounded-xl overflow-hidden h-10 border border-[#00695C]/20 bg-[#00695C]/5 hover:bg-[#00695C]/10 text-[#00695C] shadow-sm flex items-center justify-between px-3",
                    contextConversations.length === 0 && "opacity-50 pointer-events-none"
                  )}
                >
                  {contextChatsExpanded ? <ChevronDown className="h-4 w-4 text-current flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-current flex-shrink-0" />}
                  <span className="font-medium text-sm flex-grow text-center">
                    {language === 'ar' ? 'حوارات حسنية' : 'Hassani Chats'}
                  </span>
                  <Tv className="h-4 w-4 text-current flex-shrink-0" />
                </button>
              )}
            </div>
          </div>
          
          {/* Liste des conversations avec contexte */}
          {contextChatsExpanded && !isCollapsed && (
            <div 
              className="overflow-y-auto pr-1 space-y-0.5" 
              style={{ maxHeight: conversationListHeight }}
            >
              {contextConversations.length > 0 ? (
                contextConversations.map((conversation) => {
                  // Génération du titre à partir du premier message si nécessaire
                  let displayTitle = conversation.title;
                  
                  const defaultTitleAr = "محادثة جديدة";
                  const defaultTitleEn = "New Conversation";
                  const isDefaultTitle = displayTitle === defaultTitleAr || displayTitle === defaultTitleEn;
                  
                  if (isDefaultTitle && conversation.messages && conversation.messages.length > 0) {
                    const firstUserMsg = conversation.messages.find(msg => msg.role === 'user');
                    if (firstUserMsg && firstUserMsg.content) {
                      const msgContent = firstUserMsg.content;
                      // Extraire les premiers mots pour le titre
                      displayTitle = msgContent.split(' ').slice(0, 3).join(' ').trim();
                      displayTitle = displayTitle + (displayTitle.endsWith('?') ? '' : '...');
                    }
                  }
                  
                  return (
                    <div key={conversation.id} className="flex items-center group relative">
                      <Button
                        variant={currentConversation && currentConversation.id === conversation.id ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start text-left py-1 h-auto text-sm transition-all",
                          currentConversation && currentConversation.id === conversation.id ? "bg-secondary/30 shadow-sm font-medium" : "hover:bg-accent/70"
                        )}
                        onClick={() => {selectConversation(conversation.id);}}
                      >
                        <div className="flex flex-col w-full overflow-hidden pr-6">
                          <div className="flex items-center gap-1">
                            {conversation.context_id && <Tv className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                            <span className="truncate font-medium">{displayTitle}</span>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {conversation.createdAt ? format(new Date(conversation.createdAt), 'dd/MM/yyyy') : ''}
                          </div>
                        </div>
                      </Button>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-destructive p-1 rounded-full hover:bg-destructive/20 absolute right-2 transition-opacity"
                        title={language === 'ar' ? "حذف المحادثة" : "Delete conversation"}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {language === 'ar' ? 'لا توجد محادثات مع سياق' : 'No conversations with context'}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Conversations sans contexte */}
          <div className="mb-2 mt-2">
            <div className={cn(
              "flex items-center justify-between",
              isCollapsed ? "justify-center px-0" : "px-3 py-1.5"
            )}>
              {isCollapsed ? (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <button
                  onClick={toggleNoContextChats}
                  disabled={noContextConversations.length === 0}
                  aria-expanded={noContextChatsExpanded}
                  className={cn(
                    "relative group w-full rounded-xl overflow-hidden h-10 border border-[#00695C]/20 bg-[#00695C]/5 hover:bg-[#00695C]/10 text-[#00695C] shadow-sm flex items-center justify-between px-3",
                    noContextConversations.length === 0 && "opacity-50 pointer-events-none"
                  )}
                >
                  {noContextChatsExpanded ? <ChevronDown className="h-4 w-4 text-current flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-current flex-shrink-0" />}
                  <span className="font-medium text-sm flex-grow text-center">
                    {language === 'ar' ? 'محادثات في الدين' : 'Religious Chats'}
                  </span>
                  <MessageSquare className="h-4 w-4 text-current flex-shrink-0" />
                </button>
              )}
            </div>
          </div>
          
          {/* Liste des conversations sans contexte */}
          {noContextChatsExpanded && !isCollapsed && (
            <div 
              className="overflow-y-auto pr-1 space-y-0.5" 
              style={{ maxHeight: conversationListHeight }}
            >
              {noContextConversations.length > 0 ? (
                noContextConversations.map((conversation) => {
                  // Génération du titre à partir du premier message si nécessaire
                  let displayTitle = conversation.title;
                  
                  const defaultTitleAr = "محادثة جديدة";
                  const defaultTitleEn = "New Conversation";
                  const isDefaultTitle = displayTitle === defaultTitleAr || displayTitle === defaultTitleEn;
                  
                  if (isDefaultTitle && conversation.messages && conversation.messages.length > 0) {
                    const firstUserMsg = conversation.messages.find(msg => msg.role === 'user');
                    if (firstUserMsg && firstUserMsg.content) {
                      const msgContent = firstUserMsg.content;
                      // Extraire les premiers mots pour le titre
                      displayTitle = msgContent.split(' ').slice(0, 3).join(' ').trim();
                      displayTitle = displayTitle + (displayTitle.endsWith('?') ? '' : '...');
                    }
                  }
                  
                  return (
                    <div key={conversation.id} className="flex items-center group relative">
                      <Button
                        variant={currentConversation && currentConversation.id === conversation.id ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start text-left py-1 h-auto text-sm transition-all",
                          currentConversation && currentConversation.id === conversation.id ? "bg-secondary/30 shadow-sm font-medium" : "hover:bg-accent/70"
                        )}
                        onClick={() => {selectConversation(conversation.id);}}
                      >
                        <div className="flex flex-col w-full overflow-hidden pr-6">
                          <div className="flex items-center gap-1">
                            {conversation.context_id && <Tv className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                            <span className="truncate font-medium">{displayTitle}</span>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {conversation.createdAt ? format(new Date(conversation.createdAt), 'dd/MM/yyyy') : ''}
                          </div>
                        </div>
                      </Button>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-destructive p-1 rounded-full hover:bg-destructive/20 absolute right-2 transition-opacity"
                        title={language === 'ar' ? "حذف المحادثة" : "Delete conversation"}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {language === 'ar' ? 'لا توجد محادثات في الدين' : 'No Islamic chats'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Bouton de nouvelle conversation */}
      <div className={cn(
        "mt-auto border-t border-primary/10",
        isCollapsed ? "px-2 py-2" : "px-3 py-2"
      )}>
        <Button 
          onClick={() => {
            // Create a temporary conversation that will only be saved to backend when first message is sent
            createTempConversation(language === 'ar' ? "محادثة جديدة" : "New Conversation");
            console.log('Created temporary conversation - will be saved when first message is sent');
          }} 
          className={cn(
            "gap-2 w-full bg-[#00695C] hover:bg-[#00695C]/90 text-white shadow-sm h-10 flex items-center justify-center overflow-hidden",
            isCollapsed ? "p-0 rounded-full" : "rounded-xl"
          )}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <Plus className={cn("flex-shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
          {!isCollapsed && (
            <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {language === 'ar' ? "محادثة في الدين" : "New Islamic Chat"}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
