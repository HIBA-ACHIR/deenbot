import React from 'react';
import { FileText, FileVideo, FileAudio, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatFileContextProps {
  fileType: 'youtube' | 'audio' | 'video' | 'document';
  title: string;
  preview?: string;
  className?: string;
}

/**
 * Affiche une carte contextuelle sur le fichier/vidéo associé à la conversation
 */
const ChatFileContext: React.FC<ChatFileContextProps> = ({
  fileType,
  title,
  preview,
  className
}) => {
  // Sélection de l'icône en fonction du type de fichier
  const FileIcon = {
    youtube: Youtube,
    audio: FileAudio,
    video: FileVideo,
    document: FileText
  }[fileType];

  return (
    <div className={cn(
      "bg-primary/5 border border-primary/20 rounded-lg overflow-hidden transition-all p-3",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary rounded-md p-2 mt-1">
          <FileIcon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-primary truncate">{title}</h3>
          
          {preview && (
            <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {preview}
            </div>
          )}
          
          <div className="mt-2 text-xs text-primary/60">
            Contenu traité et prêt à être exploré
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatFileContext;
