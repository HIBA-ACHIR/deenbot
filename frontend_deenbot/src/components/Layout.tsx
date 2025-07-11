import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, LogOut, Moon, Sun, Globe, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

type LayoutProps = {
  children: React.ReactNode;
};

type Language = 'ar' | 'en';

// Zellij pattern overlay for decorative elements
const ZellijPattern = ({ className, pattern = "bg" }: { className?: string; pattern?: "bg" | "card" | "section" }) => {
  const patternClass = pattern === "bg" ? "var(--zellij-bg-pattern)" : 
                       pattern === "card" ? "var(--zellij-card-pattern)" : 
                       "var(--zellij-section-pattern)";
                       
  return (
    <div 
      className={`absolute inset-0 pointer-events-none opacity-10 ${className}`}
      style={{ backgroundImage: patternClass, backgroundSize: "cover" }}
    />
  );
};

// Enhanced decorative divider with Islamic motif
const IslamicDivider = () => (
  <div className="islamic-divider w-full my-4"></div>
);

// Islamic styled heading
const IslamicHeading = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`islamic-heading font-bold text-xl text-primary ${className || ''}`}>{children}</h2>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState<Language>('ar');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Initialiser et suivre la langue en fonction de l'attribut lang du document
  useEffect(() => {
    // Fonction pour détecter la langue actuelle
    const detectLanguage = () => {
      const docLang = document.documentElement.lang || 'ar';
      setLanguage(docLang === 'en' ? 'en' : 'ar');
    };
    
    // Initialiser avec la langue actuelle
    detectLanguage();
    
    // Observer les changements de langue
    const observer = new MutationObserver(detectLanguage);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Gérer le défilement pour l'effet de transparence de la barre de navigation
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Changer la langue et mettre à jour la direction du document
  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    // Mettre à jour les attributs du document
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
    // Mettre à jour l'état local
    setLanguage(newLang);
  };
  
  const handleLogout = () => {
    logout();
    toast.success(language === 'ar' ? "تم تسجيل الخروج بنجاح" : "Logged out successfully");
  };
  
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Header de style HUMAIN OS */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
        }`}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="mx-auto px-4 lg:px-6 w-full">
          <div className="flex items-center justify-between h-14"> {/* Hauteur réduite de h-20 à h-14 */}
            {/* Logo */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex-shrink-0 ${language === 'ar' ? 'ml-auto' : 'mr-auto'}`}
            >
              <Link 
                to="/"
                className="font-bold text-2xl tracking-tight transition-colors flex items-center gap-1.5"
              >
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">DeenBot</span>
              </Link>
            </motion.div>

            {/* Navigation principale - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              {/* Sélecteur de langue */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 text-gray-700 hover:text-emerald-700 transition-colors"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                <Globe className="h-4 w-4" />
                <span>{language === 'ar' ? 'عربي | ENG' : 'AR | English'}</span>
              </Button>
              
              {/* Authentication Links */}
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                    <UserCircle className="w-5 h-5 text-emerald-600" />
                    <span className="text-gray-800">{user?.name || user?.email}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-gray-700 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{language === 'ar' ? 'تسجيل الخروج' : 'Log out'}</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link 
                    to="/login" 
                    className="text-gray-700 hover:text-emerald-600 font-medium transition-colors"
                  >
                    {language === 'ar' ? 'تسجيل الدخول' : 'Log in'}
                  </Link>
                  
                  <Link 
                    to="/signup" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-medium transition-colors"
                  >
                    {language === 'ar' ? 'إنشاء حساب' : 'Sign up'}
                  </Link>
                </div>
              )}
              
              {/* Toggle de thème */}
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full w-8 h-8 border-gray-200"
              >
                {theme === "dark" ? 
                  <Sun className="h-4 w-4" /> : 
                  <Moon className="h-4 w-4" />
                }
              </Button>
            </div>
            
            {/* Bouton menu mobile */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? 
                  <X className="h-5 w-5" /> : 
                  <Menu className="h-5 w-5" />
                }
              </Button>
            </div>
          </div>
        </div>
        
        {/* Menu mobile */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-4 space-y-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleLanguage}
                  className="w-full justify-start text-gray-700 hover:text-emerald-700 transition-colors"
                >
                  <Globe className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  <span>{language === 'ar' ? 'عربي | ENG' : 'AR | English'}</span>
                </Button>
                
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <UserCircle className="w-5 h-5 text-emerald-600" />
                      <span className="text-gray-800">{user?.name || user?.email}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-start text-gray-700 hover:text-red-600 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      <span>{language === 'ar' ? 'تسجيل الخروج' : 'Log out'}</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      variant="ghost" 
                      asChild 
                      className="w-full justify-start text-gray-700 hover:text-emerald-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to="/login">
                        {language === 'ar' ? 'تسجيل الدخول' : 'Log in'}
                      </Link>
                    </Button>
                    <Button 
                      variant="default" 
                      asChild 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to="/signup">
                        {language === 'ar' ? 'إنشاء حساب' : 'Sign up'}
                      </Link>
                    </Button>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500">
                    {language === 'ar' ? 'الوضع' : 'Theme'}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="h-8 w-8 rounded-full"
                  >
                    {theme === "dark" ? 
                      <Sun className="h-4 w-4" /> : 
                      <Moon className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      {/* Espacement pour la barre de navigation fixe - réduit */}
      <div className="h-14"></div>
      
      {/* Contenu principal */}
      <main className="flex-1 relative z-10 bg-white">
        {children}
      </main>
    </div>
  );
};

export default Layout;
