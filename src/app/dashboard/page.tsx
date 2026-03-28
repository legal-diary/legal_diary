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
  Collapse,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ScheduleOutlined,
  EyeOutlined,
  DownOutlined,
  UpOutlined,
  WarningOutlined,
  BankOutlined,
  ExclamationCircleOutlined,
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
  onPendingClick?: () => void;
}>(({ totalCount, pendingCount, loading, lastUpdated, isPolling, isValidating, onPendingClick }) => {
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
      {/* Date */}
      <div className="header-date desktop-date">
        <CalendarOutlined className="header-date-icon" />
        <span>{todayFormatted}</span>
      </div>
      <div className="header-date mobile-date">
        <CalendarOutlined className="header-date-icon" />
        <span>{todayFormattedMobile}</span>
      </div>

      {/* Stats */}
      <div className="header-stats">
        <div className="header-stat">
          <BankOutlined className="header-stat-icon" />
          <span className="header-stat-count">{totalCount}</span>
        </div>

        {pendingCount > 0 && (
          <div className="header-stat header-stat-pending" onClick={onPendingClick} role="button" tabIndex={0}>
            <ExclamationCircleOutlined className="header-stat-icon-pending" />
            <span className="header-stat-count-pending">{pendingCount}</span>
          </div>
        )}
      </div>

      {/* Live indicator */}
      {isPolling && lastUpdated && (
        <div className="header-live">
          <span className={`live-dot${isValidating ? ' pulsing' : ''}`} />
        </div>
      )}

      <style jsx>{`
        .dashboard-header {
          margin-bottom: 12px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 10px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          gap: clamp(12px, 3vw, 24px);
        }

        .header-date {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-weight: 600;
          font-size: clamp(0.85rem, 2.5vw, 1.05rem);
          white-space: nowrap;
        }

        :global(.header-date-icon) {
          color: #4fd1c5 !important;
          font-size: clamp(14px, 2.5vw, 18px) !important;
        }

        .desktop-date {
          display: flex;
        }

        .mobile-date {
          display: none;
        }

        .header-stats {
          display: flex;
          align-items: center;
          gap: clamp(10px, 2vw, 16px);
          margin-left: auto;
        }

        .header-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(79, 209, 197, 0.15);
          padding: 4px 12px;
          border-radius: 16px;
        }

        :global(.header-stat-icon) {
          color: #4fd1c5 !important;
          font-size: clamp(13px, 2vw, 16px) !important;
        }

        .header-stat-count {
          color: #fff;
          font-weight: 600;
          font-size: clamp(0.8rem, 2vw, 0.95rem);
        }

        .header-stat-pending {
          background: rgba(250, 173, 20, 0.15);
          cursor: pointer;
          transition: background 0.2s;
        }

        .header-stat-pending:hover {
          background: rgba(250, 173, 20, 0.3);
        }

        :global(.header-stat-icon-pending) {
          color: #faad14 !important;
          font-size: clamp(13px, 2vw, 16px) !important;
        }

        .header-stat-count-pending {
          color: #faad14;
          font-weight: 600;
          font-size: clamp(0.8rem, 2vw, 0.95rem);
        }

        .header-live {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #52c41a;
          display: inline-block;
        }

        .live-dot.pulsing {
          animation: pulse 1.2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        @media (max-width: 768px) {
          .dashboard-header {
            padding: 8px 14px;
            gap: 10px;
          }

          .desktop-date {
            display: none;
          }

          .mobile-date {
            display: flex;
          }

          .header-stat {
            padding: 3px 8px;
          }
        }

        @media (max-width: 480px) {
          .dashboard-header {
            padding: 7px 10px;
            gap: 8px;
          }

          .header-stat {
            padding: 2px 6px;
            gap: 4px;
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
      styles={{ body: { padding: 0, minHeight: '60vh' } }}
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

  // Pending closures collapse state
  const [pendingCollapseKey, setPendingCollapseKey] = useState<string[]>([]);
  const pendingRef = useRef<HTMLDivElement>(null);

  const handlePendingClick = useCallback(() => {
    setPendingCollapseKey(['pending-closures']);
    // Wait for Ant Design Collapse expand animation (~300ms) to finish before scrolling
    setTimeout(() => {
      pendingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  }, []);

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
          onPendingClick={handlePendingClick}
        />

        {/* Today's Schedule - always visible, top priority */}
        <TodayScheduleTable hearings={todayHearings} totalCount={totalCount} loading={todayLoading} isMobile={isMobile} onCloseHearing={handleCloseHearing} />

        {/* Pending Closures - collapsible, collapsed by default */}
        {!swrLoading && pendingClosures.length > 0 && (
          <div className="dashboard-collapse-pending" style={{ marginTop: 24 }} ref={pendingRef}>
            <Collapse
              activeKey={pendingCollapseKey}
              onChange={(keys) => setPendingCollapseKey(Array.isArray(keys) ? keys as string[] : [keys as string])}
              items={[{
                key: 'pending-closures',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <WarningOutlined style={{ color: '#faad14' }} />
                    <span style={{ fontWeight: 500, fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Pending Closures</span>
                    <Badge count={pendingClosures.length} style={{ backgroundColor: '#faad14' }} />
                  </div>
                ),
                children: (
                  <PendingClosuresSection
                    pendingClosures={pendingClosures}
                    onCloseHearing={handleCloseHearing}
                  />
                ),
              }]}
            />
          </div>
        )}

        {/* Manage Hearings - collapsible, collapsed by default */}
        <div className="dashboard-collapse-hearings" style={{ marginTop: 24 }}>
          <SectionLoader loading={upcomingLoading} skeleton={<UpcomingHearingsSkeleton />}>
            <Collapse
              items={[{
                key: 'manage-hearings',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <ScheduleOutlined style={{ color: '#722ed1' }} />
                    <span style={{ fontWeight: 500, fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Manage Hearings</span>
                    <Tag color="purple">{upcomingHearings.length} upcoming</Tag>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={(e) => { e.stopPropagation(); handleAddHearing(); }}
                      size="small"
                      style={{ marginLeft: 'auto' }}
                    >
                      Add New Hearing
                    </Button>
                  </div>
                ),
                children: (
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '16px', padding: '0 4px' }}>
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
                  </div>
                ),
              }]}
            />
          </SectionLoader>
        </div>

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
