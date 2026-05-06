'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button, Tag, Space, Popconfirm, message, Spin } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import JudgmentFormModal from '@/components/Judgments/JudgmentFormModal';
import JudgmentThreads from '@/components/Judgments/JudgmentThreads';
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

export default function JudgmentDetailPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isAdmin = user?.role === 'ADMIN';

  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchJudgment = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/judgments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJudgment(data);
      } else {
        message.error('Failed to load judgment');
      }
    } catch {
      message.error('Failed to load judgment');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchJudgment();
  }, [fetchJudgment]);

  const handleDownload = async (attachment: JudgmentAttachment) => {
    setDownloadingId(attachment.id);
    try {
      const res = await fetch(`/api/judgments/${id}/attachments/${attachment.id}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { url, fileName } = await res.json();
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        message.error('Failed to get download link');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/judgments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        message.success('Judgment deleted');
        router.push('/judgments');
      } else {
        message.error('Failed to delete judgment');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '60vh',
            }}
          >
            <Spin size="large" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!judgment) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div style={{ padding: '2rem' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/judgments')}>
              Back
            </Button>
            <div style={{ marginTop: '2rem', color: '#555' }}>Judgment not found.</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={{ padding: '2rem', maxWidth: '1000px' }}>
          {/* Back button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/judgments')}>
              Back
            </Button>
          </div>

          {/* Judgment header card */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: '0.75rem',
              padding: '1.5rem 2rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <Tag
                    style={{
                      borderRadius: '1rem',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      background:
                        judgment.type === 'RESEARCH' ? 'transparent' : '#1a3a52',
                      color: judgment.type === 'RESEARCH' ? '#1a3a52' : '#fff',
                      border:
                        judgment.type === 'RESEARCH'
                          ? '1px solid #1a3a52'
                          : 'none',
                      padding: '2px 10px',
                    }}
                  >
                    {judgment.type === 'RESEARCH' ? 'Research' : 'Office Judgments'}
                  </Tag>
                  <span
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#1a3a52',
                    }}
                  >
                    {judgment.category}
                  </span>
                </div>
                <div
                  style={{ color: '#555', fontSize: '1rem', marginBottom: '0.5rem' }}
                >
                  {judgment.citation}
                </div>
                <div style={{ color: '#999', fontSize: '0.85rem' }}>
                  By {judgment.createdBy?.name || 'Unknown'} &middot;{' '}
                  {dayjs(judgment.createdAt).format('DD MMM YYYY')}
                </div>
              </div>
              {isAdmin && (
                <Space>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setModalOpen(true)}
                  >
                    Edit
                  </Button>
                  <Popconfirm
                    title="Delete this judgment?"
                    onConfirm={handleDelete}
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<DeleteOutlined />} loading={deleting}>
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              )}
            </div>
          </div>

          {/* Headnote section */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: '0.75rem',
              padding: '1.5rem 2rem',
              marginBottom: '1.5rem',
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                color: '#1a3a52',
                marginBottom: '1rem',
                marginTop: 0,
              }}
            >
              Headnote / Notes
            </h3>
            <div
              className="judgment-headnote"
              dangerouslySetInnerHTML={{ __html: judgment.headnote }}
              style={{ lineHeight: 1.6, color: '#333' }}
            />
          </div>

          {/* Attachments section */}
          {judgment.attachments && judgment.attachments.length > 0 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: '0.75rem',
                padding: '1.5rem 2rem',
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  color: '#1a3a52',
                  marginBottom: '1rem',
                  marginTop: 0,
                }}
              >
                Attachments
              </h3>
              {judgment.attachments.map((att) => (
                <div
                  key={att.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    border: '1px solid #f0f0f0',
                    borderRadius: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <PaperClipOutlined
                      style={{ color: '#1a3a52', fontSize: '1rem' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{att.fileName}</div>
                      <div style={{ color: '#999', fontSize: '0.8rem' }}>
                        {(att.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <Button
                    icon={<DownloadOutlined />}
                    size="small"
                    loading={downloadingId === att.id}
                    onClick={() => handleDownload(att)}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Inline styles for rendered headnote HTML */}
          <style>{`
            .judgment-headnote p { margin: 0.5em 0; }
            .judgment-headnote ul, .judgment-headnote ol { padding-left: 1.5em; }
            .judgment-headnote blockquote { border-left: 3px solid #d9d9d9; padding-left: 1em; color: #666; }
            .judgment-headnote a { color: #1a3a52; }
            .judgment-headnote h1, .judgment-headnote h2, .judgment-headnote h3 { color: #1a3a52; margin: 0.75em 0 0.25em; }
          `}</style>

          {/* Threads */}
          <JudgmentThreads
            judgmentId={id}
            token={token!}
            isAdmin={isAdmin}
            currentUserId={user?.id || ''}
          />

          <JudgmentFormModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={fetchJudgment}
            editingJudgment={
              judgment
                ? {
                    id: judgment.id,
                    type: judgment.type,
                    category: judgment.category,
                    headnote: judgment.headnote,
                    citation: judgment.citation,
                  }
                : null
            }
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
