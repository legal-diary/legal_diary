'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import FirmSelectionModal from '@/components/Auth/FirmSelectionModal';
import SetPasswordModal from '@/components/Auth/SetPasswordModal';
import { buildAuthHeaders } from '@/lib/authHeaders';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  firmId?: string;
  firm_name?: string;
  password?: string | null;
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
  needsPasswordSetup: boolean;
  updateUser: (userData: User) => void;
  setNeedsPasswordSetup: (needs: boolean) => void;
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
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  // Load user from session cookie on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setExpiresAt(data.expiresAt);
        setNeedsFirmSetup(!!data.needsFirmSetup || !data.user?.firmId);
        setNeedsPasswordSetup(!!data.needsPasswordSetup);
      } catch (error) {
        // Ignore session load errors
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
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
        headers: buildAuthHeaders(token),
      });

      setUser(null);
      setToken(null);
      setExpiresAt(null);
      setNeedsFirmSetup(false);
      setNeedsPasswordSetup(false);
      localStorage.removeItem('needsFirmSetup');
      localStorage.removeItem('needsPasswordSetup');
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

  // Handle password setup success
  const handlePasswordSetupSuccess = () => {
    setNeedsPasswordSetup(false);
    localStorage.removeItem('needsPasswordSetup');
  };

  // Handle password setup skip
  const handlePasswordSetupSkip = () => {
    setNeedsPasswordSetup(false);
    localStorage.removeItem('needsPasswordSetup');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, isTokenExpired, needsFirmSetup, needsPasswordSetup, updateUser, setNeedsPasswordSetup }}>
      {children}
      {/* Show firm selection modal for Google OAuth users without firm */}
      {needsFirmSetup && (
        <FirmSelectionModal
          open={needsFirmSetup}
          token={token}
          onSuccess={handleFirmSetupSuccess}
        />
      )}
      {/* Show password setup modal for Google OAuth users without password */}
      {needsPasswordSetup && !needsFirmSetup && (
        <SetPasswordModal
          open={needsPasswordSetup}
          token={token}
          onSuccess={handlePasswordSetupSuccess}
          onSkip={handlePasswordSetupSkip}
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
