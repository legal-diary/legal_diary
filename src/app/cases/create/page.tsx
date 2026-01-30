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
import { UploadOutlined, CameraOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';

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
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

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

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Create case
      const caseResponse = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!caseResponse.ok) {
        throw new Error('Failed to create case');
      }

      const caseData = await caseResponse.json();
      setCreatedCaseId(caseData.id);

      // Upload regular files if any
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch(`/api/cases/${caseData.id}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          message.warning('Case created but file upload failed');
        }
      }

      // Upload captured images (scanned documents) if any
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

  // Handle camera capture success (for after case creation)
  const handleCameraSuccess = () => {
    setCameraModalOpen(false);
    message.success('Images captured! They will be uploaded when you create the case.');
  };

  // Temporary camera capture for storing images before case creation
  const handleTempCapture = (images: Blob[]) => {
    setCapturedImages(prev => [...prev, ...images]);
    setCameraModalOpen(false);
  };

  const handleFileUpload = (info: any) => {
    const fileList = info.fileList.map((file: any) => file.originFileObj);
    setUploadedFiles(fileList);
  };

  return (
    <DashboardLayout>
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
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="caseNumber"
                  label="Case Number"
                  rules={[
                    {
                      required: true,
                      message: 'Please enter case number',
                    },
                  ]}
                >
                  <Input placeholder="e.g., CS/2024/001" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="caseTitle"
                  label="Case Title"
                  rules={[
                    {
                      required: true,
                      message: 'Please enter case title',
                    },
                  ]}
                >
                  <Input placeholder="Brief title of the case" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Client Information</Divider>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="clientName"
                  label="Client Name"
                  rules={[
                    {
                      required: true,
                      message: 'Please enter client name',
                    },
                  ]}
                >
                  <Input placeholder="Full name of the client" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="clientEmail"
                  label="Client Email"
                  rules={[
                    { type: 'email', message: 'Please enter valid email' },
                  ]}
                >
                  <Input type="email" placeholder="client@email.com" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="clientPhone"
                  label="Client Phone"
                >
                  <Input placeholder="+1 (555) 000-0000" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Case Details</Divider>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="courtName"
                  label="Court Name"
                >
                  <Input placeholder="e.g., High Court of Delhi" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="judgeAssigned"
                  label="Judge Assigned"
                >
                  <Input placeholder="Judge's name" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="opponents"
                  label="Opponents"
                >
                  <Input placeholder="Comma-separated list of opponents" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="priority"
                  label="Priority"
                  initialValue="MEDIUM"
                  rules={[
                    {
                      required: true,
                      message: 'Please select priority',
                    },
                  ]}
                >
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
            >
              <Input.TextArea
                rows={4}
                placeholder="Detailed description of the case, facts, and legal issues..."
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
                  <Button icon={<UploadOutlined />}>
                    Upload Files
                  </Button>
                </Upload>

                {/* Mobile-only: Scan Document button */}
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

              {/* Show captured images count */}
              {capturedImages.length > 0 && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#52c41a',
                }}>
                  {capturedImages.length} scanned page{capturedImages.length !== 1 ? 's' : ''} ready to upload
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
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                Create Case
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>

      {/* Camera Capture Modal - Mobile Only */}
      <CameraCapture
        visible={cameraModalOpen}
        onCancel={() => setCameraModalOpen(false)}
        onSuccess={() => {
          setCameraModalOpen(false);
          message.success('Images captured! They will be processed when you create the case.');
        }}
        onCaptureComplete={(images) => {
          setCapturedImages(prev => [...prev, ...images]);
        }}
      />
    </DashboardLayout>
  );
}
