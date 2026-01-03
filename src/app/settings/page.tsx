'use client';

import React from 'react';
import { Typography, Divider, Card, Space } from 'antd';
import { SettingOutlined, ApiOutlined } from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import GoogleCalendarConnect from '@/components/GoogleCalendar/GoogleCalendarConnect';

const { Title, Text } = Typography;

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <SettingOutlined style={{ marginRight: 12 }} />
            Settings
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Manage your account settings and integrations
          </Text>

          <Divider orientation="left">
            <Space>
              <ApiOutlined />
              <span>Integrations</span>
            </Space>
          </Divider>

          <Card
            style={{ marginBottom: 24 }}
            title="Connected Services"
            bordered={false}
            className="integration-card"
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Connect external services to enhance your Legal Diary experience.
            </Text>

            <GoogleCalendarConnect />
          </Card>

          <style jsx global>{`
            .integration-card {
              background: #fafafa;
            }

            .integration-card .ant-card-head {
              border-bottom: none;
            }

            .integration-card .ant-card-body {
              padding-top: 0;
            }

            @media (max-width: 768px) {
              .integration-card {
                margin: 0 -12px;
                border-radius: 0;
              }
            }
          `}</style>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
