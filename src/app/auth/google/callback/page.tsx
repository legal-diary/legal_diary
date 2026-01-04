'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spin, Result, Button } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      // Handle Google OAuth errors
      if (errorParam) {
        setError(
          errorParam === 'access_denied'
            ? 'You cancelled the Google sign-in process.'
            : `Google authentication error: ${errorParam}`
        );
        setIsProcessing(false);
        return;
      }

      if (!code || !state) {
        setError('Invalid callback parameters. Please try again.');
        setIsProcessing(false);
        return;
      }

      try {
        // Exchange code for tokens via our API
        const response = await fetch('/api/auth/google/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Redirect to dashboard (AuthContext will load session from cookie)
        window.location.href = '/dashboard';
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setIsProcessing(false);
      }
    }

    handleCallback();
  }, [searchParams]);

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f7fa',
        }}
      >
        <Result
          status="error"
          title="Authentication Failed"
          subTitle={error}
          extra={[
            <Button type="primary" key="login" onClick={() => router.push('/login')}>
              Back to Login
            </Button>,
            <Button key="retry" onClick={() => router.push('/login')}>
              Try Again
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
        gap: '1rem',
      }}
    >
      <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      <div style={{ color: '#666', fontSize: '1.1rem' }}>
        {isProcessing ? 'Completing sign-in with Google...' : 'Redirecting...'}
      </div>
    </div>
  );
}
