'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  message,
  Avatar,
  Tooltip,
  Badge,
  Select,
  DatePicker,
  Button,
  Statistic,
  Row,
  Col,
  Empty,
} from 'antd';
import {
  HistoryOutlined,
  UserOutlined,
  FileOutlined,
  CalendarOutlined,
  TeamOutlined,
  ReloadOutlined,
  FilterOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface ActivityLogItem {
  id: string;
  userId: string;
  firmId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  User: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ActivityStats {
  totalActivity: number;
  activityByAction: Array<{ action: string; count: number }>;
  activityByUser: Array<{
    userId: string;
    user: { id: string; name: string | null; email: string } | undefined;
    count: number;
  }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ActivityLogProps {
  token: string;
}

// Action type to icon and color mapping
const actionConfig: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  CASE_CREATED: { icon: <FileOutlined />, color: 'green', label: 'Case Created' },
  CASE_UPDATED: { icon: <FileOutlined />, color: 'blue', label: 'Case Updated' },
  CASE_DELETED: { icon: <FileOutlined />, color: 'red', label: 'Case Deleted' },
  CASE_ASSIGNED: { icon: <TeamOutlined />, color: 'purple', label: 'Case Assigned' },
  CASE_UNASSIGNED: { icon: <TeamOutlined />, color: 'orange', label: 'Case Unassigned' },
  HEARING_CREATED: { icon: <CalendarOutlined />, color: 'green', label: 'Hearing Created' },
  HEARING_UPDATED: { icon: <CalendarOutlined />, color: 'blue', label: 'Hearing Updated' },
  HEARING_DELETED: { icon: <CalendarOutlined />, color: 'red', label: 'Hearing Deleted' },
  HEARING_COMPLETED: { icon: <CalendarOutlined />, color: 'cyan', label: 'Hearing Completed' },
  HEARING_POSTPONED: { icon: <CalendarOutlined />, color: 'orange', label: 'Hearing Postponed' },
  DOCUMENT_UPLOADED: { icon: <FileOutlined />, color: 'green', label: 'Document Uploaded' },
  DOCUMENT_DELETED: { icon: <FileOutlined />, color: 'red', label: 'Document Deleted' },
  DOCUMENT_VIEWED: { icon: <EyeOutlined />, color: 'default', label: 'Document Viewed' },
  AI_ANALYSIS_RUN: { icon: <FileOutlined />, color: 'purple', label: 'AI Analysis' },
  AI_DOCUMENT_ANALYSIS: { icon: <FileOutlined />, color: 'purple', label: 'AI Document Analysis' },
  AI_CUSTOM_QUERY: { icon: <FileOutlined />, color: 'purple', label: 'AI Custom Query' },
  MEMBER_INVITED: { icon: <TeamOutlined />, color: 'green', label: 'Member Invited' },
  MEMBER_REMOVED: { icon: <TeamOutlined />, color: 'red', label: 'Member Removed' },
  MEMBER_ROLE_CHANGED: { icon: <TeamOutlined />, color: 'gold', label: 'Role Changed' },
  USER_LOGIN: { icon: <UserOutlined />, color: 'blue', label: 'User Login' },
  USER_LOGOUT: { icon: <UserOutlined />, color: 'default', label: 'User Logout' },
  PASSWORD_CHANGED: { icon: <UserOutlined />, color: 'orange', label: 'Password Changed' },
  CALENDAR_CONNECTED: { icon: <CalendarOutlined />, color: 'green', label: 'Calendar Connected' },
  CALENDAR_DISCONNECTED: { icon: <CalendarOutlined />, color: 'red', label: 'Calendar Disconnected' },
  CALENDAR_SYNCED: { icon: <CalendarOutlined />, color: 'blue', label: 'Calendar Synced' },
};

// Entity type icons
const entityIcons: Record<string, React.ReactNode> = {
  CASE: <FileOutlined />,
  HEARING: <CalendarOutlined />,
  DOCUMENT: <FileOutlined />,
  USER: <UserOutlined />,
  FIRM: <TeamOutlined />,
  CALENDAR: <CalendarOutlined />,
  AI_ANALYSIS: <FileOutlined />,
};

export default function ActivityLog({ token }: ActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>(undefined);
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // Fetch activity logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (dateRange?.[0]) params.append('startDate', dateRange[0].toISOString());
      if (dateRange?.[1]) params.append('endDate', dateRange[1].toISOString());

      const response = await fetch(`/api/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } else if (response.status === 403) {
        // Not an admin
        setLogs([]);
      } else {
        message.error('Failed to load activity logs');
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      message.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [token, pagination.page, pagination.limit, entityTypeFilter, actionFilter, dateRange]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ days: 7 }),
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle page change
  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination((prev) => ({
      ...prev,
      page,
      limit: pageSize || prev.limit,
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setEntityTypeFilter(undefined);
    setActionFilter(undefined);
    setDateRange(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Format action details
  const formatDetails = (details: Record<string, unknown> | null, action: string): string => {
    if (!details) return '';

    if (action === 'MEMBER_ROLE_CHANGED') {
      return `${details.oldRole} → ${details.newRole}`;
    }

    if (action === 'CASE_UPDATED' || action === 'HEARING_UPDATED') {
      const changes = details.changes as Record<string, unknown>;
      if (changes) {
        const fields = Object.keys(changes);
        return `Changed: ${fields.join(', ')}`;
      }
    }

    if (details.assignedUsers) {
      const users = details.assignedUsers as string[];
      return `${users.length} user(s) assigned`;
    }

    if (details.unassignedUsers) {
      const users = details.unassignedUsers as string[];
      return `${users.length} user(s) unassigned`;
    }

    if (details.hearingCount !== undefined) {
      return `${details.hearingCount} hearing(s) synced`;
    }

    return '';
  };

  // Table columns
  const columns: ColumnsType<ActivityLogItem> = [
    {
      title: 'User',
      key: 'user',
      width: 180,
      render: (_, record) => (
        <Space>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1a3a52' }}
          />
          <div>
            <div style={{ fontWeight: 500, fontSize: '13px' }}>
              {record.User.name || 'Unknown'}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {record.User.email}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 180,
      render: (_, record) => {
        const config = actionConfig[record.action] || {
          icon: <HistoryOutlined />,
          color: 'default',
          label: record.action,
        };
        return (
          <Tag icon={config.icon} color={config.color}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 200,
      render: (_, record) => (
        <Space>
          {entityIcons[record.entityType] || <FileOutlined />}
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.entityType}</div>
            {record.entityName && (
              <div style={{ fontWeight: 500, fontSize: '13px' }}>
                {record.entityName}
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Details',
      key: 'details',
      width: 180,
      render: (_, record) => {
        const details = formatDetails(record.details, record.action);
        return details ? (
          <span style={{ fontSize: '12px', color: '#666' }}>{details}</span>
        ) : (
          <span style={{ color: '#ccc' }}>-</span>
        );
      },
    },
    {
      title: 'Time',
      key: 'time',
      width: 140,
      render: (_, record) => (
        <Tooltip title={dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(record.createdAt).fromNow()}
          </span>
        </Tooltip>
      ),
    },
  ];

  // Get unique actions from logs for filter dropdown
  const availableActions = Array.from(new Set(Object.keys(actionConfig)));

  return (
    <div>
      {/* Statistics Cards */}
      <Card style={{ marginBottom: 16 }} loading={statsLoading}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Activity (7 days)"
              value={stats?.totalActivity || 0}
              prefix={<HistoryOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Most Active User"
              value={
                stats?.activityByUser?.[0]?.user?.name ||
                stats?.activityByUser?.[0]?.user?.email ||
                '-'
              }
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Top Action"
              value={
                stats?.activityByAction?.[0]
                  ? actionConfig[stats.activityByAction[0].action]?.label ||
                    stats.activityByAction[0].action
                  : '-'
              }
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Active Users"
              value={stats?.activityByUser?.length || 0}
              prefix={<TeamOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Activity Log Table */}
      <Card
        title={
          <Space>
            <HistoryOutlined style={{ fontSize: '18px' }} />
            <span>Activity Log</span>
            <Badge
              count={pagination.total}
              style={{ backgroundColor: '#1a3a52', marginLeft: '8px' }}
              overflowCount={9999}
            />
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchLogs();
                fetchStats();
              }}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <div
          style={{
            marginBottom: 16,
            padding: '12px',
            background: '#f5f5f5',
            borderRadius: '8px',
          }}
        >
          <Space wrap>
            <FilterOutlined style={{ color: '#666' }} />
            <Select
              placeholder="Entity Type"
              allowClear
              style={{ width: 140 }}
              value={entityTypeFilter}
              onChange={(value) => {
                setEntityTypeFilter(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={[
                { label: 'Case', value: 'CASE' },
                { label: 'Hearing', value: 'HEARING' },
                { label: 'Document', value: 'DOCUMENT' },
                { label: 'User', value: 'USER' },
                { label: 'Calendar', value: 'CALENDAR' },
                { label: 'AI Analysis', value: 'AI_ANALYSIS' },
              ]}
            />
            <Select
              placeholder="Action"
              allowClear
              style={{ width: 180 }}
              value={actionFilter}
              onChange={(value) => {
                setActionFilter(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={availableActions.map((action) => ({
                label: actionConfig[action]?.label || action,
                value: action,
              }))}
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              style={{ width: 240 }}
            />
            <Button type="link" onClick={resetFilters}>
              Reset Filters
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} activities`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '15', '25', '50'],
          }}
          size="middle"
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No activity logs found"
              />
            ),
          }}
        />

        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: '#f5f5f5',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#666',
          }}
        >
          <strong>About Activity Logs:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Activity logs track all important actions performed by team members</li>
            <li>Logs include case operations, hearing management, team changes, and more</li>
            <li>Use filters to find specific activities or date ranges</li>
            <li>Only administrators can view the activity log</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
