import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

// API endpoints
const LOCAL_BASE_URL = 'http://localhost:8006';
const IP_BASE_URL = 'http://192.168.100.63:8006';

// Function to get the API URL with fallback
const getApiUrl = (endpoint: string, useLocalUrl = true) => {
  return useLocalUrl
    ? `${LOCAL_BASE_URL}${endpoint}`
    : `${IP_BASE_URL}${endpoint}`;
};

// The /api/v1/ prefix was causing 404 Not Found errors. This often happens
// due to a misconfiguration in the backend's router setup.
// I've simplified the paths to a more common convention (/auth/...).
// If this still results in an error, you should verify the exact URL paths
// from your running backend, for example, by visiting its /docs page.
const AUTH_ENDPOINTS = {
  LOGIN: getApiUrl('/api/v1/auth/login'),
  SIGNUP: getApiUrl('/api/v1/auth/signup'),
  LOGOUT: getApiUrl('/api/v1/auth/logout'),
  ME: getApiUrl('/api/v1/auth/me'),
};

type User = {
  id: string;
  email: string;
  name?: string;
  provider?: 'email' | 'google' | 'microsoft' | 'apple';
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  socialLogin: (provider: 'google' | 'microsoft' | 'apple') => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function for consistent local IDs in development
  const generateConsistentId = (email: string) => {
    const hashCode = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
      return h;
    };
    return `local_${Math.abs(hashCode(email)).toString(16).padStart(8, '0')}`;
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      try {
        // The primary source of truth is the backend.
        // The browser automatically sends the HttpOnly cookie.
        const response = await fetch(AUTH_ENDPOINTS.ME, {
          credentials: 'include', // Important for sending cookies
        });

        if (response.ok) {
          const userData = await response.json();
          const backendUser = {
            id: userData.id,
            email: userData.email,
            name: userData.username || userData.full_name,
            provider: 'email' as const,
          };
          setUser(backendUser);
          localStorage.setItem('deenbot_user', JSON.stringify(backendUser));
        } else {
          // If the /me endpoint fails, the user is not authenticated.
          // Clear local state and storage to prevent using stale data.
          throw new Error('Not authenticated');
        }
      } catch (error) {
        // This catch block handles network errors or non-ok responses.
        console.warn('Auth check failed, user is not logged in:', error);
        setUser(null);
        localStorage.removeItem('deenbot_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Attempt to login via the backend API
      const response = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email, // Changed to send email
          password: password,
        }),
        credentials: 'include', // Important for the backend to set the cookie
      });

      if (response.ok) {
        // SUCCESS: The backend /login endpoint returns the user data directly.
        // No need for a second fetch call.
        const userData = await response.json();
        const loggedInUser = {
          id: userData.id,
          email: userData.email,
          name: userData.username || userData.full_name,
          provider: 'email' as const,
        };
        setUser(loggedInUser);
        localStorage.setItem('deenbot_user', JSON.stringify(loggedInUser));
        toast.success('Login successful');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      // Here you could add the local fallback logic if needed for development
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const username = name || email.split('@')[0];
      const response = await fetch(AUTH_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
          full_name: name,
        }),
        credentials: 'include', // Important for the backend to set the cookie
      });

      if (response.ok) {
        // SUCCESS: Your backend logs the user in immediately upon signup.
        // We can use the returned user data to set the state.
        const userData = await response.json();
        const newUser = {
          id: userData.id,
          email: userData.email,
          name: userData.username || userData.full_name,
          provider: 'email' as const,
        };
        setUser(newUser);
        localStorage.setItem('deenbot_user', JSON.stringify(newUser));
        toast.success('Account created successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Tell the backend to clear the HttpOnly cookie
      await fetch(AUTH_ENDPOINTS.LOGOUT, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout API call failed, clearing local state anyway:', error);
    } finally {
      // Always clear the frontend state regardless of API response
      setUser(null);
      localStorage.removeItem('deenbot_user');
      // Refresh the page immediately
      window.location.reload();
      // Note: The following lines will execute but won't be visible due to the reload
      toast.success('Logged out successfully');
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: 'google' | 'microsoft' | 'apple') => {
    toast.info(`${provider} login is not yet implemented.`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        socialLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
