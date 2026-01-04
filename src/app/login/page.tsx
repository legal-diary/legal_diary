'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Spin, Row, Col, Divider } from 'antd';
import { LockOutlined, UserOutlined, GoogleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [form] = Form.useForm();
  const [googleLoading, setGoogleLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      message.success('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      message.error('Login failed. Please check your credentials.');
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
            >
              <Form.Item
                name="email"
                label={<span style={{ fontWeight: '600', color: '#1a1a1a' }}>Email</span>}
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: 'var(--primary-color)' }} />}
                  placeholder="your@email.com"
                  type="email"
                  style={{ borderRadius: '0.6rem' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontWeight: '600', color: '#1a1a1a' }}>Password</span>}
                rules={[
                  { required: true, message: 'Please enter your password' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--primary-color)' }} />}
                  placeholder="Password"
                  style={{ borderRadius: '0.6rem' }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '2rem' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={isLoading}
                  style={{
                    height: '3rem',
                    fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                    fontWeight: '700',
                    background: 'var(--primary-color)',
                    border: '1px solid var(--primary-color)',
                    borderRadius: '0.6rem',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  Login
                </Button>
              </Form.Item>

              <Divider style={{ margin: '1.5rem 0' }}>
                <span style={{ color: '#999', fontSize: '0.85rem' }}>or</span>
              </Divider>

              <Button
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
              </Button>

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
