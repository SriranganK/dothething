// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredentials, clearCredentials, setLoading } from '../store/slices/authSlice';

interface User {
  id: string;
  name: string;
  email: string;
  designation?: string;
  company?: string;
  phone?: string;
  department?: string;
  location?: string;
  timezone?: string;
  status?: string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, token, loading } = useAppSelector((state) => state.auth);

  // Sync state loading if any async initialization checking is needed
  useEffect(() => {
    dispatch(setLoading(false));
  }, [dispatch]);

  const login = (newToken: string, userData: User) => {
    dispatch(setCredentials({ user: userData, token: newToken }));
  };

  const logout = () => {
    dispatch(clearCredentials());
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};