'use client';

import React, { useState, Suspense } from 'react';
import { Form, Input, Button, Card, Row, Col, Alert, Result } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiHeaders } from '@/lib/apiClient';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No token in URL
  if (!token) {
    return (
      <Result
        status="error"
        title="Invalid Link"
        subTitle="This password reset link is invalid. Please request a new one."
        extra={
          <Link href="/forgot-password">
            <Button type="primary" style={{ background: '#1a3a52', borderColor: '#1a3a52' }}>
              Request New Link
            </Button>
          </Link>
        }
      />
    );
  }

  const onFinish = async (values: { password: string; confirmPassword: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          token,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="Password Reset Successfully"
        subTitle="Redirecting you to login..."
        extra={
          <Link href="/login">
            <Button type="primary" style={{ background: '#1a3a52', borderColor: '#1a3a52' }}>
              Go to Login
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: '#333', fontWeight: 600 }}>Reset Password</h3>
        <p style={{ margin: '8px 0 0', color: '#888', fontSize: '0.9rem' }}>
          Enter your new password below
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
          action={
            error.includes('expired') || error.includes('Invalid') || error.includes('already been used') ? (
              <Link href="/forgot-password">
                <Button size="small" type="link">Request new link</Button>
              </Link>
            ) : undefined
          }
        />
      )}

      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="password"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Enter new password"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Confirm new password"
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
            Reset Password
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Link href="/login" style={{ color: '#1890ff', fontSize: '0.9rem' }}>
          Back to Login
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </Card>
      </Col>
    </Row>
  );
}
