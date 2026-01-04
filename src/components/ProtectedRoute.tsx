'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/login');
          setIsAuthenticated(false);
        }
      } catch (error) {
        router.push('/login');
        setIsAuthenticated(false);
      }
    };

    checkSession();
  }, [router]);

  // Show loading spinner while checking authentication
  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // If not authenticated, return null (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated, render children
  return <>{children}</>;
}
