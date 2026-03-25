'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  Divider,
  Space,
  Popconfirm,
  Popover,
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
  EyeOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { authHeaders } from '@/lib/apiClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  HeaderSkeleton,
  TodayScheduleSkeleton,
  UpcomingHearingsSkeleton,
  SectionLoader,
} from '@/components/Dashboard/DashboardSkeleton';
import { STAGE_OPTIONS, STAGE_LABEL_MAP, HEARING_STATUS_OPTIONS } from '@/lib/constants';
import { useDashboardSWR } from '@/hooks/useDashboardSWR';
import HearingFormModal from '@/components/HearingFormModal/HearingFormModal';
import HearingClosureModal from '@/components/HearingClosureModal/HearingClosureModal';
import PendingClosuresSection from '@/components/Dashboard/PendingClosuresSection';
import { useIsMobile } from '@/hooks/useIsMobile';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

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
  courtHall: string;
  notes: string | null;
  previousDate: string | null;
  currentDate: string;
  nextDate: string | null;
}

interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
  petitionerName: string;
  respondentName: string;
}

interface UpcomingHearing {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingType: string;
  courtHall: string;
  notes: string | null;
  status: string;
  Case: {
    caseNumber: string;
    caseTitle: string;
    petitionerName: string;
    respondentName: string;
  };
}

