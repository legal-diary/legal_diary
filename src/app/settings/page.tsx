'use client';

import React from 'react';
import { Typography, Divider, Card, Space } from 'antd';
import { SettingOutlined, ApiOutlined, TeamOutlined, LockOutlined, HistoryOutlined } from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import GoogleCalendarConnect from '@/components/GoogleCalendar/GoogleCalendarConnect';
import TeamManagement from '@/components/Settings/TeamManagement';
import SetPassword from '@/components/Settings/SetPassword';
import ActivityLog from '@/components/Settings/ActivityLog';
import { useAuth } from '@/context/AuthContext';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
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

          {/* Security / Password Section */}
          {token && (
            <>
              <Divider orientation="left">
                <Space>
                  <LockOutlined />
                  <span>Security</span>
                </Space>
              </Divider>

              <SetPassword token={token} />
            </>
          )}

          {/* Team Management - Only visible to Admins */}
          {isAdmin && token && (
            <>
              <Divider orientation="left">
                <Space>
                  <TeamOutlined />
                  <span>Team</span>
                </Space>
              </Divider>

              <TeamManagement token={token} />
            </>
          )}

          {/* Activity Log - Only visible to Admins */}
          {isAdmin && token && (
            <>
              <Divider orientation="left">
                <Space>
                  <HistoryOutlined />
                  <span>Activity Log</span>
                </Space>
              </Divider>

              <ActivityLog token={token} />
            </>
          )}

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
