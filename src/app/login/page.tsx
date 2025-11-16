'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Spin, Row, Col } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [form] = Form.useForm();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      message.success('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      message.error('Login failed. Please check your credentials.');
    }
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Col xs={22} sm={20} md={12} lg={8}>
        <Card
          title={
            <div style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
              Legal Diary
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
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="your@email.com"
                  type="email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please enter your password' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={isLoading}
                >
                  Login
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
                <p>
                  Don't have an account?{' '}
                  <Link href="/register" style={{ color: '#1890ff' }}>
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
