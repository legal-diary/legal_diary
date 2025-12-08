'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Empty,
  message,
  Spin,
  Typography,
  Badge,
  Tooltip,
  Button,
  Modal,
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
  ExclamationCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrAfter);

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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

interface DashboardData {
  date: string;
  hearings: TodayHearing[];
  totalCount: number;
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
  case: {
    caseNumber: string;
    caseTitle: string;
    clientName: string;
  };
}

const HEARING_TYPES = [
  { value: 'ARGUMENTS', label: 'Arguments' },
  { value: 'EVIDENCE_RECORDING', label: 'Evidence Recording' },
  { value: 'FINAL_HEARING', label: 'Final Hearing' },
  { value: 'INTERIM_HEARING', label: 'Interim Hearing' },
  { value: 'JUDGMENT_DELIVERY', label: 'Judgment Delivery' },
  { value: 'PRE_HEARING', label: 'Pre-Hearing' },
  { value: 'OTHER', label: 'Other' },
];

const HEARING_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'POSTPONED', label: 'Postponed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [upcomingHearings, setUpcomingHearings] = useState<UpcomingHearing[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<UpcomingHearing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (token && user) {
      fetchAllData();
    }
  }, [token, user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTodayData(),
        fetchCases(),
        fetchUpcomingHearings(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayData = async () => {
    try {
      const response = await fetch('/api/dashboard/today', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      message.error('Failed to load today\'s schedule');
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

  const fetchUpcomingHearings = async () => {
    try {
      const response = await fetch('/api/hearings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to show only future hearings (including today) and sort by date
        const now = dayjs().startOf('day');
        const upcoming = data
          .filter((h: UpcomingHearing) => dayjs(h.hearingDate).isSameOrAfter(now))
          .sort((a: UpcomingHearing, b: UpcomingHearing) =>
            dayjs(a.hearingDate).diff(dayjs(b.hearingDate))
          )
          .slice(0, 10);
        setUpcomingHearings(upcoming);
      }
    } catch (error) {
      console.error('Failed to load hearings');
    }
  };

  const handleAddHearing = () => {
    setEditingHearing(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditHearing = (hearing: UpcomingHearing) => {
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
  };

  const handleDeleteHearing = async (hearingId: string) => {
    try {
      const response = await fetch(`/api/hearings/${hearingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        message.success('Hearing deleted successfully');
        fetchAllData();
      } else {
        message.error('Failed to delete hearing');
      }
    } catch (error) {
      message.error('Failed to delete hearing');
    }
  };

  const handleSubmit = async (values: any) => {
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

      const url = editingHearing
        ? `/api/hearings/${editingHearing.id}`
        : '/api/hearings';
      const method = editingHearing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success(editingHearing ? 'Hearing updated successfully' : 'Hearing added successfully');
        setIsModalOpen(false);
        form.resetFields();
        fetchAllData();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to save hearing');
      }
    } catch (error) {
      message.error('Failed to save hearing');
    } finally {
      setSubmitting(false);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: { [key: string]: string } = {
      ACTIVE: 'processing',
      PENDING_JUDGMENT: 'warning',
      CONCLUDED: 'success',
      APPEAL: 'error',
      DISMISSED: 'default',
    };
    return colors[stage] || 'default';
  };

  const getStageLabel = (stage: string) => {
    const labels: { [key: string]: string } = {
      ACTIVE: 'Active',
      PENDING_JUDGMENT: 'Pending Judgment',
      CONCLUDED: 'Concluded',
      APPEAL: 'Appeal',
      DISMISSED: 'Dismissed',
    };
    return labels[stage] || stage;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      SCHEDULED: 'blue',
      POSTPONED: 'orange',
      COMPLETED: 'green',
      CANCELLED: 'red',
    };
    return colors[status] || 'default';
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return dayjs(date).format('DD/MM/YYYY');
  };

  const todayColumns = [
    {
      title: 'Previous Date',
      dataIndex: 'previousDate',
      key: 'previousDate',
      width: 120,
      render: (date: string | null) => (
        <Text type={date ? 'secondary' : undefined}>
          {formatDate(date)}
        </Text>
      ),
    },
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      width: 150,
      render: (text: string, record: TodayHearing) => (
        <Link href={`/cases/${record.caseId}`} style={{ color: '#1890ff', fontWeight: 500 }}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Party Name',
      dataIndex: 'partyName',
      key: 'partyName',
      width: 180,
      render: (text: string, record: TodayHearing) => (
        <Tooltip title={record.caseTitle}>
          <Text strong>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Position / Stage',
      dataIndex: 'stage',
      key: 'stage',
      width: 150,
      render: (stage: string, record: TodayHearing) => (
        <div>
          <Badge status={getStageColor(stage) as any} text={getStageLabel(stage)} />
          {record.hearingType && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.hearingType.replace(/_/g, ' ')}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Next Date',
      dataIndex: 'nextDate',
      key: 'nextDate',
      width: 120,
      render: (date: string | null) => (
        <Text type={date ? undefined : 'secondary'} style={{ color: date ? '#52c41a' : undefined }}>
          {date ? formatDate(date) : 'To be fixed'}
        </Text>
      ),
    },
    {
      title: 'Court',
      dataIndex: 'courtName',
      key: 'courtName',
      width: 150,
      render: (court: string | null, record: TodayHearing) => (
        <div>
          <Text>{court || '-'}</Text>
          {record.courtRoom && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Room: {record.courtRoom}
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
      width: 200,
      ellipsis: true,
      render: (notes: string | null) => (
        <Tooltip title={notes}>
          <Text type="secondary">{notes || '-'}</Text>
        </Tooltip>
      ),
    },
  ];

  const upcomingColumns = [
    {
      title: 'Date',
      dataIndex: 'hearingDate',
      key: 'hearingDate',
      width: 100,
      render: (date: string, record: UpcomingHearing) => {
        const isToday = dayjs(date).isSame(dayjs(), 'day');
        return (
          <div>
            <Text strong={isToday} style={isToday ? { color: '#1890ff' } : undefined}>
              {dayjs(date).format('DD/MM/YY')}
            </Text>
            {record.hearingTime && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
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
      width: 180,
      render: (_: any, record: UpcomingHearing) => (
        <div>
          <Link href={`/cases/${record.caseId}`} style={{ color: '#1890ff', fontSize: '13px' }}>
            {record.case.caseNumber}
          </Link>
          <div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.case.clientName}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'hearingType',
      key: 'hearingType',
      width: 120,
      render: (type: string) => (
        <Tag color="blue" style={{ fontSize: '11px' }}>
          {type.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ fontSize: '11px' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: UpcomingHearing) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditHearing(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this hearing?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteHearing(record.id)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const todayFormatted = dayjs().format('dddd, DD MMMM YYYY');

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Spin spinning={loading}>
          {/* Header Section with Today's Date */}
          <div style={{
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '24px 32px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <CalendarOutlined style={{ fontSize: '36px', color: '#4fd1c5' }} />
                <div>
                  <Text style={{ color: '#a0aec0', fontSize: '14px', display: 'block' }}>
                    Legal Referencer
                  </Text>
                  <Title level={2} style={{ margin: 0, color: '#fff', fontWeight: 600 }}>
                    {todayFormatted}
                  </Title>
                </div>
              </div>

              {/* Quick Stats */}
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    background: 'rgba(79, 209, 197, 0.2)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                  }}>
                    <FileTextOutlined style={{ fontSize: '24px', color: '#4fd1c5' }} />
                  </div>
                  <Text style={{ color: '#fff', fontSize: '24px', fontWeight: 600, display: 'block' }}>
                    {dashboardData?.totalCount || 0}
                  </Text>
                  <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
                    Today's Matters
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Main Table Section */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <span>Today's Schedule</span>
                {dashboardData && dashboardData.totalCount > 0 && (
                  <Tag color="blue">{dashboardData.totalCount} matter{dashboardData.totalCount > 1 ? 's' : ''}</Tag>
                )}
              </div>
            }
            extra={
              <Link href="/calendar" style={{ color: '#1890ff' }}>
                View Full Calendar
              </Link>
            }
            styles={{
              body: { padding: 0 }
            }}
          >
            {!dashboardData || dashboardData.hearings.length === 0 ? (
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
                dataSource={dashboardData.hearings}
                columns={todayColumns}
                pagination={false}
                rowKey="id"
                size="middle"
                scroll={{ x: 1000 }}
                rowClassName={(record, index) =>
                  index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
                }
              />
            )}
          </Card>

         

          {/* Hearing Management Section */}
          <Divider style={{ margin: '32px 0 24px' }} />

          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ScheduleOutlined style={{ color: '#722ed1' }} />
                <span>Manage Hearings</span>
                <Tag color="purple">{upcomingHearings.length} upcoming</Tag>
              </div>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddHearing}
              >
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
                    <Text type="secondary">Click "Add New Hearing" to schedule one</Text>
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
                scroll={{ x: 600 }}
              />
            )}
          </Card>
        </Spin>

        {/* Add/Edit Hearing Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingHearing ? <EditOutlined /> : <PlusOutlined />}
              <span>{editingHearing ? 'Edit Hearing' : 'Add New Hearing'}</span>
            </div>
          }
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
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
            <Form.Item
              name="caseId"
              label="Select Case"
              rules={[{ required: true, message: 'Please select a case' }]}
            >
              <Select
                placeholder="Select a case"
                showSearch
                optionFilterProp="children"
                disabled={!!editingHearing}
              >
                {cases.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.caseNumber} - {c.clientName} ({c.caseTitle})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="hearingDate"
                  label="Hearing Date"
                  rules={[{ required: true, message: 'Please select a date' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="hearingTime"
                  label="Hearing Time"
                >
                  <TimePicker style={{ width: '100%' }} format="HH:mm" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
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
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="Status"
                >
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

            <Form.Item
              name="courtRoom"
              label="Court Room"
            >
              <Input placeholder="e.g., Court Room 5, High Court" />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea
                rows={3}
                placeholder="Any notes or preparation reminders for this hearing..."
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setIsModalOpen(false);
                  form.resetFields();
                }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  {editingHearing ? 'Update Hearing' : 'Add Hearing'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <style jsx global>{`
          .table-row-light {
            background-color: #fafafa;
          }
          .table-row-dark {
            background-color: #ffffff;
          }
          .table-row-light:hover td,
          .table-row-dark:hover td {
            background-color: #e6f7ff !important;
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
