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
    return (
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {listData.map((item) => (
          <li key={item.hearingId} style={{ fontSize: '12px', color: '#f57800' }}>
            <CalendarOutlined style={{ marginRight: '4px' }} />
            {item.content}
          </li>
        ))}
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
        fetchHearings();
      } else {
        message.error('Failed to schedule hearing');
      }
    } catch (error) {
      message.error('Error scheduling hearing');
    }
  };

  const selectedDateHearings = getHearingsForDate(selectedDate);

  return (
    <div>
      <Card title="Hearing Calendar" style={{ marginBottom: '20px' }}>
        <Calendar
          fullscreen
          dateCellRender={dateCellRender}
          onChange={(date) => setSelectedDate(date)}
        />
      </Card>

      <Card
        title={`Hearings for ${selectedDate.format('YYYY-MM-DD')}`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
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
                  avatar={<FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                  title={`${hearing.case.caseNumber} - ${hearing.case.caseTitle}`}
                  description={
                    <div>
                      <p>Client: {hearing.case.clientName}</p>
                      <p>
                        Type:{' '}
                        <Tag color={getHearingTypeColor(hearing.hearingType)}>
                          {hearing.hearingType.replace(/_/g, ' ')}
                        </Tag>
                      </p>
                      {hearing.hearingTime && <p>Time: {hearing.hearingTime}</p>}
                      {hearing.courtRoom && <p>Court Room: {hearing.courtRoom}</p>}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

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
    </div>
  );
}
