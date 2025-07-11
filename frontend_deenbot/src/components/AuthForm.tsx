import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

type AuthFormProps = {
  type: 'login' | 'signup';
  onSubmit: (data: { email: string; password: string; name?: string }) => void;
  isLoading: boolean;
};

const loginSchema = z.object({
  email: z.string().email({ message: "يرجى إدخال عنوان بريد إلكتروني صحيح" }),
  password: z.string().min(6, { message: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" }),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, { message: "يجب أن يكون الاسم حرفين على الأقل" }).optional(),
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

// Social login provider configuration
const socialProviders = [
  {
    id: 'google',
    name: "Google",
    logo: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
    bgColor: "bg-white",
    textColor: "text-gray-700",
    hoverColor: "hover:bg-gray-100",
    borderColor: "border border-gray-300",
  },
  {
    id: 'microsoft',
    name: "Microsoft",
    logo: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width="18" height="18">
        <path fill="#f25022" d="M1 1h10v10H1z" />
        <path fill="#00a4ef" d="M1 12h10v10H1z" />
        <path fill="#7fba00" d="M12 1h10v10H12z" />
        <path fill="#ffb900" d="M12 12h10v10H12z" />
      </svg>
    ),
    bgColor: "bg-white",
    textColor: "text-gray-700",
    hoverColor: "hover:bg-gray-100",
    borderColor: "border border-gray-300",
  },
  {
    id: 'apple',
    name: "Apple",
    logo: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
        <path d="M14.94,5.19A4.38,4.38,0,0,0,16,2,4.44,4.44,0,0,0,13,3.52,4.17,4.17,0,0,0,12,6.61,3.69,3.69,0,0,0,14.94,5.19Zm2.52,7.44a4.51,4.51,0,0,1,2.16-3.81,4.66,4.66,0,0,0-3.66-2c-1.56-.16-3,.91-3.83.91s-2-.89-3.3-.87A4.92,4.92,0,0,0,4.69,9.39C2.93,12.45,4.24,17,6,19.47,6.8,20.68,7.8,22.05,9.12,22s1.75-.82,3.28-.82,2,.82,3.3.79,2.22-1.24,3.06-2.45a11,11,0,0,0,1.38-2.85A4.41,4.41,0,0,1,17.46,12.63Z" fill="currentColor" />
      </svg>
    ),
    bgColor: "bg-black",
    textColor: "text-white",
    hoverColor: "hover:bg-gray-900",
    borderColor: "border border-black",
  },
];

// Decorative pattern for Islamic-inspired design
const DecorativePattern = () => (
  <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M50 0 L95 25 L95 75 L50 100 L5 75 L5 25 Z" />
      <path fill="none" stroke="currentColor" strokeWidth="1" d="M50 0 L50 100 M5 25 L95 75 M5 75 L95 25" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
      <path fill="none" stroke="currentColor" strokeWidth="1" d="M35 50 Q50 25 65 50 Q50 75 35 50" />
      <path fill="none" stroke="currentColor" strokeWidth="1" d="M50 35 Q75 50 50 65 Q25 50 50 35" />
    </svg>
  </div>
);

const AuthForm: React.FC<AuthFormProps> = ({ type, onSubmit, isLoading }) => {
  const isLogin = type === 'login';
  const schema = isLogin ? loginSchema : signupSchema;
  const { socialLogin } = useAuth();
  const [socialLoadingStates, setSocialLoadingStates] = useState<Record<string, boolean>>({
    google: false,
    microsoft: false,
    apple: false
  });
  
  const form = useForm<LoginFormValues | SignupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      ...(type === 'signup' ? { name: "", confirmPassword: "" } : {}),
    }
  });

  const handleSubmit = (data: LoginFormValues | SignupFormValues) => {
    if (isLogin) {
      onSubmit({
        email: data.email,
        password: data.password,
      });
    } else {
      // TypeScript knows this is SignupFormValues when type is 'signup'
      const signupData = data as SignupFormValues;
      onSubmit({
        email: signupData.email,
        password: signupData.password,
        name: signupData.name,
      });
    }
  };
  
  const handleSocialLogin = async (providerId: 'google' | 'microsoft' | 'apple') => {
    try {
      setSocialLoadingStates(prev => ({ ...prev, [providerId]: true }));
      await socialLogin(providerId);
      toast.success(`Successfully logged in with ${providerId.charAt(0).toUpperCase() + providerId.slice(1)}!`);
    } catch (error) {
      console.error(`${providerId} login error:`, error);
      toast.error(`Failed to log in with ${providerId.charAt(0).toUpperCase() + providerId.slice(1)}. Please try again.`);
    } finally {
      setSocialLoadingStates(prev => ({ ...prev, [providerId]: false }));
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-2 border-secondary/50 relative overflow-hidden">
      <DecorativePattern />
      
      {/* Decorative header bar */}
      <div className="h-2 bg-gradient-to-r from-primary via-secondary to-primary" />
      
      <CardHeader className="relative z-10">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <div className="text-secondary text-xl">۞</div>
          </div>
          <CardTitle className="text-2xl font-bold">{isLogin ? 'تسجيل الدخول إلى DeenBot' : 'إنشاء حساب DeenBot'}</CardTitle>
          <div className="flex items-center justify-center my-2">
            <div className="h-px w-16 bg-secondary/50"></div>
            <span className="text-secondary px-2 text-lg">✽</span>
            <div className="h-px w-16 bg-secondary/50"></div>
          </div>
          <CardDescription className="text-center text-muted-foreground">
            {isLogin 
              ? 'أدخل بيانات الاعتماد الخاصة بك للوصول إلى حسابك' 
              : 'قم بإنشاء حساب لحفظ محادثاتك'}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!isLogin && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">الاسم</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="أدخل اسمك" 
                        className="border-muted bg-card/50 focus:border-secondary focus:ring-secondary/30" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="أدخل بريدك الإلكتروني" 
                      className="border-muted bg-card/50 focus:border-secondary focus:ring-secondary/30" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">كلمة المرور</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="أدخل كلمة المرور" 
                      className="border-muted bg-card/50 focus:border-secondary focus:ring-secondary/30" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!isLogin && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="تأكيد كلمة المرور" 
                        className="border-muted bg-card/50 focus:border-secondary focus:ring-secondary/30" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-md transition-colors" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري المعالجة...
                </span>
              ) : (
                isLogin ? "تسجيل الدخول" : "إنشاء حساب"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      
      <div className="islamic-divider mx-6"></div>
      
      <CardFooter className="flex flex-col gap-4 relative z-10">
        <div className="grid grid-cols-3 gap-3 w-full">
          {socialProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all duration-200 ${provider.bgColor} ${provider.textColor} ${provider.hoverColor} ${provider.borderColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary`}
              onClick={() => handleSocialLogin(provider.id as 'google' | 'microsoft' | 'apple')}
              disabled={socialLoadingStates[provider.id] || isLoading}
            >
              {socialLoadingStates[provider.id] ? (
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span className="flex-shrink-0">{provider.logo}</span>
              )}
              <span className="hidden sm:inline font-medium">{provider.name}</span>
            </button>
          ))}
        </div>
        
        <div className="text-center text-sm mt-2">
          {isLogin ? (
            <p>
              ليس لديك حساب؟ <Link to="/signup" className="font-medium text-secondary hover:underline">إنشاء حساب</Link>
            </p>
          ) : (
            <p>
              لديك حساب بالفعل؟ <Link to="/login" className="font-medium text-secondary hover:underline">تسجيل الدخول</Link>
            </p>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
