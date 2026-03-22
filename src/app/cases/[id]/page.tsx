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
  Popconfirm,
  Divider,
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
  CameraOutlined,
  UserOutlined,
  CheckCircleFilled,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { Dropdown, MenuProps } from 'antd';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import AIAnalysisTab from '@/components/Cases/AIAnalysisTab';
import CaseAssignment from '@/components/Cases/CaseAssignment';
import CloseCaseModal from '@/components/Cases/CloseCaseModal';
import DocumentViewer from '@/components/Documents/DocumentViewer';
import CameraCapture from '@/components/CameraCapture';
import { useAuth } from '@/context/AuthContext';
import { apiHeaders, authHeaders } from '@/lib/apiClient';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import Link from 'next/link';
import { CaseDetailSkeleton, shimmerStyles, SectionLoader } from '@/components/Skeletons';
import { STAGE_OPTIONS, STAGE_LABEL_MAP } from '@/lib/constants';

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

interface CourtTypeOption {
  id: string;
  name: string;
}

interface Case {
  id: string;
  caseNumber: string;
  caseTitle: string;
  petitionerName: string;
  petitionerPhone: string;
  respondentName: string;
  respondentPhone: string;
  clientParty?: string;
  vakalat?: string;
  status: string;
  priority: string;
  description?: string;
  courtName?: string;
  courtHall?: string;
  courtTypeId?: string;
  CourtType?: { id: string; name: string } | null;
  judgeAssigned?: string;
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
  CLOSED: '#8c8c8c',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'green',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};


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
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hearingSubmitting, setHearingSubmitting] = useState(false);
  const [editingHearingId, setEditingHearingId] = useState<string | null>(null);
  const [hearingDeleting, setHearingDeleting] = useState(false);
  const [courtTypes, setCourtTypes] = useState<CourtTypeOption[]>([]);
  const [newCourtName, setNewCourtName] = useState('');
  const [addingCourtType, setAddingCourtType] = useState(false);
  const [editClientParty, setEditClientParty] = useState<'PETITIONER' | 'RESPONDENT'>('PETITIONER');
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobile || hasTouch);
    };
    checkMobile();
  }, []);

  // Fetch case details
  const fetchCaseDetail = useCallback(async () => {
    if (!token || !caseId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        headers: authHeaders(token),
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

  const fetchCourtTypes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/court-types', { headers: authHeaders(token) });
      if (res.ok) setCourtTypes(await res.json());
    } catch { /* silent */ }
  }, [token]);

  const handleAddCourtType = useCallback(async () => {
    const name = newCourtName.trim();
    if (!name) return;
    setAddingCourtType(true);
    try {
      const res = await fetch('/api/court-types', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const ct = await res.json();
        setCourtTypes((prev) => [...prev, ct].sort((a, b) => a.name.localeCompare(b.name)));
        editForm.setFieldsValue({ courtTypeId: ct.id });
        setNewCourtName('');
        message.success('Court type added');
      }
    } catch {
      message.error('Failed to add court type');
    } finally {
      setAddingCourtType(false);
    }
  }, [token, newCourtName, editForm]);

  useEffect(() => {
    if (token && caseId) {
      fetchCaseDetail();
      fetchCourtTypes();
    }
  }, [token, caseId, fetchCaseDetail]);

  // Memoized handlers
  const handleAIQuickAction = useCallback(async (action: string) => {
    if (action !== 'reanalyze') return;

    setAiLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/ai/reanalyze`, {
        method: 'POST',
        headers: authHeaders(token),
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
        headers: authHeaders(token),
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
        headers: { ...apiHeaders(), Authorization: `Bearer ${token}` },
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
    setHearingSubmitting(true);
    try {
      const isEditing = !!editingHearingId;
      const url = isEditing ? `/api/hearings/${editingHearingId}` : '/api/hearings';
      const method = isEditing ? 'PUT' : 'POST';

      const payload: any = {
        hearingDate: values.hearingDate.toISOString(),
        hearingType: values.hearingType,
        courtHall: values.courtHall,
      };
      if (!isEditing) payload.caseId = caseId;

      const response = await fetch(url, {
        method,
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success(isEditing ? 'Hearing updated' : 'Hearing scheduled');
        setHearingModalOpen(false);
        setEditingHearingId(null);
        form.resetFields();
        fetchCaseDetail();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to save hearing');
      }
    } catch {
      message.error('Failed to save hearing');
    } finally {
      setHearingSubmitting(false);
    }
  }, [caseId, token, form, fetchCaseDetail, editingHearingId]);

  const handleEditHearingInCase = useCallback((hearing: any) => {
    setEditingHearingId(hearing.id);
    form.setFieldsValue({
      hearingDate: dayjs(hearing.hearingDate),
      hearingType: hearing.hearingType,
      courtHall: hearing.courtHall || '',
    });
    setHearingModalOpen(true);
  }, [form]);

  const handleDeleteHearingInCase = useCallback(async (hearingId: string) => {
    setHearingDeleting(true);
    try {
      const response = await fetch(`/api/hearings/${hearingId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      if (response.ok) {
        message.success('Hearing deleted');
        fetchCaseDetail();
      } else {
        message.error('Failed to delete hearing');
      }
    } catch {
      message.error('Failed to delete hearing');
    } finally {
      setHearingDeleting(false);
    }
  }, [token, fetchCaseDetail]);

  const handleEditSelectParty = useCallback((party: 'PETITIONER' | 'RESPONDENT') => {
    setEditClientParty(party);
    editForm.setFieldsValue({ clientParty: party });
  }, [editForm]);

  const handleEditOpen = useCallback(() => {
    if (caseData) {
      const party = (caseData.clientParty as 'PETITIONER' | 'RESPONDENT') || 'PETITIONER';
      setEditClientParty(party);
      editForm.setFieldsValue({
        petitionerName: caseData.petitionerName,
        petitionerPhone: caseData.petitionerPhone,
        respondentName: caseData.respondentName,
        respondentPhone: caseData.respondentPhone,
        clientParty: party,
        vakalat: caseData.vakalat,
        status: caseData.status,
        priority: caseData.priority,
        courtTypeId: caseData.courtTypeId || undefined,
        courtHall: caseData.courtHall,
        judgeAssigned: caseData.judgeAssigned,
        description: caseData.description,
      });
      setEditModalOpen(true);
    }
  }, [caseData, editForm]);

  const handleEditSubmit = useCallback(async (values: any) => {
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: authHeaders(token),
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
        headers: authHeaders(token),
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

  const handleReopenCase = useCallback(async () => {
    setReopening(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/reopen`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      if (response.ok) {
        message.success('Case re-opened successfully');
        fetchCaseDetail();
      } else {
        const data = await response.json();
        message.error(data.error || 'Failed to re-open case');
      }
    } catch {
      message.error('Failed to re-open case');
    } finally {
      setReopening(false);
    }
  }, [caseId, token, fetchCaseDetail]);

  // Memoized table columns
  const hearingColumns = useMemo(() => [
    {
      title: 'Date',
      dataIndex: 'hearingDate',
      key: 'hearingDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Stage',
      dataIndex: 'hearingType',
      key: 'hearingType',
      render: (type: string) => <Tag color="blue">{STAGE_LABEL_MAP[type] || type.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Court Hall',
      dataIndex: 'courtHall',
      key: 'courtHall',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color="green">{status}</Tag>,
    },
    ...(isAdmin && caseData?.status !== 'CLOSED' ? [{
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: any) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ fontSize: '14px' }} />}
            onClick={() => handleEditHearingInCase(record)}
          />
          <Popconfirm
            title="Delete this hearing?"
            onConfirm={() => handleDeleteHearingInCase(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, size: 'small' }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: '14px' }} />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ], [isAdmin, caseData?.status, handleEditHearingInCase, handleDeleteHearingInCase]);

  const fileColumns = useMemo(() => [
    {
      title: 'File Name',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (name: string, record: any) => (
        <span>
          {name}
          {record.isFinalOrder && <Tag color="gold" style={{ marginLeft: 8 }}>Final Order</Tag>}
        </span>
      ),
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
                    <div className="detail-label">Petitioner</div>
                    <div className="detail-value">{caseData.petitionerName}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Petitioner Phone</div>
                    <div className="detail-value">{caseData.petitionerPhone || 'N/A'}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Respondent</div>
                    <div className="detail-value">{caseData.respondentName}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Respondent Phone</div>
                    <div className="detail-value">{caseData.respondentPhone || 'N/A'}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Our Client</div>
                    <div className="detail-value">
                      <Tag color="blue">{caseData.clientParty === 'RESPONDENT' ? 'Respondent' : 'Petitioner'}</Tag>
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Court Type</div>
                    <div className="detail-value">{caseData.CourtType?.name || caseData.courtName || 'N/A'}</div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={12} lg={6}>
                  <div className="detail-item">
                    <div className="detail-label">Court Hall</div>
                    <div className="detail-value">{caseData.courtHall || 'N/A'}</div>
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
                    <div className="detail-label">Vakalat</div>
                    <div className="detail-value">{caseData.vakalat || 'N/A'}</div>
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
              caseData.status !== 'CLOSED' ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setHearingModalOpen(true)}>
                  Schedule Hearing
                </Button>
              ) : null
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
              caseData.status !== 'CLOSED' ? (
                <Space wrap>
                  <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
                    Upload
                  </Button>
                </Space>
              ) : null
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
                                {doc.isFinalOrder && <Tag color="gold" style={{ marginLeft: 6, fontSize: '0.65rem' }}>Final Order</Tag>}
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
          {caseData.status === 'CLOSED' && (
            <div style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              padding: '10px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <LockOutlined style={{ fontSize: '18px', color: '#8c8c8c' }} />
              <span style={{ fontWeight: 600, color: '#595959', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', flex: 1 }}>
                This case is closed. No edits, hearings, or uploads are allowed.
              </span>
              {isAdmin && (
                <Popconfirm
                  title="Re-open this case?"
                  description="The case will return to Active status. All existing data will be preserved."
                  onConfirm={handleReopenCase}
                  okText="Re-open"
                  cancelText="Cancel"
                >
                  <Button
                    type="link"
                    icon={<UnlockOutlined />}
                    loading={reopening}
                    style={{ padding: 0 }}
                  >
                    Re-open Case
                  </Button>
                </Popconfirm>
              )}
            </div>
          )}
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
                {caseData.status !== 'CLOSED' && (
                  <Button icon={<EditOutlined />} onClick={handleEditOpen} size="middle">
                    <span className="btn-text">Edit</span>
                  </Button>
                )}
                {isAdmin && caseData.status !== 'CLOSED' && (
                  <Button
                    icon={<LockOutlined />}
                    onClick={() => setCloseModalOpen(true)}
                    size="middle"
                    style={{ background: '#8c8c8c', borderColor: '#8c8c8c', color: '#fff' }}
                  >
                    <span className="btn-text">Close</span>
                  </Button>
                )}
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

          /* Party card styles for edit modal */
          .party-card {
            border: 2px solid #e8e8e8;
            border-radius: 12px;
            padding: clamp(14px, 3vw, 20px);
            cursor: pointer;
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            background: #fff;
            min-height: 100px;
          }

          .party-card:hover {
            border-color: #b0c4d8;
            box-shadow: 0 2px 12px rgba(26, 58, 82, 0.08);
          }

          .party-card.selected {
            border-color: #1a3a52;
            box-shadow: 0 4px 20px rgba(26, 58, 82, 0.15);
            background: linear-gradient(135deg, #f8fafb 0%, #eef3f7 100%);
          }

          .party-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }

          .party-card-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: clamp(0.85rem, 2.5vw, 1rem);
            color: #333;
            transition: color 0.3s ease;
          }

          .party-card.selected .party-card-title {
            color: #1a3a52;
          }

          .client-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 0.65rem;
            font-weight: 600;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
            transform: scale(0.8);
          }

          .client-badge.visible {
            opacity: 1;
            transform: scale(1);
            background: #1a3a52;
            color: #fff;
          }

          .phone-reveal {
            overflow: hidden;
            max-height: 0;
            opacity: 0;
            transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.3s ease 0.1s,
                        margin-top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            margin-top: 0;
          }

          .phone-reveal.open {
            max-height: 120px;
            opacity: 1;
            margin-top: 8px;
          }

          .party-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.3s ease;
            background: #f0f0f0;
            color: #999;
          }

          .party-card.selected .party-icon {
            background: #1a3a52;
            color: #fff;
          }

          .party-card .ant-form-item {
            margin-bottom: 0;
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
          <Modal
            title={editingHearingId ? "Edit Hearing" : "Schedule Hearing"}
            open={hearingModalOpen}
            onCancel={() => { setHearingModalOpen(false); setEditingHearingId(null); form.resetFields(); }}
            footer={null}
            destroyOnClose
          >
            <Form form={form} onFinish={handleHearingSubmit} layout="vertical">
              <Form.Item name="hearingDate" label="Hearing Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="hearingType" label="Stage" rules={[{ required: true, message: 'Please select a stage' }]}>
                <Select showSearch optionFilterProp="children" placeholder="Select a stage">
                  {STAGE_OPTIONS.map((type) => (
                    <Select.Option key={type.value} value={type.value}>{type.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="courtHall" label="Court Hall" rules={[{ required: true, message: 'Please enter court hall' }]}>
                <Input placeholder="e.g., Court Hall 5" />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={hearingSubmitting}
                disabled={hearingSubmitting}
              >
                {hearingSubmitting
                  ? (editingHearingId ? 'Updating...' : 'Scheduling...')
                  : (editingHearingId ? 'Update Hearing' : 'Schedule Hearing')
                }
              </Button>
            </Form>
          </Modal>
        </Suspense>
      )}

      {editModalOpen && (
        <Suspense fallback={null}>
          <Modal title="Edit Case" open={editModalOpen} onCancel={() => setEditModalOpen(false)} footer={null} width="min(800px, 95vw)" destroyOnClose centered>
            <Form form={editForm} onFinish={handleEditSubmit} layout="vertical">
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

              <Divider orientation="left" plain>Party Information</Divider>
              <p style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem', marginTop: '-4px', marginBottom: '12px' }}>
                Click on a party to mark them as your client
              </p>

              <Form.Item name="clientParty" hidden>
                <Input />
              </Form.Item>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <div
                    className={`party-card ${editClientParty === 'PETITIONER' ? 'selected' : ''}`}
                    onClick={() => handleEditSelectParty('PETITIONER')}
                  >
                    <div className="party-card-header">
                      <div className="party-card-title">
                        <div className="party-icon"><UserOutlined /></div>
                        Petitioner
                      </div>
                      <span className={`client-badge ${editClientParty === 'PETITIONER' ? 'visible' : ''}`}>
                        <CheckCircleFilled /> Our Client
                      </span>
                    </div>
                    <Form.Item name="petitionerName" rules={[{ required: true, message: 'Please enter petitioner name' }]} style={{ marginBottom: 0 }}>
                      <Input onClick={(e) => e.stopPropagation()} />
                    </Form.Item>
                    <div className={`phone-reveal ${editClientParty === 'PETITIONER' ? 'open' : ''}`}>
                      <Form.Item name="petitionerPhone" rules={[{ required: editClientParty === 'PETITIONER', message: 'Please enter petitioner phone' }]} style={{ marginBottom: 0 }}>
                        <Input placeholder="+91 98765 43210" onClick={(e) => e.stopPropagation()} />
                      </Form.Item>
                    </div>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div
                    className={`party-card ${editClientParty === 'RESPONDENT' ? 'selected' : ''}`}
                    onClick={() => handleEditSelectParty('RESPONDENT')}
                  >
                    <div className="party-card-header">
                      <div className="party-card-title">
                        <div className="party-icon"><UserOutlined /></div>
                        Respondent
                      </div>
                      <span className={`client-badge ${editClientParty === 'RESPONDENT' ? 'visible' : ''}`}>
                        <CheckCircleFilled /> Our Client
                      </span>
                    </div>
                    <Form.Item name="respondentName" rules={[{ required: true, message: 'Please enter respondent name' }]} style={{ marginBottom: 0 }}>
                      <Input onClick={(e) => e.stopPropagation()} />
                    </Form.Item>
                    <div className={`phone-reveal ${editClientParty === 'RESPONDENT' ? 'open' : ''}`}>
                      <Form.Item name="respondentPhone" rules={[{ required: editClientParty === 'RESPONDENT', message: 'Please enter respondent phone' }]} style={{ marginBottom: 0 }}>
                        <Input placeholder="+91 98765 43210" onClick={(e) => e.stopPropagation()} />
                      </Form.Item>
                    </div>
                  </div>
                </Col>
              </Row>

              <Divider orientation="left" plain>Court & Case Details</Divider>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={8}>
                  <Form.Item name="courtHall" label="Court Hall">
                    <Input placeholder="___Addl." />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item name="courtTypeId" label="Court Type">
                    <Select
                      showSearch
                      allowClear
                      placeholder="Select or search court type"
                      optionFilterProp="label"
                      options={courtTypes.map((ct) => ({ value: ct.id, label: ct.name }))}
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ display: 'flex', gap: 8, padding: '0 8px 8px' }}>
                            <Input
                              placeholder="New court type name"
                              value={newCourtName}
                              onChange={(e) => setNewCourtName(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                            <Button
                              type="text"
                              icon={<PlusOutlined />}
                              loading={addingCourtType}
                              onClick={handleAddCourtType}
                            >
                              Add
                            </Button>
                          </div>
                        </>
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="judgeAssigned" label="Judge Assigned">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="vakalat" label="Case Field / Vakalat">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="description" label="Case Description" rules={[{ required: true, message: 'Please enter description' }]}>
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

      <CloseCaseModal
        open={closeModalOpen}
        caseId={caseId}
        caseNumber={caseData.caseNumber}
        token={token || ''}
        onClose={() => setCloseModalOpen(false)}
        onSuccess={() => {
          setCloseModalOpen(false);
          fetchCaseDetail();
        }}
      />

      <DocumentViewer
        visible={viewerOpen}
        onClose={() => { setViewerOpen(false); setSelectedDocument(null); }}
        document={selectedDocument}
        token={token || ''}
      />

      {/* Camera Capture Modal - Mobile Only */}
      <CameraCapture
        caseId={caseId}
        visible={cameraModalOpen}
        onCancel={() => setCameraModalOpen(false)}
        onSuccess={() => {
          setCameraModalOpen(false);
          fetchCaseDetail(); // Refresh to show the new document
        }}
      />
    </DashboardLayout>
  );
}
