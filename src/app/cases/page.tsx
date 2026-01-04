'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  Tag,
  Button,
  Input,
  Select,
  Row,
  Col,
  message,
} from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { buildAuthHeaders } from '@/lib/authHeaders';
import dayjs from 'dayjs';
import { CasesPageSkeleton, SectionLoader, shimmerStyles } from '@/components/Skeletons';

// Types
interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  status: string;
  priority: string;
  courtName?: string;
  createdAt: string;
  _count?: {
    Hearing: number;
  };
}

// Static color maps - moved outside component
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'blue',
  PENDING_JUDGMENT: 'orange',
  CONCLUDED: 'green',
  APPEAL: 'red',
  DISMISSED: 'default',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'green',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

// Memoized Case Card component
const CaseCard = React.memo<{ caseData: Case }>(({ caseData }) => (
  <Card
    hoverable
    className="case-card"
    style={{
      height: '100%',
      borderRadius: 'clamp(0.5rem, 2vw, 0.8rem)',
      border: '1px solid #e8e8e8',
      boxShadow: 'none',
      transition: 'all 0.3s ease',
      background: '#ffffff',
    }}
    styles={{
      body: { padding: 'clamp(10px, 3vw, 16px)' },
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'clamp(0.5rem, 2vw, 1rem)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/cases/${caseData.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ margin: '0 0 0.3rem 0', color: '#000000', fontWeight: '700', cursor: 'pointer', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>
            {caseData.caseNumber}
          </h3>
        </Link>
        <p style={{ margin: '0.2rem 0', color: '#666', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {caseData.caseTitle}
        </p>
      </div>
    </div>

    <div style={{ marginBottom: 'clamp(0.5rem, 2vw, 1rem)' }}>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <Tag color={STATUS_COLORS[caseData.status] || 'default'} style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.8rem)', padding: '1px 6px' }}>
          {caseData.status.replace(/_/g, ' ')}
        </Tag>
        <Tag color={PRIORITY_COLORS[caseData.priority] || 'default'} style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.8rem)', padding: '1px 6px' }}>
          {caseData.priority}
        </Tag>
      </div>
    </div>

    <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', color: '#666', marginBottom: '0.5rem' }}>
      <div style={{ marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <strong>Client:</strong> {caseData.clientName}
      </div>
      {caseData.courtName && (
        <div style={{ marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hide-xs">
          <strong>Court:</strong> {caseData.courtName}
        </div>
      )}
      <div style={{ marginBottom: '0.3rem' }}>
        <strong>Hearings:</strong> {caseData._count?.Hearing ?? 0}
      </div>
      <div className="hide-xs">
        <strong>Created:</strong> {dayjs(caseData.createdAt).format('DD/MM/YYYY')}
      </div>
    </div>

    <div style={{ marginTop: 'clamp(0.5rem, 2vw, 1rem)', paddingTop: 'clamp(0.5rem, 2vw, 1rem)', borderTop: '1px solid #f0f0f0' }}>
      <Link href={`/cases/${caseData.id}`}>
        <Button type="primary" block size="small" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>
          View Details
        </Button>
      </Link>
    </div>
  </Card>
));

CaseCard.displayName = 'CaseCard';

export default function CasesPage() {
  const { token } = useAuth();
  const authHeaders = buildAuthHeaders(token);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Fetch cases with optimized API call
  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cases?minimal=true', {
        headers: authHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      } else {
        message.error('Failed to load cases');
      }
    } catch {
      message.error('Error loading cases');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Memoized filtered cases - computed only when dependencies change
  const filteredCases = useMemo(() => {
    let filtered = cases;

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(search) ||
          c.caseTitle.toLowerCase().includes(search) ||
          c.clientName.toLowerCase().includes(search)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter((c) => c.priority === priorityFilter);
    }

    return filtered;
  }, [cases, searchText, statusFilter, priorityFilter]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value || '');
  }, []);

  const handlePriorityChange = useCallback((value: string) => {
    setPriorityFilter(value || '');
  }, []);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <style>{shimmerStyles}</style>
        <SectionLoader loading={loading} skeleton={<CasesPageSkeleton />}>
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
            {/* Filters */}
            <div style={{ marginBottom: '2.5vh', paddingBottom: '1.5vh', borderBottom: '1px solid #f0f0f0' }}>
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
                      onChange={handleSearchChange}
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
                      onChange={handleStatusChange}
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
                      onChange={handlePriorityChange}
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

            {/* Cases Grid */}
            {filteredCases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                <p>
                  No cases found.{' '}
                  {searchText || statusFilter || priorityFilter
                    ? 'Try adjusting your filters.'
                    : 'Create a new case to get started.'}
                </p>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {filteredCases.map((caseData) => (
                  <Col key={caseData.id} xs={24} sm={12} md={8} lg={6}>
                    <CaseCard caseData={caseData} />
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </SectionLoader>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
