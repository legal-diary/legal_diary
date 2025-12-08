'use client';

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Calendar, Card, Tag, List, Empty, Form, Input, DatePicker, Select, Button, message } from 'antd';
import { CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/context/AuthContext';
import { CalendarSkeleton, shimmerStyles, SectionLoader } from '@/components/Skeletons';

// Lazy load Modal
const Modal = lazy(() => import('antd').then(mod => ({ default: mod.Modal })));

// Types
interface Hearing {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingTime?: string;
  hearingType: string;
  courtRoom?: string;
  case: {
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

const HEARING_TYPES = [
  { value: 'ARGUMENTS', label: 'Arguments' },
  { value: 'EVIDENCE_RECORDING', label: 'Evidence Recording' },
  { value: 'FINAL_HEARING', label: 'Final Hearing' },
  { value: 'INTERIM_HEARING', label: 'Interim Hearing' },
  { value: 'JUDGMENT_DELIVERY', label: 'Judgment Delivery' },
  { value: 'PRE_HEARING', label: 'Pre Hearing' },
  { value: 'OTHER', label: 'Other' },
] as const;

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

  // Optimized single API call to fetch both hearings and cases
  const fetchCalendarData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Parallel fetch for hearings and cases
      const [hearingsRes, casesRes] = await Promise.all([
        fetch('/api/hearings?calendar=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/cases?minimal=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (hearingsRes.ok) {
        const hearingsData = await hearingsRes.json();
        setHearings(hearingsData);
      }

      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setCases(casesData);
      }
    } catch {
      message.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCalendarData();
    }
  }, [token, fetchCalendarData]);

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

  // Memoized date cell renderer
  const dateCellRender = useCallback(
    (date: dayjs.Dayjs) => {
      const dayHearings = getHearingsForDate(date);
      if (dayHearings.length === 0) return null;

      return (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {dayHearings.slice(0, 3).map((hearing) => (
            <li
              key={hearing.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedHearing(hearing);
                setHearingDetailsModalOpen(true);
              }}
              style={{
                fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)',
                color: '#f57800',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '2px',
                backgroundColor: 'rgba(245, 120, 0, 0.1)',
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <CalendarOutlined style={{ marginRight: '4px', fontSize: '10px' }} />
              {hearing.case.caseNumber}
            </li>
          ))}
          {dayHearings.length > 3 && (
            <li style={{ fontSize: '0.7rem', color: '#999', paddingLeft: '4px' }}>
              +{dayHearings.length - 3} more
            </li>
          )}
        </ul>
      );
    },
    [getHearingsForDate]
  );

  // Handle form submission
  const onFinish = useCallback(
    async (values: any) => {
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
          message.success('Hearing scheduled successfully');
          setModalOpen(false);
          form.resetFields();
          fetchCalendarData();
        } else {
          message.error('Failed to schedule hearing');
        }
      } catch {
        message.error('Error scheduling hearing');
      }
    },
    [token, selectedCaseId, form, fetchCalendarData]
  );

  // Handle modal open with pre-filled date
  const openScheduleModal = useCallback(
    (date?: dayjs.Dayjs) => {
      setModalOpen(true);
      if (date) {
        form.setFieldsValue({ hearingDate: date });
      }
    },
    [form]
  );

  // Handle date selection
  const handleDateChange = useCallback(
    (date: dayjs.Dayjs) => {
      setSelectedDate(date);
      openScheduleModal(date);
    },
    [openScheduleModal]
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

  return (
    <div>
      <style>{shimmerStyles}</style>
      <SectionLoader loading={loading} skeleton={<CalendarSkeleton />}>
        <Card title="Hearing Calendar" style={{ marginBottom: '16px' }} className="calendar-card">
          <div className="calendar-container">
            <Calendar cellRender={dateCellRender} onChange={handleDateChange} />
          </div>
        </Card>

        <Card
          title={`Hearings for ${selectedDate.format('YYYY-MM-DD')}`}
          style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}
          extra={
            <Button type="primary" onClick={() => openScheduleModal(selectedDate)}>
              Schedule Hearing
            </Button>
          }
        >
          {selectedDateHearings.length === 0 ? (
            <Empty description="No hearings scheduled" />
          ) : (
            <List
              dataSource={selectedDateHearings}
              renderItem={(hearing) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)', color: '#1890ff' }} />}
                    title={
                      <span style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                        {`${hearing.case.caseNumber} - ${hearing.case.caseTitle}`}
                      </span>
                    }
                    description={
                      <div style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.95rem)' }}>
                        <p style={{ marginBottom: '4px' }}>Client: {hearing.case.clientName}</p>
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
                  {selectedHearing.case.caseNumber}
                </h3>
                <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', fontWeight: 'bold', marginBottom: '8px' }}>
                  {selectedHearing.case.caseTitle}
                </p>
                <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                  <strong>Client:</strong> {selectedHearing.case.clientName}
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
            </div>
          </Modal>
        </Suspense>
      )}

      {/* Schedule Hearing Modal */}
      {modalOpen && (
        <Suspense fallback={null}>
          <Modal
            title="Schedule Hearing"
            open={modalOpen}
            onCancel={() => setModalOpen(false)}
            footer={null}
            destroyOnClose
            width="min(520px, 95vw)"
            centered
          >
            <Form form={form} onFinish={onFinish} layout="vertical">
              <Form.Item
                name="caseId"
                label="Select Case"
                rules={[{ required: true, message: 'Please select a case' }]}
              >
                <Select placeholder="Select a case" onChange={(value) => setSelectedCaseId(value)}>
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

              <Button type="primary" htmlType="submit" block>
                Schedule Hearing
              </Button>
            </Form>
          </Modal>
        </Suspense>
      )}

      <style>{`
        .calendar-card {
          width: 100%;
        }

        .calendar-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* Calendar responsive styles */
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

          .calendar-container ul li {
            font-size: 0.6rem !important;
            padding: 1px 2px !important;
            margin-bottom: 1px !important;
          }

          .ant-picker-calendar-date-value {
            font-size: 0.8rem !important;
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

          .calendar-container ul li {
            font-size: 0.55rem !important;
            padding: 0 2px !important;
          }

          .ant-picker-content th {
            font-size: 0.65rem !important;
            padding: 4px 0 !important;
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
      `}</style>
    </div>
  );
}
