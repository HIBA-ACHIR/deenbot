
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const SignupPage: React.FC = () => {
  const { signup, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/chat" />;
  }
  
  const handleSignup = async ({ email, password, name }: { email: string; password: string; name?: string }) => {
    try {
      setIsLoading(true);
      await signup(email, password, name);
      toast.success("تم إنشاء الحساب بنجاح!");
      navigate('/chat');
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <AuthForm type="signup" onSubmit={handleSignup} isLoading={isLoading} />
      </div>
    </Layout>
  );
};

export default SignupPage;
