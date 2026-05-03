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
  Segmented,
  message,
} from 'antd';
import { SearchOutlined, PlusOutlined, LockOutlined } from '@ant-design/icons';
import CloseCaseModal from '@/components/Cases/CloseCaseModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/lib/apiClient';
import dayjs from 'dayjs';
import { CasesPageSkeleton, SectionLoader, shimmerStyles } from '@/components/Skeletons';

interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
  petitionerName: string;
  respondentName: string;
  status: string;
  priority: string;
  courtName?: string;
  courtTypeId?: string | null;
  createdAt: string;
  // Just userIds — enough for client-side "My cases" filter without
  // an extra round trip when the user toggles the segmented control.
  assignments?: { userId: string }[];
  _count?: {
    Hearing: number;
  };
}

interface CourtTypeOption {
  id: string;
  name: string;
}

// Static color maps - moved outside component
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'blue',
  PENDING_JUDGMENT: 'orange',
  CONCLUDED: 'green',
  APPEAL: 'red',
  DISMISSED: 'default',
  CLOSED: '#8c8c8c',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'green',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

// Memoized Case Card component
const CaseCard = React.memo<{ caseData: Case; isAdmin?: boolean; onCloseCase?: (caseId: string) => void }>(({ caseData, isAdmin, onCloseCase }) => {
  const router = useRouter();
  const isClosed = caseData.status === 'CLOSED';

  return (
    <Card
      hoverable
      className={`case-card ${isClosed ? 'case-card-closed' : ''}`}
      onClick={() => router.push(`/cases/${caseData.id}`)}
      style={{
        height: '100%',
        borderRadius: 'clamp(0.5rem, 2vw, 0.8rem)',
        border: isClosed ? '2px solid #ff4d4f' : '1px solid #e8e8e8',
        boxShadow: 'none',
        transition: 'all 0.3s ease',
        background: isClosed ? '#fff1f0' : '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      styles={{
        body: { padding: 'clamp(10px, 3vw, 16px)' },
      }}
    >
      {isClosed && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: '#ff4d4f',
          color: '#fff',
          fontSize: 'clamp(0.6rem, 1.6vw, 0.7rem)',
          fontWeight: 700,
          textAlign: 'center',
          padding: '2px 0',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}>
          <LockOutlined style={{ fontSize: '10px' }} />
          CASE CLOSED
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'clamp(0.5rem, 2vw, 1rem)', marginTop: isClosed ? '16px' : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.3rem 0', color: isClosed ? '#595959' : '#000000', fontWeight: '700', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>
            {caseData.caseNumber}
          </h3>
          <p style={{ margin: '0.2rem 0', color: '#666', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {caseData.caseTitle}
          </p>
        </div>
        {!isClosed && isAdmin && onCloseCase && (
          <Button
            size="small"
            icon={<LockOutlined />}
            onClick={(e) => { e.stopPropagation(); onCloseCase(caseData.id); }}
            style={{ background: '#8c8c8c', borderColor: '#8c8c8c', color: '#fff', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
          />
        )}
      </div>

      <div style={{ marginBottom: 'clamp(0.5rem, 2vw, 1rem)' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {!isClosed && (
            <Tag
              color={STATUS_COLORS[caseData.status] || 'default'}
              style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.8rem)', padding: '1px 6px' }}
            >
              {caseData.status.replace(/_/g, ' ')}
            </Tag>
          )}
          <Tag color={PRIORITY_COLORS[caseData.priority] || 'default'} style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.8rem)', padding: '1px 6px' }}>
            {caseData.priority}
          </Tag>
        </div>
      </div>

      <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', color: '#666' }}>
        <div style={{ marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <strong>Petitioner:</strong> {caseData.petitionerName}
        </div>
        <div style={{ marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <strong>Respondent:</strong> {caseData.respondentName}
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
    </Card>
  );
});

CaseCard.displayName = 'CaseCard';

export default function CasesPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [cases, setCases] = useState<Case[]>([]);
  const [courtTypes, setCourtTypes] = useState<CourtTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  // statusFilter: '' = both, 'OPEN' = anything not CLOSED, 'CLOSED' = closed
  const [statusFilter, setStatusFilter] = useState<'' | 'OPEN' | 'CLOSED'>('');
  const [courtTypeFilter, setCourtTypeFilter] = useState('');
  const [viewScope, setViewScope] = useState<'all' | 'mine'>('all');
  const [closeCaseId, setCloseCaseId] = useState<string | null>(null);
  const [closeCaseNumber, setCloseCaseNumber] = useState('');

  // Fetch the firm-wide list once. The "All firm cases | My cases" toggle is
  // applied client-side from the assignment userIds embedded in each row, so
  // toggling does NOT trigger a re-fetch.
  const fetchCases = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/cases?minimal=true', {
        headers: authHeaders(token),
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
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCases();
    }
  }, [token, fetchCases]);

  // One-shot fetch of the firm's court types for the filter dropdown.
  // Cached on the client; new firm-level court types are rare enough that we
  // don't refetch on toggle.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetch('/api/court-types', { headers: authHeaders(token) })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CourtTypeOption[]) => {
        if (alive) setCourtTypes(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Silently fall through — the dropdown just stays empty.
      });
    return () => {
      alive = false;
    };
  }, [token]);

  // Memoized filtered cases - computed only when dependencies change
  const filteredCases = useMemo(() => {
    let filtered = cases;

    // Scope toggle is applied client-side from the assignment userIds.
    if (viewScope === 'mine' && user?.id) {
      const myId = user.id;
      filtered = filtered.filter(
        (c) => c.assignments?.some((a) => a.userId === myId)
      );
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(search) ||
          c.caseTitle.toLowerCase().includes(search) ||
          c.petitionerName.toLowerCase().includes(search) ||
          c.respondentName.toLowerCase().includes(search)
      );
    }

    // Status: binary Open/Closed. "Open" means anything not CLOSED — including
    // PENDING_JUDGMENT, APPEAL, etc. — since the case isn't closed via the
    // dedicated Close Case flow yet.
    if (statusFilter === 'OPEN') {
      filtered = filtered.filter((c) => c.status !== 'CLOSED');
    } else if (statusFilter === 'CLOSED') {
      filtered = filtered.filter((c) => c.status === 'CLOSED');
    }

    // Court filter is on courtTypeId (FK to CourtType). Cases without a court
    // type are hidden when a specific court is chosen, surfaced when it isn't.
    if (courtTypeFilter) {
      filtered = filtered.filter((c) => c.courtTypeId === courtTypeFilter);
    }

    // Sort so closed cases always appear at the end
    filtered.sort((a, b) => {
      const aClosed = a.status === 'CLOSED' ? 1 : 0;
      const bClosed = b.status === 'CLOSED' ? 1 : 0;
      return aClosed - bClosed;
    });

    return filtered;
  }, [cases, searchText, statusFilter, courtTypeFilter, viewScope, user?.id]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const handleStatusChange = useCallback((value: 'OPEN' | 'CLOSED' | undefined) => {
    setStatusFilter(value || '');
  }, []);

  const handleCourtTypeChange = useCallback((value: string | undefined) => {
    setCourtTypeFilter(value || '');
  }, []);

  const handleCloseCase = useCallback((caseId: string) => {
    const caseItem = cases.find(c => c.id === caseId);
    setCloseCaseId(caseId);
    setCloseCaseNumber(caseItem?.caseNumber || '');
  }, [cases]);

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
            {/* Scope toggle: All firm cases vs My cases */}
            <div style={{ marginBottom: '1.5vh' }}>
              <Segmented
                value={viewScope}
                onChange={(v) => setViewScope(v as 'all' | 'mine')}
                options={[
                  { label: 'All firm cases', value: 'all' },
                  { label: 'My cases', value: 'mine' },
                ]}
              />
            </div>

            {/* Filters — three equal columns on tablet+, stacked on mobile.
                All three controls are size="large" (40px) and pinned to the
                same height via the `cases-filter-row` scoped styles below, so
                the search Input (which AntD wraps in .ant-input-affix-wrapper
                because of the prefix icon) lines up with the two Selects. */}
            <div className="cases-filter-row" style={{ marginBottom: '2.5vh', paddingBottom: '1.5vh', borderBottom: '1px solid #f0f0f0' }}>
              <style jsx>{`
                .cases-filter-row :global(.ant-input-affix-wrapper),
                .cases-filter-row :global(.ant-select .ant-select-selector) {
                  height: 40px !important;
                  display: flex;
                  align-items: center;
                }
                .cases-filter-row :global(.ant-input-affix-wrapper > input.ant-input) {
                  height: 100%;
                  line-height: 1.5;
                }
                .cases-filter-row :global(.ant-select-single .ant-select-selection-item),
                .cases-filter-row :global(.ant-select-single .ant-select-selection-placeholder) {
                  line-height: 38px;
                }
              `}</style>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#000', marginBottom: '0.5rem' }}>
                      Search
                    </label>
                    <Input
                      size="large"
                      placeholder="Case number, petitioner, or respondent..."
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={handleSearchChange}
                      style={{ width: '100%' }}
                    />
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#000', marginBottom: '0.5rem' }}>
                      Status
                    </label>
                    <Select
                      size="large"
                      placeholder="All cases"
                      allowClear
                      value={statusFilter || undefined}
                      onChange={handleStatusChange}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="OPEN">Open</Select.Option>
                      <Select.Option value="CLOSED">Closed</Select.Option>
                    </Select>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#000', marginBottom: '0.5rem' }}>
                      Court
                    </label>
                    <Select
                      size="large"
                      placeholder="All courts"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      value={courtTypeFilter || undefined}
                      onChange={handleCourtTypeChange}
                      style={{ width: '100%' }}
                    >
                      {courtTypes.map((ct) => (
                        <Select.Option key={ct.id} value={ct.id}>
                          {ct.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Cases Grid */}
            {filteredCases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                <p>
                  {viewScope === 'mine' && cases.length > 0
                    ? "You're not assigned to any cases yet. Switch to All firm cases to browse the firm."
                    : searchText || statusFilter || courtTypeFilter
                      ? 'No cases match the current filters. Try adjusting them.'
                      : 'No cases found. Create a new case to get started.'}
                </p>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {filteredCases.map((caseData) => (
                  <Col key={caseData.id} xs={24} sm={12} md={8} lg={6}>
                    <CaseCard caseData={caseData} isAdmin={isAdmin} onCloseCase={handleCloseCase} />
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </SectionLoader>

        {closeCaseId && (
          <CloseCaseModal
            open={!!closeCaseId}
            caseId={closeCaseId}
            caseNumber={closeCaseNumber}
            token={token || ''}
            onClose={() => setCloseCaseId(null)}
            onSuccess={() => {
              setCloseCaseId(null);
              fetchCases();
            }}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
