'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Card, Tag, List, Empty, Modal, Form, Input, DatePicker, Select, Button, message } from 'antd';
import { CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/context/AuthContext';

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

export default function HearingCalendar() {
  const { token } = useAuth();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [hearingDetailsModalOpen, setHearingDetailsModalOpen] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);

  // Fetch hearings
  useEffect(() => {
    if (token) {
      fetchHearings();
      fetchCases();
    }
  }, [token]);

  const fetchHearings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hearings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHearings(data);
      }
    } catch (error) {
      message.error('Failed to load hearings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await fetch('/api/cases', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      }
    } catch (error) {
      console.error('Failed to load cases');
    }
  };

  // Get hearings for selected date
  const getHearingsForDate = (date: dayjs.Dayjs) => {
    return hearings.filter((h) =>
      dayjs(h.hearingDate).isSame(date, 'day')
    );
  };

  // Get hearing status color
  const getHearingTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      ARGUMENTS: 'blue',
      EVIDENCE_RECORDING: 'orange',
      FINAL_HEARING: 'red',
      INTERIM_HEARING: 'green',
      JUDGMENT_DELIVERY: 'purple',
      PRE_HEARING: 'cyan',
    };
    return colors[type] || 'default';
  };

  // Cell render for calendar
  const getListData = (date: dayjs.Dayjs) => {
    const dayHearings = getHearingsForDate(date);
    return dayHearings.map((h) => ({
      type: 'warning',
      content: `${h.case.caseNumber} - ${h.case.clientName}`,
      hearingId: h.id,
    }));
  };

  const dateCellRender = (date: dayjs.Dayjs) => {
    const listData = getListData(date);
    const dayHearings = getHearingsForDate(date);

    return (
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {listData.map((item) => {
          const hearing = dayHearings.find((h) => h.id === item.hearingId);
          return (
            <li
              key={item.hearingId}
              onClick={() => {
                setSelectedHearing(hearing || null);
                setHearingDetailsModalOpen(true);
              }}
              style={{
                fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
                color: '#f57800',
                cursor: 'pointer',
                padding: '0.4vh 0.5vw',
                borderRadius: '0.3vh',
                backgroundColor: 'rgba(245, 120, 0, 0.1)',
                marginBottom: '0.3vh',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(245, 120, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(245, 120, 0, 0.1)';
              }}
            >
              <CalendarOutlined style={{ marginRight: '0.5vw' }} />
              {item.content}
            </li>
          );
        })}
      </ul>
    );
  };

  // Handle new hearing submission
  const onFinish = async (values: any) => {
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
        await fetchHearings();
      } else {
        message.error('Failed to schedule hearing');
      }
    } catch (error) {
      message.error('Error scheduling hearing');
    }
  };

  // Handle opening modal with pre-filled date
  const openScheduleHearingModal = (date?: dayjs.Dayjs) => {
    setModalOpen(true);
    if (date) {
      // Pre-fill the date in the form
      form.setFieldsValue({
        hearingDate: date,
      });
    }
  };

  const selectedDateHearings = getHearingsForDate(selectedDate);

  return (
    <div>
      <Card title="Hearing Calendar" style={{ marginBottom: '2vh' }} className="calendar-card">
        <div className="calendar-container">
          <Calendar
            dateCellRender={dateCellRender}
            onChange={(date) => {
              setSelectedDate(date);
              // Open schedule hearing modal with pre-filled date
              openScheduleHearingModal(date);
            }}
          />
        </div>
      </Card>

      <Card
        title={`Hearings for ${selectedDate.format('YYYY-MM-DD')}`}
        style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}
        extra={
          <Button type="primary" onClick={() => openScheduleHearingModal(selectedDate)}>
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
                  title={<span style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>{`${hearing.case.caseNumber} - ${hearing.case.caseTitle}`}</span>}
                  description={
                    <div style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.95rem)' }}>
                      <p style={{ marginBottom: '0.5vh' }}>Client: {hearing.case.clientName}</p>
                      <p style={{ marginBottom: '0.5vh' }}>
                        Type:{' '}
                        <Tag color={getHearingTypeColor(hearing.hearingType)}>
                          {hearing.hearingType.replace(/_/g, ' ')}
                        </Tag>
                      </p>
                      {hearing.hearingTime && <p style={{ marginBottom: '0.5vh' }}>Time: {hearing.hearingTime}</p>}
                      {hearing.courtRoom && <p style={{ marginBottom: '0.5vh' }}>Court Room: {hearing.courtRoom}</p>}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="Hearing Details"
        open={hearingDetailsModalOpen}
        onCancel={() => {
          setHearingDetailsModalOpen(false);
          setSelectedHearing(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setHearingDetailsModalOpen(false);
            setSelectedHearing(null);
          }}>
            Close
          </Button>,
        ]}
      >
        {selectedHearing && (
          <div style={{ marginTop: '2vh' }}>
            <div style={{ marginBottom: '2vh', paddingBottom: '2vh', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ marginBottom: '1vh', color: '#1890ff', fontSize: 'clamp(1rem, 3vw, 1.3rem)' }}>
                {selectedHearing.case.caseNumber}
              </h3>
              <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', fontWeight: 'bold', marginBottom: '0.8vh' }}>
                {selectedHearing.case.caseTitle}
              </p>
              <p style={{ color: '#666', marginBottom: '0.8vh', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                <strong>Client:</strong> {selectedHearing.case.clientName}
              </p>
            </div>

            <div style={{ marginBottom: '2vh' }}>
              <p style={{ marginBottom: '1.2vh', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                <strong>Hearing Date:</strong>{' '}
                <span style={{ fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)', color: '#1890ff', fontWeight: 'bold' }}>
                  {dayjs(selectedHearing.hearingDate).format('MMMM D, YYYY')}
                </span>
              </p>

              {selectedHearing.hearingTime && (
                <p style={{ marginBottom: '1.2vh', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                  <strong>Hearing Time:</strong> {selectedHearing.hearingTime}
                </p>
              )}

              <p style={{ marginBottom: '1.2vh', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                <strong>Hearing Type:</strong>{' '}
                <Tag color={getHearingTypeColor(selectedHearing.hearingType)}>
                  {selectedHearing.hearingType.replace(/_/g, ' ')}
                </Tag>
              </p>

              {selectedHearing.courtRoom && (
                <p style={{ marginBottom: '1.2vh', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)' }}>
                  <strong>Court Room:</strong> {selectedHearing.courtRoom}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Schedule Hearing"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            name="caseId"
            label="Select Case"
            rules={[{ required: true, message: 'Please select a case' }]}
          >
            <Select
              placeholder="Select a case"
              onChange={(value) => setSelectedCaseId(value)}
            >
              {cases.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.caseTitle}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="hearingDate"
            label="Hearing Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker />
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
              <Select.Option value="ARGUMENTS">Arguments</Select.Option>
              <Select.Option value="EVIDENCE_RECORDING">Evidence Recording</Select.Option>
              <Select.Option value="FINAL_HEARING">Final Hearing</Select.Option>
              <Select.Option value="INTERIM_HEARING">Interim Hearing</Select.Option>
              <Select.Option value="JUDGMENT_DELIVERY">Judgment Delivery</Select.Option>
              <Select.Option value="PRE_HEARING">Pre Hearing</Select.Option>
              <Select.Option value="OTHER">Other</Select.Option>
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

      <style>{`
        .calendar-card {
          width: 100%;
        }

        .calendar-container {
          width: 100%;
          overflow-x: auto;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .calendar-card {
            margin-bottom: 1.5vh !important;
          }

          .ant-picker-calendar {
            font-size: 0.85rem;
          }

          .ant-picker-calendar-header {
            padding: 0.8rem 0.4rem !important;
          }

          .ant-picker-calendar-date {
            padding: 0.4rem !important;
            min-height: auto !important;
          }

          .ant-picker-cell {
            padding: 0.4rem !important;
          }

          /* Reduce calendar cell height on mobile */
          .ant-picker-calendar-date-value {
            font-size: 0.8rem;
          }

          .ant-picker-cell-in-view.ant-picker-cell {
            height: auto;
            min-height: 60px;
          }

          /* Make calendar events smaller on mobile */
          .calendar-container ul li {
            font-size: 0.7rem !important;
            padding: 0.2rem 0.3rem !important;
            margin-bottom: 0.2rem !important;
          }
        }

        @media (max-width: 480px) {
          .ant-picker-calendar-date {
            padding: 0.2rem !important;
          }

          .ant-picker-cell {
            padding: 0.2rem !important;
          }

          .ant-picker-cell-in-view.ant-picker-cell {
            min-height: 50px;
          }

          .calendar-container ul li {
            font-size: 0.65rem !important;
            padding: 0.1rem 0.2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
