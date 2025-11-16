'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Row,
  Col,
  message,
  Spin,
} from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import dayjs from 'dayjs';

interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  status: string;
  priority: string;
  courtName?: string;
  createdAt: string;
  hearings: any[];
}

export default function CasesPage() {
  const { token } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    if (token) {
      fetchCases();
    }
  }, [token]);

  useEffect(() => {
    filterCases();
  }, [cases, searchText, statusFilter, priorityFilter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cases', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      } else {
        message.error('Failed to load cases');
      }
    } catch (error) {
      message.error('Error loading cases');
    } finally {
      setLoading(false);
    }
  };

  const filterCases = () => {
    let filtered = cases;

    if (searchText) {
      filtered = filtered.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(searchText.toLowerCase()) ||
          c.caseTitle.toLowerCase().includes(searchText.toLowerCase()) ||
          c.clientName.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter((c) => c.priority === priorityFilter);
    }

    setFilteredCases(filtered);
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

  const columns = [
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      render: (text: string, record: Case) => (
        <Link href={`/cases/${record.id}`} style={{ color: '#1890ff', fontWeight: 'bold' }}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Case Title',
      dataIndex: 'caseTitle',
      key: 'caseTitle',
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Court',
      dataIndex: 'courtName',
      key: 'courtName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>{priority}</Tag>
      ),
    },
    {
      title: 'Hearings',
      dataIndex: 'hearings',
      key: 'hearings',
      render: (hearings: any[]) => (
        <span>{hearings ? hearings.length : 0}</span>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Case) => (
        <Space>
          <Link href={`/cases/${record.id}`}>
            <Button type="link" size="small">
              View
            </Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Spin spinning={loading}>
        <Card
          title="Cases"
          extra={
            <Link href="/cases/create">
              <Button type="primary" icon={<PlusOutlined />}>
                New Case
              </Button>
            </Link>
          }
        >
          <Row gutter={[16, 16]} style={{ marginBottom: '2vh' }}>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Search case number, title, or client..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder="Filter by status"
                allowClear
                value={statusFilter || undefined}
                onChange={(value) => setStatusFilter(value || '')}
              >
                <Select.Option value="ACTIVE">Active</Select.Option>
                <Select.Option value="PENDING_JUDGMENT">Pending Judgment</Select.Option>
                <Select.Option value="CONCLUDED">Concluded</Select.Option>
                <Select.Option value="APPEAL">Appeal</Select.Option>
                <Select.Option value="DISMISSED">Dismissed</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder="Filter by priority"
                allowClear
                value={priorityFilter || undefined}
                onChange={(value) => setPriorityFilter(value || '')}
              >
                <Select.Option value="LOW">Low</Select.Option>
                <Select.Option value="MEDIUM">Medium</Select.Option>
                <Select.Option value="HIGH">High</Select.Option>
                <Select.Option value="URGENT">Urgent</Select.Option>
              </Select>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={filteredCases}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
        </Spin>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
