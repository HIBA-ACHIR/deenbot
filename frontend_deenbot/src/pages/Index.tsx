import { Link } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '../contexts/ThemeContext';
import NavBar from '../components/NavBar';
import IslamicPattern from '../components/IslamicPattern';

const Index = () => {
  const { theme } = useContext(ThemeContext);
  const [language, setLanguage] = useState('ar');
  
  // Détecter la langue à partir de l'attribut HTML
  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(document.documentElement.lang === 'en' ? 'en' : 'ar');
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
  
  return (
    <div className={`min-h-screen bg-white ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
      {/* Navigation Bar */}
      <NavBar />
      
      {/* Main hero section */}
      <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center overflow-hidden">
        {/* Decorative Islamic patterns (subtle) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <IslamicPattern />
        </div>
        
        {/* Main content */}
        <div className="container mx-auto px-4 text-center z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center justify-center w-full"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-tight rtl:leading-snug text-center">
              DeenBot
            </h1>
            
            {language === 'ar' ? (
              <>
                <h2 
                  className="text-2xl md:text-4xl font-bold mb-6 max-w-4xl mx-auto text-center" 
                  dir="rtl"
                  style={{ 
                    fontFamily: '"Amiri", "Noto Sans Arabic", sans-serif',
                    lineHeight: '1.5'
                  }}
                >
                  دمج الدروس الحسنية في الذكاء الاصطناعي
                </h2>
                
                <p 
                  className="text-xl md:text-2xl mb-12 text-gray-600 max-w-3xl mx-auto text-center"
                  dir="rtl"
                  style={{ 
                    fontFamily: '"Noto Sans Arabic", sans-serif',
                    lineHeight: '1.5'
                  }}
                >
                  اسأل وتفاعل مع محتوى ديني موثوق يعتمد على الذكاء الاصطناعي
                </p>
                
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link 
                    to="/chat" 
                    className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xl px-10 py-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                   اكتشف الآن Deenbot
                  </Link>
                </motion.div>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-4xl font-bold mb-6 leading-relaxed max-w-4xl mx-auto" style={{ fontFamily: '"Poppins", "Roboto", sans-serif' }}>
                  Explore Ramadan Hassani Lessons with Smart and Simplified Approach
                </h2>
                
                <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-3xl mx-auto" style={{ fontFamily: '"Poppins", "Roboto", sans-serif' }}>
                  Ask and interact with trusted Islamic content powered by artificial intelligence
                </p>
                
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link 
                    to="/chat" 
                    className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xl px-10 py-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Discover Deenbot Now
                  </Link>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Index;
