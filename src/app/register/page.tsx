'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Spin, Row, Col, Select, Divider } from 'antd';
import { LockOutlined, UserOutlined, HomeOutlined, MailOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Firm {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [form] = Form.useForm();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loadingFirms, setLoadingFirms] = useState(true);
  const [firmChoice, setFirmChoice] = useState<'existing' | 'new' | null>(null);

  // Fetch existing firms
  useEffect(() => {
    const fetchFirms = async () => {
      try {
        const response = await fetch('/api/firms');
        if (response.ok) {
          const data = await response.json();
          setFirms(data);
        }
      } catch (error) {
        console.error('Error fetching firms:', error);
      } finally {
        setLoadingFirms(false);
      }
    };

    fetchFirms();
  }, []);

  const onFinish = async (values: any) => {
    try {
      // Determine firm parameter based on choice
      let firmParam: string | undefined;

      if (firmChoice === 'existing') {
        firmParam = values.existingFirmId;
      } else if (firmChoice === 'new') {
        firmParam = values.newFirmName;
      }

      if (!firmParam) {
        message.error('Please select or create a firm');
        return;
      }

      await register(
        values.email,
        values.name,
        values.password,
        firmParam
      );
      message.success('Registration successful!');
      router.push('/dashboard');
    } catch (error) {
      message.error('Registration failed. Please try again.');
    }
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '2vh' }}>
      <Col xs={22} sm={20} md={12} lg={8}>
        <Card
          title={
            <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 'bold', textAlign: 'center', color: 'var(--primary-color)' }}>
              Create Account
            </div>
          }
          bordered={true}
          style={{ boxShadow: 'var(--shadow-md)', borderColor: 'var(--border-color)', borderRadius: '0.6rem' }}
        >
          <Spin spinning={isLoading}>
            <Form
              form={form}
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="name"
                label="Full Name"
                rules={[
                  { required: true, message: 'Please enter your full name' },
                ]}
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
                  { min: 6, message: 'Password must be at least 6 characters' },
                ]}
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

              <Divider>Firm Selection (Required)</Divider>

              {loadingFirms ? (
                <Spin size="small" style={{ display: 'block', marginBottom: '1.6vh' }} />
              ) : (
                <>
                  {firms.length > 0 && (
                    <Form.Item
                      name="existingFirmId"
                      label="Join Existing Firm"
                      rules={[
                        {
                          validator: (_, value) => {
                            if (firmChoice === 'existing' && !value) {
                              return Promise.reject(new Error('Please select a firm'));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Select
                        placeholder="Select a firm to join"
                        onChange={() => setFirmChoice('existing')}
                        disabled={firmChoice === 'new'}
                        optionLabelProp="label"
                      >
                        {firms.map((firm) => (
                          <Select.Option key={firm.id} value={firm.id} label={firm.name}>
                            {firm.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}

                  {(firms.length > 0 || firmChoice === 'existing') && (
                    <div style={{ textAlign: 'center', margin: '1.5vh 0' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>— OR —</span>
                    </div>
                  )}

                  <Form.Item
                    name="newFirmName"
                    label="Create New Firm"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (firmChoice === 'new' && !value) {
                            return Promise.reject(new Error('Please enter a firm name'));
                          }
                          if (value && (value.length < 2 || value.length > 100)) {
                            return Promise.reject(new Error('Firm name must be between 2 and 100 characters'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input
                      prefix={<HomeOutlined />}
                      placeholder="Your New Firm Name"
                      onChange={() => setFirmChoice('new')}
                      disabled={firmChoice === 'existing' && form.getFieldValue('existingFirmId')}
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={isLoading}
                >
                  Register
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
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
