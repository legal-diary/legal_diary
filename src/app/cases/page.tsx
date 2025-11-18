'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Tag,
  Button,
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

  const renderCaseCard = (caseData: Case) => (
    <Card
      key={caseData.id}
      hoverable
      style={{
        height: '100%',
        borderRadius: '0.8rem',
        border: '1px solid #e8e8e8',
        boxShadow: 'none',
        transition: 'all 0.3s ease',
        background: '#ffffff',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = '#d0d0d0';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e8e8e8';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <Link href={`/cases/${caseData.id}`} style={{ textDecoration: 'none' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#000000', fontWeight: '700', cursor: 'pointer' }}>
              {caseData.caseNumber}
            </h3>
          </Link>
          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
            {caseData.caseTitle}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <Tag color={getStatusColor(caseData.status)}>{caseData.status.replace(/_/g, ' ')}</Tag>
          <Tag color={getPriorityColor(caseData.priority)}>{caseData.priority}</Tag>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Client:</strong> {caseData.clientName}
        </div>
        {caseData.courtName && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Court:</strong> {caseData.courtName}
          </div>
        )}
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Hearings:</strong> {caseData.hearings ? caseData.hearings.length : 0}
        </div>
        <div>
          <strong>Created:</strong> {dayjs(caseData.createdAt).format('YYYY-MM-DD')}
        </div>
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <Link href={`/cases/${caseData.id}`}>
          <Button type="primary" block size="small">
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );

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
          <div style={{ marginBottom: '2.5vh', paddingBottom: '1.5vh', borderBottom: '1px solid var(--border-color)' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={24} md={12} lg={8}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#000', marginBottom: '0.5rem' }}>
                    Search
                  </label>
                  <Input
                    placeholder="Case number, title, or client..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={12} lg={8}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#000', marginBottom: '0.5rem' }}>
                    Status
                  </label>
                  <Select
                    placeholder="All statuses"
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
                </div>
              </Col>
              <Col xs={24} sm={12} md={12} lg={8}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#000', marginBottom: '0.5rem' }}>
                    Priority
                  </label>
                  <Select
                    placeholder="All priorities"
                    allowClear
                    value={priorityFilter || undefined}
                    onChange={(value) => setPriorityFilter(value || '')}
                  >
                    <Select.Option value="LOW">Low</Select.Option>
                    <Select.Option value="MEDIUM">Medium</Select.Option>
                    <Select.Option value="HIGH">High</Select.Option>
                    <Select.Option value="URGENT">Urgent</Select.Option>
                  </Select>
                </div>
              </Col>
            </Row>
          </div>

          {filteredCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
              <p>No cases found. {searchText || statusFilter || priorityFilter ? 'Try adjusting your filters.' : 'Create a new case to get started.'}</p>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {filteredCases.map((caseData) => (
                <Col key={caseData.id} xs={24} sm={12} md={8} lg={6}>
                  {renderCaseCard(caseData)}
                </Col>
              ))}
            </Row>
          )}
        </Card>
        </Spin>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
