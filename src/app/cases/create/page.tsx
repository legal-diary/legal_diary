'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Upload,
  message,
  Spin,
  Row,
  Col,
  Divider,
} from 'antd';
import { UploadOutlined, CameraOutlined, PlusOutlined, UserOutlined, CheckCircleFilled } from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';

interface CourtTypeOption {
  id: string;
  name: string;
}

export default function CreateCasePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLDivElement>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [capturedImages, setCapturedImages] = useState<Blob[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const [courtTypes, setCourtTypes] = useState<CourtTypeOption[]>([]);
  const [courtTypesLoading, setCourtTypesLoading] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [addingCourtType, setAddingCourtType] = useState(false);

  const [clientParty, setClientParty] = useState<'PETITIONER' | 'RESPONDENT'>('PETITIONER');

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

  useEffect(() => {
    if (token) fetchCourtTypes();
  }, [token]);

  const fetchCourtTypes = async () => {
    setCourtTypesLoading(true);
    try {
      const res = await fetch('/api/court-types', { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setCourtTypes(data);
      }
    } catch {
      // silent fail
    } finally {
      setCourtTypesLoading(false);
    }
  };

  const handleAddCourtType = async () => {
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
        form.setFieldsValue({ courtTypeId: ct.id });
        setNewCourtName('');
        message.success('Court type added');
      }
    } catch {
      message.error('Failed to add court type');
    } finally {
      setAddingCourtType(false);
    }
  };

  const handleSelectParty = (party: 'PETITIONER' | 'RESPONDENT') => {
    setClientParty(party);
    form.setFieldsValue({ clientParty: party });
    // Clear the other party's phone when switching, to avoid stale required validation
    if (party === 'PETITIONER') {
      form.setFieldsValue({ respondentPhone: undefined });
    } else {
      form.setFieldsValue({ petitionerPhone: undefined });
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Petitioner/respondent numbers are a UI-only convenience: if the user
      // typed a number, prefix it to the corresponding name (e.g. "1. John
      // Doe") before sending. The number fields themselves never go to the
      // server.
      const {
        petitionerNumber,
        respondentNumber,
        petitionerName,
        respondentName,
        ...rest
      } = values;

      const prefixed = (n: unknown, name: string) => {
        const num = typeof n === 'string' ? n.trim() : n != null ? String(n).trim() : '';
        return num ? `${num}. ${name}` : name;
      };

      const payload = {
        ...rest,
        petitionerName: prefixed(petitionerNumber, petitionerName),
        respondentName: prefixed(respondentNumber, respondentName),
      };

      const caseResponse = await fetch('/api/cases', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });

      if (!caseResponse.ok) {
        throw new Error('Failed to create case');
      }

      const caseData = await caseResponse.json();

      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach((file) => formData.append('files', file));

        const uploadResponse = await fetch(`/api/cases/${caseData.id}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          message.warning('Case created but file upload failed');
        }
      }

      if (capturedImages.length > 0) {
        const imageFormData = new FormData();
        capturedImages.forEach((blob, index) => {
          imageFormData.append('images', blob, `scanned-page-${index + 1}.jpg`);
        });

        const scanResponse = await fetch(`/api/cases/${caseData.id}/upload-images`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: imageFormData,
        });

        if (!scanResponse.ok) {
          message.warning('Case created but scanned document upload failed');
        } else {
          message.success('Scanned document processed with OCR');
        }
      }

      message.success('Case created successfully');
      router.push('/cases');
    } catch (error) {
      message.error('Failed to create case');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (info: any) => {
    const fileList = info.fileList.map((file: any) => file.originFileObj);
    setUploadedFiles(fileList);
  };

  const isPetitionerClient = clientParty === 'PETITIONER';
  const isRespondentClient = clientParty === 'RESPONDENT';

  return (
    <DashboardLayout>
      <style jsx global>{`
        .party-card {
          border: 2px solid #e8e8e8;
          border-radius: 12px;
          padding: clamp(16px, 3vw, 24px);
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          background: #fff;
          min-height: 120px;
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
          margin-bottom: 12px;
        }

        .party-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: clamp(0.9rem, 2.5vw, 1.05rem);
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
          font-size: 0.7rem;
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
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
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

      <Card
        title={<span style={{ fontSize: 'clamp(1rem, 3vw, 1.3rem)' }}>Create New Case</span>}
        style={{ maxWidth: 'min(900px, 95vw)', margin: '0 auto' }}
        styles={{ body: { padding: 'clamp(12px, 4vw, 24px)' } }}
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            onFinish={onFinish}
            layout="vertical"
            size="large"
            initialValues={{ clientParty: 'PETITIONER', priority: 'MEDIUM' }}
          >
            <Form.Item name="clientParty" hidden>
              <Input />
            </Form.Item>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="caseNumber"
                  label="Case Number"
                  rules={[{ required: true, message: 'Please enter case number' }]}
                >
                  <Input placeholder="e.g., CS/2024/001" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Party Information</Divider>
            <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', marginTop: '-8px', marginBottom: '16px' }}>
              Click on a party to mark them as your client
            </p>

            <Row gutter={[16, 16]}>
              {/* Petitioner Card */}
              <Col xs={24} md={12}>
                <div
                  className={`party-card ${isPetitionerClient ? 'selected' : ''}`}
                  onClick={() => handleSelectParty('PETITIONER')}
                >
                  <div className="party-card-header">
                    <div className="party-card-title">
                      <div className="party-icon">
                        <UserOutlined />
                      </div>
                      Petitioner
                    </div>
                    <span className={`client-badge ${isPetitionerClient ? 'visible' : ''}`}>
                      <CheckCircleFilled /> Our Client
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Form.Item
                      name="petitionerNumber"
                      style={{ marginBottom: 0, width: 72, flexShrink: 0 }}
                      getValueFromEvent={(e) => e.target.value.replace(/\D/g, '')}
                    >
                      <Input
                        placeholder="No."
                        inputMode="numeric"
                        maxLength={4}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Form.Item>
                    <Form.Item
                      name="petitionerName"
                      rules={[{ required: true, message: 'Please enter petitioner name' }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input
                        placeholder="Full name of the petitioner"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Form.Item>
                  </div>

                  <div className={`phone-reveal ${isPetitionerClient ? 'open' : ''}`}>
                    <Form.Item
                      name="petitionerPhone"
                      rules={[
                        {
                          required: isPetitionerClient,
                          message: 'Please enter petitioner phone',
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder="+91 98765 43210"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Form.Item>
                  </div>
                </div>
              </Col>

              {/* Respondent Card */}
              <Col xs={24} md={12}>
                <div
                  className={`party-card ${isRespondentClient ? 'selected' : ''}`}
                  onClick={() => handleSelectParty('RESPONDENT')}
                >
                  <div className="party-card-header">
                    <div className="party-card-title">
                      <div className="party-icon">
                        <UserOutlined />
                      </div>
                      Respondent
                    </div>
                    <span className={`client-badge ${isRespondentClient ? 'visible' : ''}`}>
                      <CheckCircleFilled /> Our Client
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Form.Item
                      name="respondentNumber"
                      style={{ marginBottom: 0, width: 72, flexShrink: 0 }}
                      getValueFromEvent={(e) => e.target.value.replace(/\D/g, '')}
                    >
                      <Input
                        placeholder="No."
                        inputMode="numeric"
                        maxLength={4}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Form.Item>
                    <Form.Item
                      name="respondentName"
                      rules={[{ required: true, message: 'Please enter respondent name' }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input
                        placeholder="Full name of the respondent"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Form.Item>
                  </div>

                  <div className={`phone-reveal ${isRespondentClient ? 'open' : ''}`}>
                    <Form.Item
                      name="respondentPhone"
                      rules={[
                        {
                          required: isRespondentClient,
                          message: 'Please enter respondent phone',
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder="+91 98765 43210"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Form.Item>
                  </div>
                </div>
              </Col>
            </Row>

            <Divider>Case Details</Divider>

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
                    loading={courtTypesLoading}
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
                  <Input placeholder="Judge's name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="vakalat" label="Case Field / Vakalat">
                  <Input placeholder="Enter vakalat details" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="priority" label="Priority (optional)">
                  <Select>
                    <Select.Option value="LOW">Low</Select.Option>
                    <Select.Option value="MEDIUM">Medium</Select.Option>
                    <Select.Option value="HIGH">High</Select.Option>
                    <Select.Option value="URGENT">Urgent</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Case Description"
              rules={[{ required: true, message: 'Please enter case description' }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Detailed description of the case, facts, and legal issues..."
              />
            </Form.Item>

            <Form.Item
              name="tasks"
              label="Tasks"
              rules={[{ required: true, message: 'Please enter at least one task' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="List the initial action items for this case — drafting, notices, filings, etc."
              />
            </Form.Item>

            <Divider>Documents</Divider>

            <Form.Item
              label="Upload Case Documents"
              extra="You can upload PDF, Word documents, or scan documents using your camera"
            >
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Upload
                  onChange={handleFileUpload}
                  multiple
                  maxCount={10}
                  beforeUpload={() => false}
                  showUploadList={true}
                >
                  <Button icon={<UploadOutlined />}>Upload Files</Button>
                </Upload>

                {isMobile && (
                  <Button
                    icon={<CameraOutlined />}
                    onClick={() => setCameraModalOpen(true)}
                    style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                  >
                    Scan Document
                  </Button>
                )}
              </div>

              {capturedImages.length > 0 && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    color: '#52c41a',
                  }}
                >
                  {capturedImages.length} scanned page{capturedImages.length !== 1 ? 's' : ''} ready
                  to upload
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => setCapturedImages([])}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                Create Case
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>

      <CameraCapture
        visible={cameraModalOpen}
        onCancel={() => setCameraModalOpen(false)}
        onSuccess={() => {
          setCameraModalOpen(false);
          message.success('Images captured! They will be processed when you create the case.');
        }}
        onCaptureComplete={(images) => {
          setCapturedImages((prev) => [...prev, ...images]);
        }}
      />
    </DashboardLayout>
  );
}
