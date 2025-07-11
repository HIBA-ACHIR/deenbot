
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/chat" />;
  }
  
  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      await login(email, password);
      toast.success("تم تسجيل الدخول بنجاح!");
      navigate('/chat');
    } catch (error) {
      console.error("Login error:", error);
      toast.error("فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <AuthForm type="login" onSubmit={handleLogin} isLoading={isLoading} />
      </div>
    </Layout>
  );
};

export default LoginPage;
