'use client';

import React, { useMemo } from 'react';
import { Card, Table, Tag, Button, Typography, Badge, Tooltip } from 'antd';
import { WarningOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import Link from 'next/link';
import dayjs from 'dayjs';
import { STAGE_LABEL_MAP } from '@/lib/constants';
import { useIsMobile } from '@/hooks/useIsMobile';

const { Text } = Typography;

interface PendingClosure {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingType: string;
  courtHall: string;
  notes: string | null;
  status: string;
  Case: {
    id: string;
    caseNumber: string;
    caseTitle: string;
    petitionerName: string;
    respondentName: string;
    courtName: string | null;
  };
}

interface PendingClosuresSectionProps {
  pendingClosures: PendingClosure[];
  onCloseHearing: (hearing: PendingClosure) => void;
}

export default function PendingClosuresSection({
  pendingClosures,
  onCloseHearing,
}: PendingClosuresSectionProps) {
  const isMobile = useIsMobile();

  const columns = useMemo(
    () => [
      {
        title: 'Date',
        dataIndex: 'hearingDate',
        key: 'hearingDate',
        width: 90,
        render: (date: string) => (
          <Text style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>
            {dayjs(date).format('DD/MM/YY')}
          </Text>
        ),
      },
      {
        title: 'Case No.',
        key: 'caseNumber',
        width: 120,
        render: (_: unknown, record: PendingClosure) => (
          <Link
            href={`/cases/${record.Case.id || record.caseId}`}
            style={{ color: '#1890ff', fontWeight: 500, fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}
          >
            {record.Case.caseNumber}
          </Link>
        ),
      },
      {
        title: 'Party',
        key: 'party',
        width: 140,
        ellipsis: true,
        className: 'hide-on-mobile',
        render: (_: unknown, record: PendingClosure) => (
          <Tooltip title={record.Case.caseTitle}>
            <Text strong style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>
              {record.Case.caseTitle}
            </Text>
          </Tooltip>
        ),
      },
      {
        title: 'Stage',
        dataIndex: 'hearingType',
        key: 'hearingType',
        width: 120,
        className: 'hide-on-mobile',
        render: (type: string) => (
          <Tag color="blue" style={{ fontSize: '0.7rem' }}>
            {STAGE_LABEL_MAP[type] || type.replace(/_/g, ' ')}
          </Tag>
        ),
      },
      {
        title: 'Court',
        key: 'court',
        width: 100,
        className: 'hide-on-mobile',
        render: (_: unknown, record: PendingClosure) => (
          <Text style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>
            {record.Case.courtName || record.courtHall || '-'}
          </Text>
        ),
      },
      {
        title: 'Overdue',
        key: 'overdue',
        width: 70,
        render: (_: unknown, record: PendingClosure) => {
          const days = dayjs().diff(dayjs(record.hearingDate), 'day');
          return (
            <Tag color={days > 3 ? 'red' : 'orange'} style={{ fontSize: '0.7rem' }}>
              {days === 0 ? 'Today' : days === 1 ? '1d' : `${days}d`}
            </Tag>
          );
        },
      },
      {
        title: '',
        key: 'action',
        width: 70,
        fixed: 'right' as const,
        render: (_: unknown, record: PendingClosure) => (
          <Button
            type="primary"
            size="small"
            onClick={() => onCloseHearing(record)}
            style={{
              backgroundColor: '#d4af37',
              borderColor: '#d4af37',
              fontSize: '0.75rem',
            }}
          >
            Close
          </Button>
        ),
      },
    ],
    [onCloseHearing]
  );

  if (pendingClosures.length === 0) return null;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <WarningOutlined style={{ color: '#faad14' }} />
          <span>Pending Closures</span>
          <Badge
            count={pendingClosures.length}
            style={{ backgroundColor: '#faad14' }}
          />
        </div>
      }
      styles={{ body: { padding: 0 } }}
      style={{
        marginBottom: 24,
        borderColor: '#ffd591',
        background: '#fffbe6',
      }}
      headStyle={{
        borderBottom: '1px solid #ffd591',
      }}
    >
      <Table
        dataSource={pendingClosures}
        columns={columns}
        pagination={false}
        rowKey="id"
        size="small"
        scroll={isMobile ? undefined : { x: 500 }}
        className="responsive-table"
        expandable={isMobile ? {
          expandIcon: ({ expanded, onExpand, record }: any) => (
            <span onClick={(e: React.MouseEvent) => onExpand(record, e)} style={{ cursor: 'pointer', color: '#999', fontSize: 12 }}>
              {expanded ? <UpOutlined /> : <DownOutlined />}
            </span>
          ),
          expandedRowRender: (record: PendingClosure) => (
            <div className="expanded-row-content">
              <div className="expanded-row-grid">
                <div><Text type="secondary">Party:</Text> <Text strong>{record.Case.caseTitle}</Text></div>
                <div><Text type="secondary">Stage:</Text> <Tag color="blue" style={{ fontSize: '0.7rem' }}>{STAGE_LABEL_MAP[record.hearingType] || record.hearingType.replace(/_/g, ' ')}</Tag></div>
                <div><Text type="secondary">Court:</Text> <Text>{record.Case.courtName || record.courtHall || '-'}</Text></div>
                {record.notes && <div style={{ gridColumn: '1 / -1' }}><Text type="secondary">Notes:</Text> <Text style={{ whiteSpace: 'pre-wrap' }}>{record.notes}</Text></div>}
              </div>
            </div>
          ),
          rowExpandable: () => true,
        } : undefined}
      />
    </Card>
  );
}
