'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Table,
  Tabs,
  Empty,
  message,
  Spin,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
} from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import Link from 'next/link';

interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  status: string;
  priority: string;
  description?: string;
  courtName?: string;
  judgeAssigned?: string;
  opponents?: string;
  createdAt: string;
  hearings: any[];
  fileDocuments: any[];
  aiSummary?: any;
}

export default function CaseDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [hearingModalOpen, setHearingModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (token && caseId) {
      fetchCaseDetail();
    }
  }, [token, caseId]);

  const fetchCaseDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCaseData(data);
      } else if (response.status === 404) {
        message.error('Case not found');
      }
    } catch (error) {
      message.error('Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      ACTIVE: 'blue',
      PENDING_JUDGMENT: 'orange',
      CONCLUDED: 'green',
      APPEAL: 'red',
      DISMISSED: 'error',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      LOW: 'green',
      MEDIUM: 'blue',
      HIGH: 'orange',
      URGENT: 'red',
    };
    return colors[priority] || 'default';
  };

  const hearingColumns = [
    {
      title: 'Date',
      dataIndex: 'hearingDate',
      key: 'hearingDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Type',
      dataIndex: 'hearingType',
      key: 'hearingType',
      render: (type: string) => <Tag color="blue">{type.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Court Room',
      dataIndex: 'courtRoom',
      key: 'courtRoom',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color="green">{status}</Tag>,
    },
  ];

  const fileColumns = [
    {
      title: 'File Name',
      dataIndex: 'fileName',
      key: 'fileName',
    },
    {
      title: 'Type',
      dataIndex: 'fileType',
      key: 'fileType',
    },
    {
      title: 'Size',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <a href={record.fileUrl} target="_blank" rel="noopener noreferrer">
          <Button icon={<DownloadOutlined />} size="small" type="link">
            Download
          </Button>
        </a>
      ),
    },
  ];

  const handleFileUpload = async (info: any) => {
    const fileList = info.fileList.map((file: any) => file.originFileObj);
    setUploadedFiles(fileList);
  };

  const handleHearingSubmit = async (values: any) => {
    try {
      const response = await fetch('/api/hearings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caseId,
          hearingDate: values.hearingDate.toISOString(),
          hearingTime: values.hearingTime,
          hearingType: values.hearingType,
          courtRoom: values.courtRoom,
        }),
      });

      if (response.ok) {
        message.success('Hearing scheduled');
        setHearingModalOpen(false);
        form.resetFields();
        fetchCaseDetail();
      }
    } catch (error) {
      message.error('Failed to schedule hearing');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Spin />
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout>
        <Empty description="Case not found" />
      </DashboardLayout>
    );
  }

  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Card>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Case Number">
              {caseData.caseNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(caseData.status)}>
                {caseData.status.replace(/_/g, ' ')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Priority">
              <Tag color={getPriorityColor(caseData.priority)}>
                {caseData.priority}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Client Name">
              {caseData.clientName}
            </Descriptions.Item>
            <Descriptions.Item label="Client Email">
              {caseData.clientEmail || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Client Phone">
              {caseData.clientPhone || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Court Name">
              {caseData.courtName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Judge Assigned">
              {caseData.judgeAssigned || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Opponents" span={2}>
              {caseData.opponents || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Created Date" span={2}>
              {dayjs(caseData.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>

          {caseData.description && (
            <Card title="Case Description" style={{ marginTop: '2vh' }}>
              <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', lineHeight: '1.6vh' }}>{caseData.description}</p>
            </Card>
          )}

          {caseData.aiSummary && (
            <Card title="AI Summary & Insights" style={{ marginTop: '2vh' }}>
              <Card.Meta
                title="Summary"
                description={caseData.aiSummary.summary}
                style={{ marginBottom: '1.5vh' }}
              />
              <Card.Meta
                title="Key Points"
                description={
                  <ul>
                    {JSON.parse(caseData.aiSummary.keyPoints).map(
                      (point: string, index: number) => (
                        <li key={index} style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', marginBottom: '0.5vh' }}>{point}</li>
                      )
                    )}
                  </ul>
                }
                style={{ marginBottom: '1.5vh' }}
              />
              <Card.Meta
                title="Insights & Recommendations"
                description={caseData.aiSummary.insights}
              />
            </Card>
          )}
        </Card>
      ),
    },
    {
      key: 'hearings',
      label: 'Hearings',
      children: (
        <Card
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setHearingModalOpen(true)}
            >
              Schedule Hearing
            </Button>
          }
        >
          {caseData.hearings && caseData.hearings.length > 0 ? (
            <Table
              columns={hearingColumns}
              dataSource={caseData.hearings}
              rowKey="id"
              pagination={false}
            />
          ) : (
            <Empty description="No hearings scheduled" />
          )}
        </Card>
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      children: (
        <Card
          extra={
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalOpen(true)}
            >
              Upload Document
            </Button>
          }
        >
          {caseData.fileDocuments && caseData.fileDocuments.length > 0 ? (
            <Table
              columns={fileColumns}
              dataSource={caseData.fileDocuments}
              rowKey="id"
              pagination={false}
            />
          ) : (
            <Empty description="No documents uploaded" />
          )}
        </Card>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Row gutter={[16, 16]} style={{ marginBottom: '2vh' }}>
        <Col xs={24}>
          <Card>
            <Row justify="space-between" align="middle">
              <Col>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>{caseData.caseTitle}</h2>
                <p style={{ margin: '0.5vh 0 0 0', color: '#666', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>
                  {caseData.caseNumber}
                </p>
              </Col>
              <Col>
                <Space>
                  <Link href="/calendar">
                    <Button icon={<CalendarOutlined />}>Calendar</Button>
                  </Link>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Tabs items={items} />

      <Modal
        title="Upload Document"
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
      >
        <Upload
          onChange={handleFileUpload}
          multiple
          maxCount={5}
          beforeUpload={() => false}
        >
          <Button icon={<UploadOutlined />}>
            Click to upload files
          </Button>
        </Upload>
      </Modal>

      <Modal
        title="Schedule Hearing"
        open={hearingModalOpen}
        onCancel={() => setHearingModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleHearingSubmit} layout="vertical">
          <Form.Item
            name="hearingDate"
            label="Hearing Date"
            rules={[{ required: true }]}
          >
            <DatePicker />
          </Form.Item>
          <Form.Item name="hearingTime" label="Time">
            <Input type="time" />
          </Form.Item>
          <Form.Item
            name="hearingType"
            label="Hearing Type"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="ARGUMENTS">Arguments</Select.Option>
              <Select.Option value="EVIDENCE_RECORDING">Evidence Recording</Select.Option>
              <Select.Option value="FINAL_HEARING">Final Hearing</Select.Option>
              <Select.Option value="INTERIM_HEARING">Interim Hearing</Select.Option>
              <Select.Option value="JUDGMENT_DELIVERY">Judgment Delivery</Select.Option>
              <Select.Option value="PRE_HEARING">Pre Hearing</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="courtRoom" label="Court Room">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Schedule
          </Button>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
