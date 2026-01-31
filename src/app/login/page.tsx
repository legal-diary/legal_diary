'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Spin, Row, Col, Divider, Alert } from 'antd';
import {
  LockOutlined,
  UserOutlined,
  GoogleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Error types for different UI treatments
type ErrorType = 'error' | 'warning' | 'info' | 'rate_limit';

interface LoginError {
  message: string;
  type: ErrorType;
  attemptsRemaining?: number;
  retryAfter?: number;
  code?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [form] = Form.useForm();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && loginError?.type === 'rate_limit') {
      setLoginError(null);
    }
  }, [countdown, loginError?.type]);

  // Clear error when user starts typing
  const handleFieldChange = () => {
    if (loginError && loginError.type !== 'rate_limit') {
      setLoginError(null);
    }
  };

  const parseLoginError = async (response: Response): Promise<LoginError> => {
    try {
      const data = await response.json();
      const errorMessage = data.error || 'Login failed';

      // Rate limiting (429)
      if (response.status === 429) {
        const retryAfter = data.retryAfter || 60;
        setCountdown(retryAfter);
        return {
          message: `Too many login attempts. Please wait ${retryAfter} seconds before trying again.`,
          type: 'rate_limit',
          retryAfter,
        };
      }

      // Google OAuth user without password
      if (data.code === 'NO_PASSWORD_SET') {
        return {
          message: 'This account uses Google Sign-In. Please click "Sign in with Google" below, or set a password in Settings.',
          type: 'info',
          code: 'NO_PASSWORD_SET',
        };
      }

      // Invalid credentials (401)
      if (response.status === 401) {
        const attemptsRemaining = data.attemptsRemaining;
        let msg = 'Invalid email or password.';
        if (attemptsRemaining !== undefined) {
          if (attemptsRemaining === 0) {
            msg = 'Invalid credentials. Your account has been temporarily locked due to too many failed attempts.';
          } else if (attemptsRemaining <= 2) {
            msg = `Invalid email or password. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before lockout.`;
          } else {
            msg = `Invalid email or password. ${attemptsRemaining} attempts remaining.`;
          }
        }
        return {
          message: msg,
          type: attemptsRemaining !== undefined && attemptsRemaining <= 2 ? 'warning' : 'error',
          attemptsRemaining,
        };
      }

      // Validation errors (400)
      if (response.status === 400) {
        return {
          message: errorMessage,
          type: 'error',
        };
      }

      // Server errors (500)
      if (response.status >= 500) {
        return {
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          type: 'error',
        };
      }

      return { message: errorMessage, type: 'error' };
    } catch {
      return { message: 'An unexpected error occurred. Please try again.', type: 'error' };
    }
  };

  const onFinish = async (values: { email: string; password: string }) => {
    setLoginError(null);

    // Don't attempt if rate limited
    if (countdown > 0) {
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await parseLoginError(response.clone());
        setLoginError(error);
        return;
      }

      const data = await response.json();

      // Manual login success - store in localStorage and redirect
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tokenExpiresAt', data.expiresAt);

      message.success('Login successful!');
      router.push('/dashboard');
      // Force page reload to update AuthContext
      window.location.href = '/dashboard';
    } catch (error) {
      setLoginError({
        message: 'Network error. Please check your internet connection and try again.',
        type: 'error',
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate Google sign-in');
      }

      // Redirect to Google OAuth consent screen
      window.location.href = data.authUrl;
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  return (
    <Row justify="center" align="middle" style={{
      minHeight: '100dvh',
      background: '#ffffff',
      padding: 'clamp(12px, 4vw, 24px)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      <Col xs={24} sm={22} md={14} lg={10} xl={8} style={{ position: 'relative', zIndex: 1, maxWidth: '450px', width: '100%' }}>
        <Card
          title={
            <div style={{
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: '800',
              textAlign: 'center',
              color: '#000000',
              marginBottom: '0.25rem',
            }}>
              Legal Diary
            </div>
          }
          variant="borderless"
          style={{
            borderColor: 'transparent',
            boxShadow: 'none',
            borderRadius: 'clamp(0.5rem, 2vw, 0.8rem)',
            background: '#ffffff',
            animation: 'slideUp 0.6s ease',
            maxWidth: '100%',
          }}
          styles={{
            body: { padding: 'clamp(12px, 4vw, 24px)' },
            header: { borderBottom: 'none', padding: 'clamp(12px, 4vw, 20px) clamp(12px, 4vw, 24px) 0' }
          }}
        >
          <Spin spinning={isLoading}>
            <Form
              form={form}
              onFinish={onFinish}
              layout="vertical"
              size="large"
              style={{ marginTop: '1rem' }}
              onValuesChange={handleFieldChange}
            >
              {/* Error Alert */}
              {loginError && (
                <Alert
                  message={
                    loginError.type === 'rate_limit' ? (
                      <span>
                        <ClockCircleOutlined style={{ marginRight: 8 }} />
                        Account Temporarily Locked
                      </span>
                    ) : loginError.type === 'warning' ? (
                      <span>
                        <WarningOutlined style={{ marginRight: 8 }} />
                        Warning
                      </span>
                    ) : loginError.code === 'NO_PASSWORD_SET' ? (
                      'Google Account Detected'
                    ) : (
                      'Login Failed'
                    )
                  }
                  description={
                    loginError.type === 'rate_limit' && countdown > 0 ? (
                      <div>
                        <p style={{ margin: 0 }}>{loginError.message}</p>
                        <p style={{ margin: '8px 0 0 0', fontWeight: 600, fontSize: '1.1rem' }}>
                          Try again in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                    ) : (
                      loginError.message
                    )
                  }
                  type={loginError.type === 'rate_limit' ? 'error' : loginError.type === 'info' ? 'info' : loginError.type}
                  showIcon
                  closable={loginError.type !== 'rate_limit'}
                  onClose={() => setLoginError(null)}
                  style={{
                    marginBottom: '1rem',
                    borderRadius: '0.5rem',
                  }}
                />
              )}

              <Form.Item
                name="email"
                label={<span style={{ fontWeight: '600', color: '#1a1a1a' }}>Email</span>}
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
                validateStatus={loginError?.type === 'error' || loginError?.type === 'warning' ? 'error' : undefined}
              >
                <Input
                  prefix={<UserOutlined style={{ color: 'var(--primary-color)' }} />}
                  placeholder="your@email.com"
                  type="email"
                  style={{ borderRadius: '0.6rem' }}
                  disabled={countdown > 0}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontWeight: '600', color: '#1a1a1a' }}>Password</span>}
                rules={[
                  { required: true, message: 'Please enter your password' },
                ]}
                validateStatus={loginError?.type === 'error' || loginError?.type === 'warning' ? 'error' : undefined}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--primary-color)' }} />}
                  placeholder="Password"
                  style={{ borderRadius: '0.6rem' }}
                  disabled={countdown > 0}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '2rem' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={isLoading}
                  disabled={countdown > 0}
                  style={{
                    height: '3rem',
                    fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                    fontWeight: '700',
                    background: countdown > 0 ? '#d9d9d9' : 'var(--primary-color)',
                    border: `1px solid ${countdown > 0 ? '#d9d9d9' : 'var(--primary-color)'}`,
                    borderRadius: '0.6rem',
                    boxShadow: countdown > 0 ? 'none' : 'var(--shadow-sm)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (countdown === 0) {
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = countdown > 0 ? 'none' : 'var(--shadow-sm)';
                  }}
                >
                  {countdown > 0 ? `Locked (${countdown}s)` : 'Login'}
                </Button>
              </Form.Item>
{/* 
              <Divider style={{ margin: '1.5rem 0' }}>
                <span style={{ color: '#999', fontSize: '0.85rem' }}>or</span>
              </Divider> */}

              {/* <Button
                block
                size="large"
                onClick={handleGoogleSignIn}
                loading={googleLoading}
                disabled={isLoading}
                icon={<GoogleOutlined />}
                style={{
                  height: '3rem',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  fontWeight: '600',
                  background: '#ffffff',
                  border: '1px solid #dadce0',
                  borderRadius: '0.6rem',
                  color: '#3c4043',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#c1c1c1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#dadce0';
                }}
              >
                Sign in with Google
              </Button> */}

              <div style={{
                textAlign: 'center',
                marginTop: '1.5rem',
                padding: '0.75rem',
                background: '#f9f9f9',
                borderRadius: '0.5rem',
              }}>
                <p style={{
                  color: '#666',
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  By signing in, you agree to our{' '}
                  <Link href="/terms" style={{
                    color: 'var(--primary-color)',
                    fontWeight: '500',
                    textDecoration: 'underline',
                  }}>
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy-policy" style={{
                    color: 'var(--primary-color)',
                    fontWeight: '500',
                    textDecoration: 'underline',
                  }}>
                    Privacy Policy
                  </Link>
                </p>
                <p style={{
                  color: '#666',
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                  margin: '0.5rem 0 0 0',
                  lineHeight: 1.5,
                }}>
                  <Link href="/about" style={{
                    color: 'var(--primary-color)',
                    fontWeight: '500',
                    textDecoration: 'underline',
                  }}>
                    About Us
                  </Link>
                </p>
              </div>

              <div style={{
                textAlign: 'center',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border-color)',
              }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                  Don't have an account?{' '}
                  <Link href="/register" style={{
                    color: 'var(--primary-color)',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}>
                    Register here
                  </Link>
                </p>
              </div>
            </Form>
          </Spin>
        </Card>
      </Col>
    </Row>
  );
}
