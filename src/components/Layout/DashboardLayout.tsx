'use client';

import React, { useState, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { Layout, Menu, Button, Avatar, Tag } from 'antd';
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

// Lazy load heavy components
const Dropdown = lazy(() => import('antd').then(mod => ({ default: mod.Dropdown })));
const Drawer = lazy(() => import('antd').then(mod => ({ default: mod.Drawer })));

const { Header, Content, Sider } = Layout;

// Memoized navigation items - defined outside component
const createDesktopNavigationItems = () => [
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
  {
    key: 'settings',
    icon: <SettingOutlined style={{ fontSize: '1.2rem' }} />,
    label: <Link href="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>Settings</Link>,
  },
];

// Memoized sidebar header
const SidebarHeader = memo(() => (
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
));
SidebarHeader.displayName = 'SidebarHeader';

// Mobile menu component
const MobileMenuContent = memo<{
  pathname: string;
  expandedMenu: string | null;
  setExpandedMenu: (menu: string | null) => void;
  handleMenuClick: (path: string) => void;
  handleLogout: () => void;
  getSelectedKey: () => string;
}>(({ pathname, expandedMenu, setExpandedMenu, handleMenuClick, handleLogout, getSelectedKey }) => (
  <>
    <div className="mobile-menu-container">
      <div
        onClick={() => handleMenuClick('/dashboard')}
        className={`mobile-menu-item ${getSelectedKey() === 'dashboard' ? 'active' : ''}`}
      >
        <DashboardOutlined style={{ fontSize: '1.2rem' }} />
        <span>Dashboard</span>
      </div>

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

      <div
        onClick={() => handleMenuClick('/calendar')}
        className={`mobile-menu-item ${getSelectedKey() === 'calendar' ? 'active' : ''}`}
      >
        <CalendarOutlined style={{ fontSize: '1.2rem' }} />
        <span>Hearing Calendar</span>
      </div>

      <div
        onClick={() => handleMenuClick('/settings')}
        className={`mobile-menu-item ${getSelectedKey() === 'settings' ? 'active' : ''}`}
      >
        <SettingOutlined style={{ fontSize: '1.2rem' }} />
        <span>Settings</span>
      </div>
    </div>

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
  </>
));
MobileMenuContent.displayName = 'MobileMenuContent';

// Main DashboardLayout component
function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Memoized handlers
  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  const getSelectedKey = useCallback(() => {
    if (pathname.includes('/cases')) return 'cases';
    if (pathname.includes('/calendar')) return 'calendar';
    if (pathname.includes('/settings')) return 'settings';
    return 'dashboard';
  }, [pathname]);

  const handleMenuClick = useCallback((path: string) => {
    setMobileDrawerOpen(false);
    router.push(path);
  }, [router]);

  // Memoized user menu items
  const userMenuItems = useMemo(() => ({
    items: [
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: <Link href="/settings">Settings</Link>,
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: handleLogout,
      },
    ],
  }), [handleLogout]);

  // Memoized navigation items
  const desktopNavigationItems = useMemo(createDesktopNavigationItems, []);

  // Memoized user avatar
  const userInitial = useMemo(() => user?.name?.charAt(0).toUpperCase() || 'U', [user?.name]);
  const userName = useMemo(() => user?.name?.split(' ')[0] || 'User', [user?.name]);
  const firmName = useMemo(() => user?.firm_name?.toUpperCase() || 'Law Firm', [user?.firm_name]);
  const isAdmin = user?.role === 'ADMIN';

  // Memoized drawer styles
  const drawerStyles = useMemo(() => ({
    header: {
      borderBottom: '1px solid #e8e8e8',
      padding: '1.5rem',
      background: '#ffffff',
    },
    body: {
      padding: '0',
      background: '#ffffff',
      display: 'flex' as const,
      flexDirection: 'column' as const,
      height: '100%',
    },
  }), []);

  return (
    <Layout style={{ height: '100dvh', background: '#ffffff', overflow: 'hidden' }} className="root-layout">
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
        <SidebarHeader />
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

      <Layout style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="main-content-layout">
        {/* Header */}
        <Header
          className="app-header"
          style={{
            background: '#ffffff',
            padding: '0 clamp(12px, 3vw, 32px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'none',
            height: 'clamp(52px, 10vh, 72px)',
            minHeight: '52px',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Desktop Firm Name */}
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
            {firmName}
          </div>

          {/* Mobile Header */}
          <div style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.8rem',
          }} className="mobile-header">
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
            <div style={{
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              fontWeight: '700',
              color: '#000000',
            }}>
              {firmName}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* User Profile Dropdown */}
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4vh 1vw' }}>
              <Avatar size={32} style={{ background: 'var(--primary-color)', color: '#fff' }}>{userInitial}</Avatar>
              <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{userName}</span>
              {isAdmin && (
                <Tag color="gold" style={{ fontSize: '0.65rem', padding: '0 6px', fontWeight: '700' }}>ADMIN</Tag>
              )}
            </div>
          }>
            <Dropdown menu={userMenuItems} trigger={['click']} placement="bottomRight">
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
                  {userInitial}
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
                  {userName}
                </span>
                {isAdmin && (
                  <Tag
                    color="gold"
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.65rem',
                      padding: '0 6px',
                      lineHeight: '18px',
                      fontWeight: '700',
                      borderRadius: '4px',
                    }}
                  >
                    ADMIN
                  </Tag>
                )}
              </div>
            </Dropdown>
          </Suspense>
        </Header>

        {/* Main Content */}
        <Content
          className="main-content"
          style={{
            padding: 'clamp(8px, 3vw, 24px)',
            overflow: 'auto',
            background: '#ffffff',
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <Suspense fallback={null}>
          <Drawer
            title="Legal Diary"
            placement="left"
            onClose={() => setMobileDrawerOpen(false)}
            open={mobileDrawerOpen}
            closeIcon={<CloseOutlined style={{ fontSize: '1.2rem', color: '#000000' }} />}
            styles={drawerStyles}
          >
            <MobileMenuContent
              pathname={pathname}
              expandedMenu={expandedMenu}
              setExpandedMenu={setExpandedMenu}
              handleMenuClick={handleMenuClick}
              handleLogout={handleLogout}
              getSelectedKey={getSelectedKey}
            />
          </Drawer>
        </Suspense>
      )}

      <style>{`
        /* Fallback for browsers that don't support dvh */
        .root-layout {
          height: 100vh;
          height: 100dvh;
        }

        .main-content-layout {
          height: 100vh;
          height: 100dvh;
        }

        /* Fixed header for all viewports */
        .app-header {
          position: sticky !important;
          top: 0 !important;
          z-index: 100 !important;
          background: #ffffff !important;
        }

        /* Main content scrollable area */
        .main-content {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        /* Responsive breakpoints */
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

          /* Ensure proper height on mobile */
          .root-layout,
          .main-content-layout {
            height: 100vh;
            height: 100dvh;
            height: -webkit-fill-available;
          }
        }

        @media (max-width: 768px) {
          .app-header {
            padding: 0 12px !important;
            height: 56px !important;
            min-height: 56px !important;
          }

          .main-content {
            padding: 12px !important;
            padding-bottom: 24px !important;
          }
        }

        @media (max-width: 576px) {
          .app-header {
            padding: 0 8px !important;
            height: 52px !important;
            min-height: 52px !important;
          }

          .main-content {
            padding: 8px !important;
            padding-bottom: 20px !important;
          }
        }

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

        .mobile-menu-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-top: 1rem;
          width: 100%;
        }

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

        .mobile-menu-item-group {
          width: 100%;
        }

        .mobile-menu-item-group .mobile-menu-item {
          display: flex;
        }

        .mobile-submenu {
          background: #fafafa;
          width: 100%;
          overflow: hidden;
        }

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

        .mobile-drawer-footer {
          padding: 1.5rem;
          border-top: 1px solid #e8e8e8;
          background: #ffffff;
          flex-shrink: 0;
        }

        .ant-avatar {
          font-weight: 600;
        }

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

export default memo(DashboardLayout);
