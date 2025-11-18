'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Drawer } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  CalendarOutlined,
  LogoutOutlined,
  SettingOutlined,
  CloseOutlined,
  MenuOutlined,
  DownOutlined,
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
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

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

  const handleMenuClick = (path: string) => {
    setMobileDrawerOpen(false);
    router.push(path);
  };

  const desktopNavigationItems = [
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

  const mobileNavigationItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined style={{ fontSize: '1.2rem' }} />,
      label: 'Dashboard',
      onClick: () => handleMenuClick('/dashboard'),
    },
    {
      key: 'cases',
      icon: <FileTextOutlined style={{ fontSize: '1.2rem' }} />,
      label: 'Cases',
      children: [
        {
          key: 'cases-list',
          label: 'All Cases',
          onClick: () => handleMenuClick('/cases'),
          style: { width: '100%' },
        },
        {
          key: 'cases-create',
          label: 'New Case',
          onClick: () => handleMenuClick('/cases/create'),
          style: { width: '100%' },
        },
      ],
    },
    {
      key: 'calendar',
      icon: <CalendarOutlined style={{ fontSize: '1.2rem' }} />,
      label: 'Hearing Calendar',
      onClick: () => handleMenuClick('/calendar'),
    },
  ];

  return (
    <Layout style={{ height: '100vh', background: '#ffffff', overflow: 'hidden' }}>
      {/* Desktop Sidebar */}
      <Sider
        theme="dark"
        width={260}
        breakpoint="lg"
        collapsedWidth={0}
        style={{
          background: '#1a1a1a',
          borderRight: 'none',
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
          borderBottom: 'none',
          background: 'transparent',
        }}>
          <div style={{
            fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
            fontWeight: '800',
            color: '#fff',
            letterSpacing: '0.3px',
            textShadow: 'none',
          }}>
            Legal Diary
          </div>
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={desktopNavigationItems}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: '1.5vh',
          }}
          theme="dark"
        />

          
      </Sider>

      <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Minimalist Header */}
        <Header
          style={{
            background: '#ffffff',
            padding: '0 clamp(1.5vw, 3vw, 3vw)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'none',
            height: '10vh',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          {/* Desktop Firm Name - Left Side */}
          <div style={{
            fontSize: 'clamp(1rem, 2vw, 1.3rem)',
            fontWeight: '700',
            color: '#000000',
            letterSpacing: '0.5px',
            minWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }} className="desktop-firm-name">
            {user?.firm_name?.toUpperCase() || 'Law Firm'}
          </div>

          {/* Mobile Header - Hamburger Menu + Firm Name */}
          <div style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.8rem',
          }} className="mobile-header">
            {/* Hamburger Menu */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}
              aria-label="Open menu"
            >
              <MenuOutlined />
            </button>
            {/* Mobile Firm Name */}
            <div style={{
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              fontWeight: '700',
              color: '#000000',
            }}>
              {user?.firm_name?.toUpperCase() || 'Law Firm'}
            </div>
          </div>

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
            background: '#ffffff',
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
        title="Legal Diary"
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        closeIcon={<CloseOutlined style={{ fontSize: '1.2rem', color: '#000000' }} />}
        styles={{
          header: {
            borderBottom: '1px solid #e8e8e8',
            padding: '1.5rem',
            background: '#ffffff',
          },
          body: {
            padding: '0',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
        }}
      >
        {/* Mobile Menu - Custom Built */}
        <div className="mobile-menu-container">
          {/* Dashboard Item */}
          <div
            onClick={() => {
              handleMenuClick('/dashboard');
            }}
            className={`mobile-menu-item ${getSelectedKey() === 'dashboard' ? 'active' : ''}`}
          >
            <DashboardOutlined style={{ fontSize: '1.2rem' }} />
            <span>Dashboard</span>
          </div>

          {/* Cases Item with Dropdown */}
          <div className="mobile-menu-item-group">
            <div
              onClick={() => setExpandedMenu(expandedMenu === 'cases' ? null : 'cases')}
              className={`mobile-menu-item ${getSelectedKey() === 'cases' ? 'active' : ''}`}
            >
              <FileTextOutlined style={{ fontSize: '1.2rem' }} />
              <span>Cases</span>
              <DownOutlined
                style={{
                  marginLeft: 'auto',
                  transition: 'transform 0.3s ease',
                  transform: expandedMenu === 'cases' ? 'rotate(180deg)' : 'rotate(0deg)',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            {/* Cases Submenu */}
            {expandedMenu === 'cases' && (
              <div className="mobile-submenu">
                <div
                  onClick={() => handleMenuClick('/cases')}
                  className={`mobile-submenu-item ${
                    pathname.includes('/cases') && !pathname.includes('/cases/create') ? 'active' : ''
                  }`}
                >
                  All Cases
                </div>
                <div
                  onClick={() => handleMenuClick('/cases/create')}
                  className={`mobile-submenu-item ${pathname.includes('/cases/create') ? 'active' : ''}`}
                >
                  New Case
                </div>
              </div>
            )}
          </div>

          {/* Calendar Item */}
          <div
            onClick={() => {
              handleMenuClick('/calendar');
            }}
            className={`mobile-menu-item ${getSelectedKey() === 'calendar' ? 'active' : ''}`}
          >
            <CalendarOutlined style={{ fontSize: '1.2rem' }} />
            <span>Hearing Calendar</span>
          </div>
        </div>

        {/* Mobile Drawer Footer */}
        <div className="mobile-drawer-footer">
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
              borderRadius: '0.5rem',
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
          .desktop-firm-name {
            display: none !important;
          }

          .mobile-header {
            display: flex !important;
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

        /* Mobile Drawer Styling */
        .ant-drawer-content-wrapper {
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08) !important;
        }

        .ant-drawer-header {
          border-bottom: 1px solid #e8e8e8 !important;
          background: #ffffff !important;
          padding: 1.5rem !important;
        }

        .ant-drawer-title {
          font-size: 1.3rem !important;
          font-weight: 800 !important;
          color: #000000 !important;
          letter-spacing: 0px;
          width: 100% !important;
        }

        .ant-drawer-close {
          font-size: 1.2rem !important;
          color: #000000 !important;
          transition: all 0.2s ease !important;
        }

        .ant-drawer-close:hover {
          color: #000000 !important;
          transform: rotate(90deg);
          opacity: 0.7;
        }

        .ant-drawer-body {
          padding: 0 !important;
          background: #ffffff !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }

        /* Mobile Menu Container */
        .mobile-menu-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-top: 1rem;
          width: 100%;
        }

        /* Mobile Menu Item */
        .mobile-menu-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          color: #757575;
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
          user-select: none;
          white-space: nowrap;
          width: 100%;
          box-sizing: border-box;
        }

        .mobile-menu-item:hover {
          background: #fafafa;
          color: #000000;
          border-left-color: #d0d0d0;
        }


        /* Mobile Menu Item Group (for submenu parent) */
        .mobile-menu-item-group {
          width: 100%;
        }

        .mobile-menu-item-group .mobile-menu-item {
          display: flex;
        }

        /* Mobile Submenu */
        .mobile-submenu {
          background: #fafafa;
          width: 100%;
          overflow: hidden;
        }

        /* Mobile Submenu Item */
        .mobile-submenu-item {
          padding: 0.9rem 1.5rem 0.9rem 3.5rem;
          color: #757575;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
          user-select: none;
          display: block;
          width: 100%;
          box-sizing: border-box;
          background: #fafafa;
        }

        .mobile-submenu-item:hover {
          background: #f0f0f0;
          color: #000000;
          border-left-color: #d0d0d0;
        }


        /* Mobile Drawer Footer */
        .mobile-drawer-footer {
          padding: 1.5rem;
          border-top: 1px solid #e8e8e8;
          background: #ffffff;
          flex-shrink: 0;
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
