import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon, GlobeIcon, MenuIcon, XIcon } from 'lucide-react';

const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  
  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Fonction de détection de la langue actuelle
  const detectCurrentLanguage = useCallback(() => {
    const docLang = document.documentElement.lang || 'ar';
    return docLang === 'en' ? 'en' : 'ar';
  }, []);
  
  // Initialiser la langue en fonction de l'attribut lang du document
  useEffect(() => {
    // Initialiser avec la langue actuelle
    setLanguage(detectCurrentLanguage());
    
    // Observer les changements de langue
    const observer = new MutationObserver(() => {
      setLanguage(detectCurrentLanguage());
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    
    return () => observer.disconnect();
  }, [detectCurrentLanguage]);
  
  // Toggle language between Arabic and English
  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    
    // Mettre à jour les attributs du document
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    
    // Forcer la mise à jour immédiate de l'état
    setLanguage(newLang);
  };
  
  return (
    <header 
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm dark:bg-gray-900/95' : 'bg-transparent'
      }`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex-1 flex items-center justify-start">
            <Link to="/" className={`flex items-center ${language === 'ar' ? 'space-x-reverse' : 'space-x-2'}`}>
              <span className="font-bold text-2xl" style={{ color: '#00695C' }}>DeenBot</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className={`hidden md:flex items-center ${language === 'ar' ? 'space-x-reverse' : 'space-x-6'}`}>
            {/* Language Toggle */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1" 
              onClick={toggleLanguage}
            >
              <GlobeIcon className="h-4 w-4" />
              <span>{language === 'ar' ? 'عربي | ENG' : 'AR | English'}</span>
            </Button>
            
            {/* Auth Buttons */}
            <Link 
              to="/login" 
              className="text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </Link>
            
            <Link 
              to="/signup" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-medium transition-colors"
            >
              {language === 'ar' ? 'إنشاء حساب' : 'Sign up'}
            </Link>
          </nav>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <XIcon className="h-6 w-6" />
              ) : (
                <MenuIcon className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              <div>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start" 
                  onClick={toggleLanguage}
                >
                  <GlobeIcon className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  <span>{language === 'ar' ? 'عربي | ENG' : 'AR | English'}</span>
                </Button>
              </div>
              
              <Link 
                to="/login" 
                className="block py-2 text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Link>
              
              <Link 
                to="/signup" 
                className="block py-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-full font-medium text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                {language === 'ar' ? 'إنشاء حساب' : 'Sign up'}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default NavBar;
