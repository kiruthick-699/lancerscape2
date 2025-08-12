import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  userType: 'client' | 'freelancer';
  isVerified: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  totalEarnings?: number;
  completedJobs?: number;
  averageRating?: number;
  reviewCount?: number;
  reputationScore?: number;
  hourlyRate?: number;
  availability?: 'available' | 'busy' | 'unavailable';
  skills?: string[];
  categories?: string[];
  location?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  walletAddress?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedTokens = await AsyncStorage.getItem('auth_tokens');
      const storedUser = await AsyncStorage.getItem('auth_user');
      
      if (storedTokens && storedUser) {
        const parsedTokens = JSON.parse(storedTokens);
        const parsedUser = JSON.parse(storedUser);
        
        // Check if tokens are still valid
        if (isTokenValid(parsedTokens.accessToken)) {
          setTokens(parsedTokens);
          setUser(parsedUser);
        } else {
          // Try to refresh token
          await refreshToken();
        }
      }
    } catch (error) {
      // Production logging would go here
    } finally {
      setIsLoading(false);
    }
  };

  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const { user: userData, tokens: authTokens } = data.data;
      
      // Store tokens and user data
      await AsyncStorage.setItem('auth_tokens', JSON.stringify(authTokens));
      await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
      
      setTokens(authTokens);
      setUser(userData);
    } catch (error) {
      // Production logging would go here
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      const { user: newUser, tokens: authTokens } = data.data;
      
      // Store tokens and user data
      await AsyncStorage.setItem('auth_tokens', JSON.stringify(authTokens));
      await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
      
      setTokens(authTokens);
      setUser(newUser);
    } catch (error) {
      // Production logging would go here
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await clearAuth();
    } catch (error) {
      // Production logging would go here
    }
  };

  const refreshToken = async () => {
    try {
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.refreshToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }

      const { tokens: newTokens, user: userData } = data.data;
      
      // Update stored tokens and user data
      await AsyncStorage.setItem('auth_tokens', JSON.stringify(newTokens));
      await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
      
      setTokens(newTokens);
      setUser(userData);
    } catch (error) {
      // Production logging would go here
      await clearAuth();
      throw error;
    }
  };

  const clearAuth = async () => {
    try {
      await AsyncStorage.removeItem('auth_tokens');
      await AsyncStorage.removeItem('auth_user');
      setTokens(null);
      setUser(null);
    } catch (error) {
      // Production logging would go here
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!user && !!tokens,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 