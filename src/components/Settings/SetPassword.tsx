'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Alert,
  Space,
} from 'antd';
import {
  LockOutlined,
  CheckCircleOutlined,
  GoogleOutlined,
} from '@ant-design/icons';

interface SetPasswordProps {
  token: string;
}

export default function SetPassword({ token }: SetPasswordProps) {
  const [form] = Form.useForm();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check if user has password set
  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        const response = await fetch('/api/auth/set-password', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setHasPassword(data.hasPassword);
        }
      } catch (error) {
        console.error('Error checking password status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPasswordStatus();
  }, [token]);

  // Handle form submission
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        message.success(data.message);
        form.resetFields();
        setHasPassword(true);
      } else {
        message.error(data.error || 'Failed to set password');
      }
    } catch (error) {
      message.error('Failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card loading style={{ marginBottom: 24 }} />
    );
  }

  return (
    <Card
      title={
        <Space>
          <LockOutlined />
          <span>{hasPassword ? 'Change Password' : 'Set Password'}</span>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {!hasPassword && (
        <Alert
          message="No password set"
          description={
            <span>
              <GoogleOutlined style={{ marginRight: 8 }} />
              Your account was created with Google Sign-In. Set a password to also login with email and password.
            </span>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {hasPassword && (
        <Alert
          message="Password is set"
          description="You can login with both Google and email/password."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        {hasPassword && (
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[
              { required: true, message: 'Please enter your current password' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter current password"
            />
          </Form.Item>
        )}

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter new password (min 8 characters)"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Confirm new password"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<LockOutlined />}
          >
            {hasPassword ? 'Update Password' : 'Set Password'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
