'use client';

import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Card,
  Table,
  Tag,
  Empty,
  message,
  Typography,
  Badge,
  Tooltip,
  Button,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Row,
  Col,
  Divider,
  Space,
  Popconfirm,
} from 'antd';
import {
  CalendarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { buildAuthHeaders } from '@/lib/authHeaders';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  HeaderSkeleton,
  TodayScheduleSkeleton,
  UpcomingHearingsSkeleton,
  SectionLoader,
} from '@/components/Dashboard/DashboardSkeleton';

// Lazy load the Modal to reduce initial bundle size
const Modal = lazy(() => import('antd').then(mod => ({ default: mod.Modal })));

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Types
interface TodayHearing {
  id: string;
  caseId: string;
  caseNumber: string;
  partyName: string;
  caseTitle: string;
  stage: string;
  courtName: string | null;
  hearingType: string;
  courtRoom: string | null;
  notes: string | null;
  previousDate: string | null;
  currentDate: string;
  nextDate: string | null;
}

interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
}

interface UpcomingHearing {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingTime: string | null;
  hearingType: string;
  courtRoom: string | null;
  notes: string | null;
  status: string;
  Case: {
    caseNumber: string;
    caseTitle: string;
    clientName: string;
  };
}

interface DashboardResponse {
  date: string;
  todayHearings: {
    hearings: TodayHearing[];
    totalCount: number;
  };
  upcomingHearings: UpcomingHearing[];
  cases: Case[];
}

// Static data - moved outside component to prevent recreation
const HEARING_TYPES = [
  { value: 'ARGUMENTS', label: 'Arguments' },
  { value: 'EVIDENCE_RECORDING', label: 'Evidence Recording' },
  { value: 'FINAL_HEARING', label: 'Final Hearing' },
  { value: 'INTERIM_HEARING', label: 'Interim Hearing' },
  { value: 'JUDGMENT_DELIVERY', label: 'Judgment Delivery' },
  { value: 'PRE_HEARING', label: 'Pre-Hearing' },
  { value: 'OTHER', label: 'Other' },
] as const;

const HEARING_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'POSTPONED', label: 'Postponed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

const STAGE_COLORS: Record<string, string> = {
  ACTIVE: 'processing',
  PENDING_JUDGMENT: 'warning',
  CONCLUDED: 'success',
  APPEAL: 'error',
  DISMISSED: 'default',
};

const STAGE_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING_JUDGMENT: 'Pending Judgment',
  CONCLUDED: 'Concluded',
  APPEAL: 'Appeal',
  DISMISSED: 'Dismissed',
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'blue',
  POSTPONED: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

// Memoized date formatter
const formatDate = (date: string | null): string => {
  if (!date) return '-';
  return dayjs(date).format('DD/MM/YYYY');
};

