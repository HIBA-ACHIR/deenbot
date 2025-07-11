import React, { useState, useEffect } from 'react';
import { Upload, Folder, FileUp, Link2, Youtube, FileAudio, Youtube as YoutubeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import MediaUploader from './MediaUploader';
import YouTubeInput from './YouTubeInput';
import DirectYouTubeProcessor from './DirectYouTubeProcessor';

interface UploadButtonProps {
  isCollapsed?: boolean;
  onUploadSuccess: (transcriptionId: string, preview: string, topic?: string, conversationId?: string) => void;
  buttonText?: string;
  isLink?: boolean;
}

const UploadButton: React.FC<UploadButtonProps> = ({ 
  isCollapsed = false,
  onUploadSuccess,
  buttonText,
  isLink = false
}) => {
  const [open, setOpen] = React.useState(false);
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

  const handleUploadSuccess = (transcriptionId: string, preview: string, topic?: string, conversationId?: string) => {
    // Make sure to complete state changes before closing the modal
    // This prevents navigation issues by ensuring React state updates complete first
    setTimeout(() => {
      setOpen(false);
    }, 500);
    
    onUploadSuccess(transcriptionId, preview, topic, conversationId);
  };

  if (isLink) {
    return (
      <Button 
        variant="outline" 
        className={cn(
          "relative group w-full rounded-xl overflow-hidden h-10 border-[#00695C]/20 bg-[#00695C]/5 hover:bg-[#00695C]/10 flex items-center justify-center",
          isCollapsed && "px-0 rounded-full"
        )}
        // onClick prop can be added here if the link button needs to perform an action before navigation
      >
        {/* Halo effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10"></div>
        
        {/* Islamic geometric accent */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-primary">
            <pattern id="islamic-pattern-link" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M10,0 L12,8 L20,10 L12,12 L10,20 L8,12 L0,10 L8,8 z" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#islamic-pattern-link)" />
          </svg>
        </div>

        <div className="relative flex items-center gap-2">
          <YoutubeIcon className="h-4 w-4 text-[#00695C] flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-[#00695C] font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              {buttonText ? buttonText : (language === 'ar' ? 'تحويل محتوى حسني من يوتيوب' : 'Upload Hassani Content from YouTube')}
            </span>
          )}
        </div>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "relative group w-full rounded-xl overflow-hidden h-10 border-[#00695C]/20 bg-[#00695C]/5 hover:bg-[#00695C]/10 flex items-center justify-center",
            isCollapsed && "px-0 rounded-full"
          )}
        >
          {/* Halo effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10"></div>
          
          {/* Islamic geometric accent */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-primary">
              <pattern id="islamic-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M10,0 L12,8 L20,10 L12,12 L10,20 L8,12 L0,10 L8,8 z" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
            </svg>
          </div>

          <div className="relative flex items-center gap-2">
            <YoutubeIcon className="h-4 w-4 text-[#00695C] flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-[#00695C] font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {buttonText ? buttonText : (language === 'ar' ? 'تحويل محتوى حسني من يوتيوب' : 'Upload Hassani Content from YouTube')}
              </span>
            )}
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-xl border-[#00695C]/10 shadow-xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-center text-[#00695C] text-2xl flex items-center justify-center gap-2">
            <span className="text-xl" style={{color: '#00695C'}}>۩</span>
            <span style={{
              fontFamily: language === 'ar' ? '"Reem Kufi", "Amiri", "Aref Ruqaa", serif' : '"Poppins", "Roboto", sans-serif',
              color: '#00695C',
              fontWeight: 'normal',
              fontStyle: 'normal',
              letterSpacing: '2px',
              fontSize: '1.5rem',
              display: 'inline-block',
              transform: 'scaleX(1.05)', // slightly stretch horizontally
              textShadow: '0 0 1px rgba(140, 198, 63, 0.3)'
            }}>
              {language === 'ar' ? 'تحويل محتوى حسني من يوتيوب' : 'Upload Hassani Content from YouTube'}
            </span>
            <span className="text-primary/70 text-xl" style={{color: '#8cc63f'}}>۩</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="youtube" className="mt-2">
          <TabsList className="w-full grid grid-cols-2 bg-muted/20 p-1 rounded-lg">
            <TabsTrigger 
              value="youtube" 
              className="rounded-md font-semibold text-base data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <Link2 className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'رابط يوتيوب' : 'YouTube Link'}
            </TabsTrigger>
            <TabsTrigger 
              value="file" 
              className="rounded-md font-semibold text-base data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <FileUp className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'تحميل ملف' : 'Upload File'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="youtube" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
            <div className="border border-primary/10 rounded-xl p-4 bg-white">
              {/* Direct YouTube processor implementation */}
              <div className="relative group overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <Youtube className="h-5 w-5 text-[#00695C]" />
                  <h3 className="text-lg text-[#00695C]" style={{fontFamily: language === 'ar' ? 'Arial, sans-serif' : '"Poppins", "Roboto", sans-serif'}} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    {language === 'ar' ? 'محتوى فيديو إسلامي' : 'Islamic Video Content'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4" style={{fontFamily: language === 'ar' ? 'Arial, sans-serif' : '"Poppins", "Roboto", sans-serif'}} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {language === 'ar' ? 'أدخل رابط يوتيوب لمحاضرة إسلامية، تلاوة قرآن، أو فيديو تعليمي' : 'Enter a YouTube link for an Islamic lecture, Quran recitation, or educational video'}
                </p>
                
                <DirectYouTubeProcessor onSuccess={handleUploadSuccess} />
                
                <div className="text-xs text-muted-foreground mt-4 italic" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {language === 'ar' ? 'ملاحظة: قد تستغرق معالجة الفيديوهات الأطول بعض الوقت' : 'Note: Processing longer videos may take some time'}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="file" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
            <div className="border border-primary/10 rounded-xl p-4 bg-white">
              <div className="relative group overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <FileAudio className="h-5 w-5 text-[#00695C]" />
                  <h3 className="text-lg text-[#00695C]" style={{fontFamily: language === 'ar' ? 'Arial, sans-serif' : '"Poppins", "Roboto", sans-serif'}} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    {language === 'ar' ? 'الصوت والفيديو الإسلامي' : 'Islamic Audio and Video'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4" style={{fontFamily: language === 'ar' ? 'Arial, sans-serif' : '"Poppins", "Roboto", sans-serif'}} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {language === 'ar' ? 'قم بتحميل تلاوات قرآنية، محاضرات إسلامية أو محتوى تعليمي للاستفسار' : 'Upload Quranic recitations, Islamic lectures or educational content for inquiry'}
                </p>
              </div>
              <MediaUploader onUploadSuccess={handleUploadSuccess} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center mt-2">
          <div className="text-xs text-center max-w-sm text-muted-foreground" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            {language === 'ar' ? 'قم بتحميل محاضرات إسلامية، تلاوات قرآنية، أو فيديوهات تعليمية لطرح أسئلة حول محتواها.' : 'Upload Islamic lectures, Quranic recitations, or educational videos to ask questions about their content.'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadButton;
