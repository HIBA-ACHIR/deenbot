import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import "./styles/theme.css";
import "./App.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import NotFound from "./pages/NotFound";
import ProcessorTest from "./pages/ProcessorTest";
import AddourousHassanyaPage from "./components/AddourousHassanyaPage";
import { AnimationProvider } from "./contexts/AnimationContext";

const App = () => {
  // Create a new QueryClient instance inside the component
  const [queryClient] = useState(() => new QueryClient());
  
  // Set default direction for RTL support (Arabic)
  useEffect(() => {
    // Default to RTL since the main language is Arabic
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    
    // Load custom fonts if needed
    const loadFonts = async () => {
      // You can add custom font loading logic here
    };
    
    loadFonts();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <ChatProvider>
              <AnimationProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/chat/:conversationId" element={<ChatPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/test-processor" element={<ProcessorTest />} />
                    <Route path="/addourous-hassanya" element={<AddourousHassanyaPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </AnimationProvider>
            </ChatProvider>
          </AuthProvider>
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