// Header component - memoized
const DashboardHeader = React.memo<{
  totalCount: number;
  loading: boolean;
}>(({ totalCount, loading }) => {
  const todayFormatted = useMemo(() => dayjs().format('dddd, DD MMMM YYYY'), []);
  const todayFormattedMobile = useMemo(() => dayjs().format('ddd, DD MMM'), []);

  if (loading) return <HeaderSkeleton />;

  return (
    <div className="dashboard-header">
      <div className="dashboard-header-content">
        <div className="dashboard-header-left">
          <CalendarOutlined className="dashboard-header-icon" />
          <div>
            <Text className="dashboard-header-label">
              Legal Referencer
            </Text>
            <Title level={2} className="dashboard-header-date desktop-date">
              {todayFormatted}
            </Title>
            <Title level={3} className="dashboard-header-date mobile-date">
              {todayFormattedMobile}
            </Title>
          </div>
        </div>

        <div className="dashboard-header-stats">
          <div className="dashboard-stat-item">
            <div className="dashboard-stat-icon">
              <FileTextOutlined />
            </div>
            <Text className="dashboard-stat-value">
              {totalCount}
            </Text>
            <Text className="dashboard-stat-label">
              Today&apos;s Matters
            </Text>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-header {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: clamp(16px, 4vw, 32px);
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .dashboard-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dashboard-header-left {
          display: flex;
          align-items: center;
          gap: clamp(8px, 2vw, 16px);
        }

        :global(.dashboard-header-icon) {
          font-size: clamp(24px, 5vw, 36px) !important;
          color: #4fd1c5;
        }

        :global(.dashboard-header-label) {
          color: #a0aec0;
          font-size: clamp(11px, 2vw, 14px);
          display: block;
        }

        :global(.dashboard-header-date) {
          margin: 0 !important;
          color: #fff !important;
          font-weight: 600 !important;
        }

        :global(.desktop-date) {
          display: block;
          font-size: clamp(1.2rem, 3vw, 1.8rem) !important;
        }

        :global(.mobile-date) {
          display: none;
          font-size: 1.1rem !important;
        }

        .dashboard-header-stats {
          display: flex;
          gap: 24px;
        }

        .dashboard-stat-item {
          text-align: center;
        }

        .dashboard-stat-icon {
          background: rgba(79, 209, 197, 0.2);
          border-radius: 50%;
          width: clamp(36px, 8vw, 48px);
          height: clamp(36px, 8vw, 48px);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
        }

        :global(.dashboard-stat-icon .anticon) {
          font-size: clamp(18px, 4vw, 24px);
          color: #4fd1c5;
        }

        :global(.dashboard-stat-value) {
          color: #fff;
          font-size: clamp(18px, 4vw, 24px) !important;
          font-weight: 600;
          display: block;
        }

        :global(.dashboard-stat-label) {
          color: #a0aec0;
          font-size: clamp(10px, 2vw, 12px);
        }

        @media (max-width: 768px) {
          .dashboard-header {
            padding: 16px;
            border-radius: 8px;
          }

          .dashboard-header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .dashboard-header-stats {
            width: 100%;
            justify-content: flex-start;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.1);
          }

          :global(.desktop-date) {
            display: none !important;
          }

          :global(.mobile-date) {
            display: block !important;
          }
        }

        @media (max-width: 576px) {
          .dashboard-header {
            padding: 12px;
            margin-bottom: 16px;
          }
        }
      `}</style>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

// Today's schedule table - memoized
const TodayScheduleTable = React.memo<{
  hearings: TodayHearing[];
  totalCount: number;
  loading: boolean;
}>(({ hearings, totalCount, loading }) => {
  const columns = useMemo(
    () => [
      {
        title: 'Prev Date',
        dataIndex: 'previousDate',
        key: 'previousDate',
        width: 90,
        className: 'hide-on-mobile',
        render: (date: string | null) => (
          <Text type={date ? 'secondary' : undefined} style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>
            {formatDate(date)}
          </Text>
        ),
      },
      {
        title: 'Case No.',
        dataIndex: 'caseNumber',
        key: 'caseNumber',
        width: 120,
        fixed: 'left' as const,
        render: (text: string, record: TodayHearing) => (
          <Link href={`/cases/${record.caseId}`} style={{ color: '#1890ff', fontWeight: 500, fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>
            {text}
          </Link>
        ),
      },
      {
        title: 'Party',
        dataIndex: 'partyName',
        key: 'partyName',
        width: 140,
        ellipsis: true,
        render: (text: string, record: TodayHearing) => (
          <Tooltip title={record.caseTitle}>
            <Text strong style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>{text}</Text>
          </Tooltip>
        ),
      },
      {
        title: 'Stage',
        dataIndex: 'stage',
        key: 'stage',
        width: 120,
        render: (stage: string, record: TodayHearing) => (
          <div>
            <Badge status={STAGE_COLORS[stage] as any} text={<span style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)' }}>{STAGE_LABELS[stage] || stage}</span>} />
            {record.hearingType && (
              <div className="hide-on-mobile">
                <Text type="secondary" style={{ fontSize: '0.7rem' }}>
                  {record.hearingType.replace(/_/g, ' ')}
                </Text>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Next',
        dataIndex: 'nextDate',
        key: 'nextDate',
        width: 90,
        render: (date: string | null) => (
          <Text type={date ? undefined : 'secondary'} style={{ color: date ? '#52c41a' : undefined, fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>
            {date ? formatDate(date) : 'TBF'}
          </Text>
        ),
      },
      {
        title: 'Court',
        dataIndex: 'courtName',
        key: 'courtName',
        width: 120,
        className: 'hide-on-mobile',
        ellipsis: true,
        render: (court: string | null, record: TodayHearing) => (
          <div>
            <Text style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>{court || '-'}</Text>
            {record.courtRoom && (
              <div>
                <Text type="secondary" style={{ fontSize: '0.7rem' }}>
                  {record.courtRoom}
                </Text>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Notes',
        dataIndex: 'notes',
        key: 'notes',
        width: 150,
        className: 'hide-on-mobile',
        ellipsis: true,
        render: (notes: string | null) => (
          <Tooltip title={notes}>
            <Text type="secondary" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>{notes || '-'}</Text>
          </Tooltip>
        ),
      },
    ],
    []
  );

  if (loading) return <TodayScheduleSkeleton />;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>Today&apos;s Schedule</span>
          {totalCount > 0 && (
            <Tag color="blue">
              {totalCount} matter{totalCount > 1 ? 's' : ''}
            </Tag>
          )}
        </div>
      }
      extra={
        <Link href="/calendar" style={{ color: '#1890ff' }}>
          View Full Calendar
        </Link>
      }
      styles={{ body: { padding: 0 } }}
    >
      {hearings.length === 0 ? (
        <div style={{ padding: '48px 24px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '12px' }} />
                <div>
                  <Text strong style={{ fontSize: '16px' }}>No matters scheduled for today</Text>
                </div>
                <Text type="secondary">Enjoy your day or add new hearings below</Text>
              </div>
            }
          />
        </div>
      ) : (
        <Table
          dataSource={hearings}
          columns={columns}
          pagination={false}
          rowKey="id"
          size="small"
          scroll={{ x: 500 }}
          rowClassName={(_, index) => (index % 2 === 0 ? 'table-row-light' : 'table-row-dark')}
          className="responsive-table"
        />
      )}
    </Card>
  );
});

TodayScheduleTable.displayName = 'TodayScheduleTable';

// Main Dashboard Component
export default function DashboardPage() {
  const { token, user } = useAuth();
  const authHeaders = buildAuthHeaders(token);

  // Separate loading states for incremental loading
  const [headerLoading, setHeaderLoading] = useState(true);
  const [todayLoading, setTodayLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  // Data states
  const [todayHearings, setTodayHearings] = useState<TodayHearing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [cases, setCases] = useState<Case[]>([]);
  const [upcomingHearings, setUpcomingHearings] = useState<UpcomingHearing[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<UpcomingHearing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Fetch all dashboard data with a single optimized API call
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard', {
        headers: {
          ...authHeaders,
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        const data: DashboardResponse = await response.json();

        // Update header immediately
        setTotalCount(data.todayHearings.totalCount);
        setHeaderLoading(false);

        // Update today's hearings with slight delay for visual effect
        requestAnimationFrame(() => {
          setTodayHearings(data.todayHearings.hearings);
          setTodayLoading(false);
        });

        // Update upcoming hearings and cases
        requestAnimationFrame(() => {
          setUpcomingHearings(data.upcomingHearings);
          setCases(data.cases);
          setUpcomingLoading(false);
        });
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      message.error('Failed to load dashboard data');
      setHeaderLoading(false);
      setTodayLoading(false);
      setUpcomingLoading(false);
    }
  }, [authHeaders]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  // Memoized handlers
  const handleAddHearing = useCallback(() => {
    setEditingHearing(null);
    form.resetFields();
    setIsModalOpen(true);
  }, [form]);

  const handleEditHearing = useCallback(
    (hearing: UpcomingHearing) => {
      setEditingHearing(hearing);
      form.setFieldsValue({
        caseId: hearing.caseId,
        hearingDate: dayjs(hearing.hearingDate),
        hearingTime: hearing.hearingTime ? dayjs(hearing.hearingTime, 'HH:mm') : null,
        hearingType: hearing.hearingType,
        courtRoom: hearing.courtRoom,
        notes: hearing.notes,
        status: hearing.status,
      });
      setIsModalOpen(true);
    },
    [form]
  );

  const handleDeleteHearing = useCallback(
    async (hearingId: string) => {
      try {
        const response = await fetch(`/api/hearings/${hearingId}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        if (response.ok) {
          message.success('Hearing deleted successfully');
          // Refresh only upcoming section
          setUpcomingLoading(true);
          fetchDashboardData();
        } else {
          message.error('Failed to delete hearing');
        }
      } catch {
        message.error('Failed to delete hearing');
      }
    },
    [authHeaders, fetchDashboardData]
  );

  const handleSubmit = useCallback(
    async (values: any) => {
      setSubmitting(true);
      try {
        const payload = {
          caseId: values.caseId,
          hearingDate: values.hearingDate.toISOString(),
          hearingTime: values.hearingTime ? values.hearingTime.format('HH:mm') : null,
          hearingType: values.hearingType,
          courtRoom: values.courtRoom || null,
          notes: values.notes || null,
          status: values.status || 'SCHEDULED',
        };

        const url = editingHearing ? `/api/hearings/${editingHearing.id}` : '/api/hearings';
        const method = editingHearing ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          message.success(editingHearing ? 'Hearing updated successfully' : 'Hearing added successfully');
          setIsModalOpen(false);
          form.resetFields();
          // Refresh data
          setTodayLoading(true);
          setUpcomingLoading(true);
          fetchDashboardData();
        } else {
          const error = await response.json();
          message.error(error.error || 'Failed to save hearing');
        }
      } catch {
        message.error('Failed to save hearing');
      } finally {
        setSubmitting(false);
      }
    },
    [editingHearing, authHeaders, form, fetchDashboardData]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
  }, [form]);

  // Memoized upcoming columns
  const upcomingColumns = useMemo(
    () => [
      {
        title: 'Date',
        dataIndex: 'hearingDate',
        key: 'hearingDate',
        width: 85,
        fixed: 'left' as const,
        render: (date: string, record: UpcomingHearing) => {
          const isToday = dayjs(date).isSame(dayjs(), 'day');
          return (
            <div>
              <Text strong={isToday} style={{ color: isToday ? '#1890ff' : undefined, fontSize: 'clamp(0.7rem, 2vw, 0.85rem)' }}>
                {dayjs(date).format('DD/MM')}
              </Text>
              {record.hearingTime && (
                <div className="hide-xs">
                  <Text type="secondary" style={{ fontSize: '0.65rem' }}>
                    {record.hearingTime}
                  </Text>
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: 'Case',
        key: 'case',
        width: 130,
        ellipsis: true,
        render: (_: any, record: UpcomingHearing) => (
          <div>
            <Link href={`/cases/${record.caseId}`} style={{ color: '#1890ff', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>
              {record.Case?.caseNumber || 'N/A'}
            </Link>
            <div className="hide-xs">
              <Text type="secondary" style={{ fontSize: '0.65rem' }}>
                {record.Case?.clientName || 'Unknown'}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'hearingType',
        key: 'hearingType',
        width: 100,
        className: 'hide-sm',
        render: (type: string) => (
          <Tag color="blue" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
            {type.replace(/_/g, ' ')}
          </Tag>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        className: 'hide-sm',
        render: (status: string) => (
          <Tag color={STATUS_COLORS[status] || 'default'} style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
            {status}
          </Tag>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 70,
        fixed: 'right' as const,
        render: (_: any, record: UpcomingHearing) => (
          <Space size={2}>
            <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: '14px' }} />} onClick={() => handleEditHearing(record)} />
            <Popconfirm
              title="Delete?"
              onConfirm={() => handleDeleteHearing(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true, size: 'small' }}
              cancelButtonProps={{ size: 'small' }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: '14px' }} />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [handleEditHearing, handleDeleteHearing]
  );

  // Memoized case options for Select
  const caseOptions = useMemo(
    () =>
      cases.map((c) => (
        <Option key={c.id} value={c.id}>
          {c.caseNumber} - {c.clientName} ({c.caseTitle})
        </Option>
      )),
    [cases]
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header Section */}
        <DashboardHeader totalCount={totalCount} loading={headerLoading} />

        {/* Today's Schedule */}
        <TodayScheduleTable hearings={todayHearings} totalCount={totalCount} loading={todayLoading} />

        {/* Divider */}
        <Divider style={{ margin: '32px 0 24px' }} />

        {/* Hearing Management Section */}
        <SectionLoader loading={upcomingLoading} skeleton={<UpcomingHearingsSkeleton />}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ScheduleOutlined style={{ color: '#722ed1' }} />
                <span>Manage Hearings</span>
                <Tag color="purple">{upcomingHearings.length} upcoming</Tag>
              </div>
            }
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddHearing}>
                Add New Hearing
              </Button>
            }
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
              Add new hearings or update existing ones. Click on any hearing to edit its details.
            </Text>

            {upcomingHearings.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Text>No upcoming hearings scheduled</Text>
                    <br />
                    <Text type="secondary">Click &quot;Add New Hearing&quot; to schedule one</Text>
                  </div>
                }
              />
            ) : (
              <Table
                dataSource={upcomingHearings}
                columns={upcomingColumns}
                pagination={false}
                rowKey="id"
                size="small"
                scroll={{ x: 350 }}
                className="responsive-table upcoming-table"
              />
            )}
          </Card>
        </SectionLoader>

        {/* Add/Edit Hearing Modal - Lazy loaded */}
        {isModalOpen && (
          <Suspense fallback={null}>
            <Modal
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {editingHearing ? <EditOutlined /> : <PlusOutlined />}
                  <span style={{ fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' }}>{editingHearing ? 'Edit Hearing' : 'Add New Hearing'}</span>
                </div>
              }
              open={isModalOpen}
              onCancel={handleModalClose}
              footer={null}
              width="min(600px, 95vw)"
              destroyOnClose
              centered
              className="responsive-modal"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                  hearingType: 'ARGUMENTS',
                  status: 'SCHEDULED',
                }}
              >
                <Form.Item name="caseId" label="Select Case" rules={[{ required: true, message: 'Please select a case' }]}>
                  <Select placeholder="Select a case" showSearch optionFilterProp="children" disabled={!!editingHearing}>
                    {caseOptions}
                  </Select>
                </Form.Item>

                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="hearingDate"
                      label="Hearing Date"
                      rules={[{ required: true, message: 'Please select a date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="hearingTime" label="Hearing Time">
                      <TimePicker style={{ width: '100%' }} format="HH:mm" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="hearingType"
                      label="Hearing Type"
                      rules={[{ required: true, message: 'Please select hearing type' }]}
                    >
                      <Select>
                        {HEARING_TYPES.map((type) => (
                          <Option key={type.value} value={type.value}>
                            {type.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="status" label="Status">
                      <Select>
                        {HEARING_STATUSES.map((status) => (
                          <Option key={status.value} value={status.value}>
                            {status.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="courtRoom" label="Court Room">
                  <Input placeholder="e.g., Court Room 5, High Court" />
                </Form.Item>

                <Form.Item name="notes" label="Notes">
                  <TextArea rows={3} placeholder="Any notes or preparation reminders for this hearing..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={handleModalClose}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                      {editingHearing ? 'Update Hearing' : 'Add Hearing'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>
          </Suspense>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
