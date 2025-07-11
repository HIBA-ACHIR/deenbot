import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, BookOpen, Clock } from 'lucide-react';

interface YoutubeUploadNotificationProps {
  lessonTitle?: string;
  isLoading: boolean;
}

const YoutubeUploadNotification: React.FC<YoutubeUploadNotificationProps> = ({
  lessonTitle = '',
  isLoading = true
}) => {
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
  
  // Si le titre n'est pas encore disponible (pendant le chargement)
  const defaultTitleAr = 'درس ديني';
  const defaultTitleEn = 'Islamic Lesson';
  const defaultTitle = language === 'ar' ? defaultTitleAr : defaultTitleEn;
  const displayTitle = lessonTitle || defaultTitle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg bg-white shadow-lg border border-emerald-100 p-6 mb-6 max-w-2xl mx-auto"
    >
      {language === 'ar' ? (
        // Contenu en arabe
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 p-3 rounded-full">
            <BookOpen className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1 text-right" dir="rtl">
            <h3 className="text-xl font-bold mb-2">
              {isLoading ? (
                <div className="flex items-center">
                  <span>جاري تحليل المحتوى</span>
                  <div className="loader-dots ml-2">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              ) : (
                <span>تم تحليل المحتوى بنجاح</span>
              )}
            </h3>

            {/* Success message would appear here when !isLoading */}

            {isLoading && (
              <p className="text-gray-600">
                نعمل على تحليل المحتوى الصوتي لاستخراج المعلومات المهمة...
              </p>
            )}
          </div>
        </div>
      ) : (
        // Contenu en anglais
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 p-3 rounded-full">
            <BookOpen className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-xl font-bold mb-2">
              {isLoading ? (
                <div className="flex items-center">
                  <span>Analyzing content</span>
                  <div className="loader-dots ml-2">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              ) : (
                <span>Content analysis completed</span>
              )}
            </h3>

            {/* Success message would appear here when !isLoading */}

            {isLoading && (
              <p className="text-gray-600">
                We are analyzing the audio content to extract important information...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer removed as requested */}
    </motion.div>
  );
};

export default YoutubeUploadNotification;
