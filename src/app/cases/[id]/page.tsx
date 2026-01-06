'use client';

import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
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
  Space,
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
  Checkbox,
} from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  DownOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { Dropdown, MenuProps } from 'antd';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import AIAnalysisTab from '@/components/Cases/AIAnalysisTab';
import CaseAssignment from '@/components/Cases/CaseAssignment';
import DocumentViewer from '@/components/Documents/DocumentViewer';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import Link from 'next/link';
import { CaseDetailSkeleton, shimmerStyles, SectionLoader } from '@/components/Skeletons';

// Lazy load Modal to reduce initial bundle
const Modal = lazy(() => import('antd').then(mod => ({ default: mod.Modal })));

// Types
interface CaseAssignmentData {
  id: string;
  userId: string;
  assignedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

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
  Hearing: any[];
  FileDocument: any[];
  AISummary?: any;
  assignments?: CaseAssignmentData[];
}

// Static color maps
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

const HEARING_TYPES = [
  { value: 'ARGUMENTS', label: 'Arguments' },
  { value: 'EVIDENCE_RECORDING', label: 'Evidence Recording' },
  { value: 'FINAL_HEARING', label: 'Final Hearing' },
  { value: 'INTERIM_HEARING', label: 'Interim Hearing' },
  { value: 'JUDGMENT_DELIVERY', label: 'Judgment Delivery' },
  { value: 'PRE_HEARING', label: 'Pre Hearing' },
] as const;

