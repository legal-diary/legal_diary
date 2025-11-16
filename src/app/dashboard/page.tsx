'use client';

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Empty, message, Spin } from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import dayjs from 'dayjs';

interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  status: string;
  priority: string;
  hearings: any[];
  createdAt: string;
}


export default function DashboardPage() {
  const { token, user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [upcomingHearings, setUpcomingHearings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && user) {
      fetchData();
    }
  }, [token, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch cases
      const casesResponse = await fetch('/api/cases', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (casesResponse.ok) {
        const casesData = await casesResponse.json();
        setCases(casesData);

        // Extract upcoming hearings
        const now = dayjs();
        const upcoming = casesData
          .flatMap((c: Case) =>
            c.hearings.map((h: any) => ({
              ...h,
              caseNumber: c.caseNumber,
              caseTitle: c.caseTitle,
            }))
          )
          .filter((h: any) => dayjs(h.hearingDate).isAfter(now))
          .sort((a: any, b: any) =>
            dayjs(a.hearingDate).diff(dayjs(b.hearingDate))
          )
          .slice(0, 5);

        setUpcomingHearings(upcoming);
      }
    } catch (error) {
      message.error('Failed to load dashboard data');
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

  const activeCases = cases.filter((c) => c.status === 'ACTIVE').length;
  const concludedCases = cases.filter((c) => c.status === 'CONCLUDED').length;

  const hearingColumns = [
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      render: (text: string) => (
        <Link href={`/cases/${text}`} style={{ color: '#1890ff' }}>
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
      title: 'Hearing Date',
      dataIndex: 'hearingDate',
      key: 'hearingDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Type',
      dataIndex: 'hearingType',
      key: 'hearingType',
      render: (type: string) => (
        <Tag color="blue">{type.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Court Room',
      dataIndex: 'courtRoom',
      key: 'courtRoom',
    },
  ];

  const caseColumns = [
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      render: (text: string) => (
        <Link href={`/cases/${text}`} style={{ color: '#1890ff' }}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'caseTitle',
      key: 'caseTitle',
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
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
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Spin spinning={loading}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px' }}>Dashboard</h2>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Cases"
                  value={cases.length}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Active Cases"
                  value={activeCases}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Concluded Cases"
                  value={concludedCases}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Upcoming Hearings"
                  value={upcomingHearings.length}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#fa541c' }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title="Upcoming Hearings"
              extra={
                <Link href="/calendar" style={{ color: '#1890ff' }}>
                  View Calendar
                </Link>
              }
            >
              {upcomingHearings.length === 0 ? (
                <Empty description="No upcoming hearings" />
              ) : (
                <Table
                  dataSource={upcomingHearings}
                  columns={hearingColumns}
                  pagination={false}
                  size="small"
                  rowKey="id"
                />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="Recent Cases"
              extra={
                <Link href="/cases" style={{ color: '#1890ff' }}>
                  View All
                </Link>
              }
            >
              {cases.length === 0 ? (
                <Empty description="No cases yet" />
              ) : (
                <Table
                  dataSource={cases.slice(0, 5)}
                  columns={caseColumns}
                  pagination={false}
                  size="small"
                  rowKey="id"
                />
              )}
            </Card>
          </Col>
        </Row>
        </Spin>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
