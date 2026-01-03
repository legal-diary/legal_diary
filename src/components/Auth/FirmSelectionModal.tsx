'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Divider, Spin, message } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

interface Firm {
  id: string;
  name: string;
}

interface FirmSelectionModalProps {
  open: boolean;
  token: string;
  onSuccess: (userData: any) => void;
}

export default function FirmSelectionModal({ open, token, onSuccess }: FirmSelectionModalProps) {
  const [form] = Form.useForm();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loadingFirms, setLoadingFirms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

    if (open) {
      fetchFirms();
    }
  }, [open]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // Determine firm parameter based on choice
      let firmParam: { firmName?: string; firmId?: string } = {};

      if (firmChoice === 'existing') {
        firmParam.firmId = values.existingFirmId;
      } else if (firmChoice === 'new') {
        firmParam.firmName = values.newFirmName;
      }

      if (!firmParam.firmId && !firmParam.firmName) {
        message.error('Please select or create a firm');
        return;
      }

      const response = await fetch('/api/auth/setup-firm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(firmParam),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set up firm');
      }

      message.success('Firm setup successful!');
      onSuccess(data.user);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to set up firm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExistingFirmChange = (value: string) => {
    setFirmChoice('existing');
    form.setFieldValue('newFirmName', undefined);
  };

  const handleNewFirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setFirmChoice('new');
      form.setFieldValue('existingFirmId', undefined);
    }
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 'bold' }}>
          Complete Your Registration
        </div>
      }
      open={open}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={480}
    >
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
        Please select or create a firm to continue using Legal Diary.
      </p>

      <Form form={form} onFinish={handleSubmit} layout="vertical">
        {loadingFirms ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spin />
            <p style={{ marginTop: '0.5rem', color: '#666' }}>Loading firms...</p>
          </div>
        ) : (
          <>
            {firms.length > 0 && (
              <>
                <Form.Item
                  name="existingFirmId"
                  label="Join an Existing Firm"
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
                    onChange={handleExistingFirmChange}
                    disabled={firmChoice === 'new'}
                    size="large"
                  >
                    {firms.map((firm) => (
                      <Select.Option key={firm.id} value={firm.id}>
                        {firm.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Divider style={{ margin: '1rem 0' }}>
                  <span style={{ color: '#999', fontSize: '0.9rem' }}>OR</span>
                </Divider>
              </>
            )}

            <Form.Item
              name="newFirmName"
              label="Create a New Firm"
              rules={[
                {
                  validator: (_, value) => {
                    if (firmChoice === 'new' && !value) {
                      return Promise.reject(new Error('Please enter a firm name'));
                    }
                    if (value && (value.length < 2 || value.length > 100)) {
                      return Promise.reject(
                        new Error('Firm name must be between 2 and 100 characters')
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                prefix={<HomeOutlined />}
                placeholder="Enter your firm name"
                onChange={handleNewFirmChange}
                disabled={firmChoice === 'existing'}
                size="large"
              />
            </Form.Item>
          </>
        )}

        <Form.Item style={{ marginTop: '1.5rem', marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={submitting}
            disabled={loadingFirms}
          >
            Continue to Dashboard
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
