'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, Alert, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { apiHeaders } from '@/lib/apiClient';

export default function ForgotPasswordPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email: values.email.trim().toLowerCase() }),
      });

      if (response.status === 429) {
        setError('Too many requests. Please try again later.');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Something went wrong');
        return;
      }

      setSent(true);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row justify="center" align="middle" style={{
      minHeight: '100dvh',
      background: '#ffffff',
      padding: 'clamp(12px, 4vw, 24px)',
    }}>
      <Col xs={24} sm={22} md={14} lg={10} xl={8} style={{ maxWidth: '450px', width: '100%' }}>
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
          }}
          styles={{
            body: { padding: 'clamp(12px, 4vw, 24px)' },
            header: { borderBottom: 'none', padding: 'clamp(12px, 4vw, 20px) clamp(12px, 4vw, 24px) 0' }
          }}
        >
          {sent ? (
            <Result
              icon={<MailOutlined style={{ color: '#1a3a52' }} />}
              title="Check your email"
              subTitle="If an account exists with that email, we've sent a password reset link. Check your inbox (and spam folder)."
              extra={
                <Link href="/login">
                  <Button type="primary" style={{ background: '#1a3a52', borderColor: '#1a3a52' }}>
                    Back to Login
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#333', fontWeight: 600 }}>Forgot Password?</h3>
                <p style={{ margin: '8px 0 0', color: '#888', fontSize: '0.9rem' }}>
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </div>

              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                  style={{ marginBottom: '1rem' }}
                />
              )}

              <Form
                form={form}
                onFinish={onFinish}
                layout="vertical"
                size="large"
              >
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Please enter a valid email' },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="your@email.com"
                    type="email"
                    autoFocus
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: '1rem' }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    style={{
                      height: 'clamp(40px, 6vh, 48px)',
                      background: '#1a3a52',
                      borderColor: '#1a3a52',
                      fontWeight: 600,
                    }}
                  >
                    Send Reset Link
                  </Button>
                </Form.Item>
              </Form>

              <div style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ color: '#1890ff', fontSize: '0.9rem' }}>
                  <ArrowLeftOutlined style={{ marginRight: 4 }} />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </Card>
      </Col>
    </Row>
  );
}
