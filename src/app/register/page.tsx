'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Spin, Row, Col, Divider, Alert, Space } from 'antd';
import {
  LockOutlined,
  UserOutlined,
  HomeOutlined,
  MailOutlined,
  TeamOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { apiHeaders } from '@/lib/apiClient';

// Error types for different UI treatments
type ErrorType = 'error' | 'warning' | 'info';

interface RegisterError {
  message: string;
  type: ErrorType;
  field?: string; // Which field the error relates to
}

// Field-specific error messages for better UX
const ERROR_FIELD_MAP: Record<string, string> = {
  'Email already registered': 'email',
  'Invalid email format': 'email',
  'Password must be at least': 'password',
  'Name must be between': 'name',
  'Firm name must be between': 'newFirmName',
  'Specified firm does not exist': 'existingFirmId',
};

export default function RegisterPage() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const [form] = Form.useForm();
  const [firmChoice, setFirmChoice] = useState<'existing' | 'new' | null>(null);
  const [registerError, setRegisterError] = useState<RegisterError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Clear error when user starts typing
  const handleFieldChange = () => {
    if (registerError) {
      setRegisterError(null);
    }
  };

  // Parse error response and identify which field it relates to
  const parseRegisterError = async (response: Response): Promise<RegisterError> => {
    try {
      const data = await response.json();
      const errorMessage = data.error || 'Registration failed';

      // Find which field the error relates to
      let field: string | undefined;
      for (const [key, value] of Object.entries(ERROR_FIELD_MAP)) {
        if (errorMessage.includes(key)) {
          field = value;
          break;
        }
      }

      // Email already exists (409)
      if (response.status === 409) {
        return {
          message: 'This email is already registered. Please use a different email or try logging in.',
          type: 'warning',
          field: 'email',
        };
      }

      // Firm not found (404)
      if (response.status === 404) {
        return {
          message: 'The selected firm no longer exists. Please choose a different firm or create a new one.',
          type: 'error',
          field: 'existingFirmId',
        };
      }

      // Validation errors (400)
      if (response.status === 400) {
        return {
          message: errorMessage,
          type: 'error',
          field,
        };
      }

      // Server errors (500)
      if (response.status >= 500) {
        return {
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          type: 'error',
        };
      }

      return { message: errorMessage, type: 'error', field };
    } catch {
      return { message: 'An unexpected error occurred. Please try again.', type: 'error' };
    }
  };

  const onFinish = async (values: any) => {
    setRegisterError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        email: values.email,
        name: values.name,
        password: values.password,
      };

      if (firmChoice === 'existing') {
        const firmId = values.existingFirmId?.trim();
        if (!firmId) {
          setRegisterError({
            message: 'Please enter a Firm ID to join an existing firm.',
            type: 'warning',
            field: 'existingFirmId',
          });
          setSubmitting(false);
          return;
        }
        payload.firmId = firmId;
      } else if (firmChoice === 'new') {
        const firmName = values.newFirmName?.trim();
        if (!firmName) {
          setRegisterError({
            message: 'Please enter a firm name to create a new firm.',
            type: 'warning',
            field: 'newFirmName',
          });
          setSubmitting(false);
          return;
        }
        payload.firmName = firmName;
      } else {
        setRegisterError({
          message: 'Please join an existing firm or create a new one to continue.',
          type: 'warning',
        });
        setSubmitting(false);
        return;
      }

      // Call register API directly to handle errors
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await parseRegisterError(response.clone());
        setRegisterError(error);
        setSubmitting(false);
        return;
      }

      // Registration successful - now login
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        localStorage.setItem('authToken', loginData.token);
        localStorage.setItem('user', JSON.stringify(loginData.user));
        localStorage.setItem('tokenExpiresAt', loginData.expiresAt);

        message.success('Registration successful! Welcome to Legal Diary.');
        router.push('/dashboard');
        window.location.href = '/dashboard';
      } else {
        message.success('Registration successful! Please login with your credentials.');
        router.push('/login');
      }
    } catch (error) {
      setRegisterError({
        message: 'Network error. Please check your internet connection and try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100dvh', background: '#ffffff', padding: 'clamp(12px, 4vw, 24px)' }}>
      <Col xs={24} sm={22} md={14} lg={10} xl={8} style={{ maxWidth: '500px', width: '100%' }}>
        <Card
          title={
            <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 'bold', textAlign: 'center', color: '#000000' }}>
              Create Account
            </div>
          }
          variant="borderless"
          style={{ boxShadow: 'none', borderColor: 'transparent', borderRadius: 'clamp(0.5rem, 2vw, 0.8rem)', background: '#ffffff' }}
          styles={{
            body: { padding: 'clamp(12px, 4vw, 24px)' },
            header: { borderBottom: 'none', padding: 'clamp(12px, 4vw, 16px) clamp(12px, 4vw, 24px) 0' }
          }}
        >
          <Spin spinning={isLoading || submitting}>
            <Form
              form={form}
              onFinish={onFinish}
              layout="vertical"
              size="large"
              onValuesChange={handleFieldChange}
            >
              {/* Error Alert */}
              {registerError && (
                <Alert
                  message={
                    registerError.type === 'warning' ? (
                      registerError.field === 'email' ? 'Email Already Registered' : 'Action Required'
                    ) : (
                      'Registration Failed'
                    )
                  }
                  description={
                    <div>
                      <p style={{ margin: 0 }}>{registerError.message}</p>
                      {registerError.field === 'email' && registerError.type === 'warning' && (
                        <p style={{ margin: '8px 0 0 0' }}>
                          <Link href="/login" style={{ color: '#1890ff', fontWeight: 600 }}>
                            Click here to login instead →
                          </Link>
                        </p>
                      )}
                    </div>
                  }
                  type={registerError.type}
                  showIcon
                  closable
                  onClose={() => setRegisterError(null)}
                  style={{
                    marginBottom: '1rem',
                    borderRadius: '0.5rem',
                  }}
                />
              )}

              {/* Personal Details */}
              <Form.Item
                name="name"
                label="Full Name"
                rules={[
                  { required: true, message: 'Please enter your full name' },
                  { min: 2, message: 'Name must be at least 2 characters' },
                  { max: 100, message: 'Name must be less than 100 characters' },
                ]}
                validateStatus={registerError?.field === 'name' ? 'error' : undefined}
                help={registerError?.field === 'name' ? registerError.message : undefined}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="John Doe"
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
                validateStatus={registerError?.field === 'email' ? 'error' : undefined}
                help={registerError?.field === 'email' ? registerError.message : undefined}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="your@email.com"
                  type="email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please enter your password' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                ]}
                validateStatus={registerError?.field === 'password' ? 'error' : undefined}
                help={registerError?.field === 'password' ? registerError.message : undefined}
                extra={
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    Must be at least 8 characters
                  </span>
                }
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
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
                  prefix={<LockOutlined />}
                  placeholder="Confirm Password"
                />
              </Form.Item>

              {/* Firm Selection */}
              {firmChoice === null && (
                <>
                  <Divider>Firm Selection (Required)</Divider>

                  {/* Firm not selected warning */}
                  {registerError && !registerError.field && registerError.type === 'warning' && (
                    <Alert
                      message="Firm Required"
                      description={registerError.message}
                      type="warning"
                      showIcon
                      style={{ marginBottom: '1rem', borderRadius: '0.5rem' }}
                    />
                  )}

                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Button
                      block
                      size="large"
                      icon={<TeamOutlined />}
                      onClick={() => setFirmChoice('existing')}
                      style={{
                        height: '3rem',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        fontWeight: '600',
                        borderRadius: '0.6rem',
                      }}
                    >
                      Join Existing Firm
                    </Button>
                    <Button
                      block
                      size="large"
                      icon={<PlusCircleOutlined />}
                      onClick={() => setFirmChoice('new')}
                      style={{
                        height: '3rem',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        fontWeight: '600',
                        borderRadius: '0.6rem',
                      }}
                    >
                      Create New Firm
                    </Button>
                  </Space>
                </>
              )}

              {firmChoice === 'existing' && (
                <>
                  <Divider>Join Existing Firm</Divider>
                  <Form.Item
                    name="existingFirmId"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value?.trim()) {
                            return Promise.reject(new Error('Please enter a Firm ID'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                    validateStatus={registerError?.field === 'existingFirmId' ? 'error' : undefined}
                    help={registerError?.field === 'existingFirmId' ? registerError.message : undefined}
                    extra={
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                        Ask your firm admin to share the Firm ID from Settings
                      </span>
                    }
                  >
                    <Input
                      prefix={<HomeOutlined />}
                      placeholder="Enter Firm ID"
                      allowClear
                    />
                  </Form.Item>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <a
                      onClick={() => {
                        setFirmChoice(null);
                        form.setFieldValue('existingFirmId', undefined);
                        setRegisterError(null);
                      }}
                      style={{ color: '#1890ff', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', cursor: 'pointer' }}
                    >
                      Want to create a new firm instead?
                    </a>
                  </div>
                </>
              )}

              {firmChoice === 'new' && (
                <>
                  <Divider>Create New Firm</Divider>
                  <Form.Item
                    name="newFirmName"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value?.trim()) {
                            return Promise.reject(new Error('Please enter a firm name'));
                          }
                          if (value.length < 2 || value.length > 100) {
                            return Promise.reject(new Error('Firm name must be between 2 and 100 characters'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                    validateStatus={registerError?.field === 'newFirmName' ? 'error' : undefined}
                    help={registerError?.field === 'newFirmName' ? registerError.message : undefined}
                    extra={
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                        You will be the admin of this firm
                      </span>
                    }
                  >
                    <Input
                      prefix={<HomeOutlined />}
                      placeholder="Your New Firm Name"
                    />
                  </Form.Item>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <a
                      onClick={() => {
                        setFirmChoice(null);
                        form.setFieldValue('newFirmName', undefined);
                        setRegisterError(null);
                      }}
                      style={{ color: '#1890ff', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', cursor: 'pointer' }}
                    >
                      Want to join an existing firm instead?
                    </a>
                  </div>
                </>
              )}

              <Form.Item style={{ marginTop: '1.5rem' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={submitting}
                  style={{
                    height: '3rem',
                    fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                    fontWeight: '700',
                    borderRadius: '0.6rem',
                  }}
                >
                  {submitting ? 'Creating Account...' : 'Register'}
                </Button>
              </Form.Item>

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
                  By registering, you agree to our{' '}
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

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <p>
                  Already have an account?{' '}
                  <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
                    Login here
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
