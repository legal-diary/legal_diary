'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');

    if (token) {
      // User is logged in, redirect to dashboard
      router.replace('/dashboard');
    } else {
      // User is not logged in, redirect to login
      router.replace('/login');
    }

    setIsChecking(false);
  }, [router]);

  // Show loading spinner while checking auth status
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#ffffff',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return null;
}
