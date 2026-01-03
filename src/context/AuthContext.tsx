'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import FirmSelectionModal from '@/components/Auth/FirmSelectionModal';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  firmId?: string;
  firm_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, firmNameOrId?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isTokenExpired: () => boolean;
  needsFirmSetup: boolean;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to check if token is expired
function isTokenExpiredLocal(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiryTime = new Date(expiresAt).getTime();
  return Date.now() >= expiryTime;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [needsFirmSetup, setNeedsFirmSetup] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    const savedExpiresAt = localStorage.getItem('tokenExpiresAt');
    const firmSetupNeeded = localStorage.getItem('needsFirmSetup');

    if (savedToken && savedUser) {
      // Check if token has already expired
      if (savedExpiresAt && isTokenExpiredLocal(savedExpiresAt)) {
        // Token has expired, clear everything
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem('needsFirmSetup');
      } else {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setExpiresAt(savedExpiresAt);

        // Check if user needs firm setup (Google OAuth user without firm)
        if (firmSetupNeeded === 'true' || !parsedUser.firmId) {
          setNeedsFirmSetup(true);
        }
      }
    }
    setIsLoading(false);
  }, []);

  // Periodically check if token has expired (check every minute)
  useEffect(() => {
    if (!token || !expiresAt) return;

    const interval = setInterval(() => {
      if (isTokenExpiredLocal(expiresAt)) {
        // Token has expired, auto-logout
        setUser(null);
        setToken(null);
        setExpiresAt(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiresAt');
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [token, expiresAt]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      setExpiresAt(data.expiresAt);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tokenExpiresAt', data.expiresAt);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, name: string, password: string, firmNameOrId?: string) => {
    setIsLoading(true);
    try {
      // Determine if it's a firm ID (UUID format) or firm name (string)
      const isUUID = firmNameOrId && /^[a-z0-9]+$/.test(firmNameOrId) && firmNameOrId.length > 20;

      const payload: any = { email, name, password };
      if (firmNameOrId) {
        if (isUUID) {
          payload.firmId = firmNameOrId; // It's an existing firm ID
        } else {
          payload.firmName = firmNameOrId; // It's a new firm name
        }
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      // Auto-login after registration
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(null);
      setToken(null);
      setExpiresAt(null);
      setNeedsFirmSetup(false);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('needsFirmSetup');
      localStorage.removeItem('googleCalendarConnected');
    } finally {
      setIsLoading(false);
    }
  };

  const isTokenExpired = () => {
    return isTokenExpiredLocal(expiresAt);
  };

  // Update user data (e.g., after firm setup)
  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    // Clear firm setup flag if user now has a firm
    if (userData.firmId) {
      setNeedsFirmSetup(false);
      localStorage.removeItem('needsFirmSetup');
    }
  };

  // Handle firm setup success
  const handleFirmSetupSuccess = (userData: User) => {
    updateUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, isTokenExpired, needsFirmSetup, updateUser }}>
      {children}
      {/* Show firm selection modal for Google OAuth users without firm */}
      {token && needsFirmSetup && (
        <FirmSelectionModal
          open={needsFirmSetup}
          token={token}
          onSuccess={handleFirmSetupSuccess}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
