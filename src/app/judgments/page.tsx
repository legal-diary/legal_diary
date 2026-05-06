'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Input, Select, Space, Tag, Tooltip, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import JudgmentFormModal from '@/components/Judgments/JudgmentFormModal';
import dayjs from 'dayjs';

interface JudgmentAttachment {
  id: string;
  judgmentId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

interface Judgment {
  id: string;
  type: 'RESEARCH' | 'OFFICE_JUDGMENT';
  category: string;
  headnotePreview: string;
  headnote: string;
  citation: string;
  createdAt: string;
  createdBy: { name: string | null };
  attachments?: JudgmentAttachment[];
}

interface EditingJudgment {
  id: string;
  type: 'RESEARCH' | 'OFFICE_JUDGMENT';
  category: string;
  headnote: string;
  citation: string;
}

export default function JudgmentsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';

  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJudgment, setEditingJudgment] = useState<EditingJudgment | null>(null);

  const fetchJudgments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      const res = await fetch(`/api/judgments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJudgments(data.judgments || data || []);
      } else {
        message.error('Failed to load judgments');
      }
    } catch {
      message.error('Failed to load judgments');
    } finally {
      setLoading(false);
    }
  }, [token, sort]);

  useEffect(() => {
    fetchJudgments();
  }, [fetchJudgments]);

  const filtered = useMemo(() => {
    let data = judgments;
    if (search) {
      data = data.filter(
        (j) =>
          j.citation.toLowerCase().includes(search.toLowerCase()) ||
          j.category.toLowerCase().includes(search.toLowerCase()) ||
          j.headnotePreview.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (typeFilter !== 'all') {
      data = data.filter((j) => j.type === typeFilter);
    }
    return data;
  }, [judgments, search, typeFilter]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/judgments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        message.success('Judgment deleted');
        fetchJudgments();
      } else {
        message.error('Failed to delete judgment');
      }
    } catch {
      message.error('Failed to delete judgment');
    }
  };

  const handleEdit = async (record: Judgment) => {
    try {
      const res = await fetch(`/api/judgments/${record.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEditingJudgment({
          id: data.id,
          type: data.type,
          category: data.category,
          headnote: data.headnote,
          citation: data.citation,
        });
        setModalOpen(true);
      } else {
        message.error('Failed to load judgment details');
      }
    } catch {
      message.error('Failed to load judgment details');
    }
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 160,
      render: (type: string) => (
        <Tag
          style={{
            borderRadius: '1rem',
            fontWeight: 500,
            fontSize: '0.8rem',
            background: type === 'RESEARCH' ? 'transparent' : '#1a3a52',
            color: type === 'RESEARCH' ? '#1a3a52' : '#fff',
            border: type === 'RESEARCH' ? '1px solid #1a3a52' : 'none',
            padding: '2px 10px',
          }}
        >
          {type === 'RESEARCH' ? 'Research' : 'Office Judgments'}
        </Tag>
      ),
    },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 130 },
    {
      title: 'Headnote',
      dataIndex: 'headnotePreview',
      key: 'headnote',
      render: (text: string) => (
        <span style={{ color: '#555', fontSize: '0.9rem' }}>{text}</span>
      ),
    },
    { title: 'Citation / Reference', dataIndex: 'citation', key: 'citation', width: 180 },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Author',
      key: 'author',
      width: 130,
      render: (_: unknown, record: Judgment) => record.createdBy?.name || '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Judgment) =>
        isAdmin ? (
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Edit">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(record);
                }}
              />
            </Tooltip>
            <Popconfirm
              title="Delete this judgment?"
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={{ padding: '2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <h1
              style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: '#1a3a52',
                margin: 0,
              }}
            >
              Judgments
            </h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingJudgment(null);
                setModalOpen(true);
              }}
              style={{
                background: '#1a3a52',
                borderColor: '#1a3a52',
                height: '2.5rem',
                fontWeight: 600,
              }}
            >
              New Judgment
            </Button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Input.Search
              placeholder="Search judgments..."
              allowClear
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260 }}
              prefix={<SearchOutlined />}
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 160 }}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'RESEARCH', label: 'Research' },
                { value: 'OFFICE_JUDGMENT', label: 'Office Judgments' },
              ]}
            />
            <Select
              value={sort}
              onChange={(v) => {
                setSort(v);
              }}
              style={{ width: 140 }}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
              ]}
            />
          </div>

          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Showing ${total} judgments`,
              showSizeChanger: false,
            }}
            onRow={(record) => ({
              onClick: () => router.push(`/judgments/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            style={{ background: '#fff' }}
          />

          <JudgmentFormModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditingJudgment(null);
            }}
            onSuccess={fetchJudgments}
            editingJudgment={editingJudgment}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