export default function CaseDetailPage() {
  const { token, user } = useAuth();
  const params = useParams();
  const caseId = params.id as string;
  const router = useRouter();

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  // State
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [hearingModalOpen, setHearingModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Fetch case details
  const fetchCaseDetail = useCallback(async () => {
    if (!token || !caseId) return;

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
    } catch {
      message.error('Failed to load case details');
    } finally {
      setLoading(false);
    }
  }, [token, caseId]);

  useEffect(() => {
    if (token && caseId) {
      fetchCaseDetail();
    }
  }, [token, caseId, fetchCaseDetail]);

  // Memoized handlers
  const handleAIQuickAction = useCallback(async (action: string) => {
    if (action !== 'reanalyze') return;

    setAiLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/ai/reanalyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        message.success('Case re-analyzed successfully');
        fetchCaseDetail();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to re-analyze case');
      }
    } catch {
      message.error('Failed to perform action');
    } finally {
      setAiLoading(false);
    }
  }, [caseId, token, fetchCaseDetail]);

  const handleViewDocument = useCallback((record: any) => {
    setSelectedDocument(record);
    setViewerOpen(true);
  }, []);

  // Download document by fetching signed URL from Supabase
  const handleDownloadDocument = useCallback(async (doc: any) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.url) {
        // Open the signed URL in a new tab for download
        window.open(data.url, '_blank');
      } else {
        message.error(data.error || 'Failed to get download URL');
      }
    } catch {
      message.error('Failed to download document');
    }
  }, [token]);

  const handleFileUpload = useCallback((info: any) => {
    const fileList = info.fileList
      .filter((file: any) => file.originFileObj)
      .map((file: any) => file.originFileObj);
    setUploadedFiles(fileList);
  }, []);

  const handleUploadSubmit = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      message.warning('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/cases/${caseId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`${result.files.length} file(s) uploaded successfully`);
        setUploadModalOpen(false);
        setUploadedFiles([]);
        fetchCaseDetail();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to upload files');
      }
    } catch {
      message.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  }, [uploadedFiles, caseId, token, fetchCaseDetail]);

  const handleHearingSubmit = useCallback(async (values: any) => {
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
    } catch {
      message.error('Failed to schedule hearing');
    }
  }, [caseId, token, form, fetchCaseDetail]);

  const handleEditOpen = useCallback(() => {
    if (caseData) {
      editForm.setFieldsValue({
        caseTitle: caseData.caseTitle,
        status: caseData.status,
        priority: caseData.priority,
        clientName: caseData.clientName,
        clientEmail: caseData.clientEmail,
        clientPhone: caseData.clientPhone,
        courtName: caseData.courtName,
        judgeAssigned: caseData.judgeAssigned,
        opponents: caseData.opponents,
        description: caseData.description,
      });
      setEditModalOpen(true);
    }
  }, [caseData, editForm]);

  const handleEditSubmit = useCallback(async (values: any) => {
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          documentsToDelete: documentsToDelete,
        }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        message.success('Case updated successfully');
        setEditModalOpen(false);
        setDocumentsToDelete([]);
        setCaseData(updatedData);
        setTimeout(() => fetchCaseDetail(), 500);
      } else {
        message.error('Failed to update case');
      }
    } catch {
      message.error('Failed to update case');
    }
  }, [caseId, token, documentsToDelete, fetchCaseDetail]);

  const handleDelete = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        message.success('Case deleted successfully');
        router.push('/cases');
      } else {
        message.error('Failed to delete case');
        setDeleteConfirmOpen(false);
      }
    } catch {
      message.error('Failed to delete case');
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [caseId, token, router]);

  // Memoized table columns
  const hearingColumns = useMemo(() => [
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
  ], []);

  const fileColumns = useMemo(() => [
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
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            type="link"
            onClick={() => handleViewDocument(record)}
          >
            View
          </Button>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            type="link"
            onClick={() => handleDownloadDocument(record)}
          >
            Download
          </Button>
        </Space>
      ),
    },
  ], [handleViewDocument, handleDownloadDocument]);

  // AI dropdown menu items
  const aiMenuItems: MenuProps['items'] = useMemo(() => [
    {
      key: 'reanalyze',
      label: 'Re-analyze Case',
      icon: <ThunderboltOutlined />,
      onClick: () => handleAIQuickAction('reanalyze'),
    },
    {
      key: 'ai-tab',
      label: 'Go to AI Analysis Tab',
      onClick: () => {
        const tabElement = document.querySelector('[data-node-key="ai-analysis"]') as HTMLElement;
        if (tabElement) tabElement.click();
      },
    },
  ], [handleAIQuickAction]);

  // Memoized tab items
  const tabItems = useMemo(() => {
    if (!caseData) return [];

    return [
      {
        key: 'overview',
        label: 'Overview',
        children: (
          <Card className="overview-card">
            {/* Custom Two-Column Grid for Case Details */}
            <div className="case-details-grid">
              <Row gutter={[12, 12]}>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Case Number</div>
                    <div className="detail-value">{caseData.caseNumber}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Status</div>
                    <div className="detail-value">
                      <Tag color={STATUS_COLORS[caseData.status]}>{caseData.status.replace(/_/g, ' ')}</Tag>
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Priority</div>
                    <div className="detail-value">
                      <Tag color={PRIORITY_COLORS[caseData.priority]}>{caseData.priority}</Tag>
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Client Name</div>
                    <div className="detail-value">{caseData.clientName}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Client Email</div>
                    <div className="detail-value">{caseData.clientEmail || 'N/A'}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Client Phone</div>
                    <div className="detail-value">{caseData.clientPhone || 'N/A'}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Court Name</div>
                    <div className="detail-value">{caseData.courtName || 'N/A'}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Judge Assigned</div>
                    <div className="detail-value">{caseData.judgeAssigned || 'N/A'}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Opponents</div>
                    <div className="detail-value">{caseData.opponents || 'N/A'}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Created Date</div>
                    <div className="detail-value">{dayjs(caseData.createdAt).format('DD/MM/YYYY')}</div>
                  </div>
                </Col>
              </Row>
            </div>

            {caseData.description && (
              <Card title="Case Description" style={{ marginTop: '2vh' }}>
                <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', lineHeight: '1.6' }}>{caseData.description}</p>
              </Card>
            )}

            {caseData.AISummary && (
              <Card title="AI Summary & Insights" style={{ marginTop: '2vh' }}>
                <Card.Meta title="Summary" description={caseData.AISummary.summary} style={{ marginBottom: '1.5vh' }} />
                <Card.Meta
                  title="Key Points"
                  description={
                    <ul>
                      {(Array.isArray(caseData.AISummary.keyPoints)
                        ? caseData.AISummary.keyPoints
                        : typeof caseData.AISummary.keyPoints === 'string'
                          ? JSON.parse(caseData.AISummary.keyPoints)
                          : []
                      ).map((point: string, index: number) => (
                        <li key={index} style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', marginBottom: '0.5vh' }}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  }
                  style={{ marginBottom: '1.5vh' }}
                />
                <Card.Meta title="Insights & Recommendations" description={caseData.AISummary.insights} />
              </Card>
            )}

            {/* Case Assignments */}
            <CaseAssignment
              caseId={caseId}
              assignments={caseData.assignments || []}
              token={token || ''}
              isAdmin={isAdmin}
              onAssignmentChange={fetchCaseDetail}
            />
          </Card>
        ),
      },
      {
        key: 'hearings',
        label: 'Hearings',
        children: (
          <Card
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setHearingModalOpen(true)}>
                Schedule Hearing
              </Button>
            }
          >
            {caseData.Hearing && caseData.Hearing.length > 0 ? (
              <Table columns={hearingColumns} dataSource={caseData.Hearing} rowKey="id" pagination={false} />
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
              <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
                Upload Document
              </Button>
            }
          >
            {caseData.FileDocument && caseData.FileDocument.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="documents-table-view">
                  <Table
                    columns={fileColumns}
                    dataSource={caseData.FileDocument}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                  />
                </div>
                {/* Mobile Card View */}
                <div className="documents-card-view">
                  <Row gutter={[12, 12]}>
                    {caseData.FileDocument.map((doc: any) => (
                      <Col xs={24} sm={12} key={doc.id}>
                        <Card
                          size="small"
                          className="document-card"
                          styles={{ body: { padding: '12px' } }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <FileTextOutlined style={{ fontSize: '24px', color: '#1a3a52', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 600,
                                fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)',
                                marginBottom: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {doc.fileName}
                              </div>
                              <div style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', color: '#666', marginBottom: '8px' }}>
                                <span>{doc.fileType}</span>
                                <span style={{ margin: '0 8px' }}>•</span>
                                <span>{(doc.fileSize / 1024).toFixed(2)} KB</span>
                              </div>
                              <Space size={8} wrap>
                                <Button
                                  icon={<EyeOutlined />}
                                  size="small"
                                  type="primary"
                                  ghost
                                  onClick={() => handleViewDocument(doc)}
                                >
                                  View
                                </Button>
                                <Button
                                  icon={<DownloadOutlined />}
                                  size="small"
                                  type="default"
                                  onClick={() => handleDownloadDocument(doc)}
                                >
                                  Download
                                </Button>
                              </Space>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </>
            ) : (
              <Empty description="No documents uploaded" />
            )}
          </Card>
        ),
      },
      {
        key: 'ai-analysis',
        label: 'AI Analysis',
        children: (
          <AIAnalysisTab
            caseId={caseId}
            caseTitle={caseData.caseTitle}
            aiSummary={caseData.AISummary}
            fileDocuments={caseData.FileDocument || []}
            token={token || ''}
            onAnalysisComplete={fetchCaseDetail}
          />
        ),
      },
    ];
  }, [caseData, caseId, token, hearingColumns, fileColumns, fetchCaseDetail, isAdmin]);

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <style>{shimmerStyles}</style>
        <CaseDetailSkeleton />
      </DashboardLayout>
    );
  }

  // Not found state
  if (!caseData) {
    return (
      <DashboardLayout>
        <Empty description="Case not found" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="case-detail-header">
        <Card>
          <div className="case-header-content">
            <div className="case-header-info">
              <h2 style={{ margin: 0, fontSize: 'clamp(1rem, 4vw, 1.8rem)' }}>{caseData.caseTitle}</h2>
              <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 'clamp(0.75rem, 2vw, 0.95rem)' }}>
                {caseData.caseNumber}
              </p>
            </div>
            <div className="case-header-actions">
              <Space wrap size={[8, 8]} className="action-buttons">
                <Dropdown menu={{ items: aiMenuItems }}>
                  <Button icon={<ThunderboltOutlined />} loading={aiLoading} size="middle">
                    <span className="btn-text">AI</span> <DownOutlined />
                  </Button>
                </Dropdown>
                <Button icon={<EditOutlined />} onClick={handleEditOpen} size="middle">
                  <span className="btn-text">Edit</span>
                </Button>
                {isAdmin && (
                  <Button icon={<DeleteOutlined />} onClick={handleDelete} danger loading={deleting} size="middle">
                    <span className="btn-text">Delete</span>
                  </Button>
                )}
                <Link href="/calendar">
                  <Button icon={<CalendarOutlined />} size="middle">
                    <span className="btn-text">Calendar</span>
                  </Button>
                </Link>
              </Space>
            </div>
          </div>
        </Card>

        <style jsx global>{`
          .case-detail-header {
            margin-bottom: 16px;
          }

          .case-header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
          }

          .case-header-info {
            flex: 1;
            min-width: 200px;
          }

          .case-header-actions {
            flex-shrink: 0;
          }

          @media (max-width: 768px) {
            .case-header-content {
              flex-direction: column;
              align-items: flex-start;
            }

            .case-header-actions {
              width: 100%;
            }

            .action-buttons {
              width: 100%;
              justify-content: flex-start !important;
            }

            .action-buttons .ant-btn {
              padding: 4px 8px !important;
              font-size: 0.8rem !important;
            }

            .btn-text {
              display: none;
            }
          }

          @media (max-width: 576px) {
            .case-detail-header {
              margin-bottom: 12px;
            }

            .action-buttons .ant-space-item {
              flex: 1;
            }

            .action-buttons .ant-btn {
              width: 100%;
              justify-content: center;
            }
          }

          /* Overview Tab - Custom Grid Styles */
          .overview-card {
            overflow: hidden;
          }

          .case-details-grid {
            background: #fafafa;
            border-radius: 8px;
            padding: clamp(12px, 3vw, 20px);
            border: 1px solid #e8e8e8;
          }

          .detail-item {
            background: #ffffff;
            border-radius: 6px;
            padding: clamp(8px, 2vw, 12px);
            height: 100%;
            border: 1px solid #f0f0f0;
          }

          .detail-label {
            font-size: clamp(0.65rem, 1.8vw, 0.8rem);
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
          }

          .detail-value {
            font-size: clamp(0.8rem, 2.2vw, 0.95rem);
            color: #000;
            word-break: break-word;
          }

          /* Mobile adjustments */
          @media (max-width: 576px) {
            .case-details-grid {
              padding: 8px;
            }

            .detail-item {
              padding: 8px;
            }

            .detail-label {
              font-size: 0.6rem;
              margin-bottom: 2px;
            }

            .detail-value {
              font-size: 0.75rem;
            }

            .detail-value .ant-tag {
              font-size: 0.65rem !important;
              padding: 0 4px !important;
              line-height: 1.5;
            }
          }

          /* Tablet adjustments */
          @media (min-width: 577px) and (max-width: 768px) {
            .detail-label {
              font-size: 0.7rem;
            }

            .detail-value {
              font-size: 0.85rem;
            }
          }

          /* Large screens */
          @media (min-width: 1200px) {
            .detail-item {
              padding: 14px;
            }

            .detail-label {
              font-size: 0.85rem;
            }

            .detail-value {
              font-size: 1rem;
            }
          }

          /* Documents Tab - Table vs Card View */
          .documents-table-view {
            display: block;
          }

          .documents-card-view {
            display: none;
          }

          @media (max-width: 768px) {
            .documents-table-view {
              display: none;
            }

            .documents-card-view {
              display: block;
            }
          }

          .document-card {
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            transition: all 0.2s ease;
          }

          .document-card:hover {
            border-color: #1a3a52;
            box-shadow: 0 2px 8px rgba(26, 58, 82, 0.1);
          }

          /* Hearings Table Responsive */
          @media (max-width: 768px) {
            .ant-table-wrapper {
              overflow-x: auto;
            }

            .ant-table {
              min-width: 500px;
            }
          }

          /* Large screens optimization */
          @media (min-width: 1920px) {
            .case-descriptions .ant-descriptions-item-label {
              font-size: 1rem !important;
              padding: 16px !important;
            }

            .case-descriptions .ant-descriptions-item-content {
              font-size: 1.05rem !important;
              padding: 16px !important;
            }
          }

          @media (min-width: 2560px) {
            .case-descriptions .ant-descriptions-item-label,
            .case-descriptions .ant-descriptions-item-content {
              font-size: 1.1rem !important;
              padding: 18px !important;
            }

            .document-card {
              padding: 16px;
            }
          }
        `}</style>
      </div>

      {/* Tabs */}
      <Tabs items={tabItems} />

      {/* Modals - Lazy loaded */}
      {uploadModalOpen && (
        <Suspense fallback={null}>
          <Modal
            title="Upload Document"
            open={uploadModalOpen}
            onCancel={() => {
              setUploadModalOpen(false);
              setUploadedFiles([]);
            }}
            footer={[
              <Button key="cancel" onClick={() => { setUploadModalOpen(false); setUploadedFiles([]); }}>
                Cancel
              </Button>,
              <Button key="upload" type="primary" loading={uploading} onClick={handleUploadSubmit} disabled={uploadedFiles.length === 0}>
                {uploading ? 'Uploading...' : `Upload ${uploadedFiles.length > 0 ? `(${uploadedFiles.length})` : ''}`}
              </Button>,
            ]}
            destroyOnClose
          >
            <Upload.Dragger
              onChange={handleFileUpload}
              multiple
              maxCount={5}
              beforeUpload={() => false}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
              fileList={uploadedFiles.map((file, index) => ({
                uid: `${index}`,
                name: file.name,
                status: 'done' as const,
              }))}
              onRemove={(file) => setUploadedFiles(uploadedFiles.filter((_, i) => `${i}` !== file.uid))}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: '3rem', color: '#1a3a52' }} />
              </p>
              <p className="ant-upload-text">Click or drag files to this area to upload</p>
              <p className="ant-upload-hint">Supported formats: PDF, Word, Excel, TXT, Images (max 5 files, 10MB each)</p>
            </Upload.Dragger>
          </Modal>
        </Suspense>
      )}

      {hearingModalOpen && (
        <Suspense fallback={null}>
          <Modal title="Schedule Hearing" open={hearingModalOpen} onCancel={() => setHearingModalOpen(false)} footer={null} destroyOnClose>
            <Form form={form} onFinish={handleHearingSubmit} layout="vertical">
              <Form.Item name="hearingDate" label="Hearing Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="hearingTime" label="Time">
                <Input type="time" />
              </Form.Item>
              <Form.Item name="hearingType" label="Hearing Type" rules={[{ required: true }]}>
                <Select>
                  {HEARING_TYPES.map((type) => (
                    <Select.Option key={type.value} value={type.value}>{type.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="courtRoom" label="Court Room">
                <Input />
              </Form.Item>
              <Button type="primary" htmlType="submit" block>Schedule</Button>
            </Form>
          </Modal>
        </Suspense>
      )}

      {editModalOpen && (
        <Suspense fallback={null}>
          <Modal title="Edit Case" open={editModalOpen} onCancel={() => setEditModalOpen(false)} footer={null} width="min(800px, 95vw)" destroyOnClose centered>
            <Form form={editForm} onFinish={handleEditSubmit} layout="vertical">
              <Form.Item name="caseTitle" label="Case Title" rules={[{ required: true, message: 'Please enter case title' }]}>
                <Input />
              </Form.Item>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                    <Select>
                      <Select.Option value="ACTIVE">Active</Select.Option>
                      <Select.Option value="PENDING_JUDGMENT">Pending Judgment</Select.Option>
                      <Select.Option value="CONCLUDED">Concluded</Select.Option>
                      <Select.Option value="APPEAL">Appeal</Select.Option>
                      <Select.Option value="DISMISSED">Dismissed</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                    <Select>
                      <Select.Option value="LOW">Low</Select.Option>
                      <Select.Option value="MEDIUM">Medium</Select.Option>
                      <Select.Option value="HIGH">High</Select.Option>
                      <Select.Option value="URGENT">Urgent</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="clientName" label="Client Name" rules={[{ required: true, message: 'Please enter client name' }]}>
                <Input />
              </Form.Item>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="clientEmail" label="Client Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
                    <Input type="email" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="clientPhone" label="Client Phone">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="courtName" label="Court Name">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="judgeAssigned" label="Judge Assigned">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="opponents" label="Opponents">
                <Input placeholder="Comma-separated list" />
              </Form.Item>

              <Form.Item name="description" label="Case Description">
                <Input.TextArea rows={4} />
              </Form.Item>

              {caseData.FileDocument && caseData.FileDocument.length > 0 && (
                <Form.Item label="Manage Documents">
                  <Card type="inner" size="small">
                    <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
                      Click the checkbox to delete documents:
                    </p>
                    {caseData.FileDocument.map((doc: any) => (
                      <div key={doc.id} style={{ marginBottom: '0.5rem' }}>
                        <Checkbox
                          checked={documentsToDelete.includes(doc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocumentsToDelete([...documentsToDelete, doc.id]);
                            } else {
                              setDocumentsToDelete(documentsToDelete.filter((id) => id !== doc.id));
                            }
                          }}
                        >
                          {doc.fileName} ({(doc.fileSize / 1024).toFixed(2)} KB)
                        </Checkbox>
                      </div>
                    ))}
                  </Card>
                </Form.Item>
              )}

              <Row gutter={[8, 0]} justify="end">
                <Col>
                  <Button onClick={() => { setEditModalOpen(false); setDocumentsToDelete([]); }}>Cancel</Button>
                </Col>
                <Col>
                  <Button type="primary" htmlType="submit">Save Changes</Button>
                </Col>
              </Row>
            </Form>
          </Modal>
        </Suspense>
      )}

      {deleteConfirmOpen && (
        <Suspense fallback={null}>
          <Modal
            title="Delete Case"
            open={deleteConfirmOpen}
            onCancel={() => setDeleteConfirmOpen(false)}
            onOk={confirmDelete}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
            confirmLoading={deleting}
          >
            <p>Are you sure you want to delete this case? This action cannot be undone.</p>
          </Modal>
        </Suspense>
      )}

      <DocumentViewer
        visible={viewerOpen}
        onClose={() => { setViewerOpen(false); setSelectedDocument(null); }}
        document={selectedDocument}
        token={token || ''}
      />
    </DashboardLayout>
  );
}
