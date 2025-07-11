import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SuggestedQuestionsProps {
  suggestions: string[];
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ suggestions }) => {
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

  const handleSuggestionClick = (suggestion: string) => {
    document.dispatchEvent(new CustomEvent('suggest-prompt', { detail: suggestion }));
  };

  return (
    <div className="flex justify-center items-center gap-2 py-2 pt-3 pb-4 max-w-2xl mx-auto">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          className="rounded-full px-4 py-2 bg-gray-100 hover:bg-[#00695C]/10 text-[#00695C] text-sm whitespace-nowrap border border-[#00695C]/20 shadow-sm transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          onClick={() => handleSuggestionClick(suggestion)}
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
};

export default SuggestedQuestions;
