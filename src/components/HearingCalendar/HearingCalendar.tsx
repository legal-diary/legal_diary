'use client';

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Calendar, Card, Tag, List, Empty, Form, Input, DatePicker, Select, Button, message, Tooltip, Space, Badge, Progress, Statistic, Row, Col, Divider, Popconfirm } from 'antd';
import { CalendarOutlined, FileTextOutlined, CheckCircleOutlined, SyncOutlined, CloudOutlined, GoogleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, LinkOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/context/AuthContext';
import { CalendarSkeleton, shimmerStyles, SectionLoader } from '@/components/Skeletons';
import { getDayStatus } from '@/data/bangaloreCourtHolidays2026';
import GoogleCalendarConnect from '@/components/GoogleCalendar/GoogleCalendarConnect';

// Lazy load Modal
const Modal = lazy(() => import('antd').then(mod => ({ default: mod.Modal })));

// Types
interface CalendarSyncInfo {
  id: string;
  googleEventId: string;
  syncStatus: string;
  lastSyncedAt: string;
}

interface Hearing {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingTime?: string;
  hearingType: string;
  courtRoom?: string;
  CalendarSync?: CalendarSyncInfo[];
  Case: {
    caseNumber: string;
    caseTitle: string;
    clientName: string;
  };
}

interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
}

interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// Static color map
const HEARING_TYPE_COLORS: Record<string, string> = {
  ARGUMENTS: 'blue',
  EVIDENCE_RECORDING: 'orange',
  FINAL_HEARING: 'red',
  INTERIM_HEARING: 'green',
  JUDGMENT_DELIVERY: 'purple',
  PRE_HEARING: 'cyan',
  OTHER: 'default',
};

// Google Calendar-style pill colors (vibrant, high contrast)
const HEARING_PILL_COLORS: Record<string, string> = {
  ARGUMENTS: '#1a73e8',        // Google Blue
  EVIDENCE_RECORDING: '#f57c00', // Orange
  FINAL_HEARING: '#d93025',    // Google Red
  INTERIM_HEARING: '#0d652d',  // Google Green
  JUDGMENT_DELIVERY: '#8430ce', // Purple
  PRE_HEARING: '#007b83',      // Teal/Cyan
  OTHER: '#5f6368',            // Gray
};

const HEARING_TYPES = [
  { value: 'ARGUMENTS', label: 'Arguments' },
  { value: 'EVIDENCE_RECORDING', label: 'Evidence Recording' },
  { value: 'FINAL_HEARING', label: 'Final Hearing' },
  { value: 'INTERIM_HEARING', label: 'Interim Hearing' },
  { value: 'JUDGMENT_DELIVERY', label: 'Judgment Delivery' },
  { value: 'PRE_HEARING', label: 'Pre Hearing' },
  { value: 'OTHER', label: 'Other' },
] as const;

// Calendar Legend Component - Court Days only with matching cell colors
const CalendarLegend = () => (
  <div className="calendar-legend">
    <div className="legend-items">
      <div className="legend-item">
        <span className="legend-cell working"></span>
        <span>Working Day</span>
      </div>
      <div className="legend-item">
        <span className="legend-cell holiday"></span>
        <span>Holiday/Sunday/2nd Sat</span>
      </div>
      <div className="legend-item">
        <span className="legend-cell vacation"></span>
        <span>Court Vacation</span>
      </div>
      <div className="legend-item">
        <span className="legend-cell restricted"></span>
        <span>Restricted Holiday</span>
      </div>
      <div className="legend-item">
        <span className="legend-cell sitting"></span>
        <span>Sitting Day</span>
      </div>
    </div>
  </div>
);


// Google Calendar Status Interface
interface GoogleCalendarStatus {
  connected: boolean;
  expiresAt: string | null;
  lastSync: string | null;
  syncedCount: number;
  failedCount: number;
}

