'use client';

import React from 'react';
import { Layout, Menu, Button, Dropdown, Space, Avatar } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  CalendarOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

const { Header, Content, Sider } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getSelectedKey = () => {
    if (pathname.includes('/cases')) return 'cases';
    if (pathname.includes('/calendar')) return 'calendar';
    if (pathname.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const userMenu = {
    items: [
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: <Link href="/settings">Settings</Link>,
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={250}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#1890ff', margin: 0 }}>Legal Diary</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: <Link href="/dashboard">Dashboard</Link>,
            },
            {
              key: 'cases',
              icon: <FileTextOutlined />,
              label: 'Cases',
              children: [
                {
                  key: 'cases-list',
                  label: <Link href="/cases">All Cases</Link>,
                },
                {
                  key: 'cases-create',
                  label: <Link href="/cases/create">New Case</Link>,
                },
              ],
            },
            {
              key: 'calendar',
              icon: <CalendarOutlined />,
              label: <Link href="/calendar">Hearing Calendar</Link>,
            },
          ]}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ fontSize: '14px', color: '#666' }}>
            Welcome, {user?.name}
          </div>
          <Dropdown menu={userMenu} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ background: '#1890ff' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <span>{user?.name}</span>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: '20px' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
