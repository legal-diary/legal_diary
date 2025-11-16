'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Space, Avatar, Drawer } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  CalendarOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuOutlined,
  CloseOutlined,
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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

  const navigationMenuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined style={{ fontSize: '1.2rem' }} />,
      label: <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>Dashboard</Link>,
    },
    {
      key: 'cases',
      icon: <FileTextOutlined style={{ fontSize: '1.2rem' }} />,
      label: 'Cases',
      children: [
        {
          key: 'cases-list',
          label: <Link href="/cases" style={{ textDecoration: 'none', color: 'inherit' }}>All Cases</Link>,
        },
        {
          key: 'cases-create',
          label: <Link href="/cases/create" style={{ textDecoration: 'none', color: 'inherit' }}>New Case</Link>,
        },
      ],
    },
    {
      key: 'calendar',
      icon: <CalendarOutlined style={{ fontSize: '1.2rem' }} />,
      label: <Link href="/calendar" style={{ textDecoration: 'none', color: 'inherit' }}>Hearing Calendar</Link>,
    },
  ];

  return (
    <Layout style={{ height: '100vh', background: '#f8fafb', overflow: 'hidden' }}>
      {/* Desktop Sidebar */}
      <Sider
        theme="light"
        width={260}
        breakpoint="lg"
        collapsedWidth={0}
        style={{
          background: 'var(--primary-color)',
          borderRight: '1px solid var(--border-color)',
          position: 'relative',
          overflow: 'hidden',
          height: '100vh',
        }}
        className="desktop-sidebar"
      >
        {/* Sidebar Header */}
        <div style={{
          padding: '2.5vh 2vw',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{
            fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
            fontWeight: '700',
            color: '#fff',
            letterSpacing: '0.5px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}>
            Legal Diary
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '0.4vh',
            fontWeight: '500',
          }}>
            Case Management
          </div>
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={navigationMenuItems}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: '1.5vh',
          }}
          theme="dark"
        />

        {/* User Info in Sidebar */}
        <div style={{
          position: 'absolute',
          bottom: '2vh',
          left: 0,
          right: 0,
          padding: '2vw',
          background: 'rgba(255, 255, 255, 0.1)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
        }}>
          <Avatar
            size={50}
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 'bold',
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{
            color: '#fff',
            fontSize: '0.8rem',
            marginTop: '0.8vh',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: '500',
          }}>
            {user?.name}
          </div>
        </div>
      </Sider>

      <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Minimalist Header */}
        <Header
          style={{
            background: 'var(--bg-primary)',
            padding: '0 clamp(1.5vw, 3vw, 3vw)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)',
            height: '10vh',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          {/* Mobile Logo - Clickable to open menu */}
          <Link href="#" onClick={(e) => {
            e.preventDefault();
            setMobileDrawerOpen(true);
          }} style={{
            display: 'none',
            fontSize: 'clamp(1rem, 4vw, 1.3rem)',
            fontWeight: '700',
            color: 'var(--primary-color)',
            textDecoration: 'none',
            letterSpacing: '0.5px',
          }} className="mobile-logo">
            Legal Diary
          </Link>

          {/* User Profile - Spacer to push right */}
          <div style={{ flex: 1 }} />

          {/* User Profile */}
          <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
            <div
              style={{
                cursor: 'pointer',
                padding: '0.4vh 1vw',
                borderRadius: '0.6rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                height: '6vh',
                marginLeft: 'auto',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(26, 58, 82, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Avatar
                size={32}
                style={{
                  background: 'var(--primary-color)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0,
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <span style={{
                fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)',
                fontWeight: '600',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 'clamp(100px, 12vw, 150px)',
              }}>
                {user?.name?.split(' ')[0]}
              </span>
            </div>
          </Dropdown>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            padding: 'clamp(1.5vh, 3vw, 3vh)',
            overflow: 'auto',
            background: '#f8fafb',
            flex: 1,
            minHeight: 0,
            height: 'calc(100vh - 10vh)',
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* Mobile Navigation Drawer */}
      <Drawer
        title={
          <div style={{
            fontSize: '1.3rem',
            fontWeight: '700',
            color: 'var(--primary-color)',
            margin: '-1rem -1rem 0 -1rem',
            padding: '1rem 1rem 0.5rem 1rem',
            borderBottom: '2px solid var(--primary-color)',
          }}>
            Legal Diary
          </div>
        }
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        closeIcon={<CloseOutlined style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }} />}
        style={{
          background: 'var(--bg-secondary)',
        }}
        bodyStyle={{
          padding: '1.5vh 0',
          background: 'var(--bg-secondary)',
        }}
      >
        <Menu
          mode="vertical"
          selectedKeys={[getSelectedKey()]}
          items={navigationMenuItems}
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            border: 'none',
            background: 'transparent',
          }}
        />

        {/* Mobile Drawer Footer */}
        <div style={{
          position: 'absolute',
          bottom: '2vh',
          left: 0,
          right: 0,
          padding: '2vw',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
        }}>
          <Button
            type="primary"
            danger
            block
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              height: '2.8rem',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '0.6rem',
              background: '#d32f2f',
              border: 'none',
            }}
          >
            Logout
          </Button>
        </div>
      </Drawer>

      <style>{`
        @media (max-width: 992px) {
          .mobile-logo {
            display: inline-block !important;
            cursor: pointer;
            padding: 0.5vh 0.8vw;
            border-radius: 0.6rem;
            transition: all 0.3s ease;
            user-select: none;
          }

          .mobile-logo:active {
            background: rgba(26, 58, 82, 0.08);
            transform: scale(0.98);
          }

          .desktop-sidebar {
            display: none !important;
          }
        }

        /* Mobile Header Optimization */
        @media (max-width: 768px) {
          .ant-layout-header {
            padding: 0 1.2vw !important;
          }
        }

        /* Mobile Drawer Premium Styling */
        .ant-drawer-content-wrapper {
          box-shadow: -2px 0 12px rgba(0, 0, 0, 0.1) !important;
        }

        .ant-drawer-header {
          border-bottom: 1px solid var(--border-color) !important;
          background: var(--bg-primary) !important;
          padding: 1.5vh 1.5vw !important;
        }

        .ant-drawer-title {
          font-size: clamp(1.1rem, 5vw, 1.3rem) !important;
          font-weight: 700 !important;
          color: var(--primary-color) !important;
          letter-spacing: 0.5px;
        }

        .ant-drawer-close {
          font-size: 1.2rem !important;
          color: var(--primary-color) !important;
          transition: all 0.3s ease !important;
        }

        .ant-drawer-close:hover {
          color: var(--primary-light) !important;
          transform: rotate(90deg);
        }

        .ant-drawer-body {
          padding: 0 !important;
          background: var(--bg-secondary) !important;
        }

        /* Mobile Menu Styling */
        .ant-menu-light {
          background: var(--bg-secondary) !important;
          border: none !important;
        }

        .ant-menu-item-selected {
          background: rgba(26, 58, 82, 0.08) !important;
          border-left: 3px solid var(--primary-color) !important;
          border-radius: 0 !important;
          margin: 0 !important;
          padding: 1.2vh 1.5vw !important;
          font-weight: 600 !important;
          color: var(--primary-color) !important;
        }

        .ant-menu-item {
          border-radius: 0 !important;
          margin: 0 !important;
          padding: 1.2vh 1.5vw !important;
          color: var(--text-primary) !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
          border-left: 3px solid transparent;
        }

        .ant-menu-item:hover {
          background: rgba(26, 58, 82, 0.04) !important;
          border-left-color: rgba(26, 58, 82, 0.3) !important;
        }

        .ant-menu-submenu-title {
          padding: 1.2vh 1.5vw !important;
          color: var(--text-primary) !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
        }

        .ant-menu-submenu-title:hover {
          background: rgba(26, 58, 82, 0.04) !important;
          color: var(--primary-color) !important;
        }

        /* Mobile Drawer Footer Premium */
        .ant-drawer-body > div:last-child {
          padding: 2vh 1.5vw !important;
          border-top: 1px solid var(--border-color) !important;
          background: var(--bg-primary) !important;
        }

        .ant-avatar {
          font-weight: 600;
        }

        /* Desktop Sidebar Menu Styling */
        .desktop-sidebar .ant-menu-dark .ant-menu-item,
        .desktop-sidebar .ant-menu-dark .ant-menu-submenu-title {
          color: rgba(255, 255, 255, 0.85) !important;
          font-size: clamp(0.9rem, 2vw, 1rem) !important;
        }

        .desktop-sidebar .ant-menu-dark .ant-menu-item a,
        .desktop-sidebar .ant-menu-dark .ant-menu-submenu-title a {
          color: rgba(255, 255, 255, 0.85) !important;
          font-size: clamp(0.9rem, 2vw, 1rem) !important;
        }
      `}</style>
    </Layout>
  );
}