interface PendingClosure {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingType: string;
  courtHall: string;
  notes: string | null;
  status: string;
  Case: {
    id: string;
    caseNumber: string;
    caseTitle: string;
    petitionerName: string;
    respondentName: string;
    courtName: string | null;
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
  pendingClosures: PendingClosure[];
  totalPendingCount: number;
}


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
  UPCOMING: 'blue',
  PENDING: 'orange',
  CLOSED: 'green',
  POSTPONED: 'gold',
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
  pendingCount: number;
  loading: boolean;
  lastUpdated: Date | null;
  isPolling: boolean;
  isValidating: boolean;
}>(({ totalCount, pendingCount, loading, lastUpdated, isPolling, isValidating }) => {
  const todayFormatted = useMemo(() => dayjs().format('dddd, DD MMMM YYYY'), []);
  const todayFormattedMobile = useMemo(() => dayjs().format('ddd, DD MMM'), []);

  // Update "X seconds ago" every 10s
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(interval);
  }, [isPolling]);

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

        <div className="dashboard-header-right">
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
            {pendingCount > 0 && (
              <div className="dashboard-stat-item">
                <div className="dashboard-stat-icon" style={{ background: 'rgba(250, 173, 20, 0.2)' }}>
                  <ClockCircleOutlined style={{ color: '#faad14' }} />
                </div>
                <Text className="dashboard-stat-value" style={{ color: '#faad14' }}>
                  {pendingCount}
                </Text>
                <Text className="dashboard-stat-label">
                  Pending Closures
                </Text>
              </div>
            )}
          </div>

          {isPolling && lastUpdated && (
            <div className="live-indicator">
              <span className={`live-dot${isValidating ? ' pulsing' : ''}`} />
              <Text className="live-text">
                {isValidating ? 'Updating...' : `Updated ${dayjs(lastUpdated).fromNow()}`}
              </Text>
            </div>
          )}
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

        .dashboard-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .dashboard-header-stats {
          display: flex;
          gap: 24px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #52c41a;
          display: inline-block;
          flex-shrink: 0;
        }

        .live-dot.pulsing {
          animation: pulse 1.2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        :global(.live-text) {
          color: #a0aec0;
          font-size: clamp(10px, 1.5vw, 12px);
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

          .dashboard-header-right {
            width: 100%;
            align-items: flex-start;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.1);
          }

          .dashboard-header-stats {
            width: 100%;
            justify-content: flex-start;
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
  isMobile: boolean;
  onCloseHearing?: (hearing: any) => void;
}>(({ hearings, totalCount, loading, isMobile, onCloseHearing }) => {
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
        width: isMobile ? 110 : 120,
        ellipsis: true,
        ...(isMobile ? {} : { fixed: 'left' as const }),
        render: (text: string, record: TodayHearing) => (
          <Link href={`/cases/${record.caseId}`} style={{ color: '#1890ff', fontWeight: 500, fontSize: 'clamp(0.7rem, 2vw, 0.9rem)' }}>
            {text}
          </Link>
        ),
      },
      {
        title: 'Party',
        dataIndex: 'partyName',
        key: 'partyName',
        width: isMobile ? 110 : 140,
        ellipsis: true,
        render: (text: string, record: TodayHearing) => (
          <Tooltip title={record.caseTitle}>
            <Text strong style={{ fontSize: 'clamp(0.7rem, 2vw, 0.9rem)' }}>{text}</Text>
          </Tooltip>
        ),
      },
      {
        title: 'Stage',
        dataIndex: 'stage',
        key: 'stage',
        width: 120,
        className: 'hide-on-mobile',
        render: (stage: string, record: TodayHearing) => (
          <div>
            <Badge status={STAGE_COLORS[stage] as any} text={<span style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)' }}>{STAGE_LABELS[stage] || stage}</span>} />
            {record.hearingType && (
              <div>
                <Text type="secondary" style={{ fontSize: '0.7rem' }}>
                  {STAGE_LABEL_MAP[record.hearingType] || record.hearingType.replace(/_/g, ' ')}
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
            {record.courtHall && (
              <div>
                <Text type="secondary" style={{ fontSize: '0.7rem' }}>
                  Hall: {record.courtHall}
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
        width: 60,
        className: 'hide-on-mobile',
        render: (notes: string | null) =>
          notes ? (
            <Popover
              content={<div style={{ maxWidth: 320, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{notes}</div>}
              title="Notes"
              trigger="click"
              placement="left"
            >
              <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#1890ff' }} />
            </Popover>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
    ],
    [isMobile]
  );

  if (loading) return <TodayScheduleSkeleton />;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>Schedule</span>
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
          scroll={isMobile ? undefined : { x: 500 }}
          rowClassName={(_, index) => (index % 2 === 0 ? 'table-row-light' : 'table-row-dark')}
          className="responsive-table"
          expandable={isMobile ? {
            expandIcon: ({ expanded, onExpand, record }: any) => (
              <span onClick={e => onExpand(record, e)} style={{ cursor: 'pointer', color: '#999', fontSize: 12 }}>
                {expanded ? <UpOutlined /> : <DownOutlined />}
              </span>
            ),
            expandedRowRender: (record: TodayHearing) => (
              <div className="expanded-row-content">
                <div className="expanded-row-grid">
                  <div><Text type="secondary">Stage:</Text> <Badge status={STAGE_COLORS[record.stage] as any} text={STAGE_LABELS[record.stage] || record.stage} /></div>
                  <div><Text type="secondary">Type:</Text> <Tag color="blue" style={{ fontSize: '0.7rem' }}>{STAGE_LABEL_MAP[record.hearingType] || record.hearingType.replace(/_/g, ' ')}</Tag></div>
                  <div><Text type="secondary">Prev Date:</Text> <Text>{formatDate(record.previousDate)}</Text></div>
                  <div><Text type="secondary">Court:</Text> <Text>{record.courtName || '-'}{record.courtHall ? ` (Hall: ${record.courtHall})` : ''}</Text></div>
                  {record.notes && <div style={{ gridColumn: '1 / -1' }}><Text type="secondary">Notes:</Text> <Text style={{ whiteSpace: 'pre-wrap' }}>{record.notes}</Text></div>}
                </div>
                <div className="expanded-row-actions">
                  <Link href={`/cases/${record.caseId}`}>
                    <Button size="small" type="link" icon={<EyeOutlined />}>View Case</Button>
                  </Link>
                  {onCloseHearing && (
                    <Button
                      size="small"
                      style={{ backgroundColor: '#d4af37', borderColor: '#d4af37', color: '#fff' }}
                      icon={<CheckCircleOutlined />}
                      onClick={() => onCloseHearing({
                        id: record.id,
                        caseId: record.caseId,
                        hearingDate: record.currentDate,
                        hearingType: record.hearingType,
                        courtHall: record.courtHall,
                        notes: record.notes,
                        status: 'UPCOMING',
                        Case: { id: record.caseId, caseNumber: record.caseNumber, caseTitle: record.caseTitle, petitionerName: '', respondentName: '', courtName: record.courtName },
                      })}
                    >
                      Close Hearing
                    </Button>
                  )}
                </div>
              </div>
            ),
            rowExpandable: () => true,
          } : undefined}
        />
      )}
    </Card>
  );
});

TodayScheduleTable.displayName = 'TodayScheduleTable';

// Main Dashboard Component
export default function DashboardPage() {
  const { token, user } = useAuth();
  const isMobile = useIsMobile();

  // SWR-powered data fetching with auto-polling for admins
  const { data: dashboardData, error: swrError, isLoading: swrLoading, isValidating, refresh, isPolling } = useDashboardSWR();

  // Track when data was last successfully fetched
  const lastUpdatedRef = useRef<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Update lastUpdated when fresh data arrives
  useEffect(() => {
    if (dashboardData && !isValidating) {
      const now = new Date();
      lastUpdatedRef.current = now;
      setLastUpdated(now);
    }
  }, [dashboardData, isValidating]);

  // Show error only on initial load failure
  useEffect(() => {
    if (swrError && !dashboardData) {
      message.error('Failed to load dashboard data');
    }
  }, [swrError, dashboardData]);

  // Derive data from SWR response (cached data renders instantly)
  const todayHearings = dashboardData?.todayHearings?.hearings ?? [];
  const totalCount = dashboardData?.todayHearings?.totalCount ?? 0;
  const cases = dashboardData?.cases ?? [];
  const upcomingHearings = dashboardData?.upcomingHearings ?? [];
  const pendingClosures = dashboardData?.pendingClosures ?? [];

  // Loading states: only true on first load (SWR shows cached data after that)
  const headerLoading = swrLoading;
  const todayLoading = swrLoading;
  const upcomingLoading = swrLoading;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<UpcomingHearing | null>(null);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closingHearing, setClosingHearing] = useState<PendingClosure | null>(null);

  // Memoized handlers
  const handleAddHearing = useCallback(() => {
    setEditingHearing(null);
    setIsModalOpen(true);
  }, []);

  const handleEditHearing = useCallback(
    (hearing: UpcomingHearing) => {
      setEditingHearing(hearing);
      setIsModalOpen(true);
    },
    []
  );

  const handleDeleteHearing = useCallback(
    async (hearingId: string) => {
      try {
        const response = await fetch(`/api/hearings/${hearingId}`, {
          method: 'DELETE',
          headers: authHeaders(token),
        });
        if (response.ok) {
          message.success('Hearing deleted successfully');
          refresh();
        } else {
          message.error('Failed to delete hearing');
        }
      } catch {
        message.error('Failed to delete hearing');
      }
    },
    [token, refresh]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingHearing(null);
  }, []);

  const handleModalSuccess = useCallback(() => {
    setIsModalOpen(false);
    setEditingHearing(null);
    refresh();
  }, [refresh]);

  const handleCloseHearing = useCallback((hearing: PendingClosure) => {
    setClosingHearing(hearing);
    setClosureModalOpen(true);
  }, []);

  const handleClosureModalClose = useCallback(() => {
    setClosureModalOpen(false);
    setClosingHearing(null);
  }, []);

  const handleClosureSuccess = useCallback(() => {
    setClosureModalOpen(false);
    setClosingHearing(null);
    refresh();
  }, [refresh]);

  // Memoized upcoming columns
  const upcomingColumns = useMemo(
    () => [
      {
        title: 'Date',
        dataIndex: 'hearingDate',
        key: 'hearingDate',
        width: isMobile ? 55 : 85,
        ...(isMobile ? {} : { fixed: 'left' as const }),
        render: (date: string) => {
          const isToday = dayjs(date).isSame(dayjs(), 'day');
          return (
            <Text strong={isToday} style={{ color: isToday ? '#1890ff' : undefined, fontSize: 'clamp(0.7rem, 2vw, 0.85rem)' }}>
              {dayjs(date).format('DD/MM')}
            </Text>
          );
        },
      },
      {
        title: 'Case',
        key: 'case',
        width: isMobile ? 110 : 130,
        ellipsis: true,
        render: (_: any, record: UpcomingHearing) => (
          <div>
            <Link href={`/cases/${record.caseId}`} style={{ color: '#1890ff', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>
              {record.Case?.caseNumber || 'N/A'}
            </Link>
            {!isMobile && (
              <div>
                <Text type="secondary" style={{ fontSize: '0.65rem' }}>
                  {record.Case?.caseTitle || 'Unknown'}
                </Text>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Stage',
        dataIndex: 'hearingType',
        key: 'hearingType',
        width: 100,
        className: 'hide-sm',
        render: (type: string) => (
          <Tag color="blue" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
            {STAGE_LABEL_MAP[type] || type.replace(/_/g, ' ')}
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
        width: isMobile ? 50 : 70,
        ...(isMobile ? {} : { fixed: 'right' as const }),
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
    [isMobile, handleEditHearing, handleDeleteHearing]
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header Section */}
        <DashboardHeader
          totalCount={totalCount}
          pendingCount={pendingClosures.length}
          loading={headerLoading}
          lastUpdated={lastUpdated}
          isPolling={isPolling}
          isValidating={isValidating}
        />

        {/* Pending Closures - shown above today's schedule */}
        {!swrLoading && (
          <PendingClosuresSection
            pendingClosures={pendingClosures}
            onCloseHearing={handleCloseHearing}
          />
        )}

        {/* Today's Schedule */}
        <TodayScheduleTable hearings={todayHearings} totalCount={totalCount} loading={todayLoading} isMobile={isMobile} onCloseHearing={handleCloseHearing} />

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
                scroll={isMobile ? undefined : { x: 350 }}
                className="responsive-table upcoming-table"
                expandable={isMobile ? {
                  expandIcon: ({ expanded, onExpand, record }: any) => (
                    <span onClick={e => onExpand(record, e)} style={{ cursor: 'pointer', color: '#999', fontSize: 12 }}>
                      {expanded ? <UpOutlined /> : <DownOutlined />}
                    </span>
                  ),
                  expandedRowRender: (record: UpcomingHearing) => (
                    <div className="expanded-row-content">
                      <div className="expanded-row-grid">
                        <div><Text type="secondary">Case:</Text> <Text strong>{record.Case?.caseTitle || 'Unknown'}</Text></div>
                        <div><Text type="secondary">Stage:</Text> <Tag color="blue" style={{ fontSize: '0.7rem' }}>{STAGE_LABEL_MAP[record.hearingType] || record.hearingType.replace(/_/g, ' ')}</Tag></div>
                        <div><Text type="secondary">Status:</Text> <Tag color={STATUS_COLORS[record.status] || 'default'} style={{ fontSize: '0.7rem' }}>{record.status}</Tag></div>
                        <div><Text type="secondary">Court:</Text> <Text>{record.courtHall || '-'}</Text></div>
                        {record.notes && <div style={{ gridColumn: '1 / -1' }}><Text type="secondary">Notes:</Text> <Text style={{ whiteSpace: 'pre-wrap' }}>{record.notes}</Text></div>}
                      </div>
                      <div className="expanded-row-actions">
                        <Button size="small" icon={<EditOutlined />} onClick={() => handleEditHearing(record)}>Edit</Button>
                        <Popconfirm title="Delete?" onConfirm={() => handleDeleteHearing(record.id)} okText="Yes" cancelText="No" okButtonProps={{ danger: true, size: 'small' }}>
                          <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
                        </Popconfirm>
                      </div>
                    </div>
                  ),
                  rowExpandable: () => true,
                } : undefined}
              />
            )}
          </Card>
        </SectionLoader>

        {/* Add/Edit Hearing Modal - Shared component */}
        <HearingFormModal
          open={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          cases={cases}
          token={token}
          editingHearing={editingHearing}
          showStatus={true}
        />

        {/* Hearing Closure Modal */}
        <HearingClosureModal
          open={closureModalOpen}
          onClose={handleClosureModalClose}
          onSuccess={handleClosureSuccess}
          hearing={closingHearing}
          token={token}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
