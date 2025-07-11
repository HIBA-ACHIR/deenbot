import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom'; // Import Link
import { Home } from 'lucide-react'; // Import Home icon
import LessonsColumn from './LessonsColumn';
import ConversionForm from './ConversionForm';

// Define types for tab values if not already defined elsewhere
export type ConversionFormTab = 'youtube' | 'file';

const AddourousHassanyaPage: React.FC = () => {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<ConversionFormTab>('youtube');
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [selectedYoutubeUrlForForm, setSelectedYoutubeUrlForForm] = useState<string | null>(null);

  useEffect(() => {
    const handleLanguageChange = () => {
      const docLang = document.documentElement.lang || 'ar';
      setLanguage(docLang === 'en' ? 'en' : 'ar');
    };
    handleLanguageChange();
    const observer = new MutationObserver(handleLanguageChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    return () => observer.disconnect();
  }, []);

  const handleTabChange = (tab: ConversionFormTab) => {
    setActiveTab(tab);
  };

  const handleToggleExpandLesson = (lessonId: string) => {
    setExpandedLessonId(prevId => (prevId === lessonId ? null : lessonId));
  };

  const handleUseVideoUrl = (url: string) => {
    setSelectedYoutubeUrlForForm(url);
    setActiveTab('youtube'); // Ensure YouTube tab is active
  };

  const handleUrlProcessedInForm = () => {
    setSelectedYoutubeUrlForForm(null); // Clear the URL after it's been processed by the form
  };

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-100 to-teal-50 via-green-50">
      <motion.header 
        className="mb-8 md:mb-12 text-center relative"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#00695C] tracking-tight"
            style={{ fontFamily: language === 'ar' ? '"Reem Kufi", "Amiri", serif' : '"Poppins", sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
          {language === 'ar' ? 'الدروس الحسنية المتكاملة' : 'Integrated Hassani Lessons'}
        </h1>
        <p className="text-md md:text-lg text-gray-700 mt-3 max-w-2xl mx-auto">
          {language === 'ar' ? 'منصة شاملة لاستكشاف الدروس الحسنية القيمة وتحويل محتواها المرئي والمسموع إلى نصوص تفاعلية.' : 'A comprehensive platform to explore valuable Hassani lessons and convert their visual and audio content into interactive text.'}
        </p>
        
        {/* Return to Home Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className={`absolute ${language === 'ar' ? 'left-0 top-0 ml-2 md:ml-0' : 'right-0 top-0 mr-2 md:mr-0'} mt-2 md:mt-0`}
        >
          <Link
            to="/"
            className="flex items-center gap-2 bg-gradient-to-r from-[#00695C] to-[#00796B] hover:from-[#00796B] hover:to-[#00897B] text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
            aria-label={language === 'ar' ? 'الرجوع إلى القائمة الرئيسية' : 'Return to Main Menu'}
          >
            <Home size={20} />
            <span className="hidden sm:inline">{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
          </Link>
        </motion.div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Lessons Column (占据3/4宽度, 在lg屏幕及以上) */}
        <motion.div 
          className="lg:col-span-9 order-2 lg:order-1"
          initial={{ opacity: 0, x: language === 'ar' ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
        >
          <LessonsColumn 
            language={language} 
            expandedLessonId={expandedLessonId}
            onToggleExpand={handleToggleExpandLesson}
            onUseVideo={handleUseVideoUrl} // Pass the new handler
          />
        </motion.div>

        {/* Conversion Form Column (占据1/4宽度, 在lg屏幕及以上, sticky) */}
        <motion.div 
          className="lg:col-span-3 order-1 lg:order-2 lg:sticky lg:top-8"
          initial={{ opacity: 0, x: language === 'ar' ? -50 : 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        >
          <ConversionForm 
            language={language} 
            activeTab={activeTab}
            onTabChange={handleTabChange}
            selectedYoutubeUrl={selectedYoutubeUrlForForm} // Pass the selected URL
            onUrlProcessed={handleUrlProcessedInForm} // Pass the callback to clear the URL
          />
        </motion.div>
      </div>
    </div>
  );
};

export default AddourousHassanyaPage;