export default function HearingCalendar() {
  const { token } = useAuth();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [form] = Form.useForm();
  const [hearingDetailsModalOpen, setHearingDetailsModalOpen] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingHearingId, setSyncingHearingId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingHearing, setEditingHearing] = useState<Hearing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dateDetailsModalOpen, setDateDetailsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Helper to check if a hearing is synced to Google Calendar
  const isSyncedToGoogle = useCallback((hearing: Hearing): boolean => {
    return !!(hearing.CalendarSync && hearing.CalendarSync.length > 0 &&
              hearing.CalendarSync.some(sync => sync.syncStatus === 'SYNCED'));
  }, []);

  // Optimized single API call to fetch both hearings and cases
  const fetchCalendarData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const rangeStart = selectedDate.startOf('month').toISOString();
      const rangeEnd = selectedDate.endOf('month').toISOString();

      // Parallel fetch for hearings and cases
      const [hearingsRes, casesRes] = await Promise.all([
        fetch(`/api/hearings?calendar=true&startDate=${encodeURIComponent(rangeStart)}&endDate=${encodeURIComponent(rangeEnd)}&limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/cases?minimal=true&limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (hearingsRes.ok) {
        const hearingsData: PaginatedResponse<Hearing> = await hearingsRes.json();
        setHearings(hearingsData.data);
      }

      if (casesRes.ok) {
        const casesData: PaginatedResponse<Case> = await casesRes.json();
        setCases(casesData.data);
      }
    } catch {
      message.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate]);

  // Fetch Google Calendar status
  const fetchGoogleStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/google/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setGoogleStatus(data);
        setGoogleCalendarConnected(data.connected);
      }
    } catch (error) {
      console.error('Failed to fetch Google Calendar status:', error);
    }
  }, [token]);

  // Sync all hearings to Google Calendar
  const handleSyncAll = useCallback(async () => {
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
        fetchGoogleStatus();
        fetchCalendarData();
      } else {
        message.error('Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      message.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [token, fetchGoogleStatus, fetchCalendarData]);

  // Sync individual hearing to Google Calendar
  const handleSyncHearing = useCallback(async (hearingId: string) => {
    if (!token) return;

    setSyncingHearingId(hearingId);
    try {
      const response = await fetch(`/api/google/calendar/sync/${hearingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        message.success('Hearing synced to Google Calendar');
        fetchCalendarData();
        fetchGoogleStatus();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to sync hearing');
      }
    } catch (error) {
      console.error('Sync error:', error);
      message.error('Failed to sync hearing');
    } finally {
      setSyncingHearingId(null);
    }
  }, [token, fetchCalendarData, fetchGoogleStatus]);

  // Handle edit hearing
  const handleEditHearing = useCallback((hearing: Hearing) => {
    setEditingHearing(hearing);
    setIsEditMode(true);
    setSelectedCaseId(hearing.caseId);
    setSubmitSuccess(false); // Reset success state when entering edit mode
    setSubmitting(false); // Reset submitting state
    form.setFieldsValue({
      caseId: hearing.caseId,
      hearingDate: dayjs(hearing.hearingDate),
      hearingTime: hearing.hearingTime || '',
      hearingType: hearing.hearingType,
      courtRoom: hearing.courtRoom || '',
    });
    setHearingDetailsModalOpen(false);
    setModalOpen(true);
  }, [form]);

  // Handle update hearing
  const handleUpdateHearing = useCallback(async (values: any) => {
    if (!editingHearing) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/hearings/${editingHearing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hearingDate: values.hearingDate.toISOString(),
          hearingTime: values.hearingTime,
          hearingType: values.hearingType,
          courtRoom: values.courtRoom,
          notes: values.notes,
        }),
      });

      if (response.ok) {
        await fetchCalendarData();
        setSubmitSuccess(true);
        message.success('Hearing updated successfully');

        setTimeout(() => {
          setModalOpen(false);
          setIsEditMode(false);
          setEditingHearing(null);
          form.resetFields();
          setSubmitSuccess(false);
        }, 1500);
      } else {
        message.error('Failed to update hearing');
      }
    } catch {
      message.error('Error updating hearing');
    } finally {
      setSubmitting(false);
    }
  }, [token, editingHearing, form, fetchCalendarData]);

  // Handle delete hearing
  const handleDeleteHearing = useCallback(async (hearingId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/hearings/${hearingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchCalendarData();
        message.success('Hearing deleted successfully');

        setTimeout(() => {
          setHearingDetailsModalOpen(false);
          setSelectedHearing(null);
          setDateDetailsModalOpen(false);
        }, 1000);
      } else {
        message.error('Failed to delete hearing');
      }
    } catch {
      message.error('Error deleting hearing');
    } finally {
      setDeleting(false);
    }
  }, [token, fetchCalendarData]);

  useEffect(() => {
    if (token) {
      fetchCalendarData();
      fetchGoogleStatus();
    }
  }, [token, fetchCalendarData, fetchGoogleStatus]);

  // Memoized hearings grouped by date for fast lookup
  const hearingsByDate = useMemo(() => {
    const map = new Map<string, Hearing[]>();
    hearings.forEach((h) => {
      const dateKey = dayjs(h.hearingDate).format('YYYY-MM-DD');
      const existing = map.get(dateKey) || [];
      existing.push(h);
      map.set(dateKey, existing);
    });
    return map;
  }, [hearings]);

  // Get hearings for a specific date
  const getHearingsForDate = useCallback(
    (date: dayjs.Dayjs): Hearing[] => {
      const dateKey = date.format('YYYY-MM-DD');
      return hearingsByDate.get(dateKey) || [];
    },
    [hearingsByDate]
  );

  // Memoized selected date hearings
  const selectedDateHearings = useMemo(
    () => getHearingsForDate(selectedDate),
    [selectedDate, getHearingsForDate]
  );

  // Sorted hearings by time for timeline view
  const sortedSelectedDateHearings = useMemo(() => {
    return [...selectedDateHearings].sort((a, b) => {
      // Hearings without time go to the end
      if (!a.hearingTime && !b.hearingTime) return 0;
      if (!a.hearingTime) return 1;
      if (!b.hearingTime) return -1;
      return a.hearingTime.localeCompare(b.hearingTime);
    });
  }, [selectedDateHearings]);

  // Get day status for selected date
  const selectedDayStatus = useMemo(() => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    return getDayStatus(dateStr);
  }, [selectedDate]);

  // Memoized date cell renderer with court holiday information
  const dateCellRender = useCallback(
    (date: dayjs.Dayjs) => {
      const dateStr = date.format('YYYY-MM-DD');
      const dayHearings = getHearingsForDate(date);
      const dayStatus = getDayStatus(dateStr);

      // Determine cell background class
      let cellClass = 'court-day ';
      if (dayStatus.isVacation) {
        cellClass += 'vacation-day';
      } else if (dayStatus.isSittingDay) {
        cellClass += 'sitting-day';
      } else if (dayStatus.isHoliday) {
        cellClass += 'holiday-day';
      } else if (dayStatus.isRestrictedHoliday) {
        cellClass += 'restricted-day';
      } else {
        cellClass += 'working-day';
      }

      const tooltipContent = dayStatus.holidayName || dayStatus.vacationName ||
        (dayStatus.isWorkingDay ? 'Working Day' : 'Non-Working Day');

      // Determine the status label and color class for non-working days
      // Exclude regular Sundays - only show actual holiday/vacation names
      let statusLabel = '';
      let statusColorClass = '';
      if (dayStatus.isVacation && dayStatus.vacationName) {
        statusLabel = dayStatus.vacationName;
        statusColorClass = 'status-vacation';
      } else if (dayStatus.isHoliday && dayStatus.holidayName && dayStatus.holidayName !== 'Sunday') {
        statusLabel = dayStatus.holidayName;
        statusColorClass = 'status-holiday';
      } else if (dayStatus.isRestrictedHoliday && dayStatus.holidayName) {
        statusLabel = dayStatus.holidayName;
        statusColorClass = 'status-restricted';
      } else if (dayStatus.isSittingDay) {
        statusLabel = 'Sitting Day';
        statusColorClass = 'status-sitting';
      }

      return (
        <Tooltip title={tooltipContent} placement="top">
          <div className={cellClass}>
            {/* Sitting Day badge */}
            {dayStatus.isSittingDay && (
              <div className="day-status-indicator">
                <span className="sitting-badge">S</span>
              </div>
            )}

            {/* Hearings list */}
            {dayHearings.length > 0 && (
              <ul className="hearing-list">
                {dayHearings.slice(0, 2).map((hearing) => {
                  const synced = isSyncedToGoogle(hearing);
                  const pillColor = HEARING_PILL_COLORS[hearing.hearingType] || '#5f6368';
                  return (
                    <li
                      key={hearing.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHearing(hearing);
                        setHearingDetailsModalOpen(true);
                      }}
                      className={`hearing-pill ${synced ? 'synced' : ''}`}
                      style={{ backgroundColor: pillColor }}
                    >
                      {googleCalendarConnected && synced && (
                        <GoogleOutlined className="google-sync-icon" />
                      )}
                      <span className="pill-text">{hearing.Case?.caseNumber || 'N/A'}</span>
                    </li>
                  );
                })}
                {dayHearings.length > 2 && (
                  <li className="hearing-more">+{dayHearings.length - 2} more</li>
                )}
              </ul>
            )}

            {/* Holiday/Status label at bottom */}
            {statusLabel && (
              <div className={`day-status-label ${statusColorClass}`}>
                {statusLabel}
              </div>
            )}
          </div>
        </Tooltip>
      );
    },
    [getHearingsForDate, isSyncedToGoogle, googleCalendarConnected]
  );

  // Handle form submission
  const onFinish = useCallback(
    async (values: any) => {
      setSubmitting(true);
      try {
        const response = await fetch('/api/hearings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            caseId: selectedCaseId,
            hearingDate: values.hearingDate.toISOString(),
            hearingTime: values.hearingTime,
            hearingType: values.hearingType,
            courtRoom: values.courtRoom,
            notes: values.notes,
          }),
        });

        if (response.ok) {
          await fetchCalendarData();
          setSubmitSuccess(true);
          message.success('Hearing scheduled successfully');

          setTimeout(() => {
            setModalOpen(false);
            form.resetFields();
            setSubmitSuccess(false);
          }, 1500);
        } else {
          message.error('Failed to schedule hearing');
        }
      } catch {
        message.error('Error scheduling hearing');
      } finally {
        setSubmitting(false);
      }
    },
    [token, selectedCaseId, form, fetchCalendarData]
  );

  // Handle modal open with pre-filled date
  const openScheduleModal = useCallback(
    (date?: dayjs.Dayjs) => {
      // Reset edit mode for new hearing creation
      setIsEditMode(false);
      setEditingHearing(null);
      setSubmitSuccess(false); // Reset success state
      setSubmitting(false); // Reset submitting state
      form.resetFields();
      setModalOpen(true);
      if (date) {
        form.setFieldsValue({ hearingDate: date });
      }
    },
    [form]
  );

  // Handle date selection (from header dropdowns)
  const handleDateChange = useCallback(
    (date: dayjs.Dayjs) => {
      setSelectedDate(date);
    },
    []
  );

  // Handle date cell click - opens date details modal
  const handleDateSelect = useCallback(
    (date: dayjs.Dayjs) => {
      setSelectedDate(date);
      // Open date details modal instead of create modal
      setDateDetailsModalOpen(true);
    },
    []
  );

  // Memoized case options
  const caseOptions = useMemo(
    () =>
      cases.map((c) => (
        <Select.Option key={c.id} value={c.id}>
          {c.caseNumber} - {c.caseTitle}
        </Select.Option>
      )),
    [cases]
  );

  // Calculate sync statistics
  const syncStats = useMemo(() => {
    const total = hearings.length;
    const synced = hearings.filter(h => isSyncedToGoogle(h)).length;
    const unsynced = total - synced;
    const percentage = total > 0 ? Math.round((synced / total) * 100) : 0;
    return { total, synced, unsynced, percentage };
  }, [hearings, isSyncedToGoogle]);

  return (
    <div className="hearing-calendar-container">
      <style>{shimmerStyles}</style>
      <style>{calendarStyles}</style>

      <SectionLoader loading={loading} skeleton={<CalendarSkeleton />}>

        {/* Google Calendar Status Card - COMMENTED OUT
        {googleCalendarConnected && googleStatus && (
          <Card
            className="google-status-card"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={8} md={6}>
                <div className="google-status-header">
                  <GoogleOutlined style={{ fontSize: 24, color: '#4285f4', marginRight: 8 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>Google Calendar</div>
                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginTop: 4 }}>Connected</Tag>
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={8} md={5}>
                <Statistic
                  title="Synced Hearings"
                  value={syncStats.synced}
                  suffix={`/ ${syncStats.total}`}
                  valueStyle={{ color: '#52c41a', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>

              <Col xs={12} sm={8} md={5}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={syncStats.percentage}
                    size={60}
                    strokeColor="#52c41a"
                    format={percent => `${percent}%`}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>Sync Rate</div>
                </div>
              </Col>

              <Col xs={24} sm={12} md={4}>
                {googleStatus.lastSync && (
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    Last sync:<br />
                    <span style={{ fontWeight: 500 }}>
                      {dayjs(googleStatus.lastSync).format('MMM D, h:mm A')}
                    </span>
                  </div>
                )}
              </Col>

              <Col xs={24} sm={12} md={4} style={{ textAlign: 'right' }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<SyncOutlined spin={syncing} />}
                    onClick={handleSyncAll}
                    loading={syncing}
                    block
                  >
                    Sync All
                  </Button>
                  {syncStats.unsynced > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#faad14' }}>
                      <ExclamationCircleOutlined /> {syncStats.unsynced} unsynced
                    </div>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        )}
        */}

        {/* Main Calendar */}
        <Card
          title={
            <span>
              <CalendarOutlined style={{ marginRight: 8 }} />
              Karnataka High Court Calendar 2026
            </span>
          }
          extra={
            <GoogleCalendarConnect
              compact
              onStatusChange={(connected) => setGoogleCalendarConnected(connected)}
            />
          }
          style={{ marginBottom: '16px' }}
          className="calendar-card"
        >
          <CalendarLegend />
          <div className="calendar-container">
            <Calendar
              cellRender={dateCellRender}
              onChange={handleDateChange}
              onSelect={handleDateSelect}
              mode="month"
              headerRender={({ value, onChange }) => {
                const year = value.year();
                const month = value.month();
                const years = [];
                for (let i = year - 5; i <= year + 5; i++) {
                  years.push(i);
                }
                const months = [];
                for (let i = 0; i < 12; i++) {
                  months.push(dayjs().month(i).format('MMM'));
                }
                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 0', gap: '8px' }}>
                    <Select
                      value={year}
                      onChange={(newYear) => {
                        const newValue = value.clone().year(newYear);
                        onChange(newValue);
                      }}
                      style={{ width: 90 }}
                      options={years.map(y => ({ value: y, label: y }))}
                    />
                    <Select
                      value={month}
                      onChange={(newMonth) => {
                        const newValue = value.clone().month(newMonth);
                        onChange(newValue);
                      }}
                      style={{ width: 80 }}
                      options={months.map((m, i) => ({ value: i, label: m }))}
                    />
                  </div>
                );
              }}
            />
          </div>
        </Card>

        {/* Selected Date Details */}
        <Card
          title={
            <div className="selected-date-header">
              <span>{selectedDate.format('dddd, MMMM D, YYYY')}</span>
              <Tag color={selectedDayStatus.isWorkingDay ? 'green' : 'red'}>
                {selectedDayStatus.isWorkingDay ? 'Working Day' : 'Non-Working'}
              </Tag>
              {selectedDayStatus.holidayName && (
                <Tag color="blue">{selectedDayStatus.holidayName}</Tag>
              )}
              {selectedDayStatus.vacationName && (
                <Tag color="purple">{selectedDayStatus.vacationName}</Tag>
              )}
            </div>
          }
          extra={
            <Button type="primary" onClick={() => openScheduleModal(selectedDate)}>
              Schedule Hearing
            </Button>
          }
        >
          {selectedDateHearings.length === 0 ? (
            <Empty description="No hearings scheduled for this date" />
          ) : (
            <List
              dataSource={selectedDateHearings}
              renderItem={(hearing) => (
                <List.Item
                  extra={
                    googleCalendarConnected && (
                      <Space direction="vertical" align="end" size="small">
                        <Tooltip title={isSyncedToGoogle(hearing) ? 'Synced to Google Calendar' : 'Not synced'}>
                          {isSyncedToGoogle(hearing) ? (
                            <Badge status="success" text={<span style={{ color: '#52c41a', fontSize: '0.8rem' }}><GoogleOutlined /> Synced</span>} />
                          ) : (
                            <Badge status="warning" text={<span style={{ color: '#faad14', fontSize: '0.8rem' }}><CloudOutlined /> Not synced</span>} />
                          )}
                        </Tooltip>
                        {!isSyncedToGoogle(hearing) && (
                          <Button
                            type="link"
                            size="small"
                            icon={<SyncOutlined spin={syncingHearingId === hearing.id} />}
                            onClick={() => handleSyncHearing(hearing.id)}
                            loading={syncingHearingId === hearing.id}
                            style={{ padding: 0, height: 'auto', fontSize: '0.75rem' }}
                          >
                            Sync now
                          </Button>
                        )}
                      </Space>
                    )
                  }
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)', color: '#1890ff' }} />}
                    title={
                      <span style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                        {`${hearing.Case?.caseNumber || 'N/A'} - ${hearing.Case?.caseTitle || 'Unknown'}`}
                      </span>
                    }
                    description={
                      <div style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.95rem)' }}>
                        <p style={{ marginBottom: '4px' }}>Client: {hearing.Case?.clientName || 'Unknown'}</p>
                        <p style={{ marginBottom: '4px' }}>
                          Type:{' '}
                          <Tag color={HEARING_TYPE_COLORS[hearing.hearingType] || 'default'}>
                            {hearing.hearingType.replace(/_/g, ' ')}
                          </Tag>
                        </p>
                        {hearing.hearingTime && <p style={{ marginBottom: '4px' }}>Time: {hearing.hearingTime}</p>}
                        {hearing.courtRoom && <p style={{ marginBottom: '4px' }}>Court Room: {hearing.courtRoom}</p>}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </SectionLoader>

      {/* Hearing Details Modal */}
      {hearingDetailsModalOpen && selectedHearing && (
        <Suspense fallback={null}>
          <Modal
            title="Hearing Details"
            open={hearingDetailsModalOpen}
            onCancel={() => {
              setHearingDetailsModalOpen(false);
              setSelectedHearing(null);
            }}
            footer={[
              <Popconfirm
                key="delete"
                title="Delete Hearing"
                description="Are you sure you want to delete this hearing?"
                onConfirm={() => handleDeleteHearing(selectedHearing.id)}
                okText="Yes, Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true, loading: deleting }}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleting}
                >
                  Delete
                </Button>
              </Popconfirm>,
              <Button
                key="edit"
                type="primary"
                icon={<EditOutlined />}
                onClick={() => handleEditHearing(selectedHearing)}
              >
                Edit
              </Button>,
              <Button
                key="close"
                onClick={() => {
                  setHearingDetailsModalOpen(false);
                  setSelectedHearing(null);
                }}
              >
                Close
              </Button>,
            ]}
            destroyOnClose
            width="min(520px, 95vw)"
            centered
          >
            <div style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                <h3 style={{ marginBottom: '8px', color: '#1890ff', fontSize: 'clamp(1rem, 3vw, 1.3rem)' }}>
                  {selectedHearing.Case?.caseNumber || 'N/A'}
                </h3>
                <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', fontWeight: 'bold', marginBottom: '8px' }}>
                  {selectedHearing.Case?.caseTitle || 'Unknown Case'}
                </p>
                <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                  <strong>Client:</strong> {selectedHearing.Case?.clientName || 'Unknown'}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ marginBottom: '12px', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                  <strong>Hearing Date:</strong>{' '}
                  <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                    {dayjs(selectedHearing.hearingDate).format('MMMM D, YYYY')}
                  </span>
                </p>

                {selectedHearing.hearingTime && (
                  <p style={{ marginBottom: '12px', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                    <strong>Hearing Time:</strong> {selectedHearing.hearingTime}
                  </p>
                )}

                <p style={{ marginBottom: '12px', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                  <strong>Hearing Type:</strong>{' '}
                  <Tag color={HEARING_TYPE_COLORS[selectedHearing.hearingType] || 'default'}>
                    {selectedHearing.hearingType.replace(/_/g, ' ')}
                  </Tag>
                </p>

                {selectedHearing.courtRoom && (
                  <p style={{ marginBottom: '12px', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                    <strong>Court Room:</strong> {selectedHearing.courtRoom}
                  </p>
                )}
              </div>

              {/* Google Calendar Sync Section */}
              {googleCalendarConnected && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <div className="google-sync-section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GoogleOutlined style={{ fontSize: 18, color: '#4285f4' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Google Calendar</span>
                      </div>
                      {isSyncedToGoogle(selectedHearing) ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>Synced</Tag>
                      ) : (
                        <Tag color="warning" icon={<ExclamationCircleOutlined />}>Not Synced</Tag>
                      )}
                    </div>

                    {isSyncedToGoogle(selectedHearing) ? (
                      <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: 12 }}>
                        <p style={{ margin: 0, color: '#52c41a', fontSize: '0.85rem' }}>
                          <CheckCircleOutlined style={{ marginRight: 6 }} />
                          This hearing is synced to your Google Calendar
                        </p>
                        {selectedHearing.CalendarSync && selectedHearing.CalendarSync[0] && (
                          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '0.8rem' }}>
                            <ClockCircleOutlined style={{ marginRight: 6 }} />
                            Last synced: {dayjs(selectedHearing.CalendarSync[0].lastSyncedAt).format('MMM D, YYYY h:mm A')}
                          </p>
                        )}
                        <Button
                          type="link"
                          icon={<ReloadOutlined spin={syncingHearingId === selectedHearing.id} />}
                          onClick={() => handleSyncHearing(selectedHearing.id)}
                          loading={syncingHearingId === selectedHearing.id}
                          style={{ padding: '4px 0', marginTop: 8 }}
                        >
                          Re-sync to Google Calendar
                        </Button>
                      </div>
                    ) : (
                      <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: 12 }}>
                        <p style={{ margin: '0 0 12px 0', color: '#d48806', fontSize: '0.85rem' }}>
                          <ExclamationCircleOutlined style={{ marginRight: 6 }} />
                          This hearing hasn't been synced to Google Calendar yet
                        </p>
                        <Button
                          type="primary"
                          icon={<GoogleOutlined />}
                          onClick={() => handleSyncHearing(selectedHearing.id)}
                          loading={syncingHearingId === selectedHearing.id}
                          style={{ background: '#4285f4' }}
                        >
                          Sync to Google Calendar
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Modal>
        </Suspense>
      )}

      {/* Schedule/Edit Hearing Modal */}
      {modalOpen && (
        <Suspense fallback={null}>
          <Modal
            title={isEditMode ? "Edit Hearing" : "Schedule Hearing"}
            open={modalOpen}
            onCancel={() => {
              setModalOpen(false);
              setIsEditMode(false);
              setEditingHearing(null);
              form.resetFields();
            }}
            footer={null}
            destroyOnClose
            width="min(520px, 95vw)"
            centered
          >
            <Form
              form={form}
              onFinish={isEditMode ? handleUpdateHearing : onFinish}
              layout="vertical"
            >
              <Form.Item
                name="caseId"
                label="Select Case"
                rules={[{ required: true, message: 'Please select a case' }]}
              >
                <Select
                  placeholder="Select a case"
                  onChange={(value) => setSelectedCaseId(value)}
                  disabled={isEditMode}
                >
                  {caseOptions}
                </Select>
              </Form.Item>

              <Form.Item
                name="hearingDate"
                label="Hearing Date"
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="hearingTime" label="Hearing Time">
                <Input type="time" />
              </Form.Item>

              <Form.Item
                name="hearingType"
                label="Hearing Type"
                rules={[{ required: true, message: 'Please select hearing type' }]}
              >
                <Select>
                  {HEARING_TYPES.map((type) => (
                    <Select.Option key={type.value} value={type.value}>
                      {type.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="courtRoom" label="Court Room">
                <Input placeholder="e.g., Court Room 5" />
              </Form.Item>

              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} placeholder="Additional notes" />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={submitting}
                icon={submitSuccess ? <CheckCircleOutlined /> : undefined}
                style={submitSuccess ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
                disabled={submitSuccess}
              >
                {submitSuccess
                  ? "Success!"
                  : submitting
                    ? (isEditMode ? "Updating..." : "Scheduling...")
                    : (isEditMode ? "Update Hearing" : "Schedule Hearing")
                }
              </Button>
            </Form>
          </Modal>
        </Suspense>
      )}

      {/* Date Details Modal - Google Calendar Style */}
      {dateDetailsModalOpen && (
        <Suspense fallback={null}>
          <Modal
            title={null}
            open={dateDetailsModalOpen}
            onCancel={() => setDateDetailsModalOpen(false)}
            footer={null}
            destroyOnClose
            width="min(600px, 95vw)"
            centered
            className="date-details-modal"
          >
            {/* Date Header */}
            <div className="date-details-header">
              <div className="date-details-title">
                <CalendarOutlined style={{ fontSize: 24, color: '#1a73e8', marginRight: 12 }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 600 }}>
                    {selectedDate.format('dddd, MMMM D, YYYY')}
                  </h2>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Tag
                      color={selectedDayStatus.isWorkingDay ? 'success' : 'error'}
                      style={{ fontSize: '0.85rem', padding: '2px 10px' }}
                    >
                      {selectedDayStatus.isWorkingDay ? '✓ Working Day' : '✗ Non-Working'}
                    </Tag>
                    {selectedDayStatus.holidayName && selectedDayStatus.holidayName !== 'Sunday' && (
                      <Tag color="blue" style={{ fontSize: '0.85rem', padding: '2px 10px' }}>
                        {selectedDayStatus.holidayName}
                      </Tag>
                    )}
                    {selectedDayStatus.vacationName && (
                      <Tag color="purple" style={{ fontSize: '0.85rem', padding: '2px 10px' }}>
                        {selectedDayStatus.vacationName}
                      </Tag>
                    )}
                    {selectedDayStatus.isSittingDay && (
                      <Tag color="geekblue" style={{ fontSize: '0.85rem', padding: '2px 10px' }}>
                        Sitting Day
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule New Hearing Button */}
            <div style={{ marginBottom: 20 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => {
                  setDateDetailsModalOpen(false);
                  openScheduleModal(selectedDate);
                }}
                style={{
                  background: '#1a73e8',
                  borderRadius: 24,
                  height: 44,
                  paddingLeft: 20,
                  paddingRight: 24,
                  fontWeight: 500
                }}
              >
                Schedule New Hearing
              </Button>
            </div>

            {/* Hearings Timeline */}
            <div className="date-details-hearings">
              <div style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#5f6368',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <FileTextOutlined />
                Hearings ({sortedSelectedDateHearings.length})
              </div>

              {sortedSelectedDateHearings.length === 0 ? (
                <Empty
                  description="No hearings scheduled for this date"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '40px 0' }}
                />
              ) : (
                <div className="timeline-container">
                  {sortedSelectedDateHearings.map((hearing, index) => {
                    const pillColor = HEARING_PILL_COLORS[hearing.hearingType] || '#5f6368';
                    const synced = isSyncedToGoogle(hearing);

                    return (
                      <div key={hearing.id} className="timeline-item">
                        {/* Time Column */}
                        <div className="timeline-time">
                          <span className="time-text">
                            {hearing.hearingTime || 'No time set'}
                          </span>
                          {index < sortedSelectedDateHearings.length - 1 && (
                            <div className="timeline-connector" />
                          )}
                        </div>

                        {/* Hearing Card */}
                        <div
                          className="timeline-card"
                          style={{ borderLeftColor: pillColor }}
                        >
                          <div className="timeline-card-header">
                            <div className="case-info">
                              <span className="case-number" style={{ color: pillColor }}>
                                {hearing.Case?.caseNumber || 'N/A'}
                              </span>
                              {synced && googleCalendarConnected && (
                                <Tooltip title="Synced to Google Calendar">
                                  <GoogleOutlined style={{ color: '#34a853', fontSize: 14 }} />
                                </Tooltip>
                              )}
                            </div>
                            <Tag
                              color={HEARING_TYPE_COLORS[hearing.hearingType] || 'default'}
                              style={{ margin: 0, fontSize: '0.75rem' }}
                            >
                              {hearing.hearingType.replace(/_/g, ' ')}
                            </Tag>
                          </div>

                          <div className="timeline-card-title">
                            {hearing.Case?.caseTitle || 'Unknown Case'}
                          </div>

                          <div className="timeline-card-meta">
                            <span>Client: {hearing.Case?.clientName || 'Unknown'}</span>
                            {hearing.courtRoom && (
                              <span>• Court: {hearing.courtRoom}</span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="timeline-card-actions">
                            <Button
                              type="text"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                setDateDetailsModalOpen(false);
                                setSelectedHearing(hearing);
                                setHearingDetailsModalOpen(true);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setDateDetailsModalOpen(false);
                                handleEditHearing(hearing);
                              }}
                            >
                              Edit
                            </Button>
                            <Popconfirm
                              title="Delete Hearing"
                              description="Are you sure you want to delete this hearing?"
                              onConfirm={async () => {
                                await handleDeleteHearing(hearing.id);
                              }}
                              okText="Yes, Delete"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                            >
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                              >
                                Delete
                              </Button>
                            </Popconfirm>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Button onClick={() => setDateDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </Modal>
        </Suspense>
      )}
    </div>
  );
}

// Calendar-specific styles
const calendarStyles = `
  .hearing-calendar-container {
    width: 100%;
  }

  /* Google Calendar Status Card */
  .google-status-card {
    background: linear-gradient(135deg, #f8faff 0%, #ffffff 100%);
    border: 1px solid #e6f0ff;
    border-radius: 12px;
  }

  .google-status-card .ant-card-body {
    padding: 16px 24px;
  }

  .google-status-header {
    display: flex;
    align-items: center;
  }

  .google-sync-section {
    margin-top: 8px;
  }

  /* Calendar Info Card */
  .calendar-info-card .ant-card-body {
    padding: 16px;
  }

  /* Google Sync Icon in Calendar Cell */
  .google-sync-icon {
    color: #4285f4;
    font-size: 8px;
    margin-right: 2px;
  }

  /* Legacy synced styles removed - now handled by .hearing-pill.synced */

  /* Legend Styles */
  .calendar-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
  }

  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: clamp(0.75rem, 1.5vw, 0.85rem);
    color: #333;
  }

  /* Legend cells matching actual calendar cell colors */
  .legend-cell {
    width: 18px;
    height: 14px;
    border-radius: 3px;
    flex-shrink: 0;
    border-left: 3px solid;
  }

  .legend-cell.working {
    background-color: rgba(52, 168, 83, 0.08);
    border-left-color: #34a853;
  }

  .legend-cell.holiday {
    background-color: rgba(234, 67, 53, 0.12);
    border-left-color: #ea4335;
  }

  .legend-cell.vacation {
    background-color: rgba(66, 133, 244, 0.12);
    border-left-color: #4285f4;
  }

  .legend-cell.restricted {
    background-color: rgba(251, 188, 4, 0.12);
    border-left-color: #fbbc04;
  }

  .legend-cell.sitting {
    background-color: rgba(142, 68, 173, 0.12);
    border-left-color: #8e44ad;
  }


  /* Calendar Cell Styles */
  .court-day {
    min-height: 100%;
    border-radius: 4px;
    padding: 2px;
    margin: -2px;
    position: relative;
    border-left: 3px solid #e0e0e0; /* Default border for all days */
  }

  /* Court Day Backgrounds - visible but not overpowering */
  .working-day {
    background-color: rgba(52, 168, 83, 0.08);
    border-left: 3px solid #34a853;
  }

  .holiday-day {
    background-color: rgba(234, 67, 53, 0.12);
    border-left: 3px solid #ea4335;
  }

  .vacation-day {
    background-color: rgba(66, 133, 244, 0.12);
    border-left: 3px solid #4285f4;
  }

  .restricted-day {
    background-color: rgba(251, 188, 4, 0.12);
    border-left: 3px solid #fbbc04;
  }

  .sitting-day {
    background-color: rgba(142, 68, 173, 0.12);
    border-left: 3px solid #8e44ad;
  }

  .day-status-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
  }

  .sitting-badge {
    background: #8e44ad;
    color: white;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: bold;
  }

  /* Holiday/Status label at bottom of cell */
  .day-status-label {
    position: absolute;
    bottom: 2px;
    left: 2px;
    right: 2px;
    font-size: clamp(0.5rem, 1vw, 0.65rem);
    font-weight: 600;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    padding: 1px 3px;
    border-radius: 2px;
  }

  .day-status-label.status-holiday {
    color: #c53030;
    background-color: rgba(234, 67, 53, 0.15);
  }

  .day-status-label.status-vacation {
    color: #2b6cb0;
    background-color: rgba(66, 133, 244, 0.15);
  }

  .day-status-label.status-restricted {
    color: #b7791f;
    background-color: rgba(251, 188, 4, 0.2);
  }

  .day-status-label.status-sitting {
    color: #6b46c1;
    background-color: rgba(142, 68, 173, 0.15);
  }

  /* Hearing List in Cell */
  .hearing-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  /* Google Calendar-Style Event Pills */
  .hearing-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: clamp(0.65rem, 1.2vw, 0.75rem);
    color: #ffffff;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: all 0.15s ease;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .hearing-pill:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    filter: brightness(1.1);
  }

  .hearing-pill .pill-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hearing-pill .google-sync-icon {
    color: rgba(255,255,255,0.9);
    font-size: 10px;
    flex-shrink: 0;
  }

  .hearing-pill.synced {
    /* Synced pills have a subtle white border */
    box-shadow: 0 1px 2px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.3);
  }

  /* "+X more" text */
  .hearing-more {
    font-size: clamp(0.6rem, 1vw, 0.7rem);
    color: #1a73e8;
    padding: 1px 4px;
    font-weight: 500;
    cursor: pointer;
  }

  .hearing-more:hover {
    text-decoration: underline;
  }

  /* Selected Date Header */
  .selected-date-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* Calendar Card */
  .calendar-card {
    width: 100%;
  }

  .calendar-container {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Ant Design Calendar Overrides */
  .ant-picker-calendar-date-content {
    height: 70px !important;
    overflow: hidden;
  }

  /* Court day cell - fit content without scrollbars */
  .court-day {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Responsive Styles */
  @media (max-width: 992px) {
    .ant-picker-calendar-date-content {
      height: 50px !important;
    }
  }

  @media (max-width: 768px) {
    .calendar-card {
      margin-bottom: 12px !important;
    }

    .ant-picker-calendar {
      font-size: 0.85rem;
    }

    .ant-picker-calendar-header {
      padding: 8px !important;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .ant-picker-calendar-date {
      padding: 2px !important;
    }

    .ant-picker-calendar-date-content {
      height: 40px !important;
      overflow: hidden;
    }

    .ant-picker-cell {
      padding: 2px !important;
    }

    .hearing-pill {
      font-size: 0.6rem !important;
      padding: 1px 4px !important;
      margin-bottom: 1px !important;
      border-radius: 3px !important;
    }

    .ant-picker-calendar-date-value {
      font-size: 0.8rem !important;
    }

    .court-day {
      border-left-width: 3px !important;
      border-left-style: solid !important;
    }
  }

  @media (max-width: 576px) {
    .calendar-card .ant-card-body {
      padding: 8px !important;
    }

    .ant-picker-calendar {
      font-size: 0.75rem;
    }

    .ant-picker-calendar-header {
      padding: 4px !important;
    }

    .ant-picker-calendar-header .ant-select {
      min-width: 60px !important;
      font-size: 0.75rem !important;
    }

    .ant-picker-calendar-header .ant-radio-group {
      display: none !important;
    }

    .ant-picker-calendar-date-content {
      height: 30px !important;
    }

    .ant-picker-calendar-date-value {
      font-size: 0.7rem !important;
      line-height: 1.2 !important;
    }

    .hearing-pill {
      font-size: 0.55rem !important;
      padding: 1px 3px !important;
    }

    .hearing-pill .google-sync-icon {
      display: none;
    }

    .court-day {
      border-left-width: 3px !important;
      border-left-style: solid !important;
    }

    .day-status-label {
      font-size: 0.45rem !important;
      padding: 0 2px !important;
    }

    .ant-picker-content th {
      font-size: 0.65rem !important;
      padding: 4px 0 !important;
    }

    .calendar-legend {
      flex-direction: column;
      gap: 12px;
      padding: 10px 12px;
    }

    .legend-items {
      gap: 8px;
    }

    .legend-item {
      font-size: 0.7rem;
    }

    .legend-cell {
      width: 16px;
      height: 12px;
      border-left-width: 3px !important;
    }

    /* Google Calendar Status Card Mobile */
    .google-status-card .ant-card-body {
      padding: 12px !important;
    }

    .google-status-header {
      justify-content: center;
      text-align: center;
      flex-direction: column;
      gap: 8px;
    }

    .google-sync-icon {
      display: none;
    }

    .hearing-pill.synced {
      box-shadow: 0 1px 1px rgba(0,0,0,0.1);
    }
  }

  /* Hearing list responsive */
  @media (max-width: 768px) {
    .ant-list-item-meta-avatar {
      margin-right: 8px !important;
    }

    .ant-list-item-meta-title {
      font-size: 0.85rem !important;
    }

    .ant-list-item-meta-description {
      font-size: 0.75rem !important;
    }
  }

  /* Date Details Modal Styles */
  .date-details-modal .ant-modal-content {
    border-radius: 16px;
    overflow: hidden;
  }

  .date-details-modal .ant-modal-body {
    padding: 24px;
  }

  .date-details-header {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e8e8e8;
  }

  .date-details-title {
    display: flex;
    align-items: flex-start;
  }

  .date-details-hearings {
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 8px;
  }

  /* Timeline Styles */
  .timeline-container {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .timeline-item {
    display: flex;
    gap: 16px;
    position: relative;
  }

  .timeline-time {
    width: 90px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    position: relative;
    padding-top: 12px;
  }

  .time-text {
    font-size: 0.85rem;
    font-weight: 600;
    color: #5f6368;
    white-space: nowrap;
  }

  .timeline-connector {
    position: absolute;
    left: calc(100% + 8px);
    top: 32px;
    bottom: -16px;
    width: 2px;
    background: linear-gradient(to bottom, #1a73e8 0%, #e8e8e8 100%);
  }

  .timeline-card {
    flex: 1;
    background: #f8f9fa;
    border-radius: 12px;
    border-left: 4px solid #1a73e8;
    padding: 16px;
    margin-bottom: 16px;
    transition: all 0.2s ease;
  }

  .timeline-card:hover {
    background: #f0f4ff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .timeline-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .case-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .case-number {
    font-weight: 700;
    font-size: 1rem;
  }

  .timeline-card-title {
    font-size: 0.95rem;
    font-weight: 500;
    color: #202124;
    margin-bottom: 8px;
  }

  .timeline-card-meta {
    font-size: 0.8rem;
    color: #5f6368;
    margin-bottom: 12px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .timeline-card-actions {
    display: flex;
    gap: 4px;
    border-top: 1px solid #e8e8e8;
    padding-top: 12px;
    margin-top: 4px;
  }

  .timeline-card-actions .ant-btn {
    font-size: 0.8rem;
    padding: 4px 8px;
    height: auto;
  }

  /* Timeline Responsive */
  @media (max-width: 576px) {
    .date-details-modal .ant-modal-body {
      padding: 16px;
    }

    .date-details-header {
      margin-bottom: 16px;
      padding-bottom: 16px;
    }

    .timeline-time {
      width: 70px;
    }

    .time-text {
      font-size: 0.75rem;
    }

    .timeline-card {
      padding: 12px;
    }

    .case-number {
      font-size: 0.9rem;
    }

    .timeline-card-title {
      font-size: 0.85rem;
    }

    .timeline-card-meta {
      font-size: 0.75rem;
    }

    .timeline-card-actions .ant-btn {
      font-size: 0.75rem;
      padding: 2px 6px;
    }

    .timeline-connector {
      left: calc(100% + 6px);
    }
  }
`;
