'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Alert } from 'antd';
import { LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { buildAuthHeaders } from '@/lib/authHeaders';

interface SetPasswordModalProps {
  open: boolean;
  token?: string | null;
  onSuccess: () => void;
  onSkip: () => void;
}

export default function SetPasswordModal({
  open,
  token,
  onSuccess,
  onSkip,
}: SetPasswordModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const authHeaders = buildAuthHeaders(token);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        message.success('Password set successfully! You can now login with email and password.');
        form.resetFields();
        onSuccess();
      } else {
        message.error(data.error || 'Failed to set password');
      }
    } catch (error) {
      message.error('Failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 'bold' }}>
          <LockOutlined style={{ marginRight: '8px', color: '#1a3a52' }} />
          Set Your Password
        </div>
      }
      open={open}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={480}
    >
      <Alert
        message="Optional Step"
        description={
          <span>
            <GoogleOutlined style={{ marginRight: '8px' }} />
            You signed in with Google. Set a password to also login with email and password, or skip this step.
          </span>
        }
        type="info"
        showIcon
        style={{ marginBottom: '1.5rem' }}
      />

      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter password (min 8 characters)"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
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
            placeholder="Confirm password"
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
              icon={<LockOutlined />}
            >
              Set Password
            </Button>
            <Button
              type="text"
              block
              size="large"
              onClick={handleSkip}
              disabled={submitting}
              style={{ color: '#666' }}
            >
              Skip for now
            </Button>
          </div>
        </Form.Item>
      </Form>

      <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#999' }}>
        You can always set a password later from Settings
      </p>
    </Modal>
  );
}
