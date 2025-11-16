'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Spin, Row, Col, Checkbox } from 'antd';
import { LockOutlined, UserOutlined, HomeOutlined, MailOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [form] = Form.useForm();
  const [createFirm, setCreateFirm] = useState(false);

  const onFinish = async (values: any) => {
    try {
      await register(
        values.email,
        values.name,
        values.password,
        createFirm ? values.firmName : undefined
      );
      message.success('Registration successful!');
      router.push('/dashboard');
    } catch (error) {
      message.error('Registration failed. Please try again.');
    }
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f0f2f5', padding: '20px' }}>
      <Col xs={22} sm={20} md={12} lg={8}>
        <Card
          title={
            <div style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
              Create Account
            </div>
          }
          bordered={false}
          style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.1)' }}
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

              <Form.Item>
                <Checkbox
                  checked={createFirm}
                  onChange={(e) => setCreateFirm(e.target.checked)}
                >
                  Create a new law firm
                </Checkbox>
              </Form.Item>

              {createFirm && (
                <Form.Item
                  name="firmName"
                  label="Firm Name"
                  rules={[
                    { required: true, message: 'Please enter your firm name' },
                  ]}
                >
                  <Input
                    prefix={<HomeOutlined />}
                    placeholder="Your Firm Name"
                  />
                </Form.Item>
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
                  <Link href="/login" style={{ color: '#1890ff' }}>
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
