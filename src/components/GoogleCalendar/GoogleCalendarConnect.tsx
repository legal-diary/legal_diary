'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Tag, message, Spin, Popconfirm } from 'antd';
import {
  GoogleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

interface GoogleCalendarStatus {
  connected: boolean;
  expiresAt: string | null;
  lastSync: string | null;
  syncedCount: number;
  failedCount: number;
}

interface GoogleCalendarConnectProps {
  compact?: boolean;
  onStatusChange?: (connected: boolean) => void;
}

export default function GoogleCalendarConnect({
  compact = false,
  onStatusChange,
}: GoogleCalendarConnectProps) {
  const { token } = useAuth();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/google/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        onStatusChange?.(data.connected);
      }
    } catch (error) {
      console.error('Failed to fetch Google Calendar status:', error);
    } finally {
      setLoading(false);
    }
  }, [token, onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Check URL for connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get('google');

    if (googleStatus === 'connected') {
      message.success('Google Calendar connected successfully!');
      fetchStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (googleStatus === 'error') {
      const errorMessage = params.get('message') || 'Connection failed';
      message.error(`Google Calendar: ${errorMessage}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchStatus]);

  const handleConnect = async () => {
    if (!token) return;

    setConnecting(true);
    try {
      const response = await fetch('/api/google/auth', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        // Redirect to Google OAuth
        window.location.href = authUrl;
      } else {
        message.error('Failed to initiate Google connection');
      }
    } catch (error) {
      console.error('Connect error:', error);
      message.error('Failed to connect to Google');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        message.success('Google Calendar disconnected');
        setStatus({ connected: false, expiresAt: null, lastSync: null, syncedCount: 0, failedCount: 0 });
        onStatusChange?.(false);
      } else {
        message.error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      message.error('Failed to disconnect');
    }
  };

  const handleSync = async () => {
    if (!token) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/google/calendar/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`Synced ${result.synced} hearings to Google Calendar`);
        if (result.failed > 0) {
          message.warning(`${result.failed} hearings failed to sync`);
        }
        fetchStatus();
      } else {
        message.error('Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      message.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return compact ? (
      <Spin size="small" />
    ) : (
      <Card loading style={{ width: '100%' }} />
    );
  }

  // Compact mode - just a button
  if (compact) {
    if (status?.connected) {
      return (
        <Button
          type="text"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          onClick={handleSync}
          loading={syncing}
          title="Google Calendar connected - Click to sync"
        >
          <GoogleOutlined style={{ color: '#4285f4' }} />
        </Button>
      );
    }

    return (
      <Button
        type="primary"
        icon={<GoogleOutlined />}
        onClick={handleConnect}
        loading={connecting}
        style={{ background: '#4285f4' }}
      >
        Connect Google
      </Button>
    );
  }

  // Full card mode
  return (
    <Card
      title={
        <span>
          <GoogleOutlined style={{ marginRight: 8, color: '#4285f4' }} />
          Google Calendar
        </span>
      }
      extra={
        status?.connected && (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Connected
          </Tag>
        )
      }
      style={{ marginBottom: 16 }}
    >
      {status?.connected ? (
        <div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '8px 0' }}>
              <SyncOutlined style={{ marginRight: 8 }} />
              <strong>{status.syncedCount}</strong> hearings synced
              {status.failedCount > 0 && (
                <Tag color="error" style={{ marginLeft: 8 }}>
                  {status.failedCount} failed
                </Tag>
              )}
            </p>
            {status.lastSync && (
              <p style={{ margin: '8px 0', color: '#666' }}>
                <ClockCircleOutlined style={{ marginRight: 8 }} />
                Last sync: {new Date(status.lastSync).toLocaleString()}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={handleSync}
              loading={syncing}
            >
              Sync All Hearings
            </Button>
            <Popconfirm
              title="Disconnect Google Calendar?"
              description="Sync records will be removed. You can reconnect anytime."
              onConfirm={handleDisconnect}
              okText="Disconnect"
              cancelText="Cancel"
            >
              <Button icon={<DisconnectOutlined />} danger>
                Disconnect
              </Button>
            </Popconfirm>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: 16, color: '#666' }}>
            Connect your Google Calendar to automatically sync court hearings.
            You'll receive reminders and see hearings on your phone.
          </p>
          <Button
            type="primary"
            icon={<GoogleOutlined />}
            onClick={handleConnect}
            loading={connecting}
            style={{ background: '#4285f4' }}
            size="large"
          >
            Connect Google Calendar
          </Button>
        </div>
      )}
    </Card>
  );
}
