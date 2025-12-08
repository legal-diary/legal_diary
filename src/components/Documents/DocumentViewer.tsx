'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Spin, Button, Space, Alert } from 'antd';
import {
  DownloadOutlined,
  ExpandOutlined,
  CompressOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import mammoth from 'mammoth';

interface DocumentViewerProps {
  visible: boolean;
  onClose: () => void;
  document: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  } | null;
  token: string;
}

type FileCategory = 'pdf' | 'image' | 'text' | 'docx' | 'doc' | 'excel' | 'unsupported';

export default function DocumentViewer({
  visible,
  onClose,
  document,
  token,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);

  // Determine file category based on MIME type
  const getFileCategory = (fileType: string): FileCategory => {
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'text/plain') return 'text';
    if (
      fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
      return 'docx';
    if (fileType === 'application/msword') return 'doc';
    if (
      fileType === 'application/vnd.ms-excel' ||
      fileType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
      return 'excel';
    return 'unsupported';
  };

  // Load content when modal opens
  useEffect(() => {
    if (!document || !visible) return;

    const category = getFileCategory(document.fileType);
    setLoading(true);
    setError(null);

    if (category === 'text') {
      // Fetch text content from API
      fetch(`/api/documents/${document.id}/content`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.content) {
            setTextContent(data.content);
          } else {
            setError(data.error || 'Failed to load text content');
          }
        })
        .catch(() => setError('Failed to load document'))
        .finally(() => setLoading(false));
    } else if (category === 'docx') {
      // Fetch and convert DOCX using mammoth.js
      fetch(document.fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch document');
          return res.arrayBuffer();
        })
        .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
        .then((result) => {
          setDocxHtml(result.value);
          // Log any conversion warnings
          if (result.messages.length > 0) {
            console.warn('Mammoth conversion warnings:', result.messages);
          }
        })
        .catch((err) => {
          console.error('DOCX conversion error:', err);
          setError('Failed to load Word document');
        })
        .finally(() => setLoading(false));
    } else if (category === 'pdf' || category === 'image') {
      // PDF and images load directly, just clear loading state
      setLoading(false);
    } else {
      // Unsupported types
      setLoading(false);
    }
  }, [document, visible, token]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setTextContent(null);
      setDocxHtml(null);
      setError(null);
      setLoading(true);
      setFullScreen(false);
    }
  }, [visible]);

  if (!document) return null;

  const category = getFileCategory(document.fileType);

  const renderContent = () => {
    if (loading) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
          }}
        >
          <Spin size="large" tip="Loading document..." />
        </div>
      );
    }

    if (error) {
      return <Alert type="error" message={error} showIcon />;
    }

    switch (category) {
      case 'pdf':
        return (
          <iframe
            src={document.fileUrl}
            style={{
              width: '100%',
              height: fullScreen ? '85vh' : '70vh',
              border: 'none',
              borderRadius: '0.5rem',
            }}
            title={document.fileName}
          />
        );

      case 'image':
        return (
          <div
            style={{
              textAlign: 'center',
              overflow: 'auto',
              maxHeight: fullScreen ? '85vh' : '70vh',
            }}
          >
            <img
              src={document.fileUrl}
              alt={document.fileName}
              style={{
                maxWidth: '100%',
                maxHeight: fullScreen ? '80vh' : '65vh',
                objectFit: 'contain',
                borderRadius: '0.5rem',
              }}
            />
          </div>
        );

      case 'text':
        return (
          <pre
            style={{
              background: '#fafafa',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              overflow: 'auto',
              maxHeight: fullScreen ? '85vh' : '70vh',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            }}
          >
            {textContent}
          </pre>
        );

      case 'docx':
        return (
          <div
            style={{
              background: '#ffffff',
              padding: '2rem',
              borderRadius: '0.5rem',
              overflow: 'auto',
              maxHeight: fullScreen ? '85vh' : '70vh',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              lineHeight: '1.6',
              fontFamily: 'Calibri, Arial, sans-serif',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
            }}
            dangerouslySetInnerHTML={{ __html: docxHtml || '' }}
          />
        );

      case 'doc':
        return (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <FileWordOutlined
              style={{ fontSize: '4rem', color: '#2b579a', marginBottom: '1rem' }}
            />
            <p
              style={{ fontSize: '1rem', color: '#666', marginBottom: '0.5rem' }}
            >
              Legacy .doc format is not supported for in-browser preview.
            </p>
            <p
              style={{ fontSize: '0.9rem', color: '#999', marginBottom: '1.5rem' }}
            >
              Please convert to .docx format or download to view in Microsoft
              Word.
            </p>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              href={document.fileUrl}
              target="_blank"
            >
              Download to View
            </Button>
          </div>
        );

      case 'excel':
        return (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <FileExcelOutlined
              style={{ fontSize: '4rem', color: '#217346', marginBottom: '1rem' }}
            />
            <p
              style={{ fontSize: '1rem', color: '#666', marginBottom: '0.5rem' }}
            >
              Excel files cannot be previewed in the browser.
            </p>
            <p
              style={{ fontSize: '0.9rem', color: '#999', marginBottom: '1.5rem' }}
            >
              Please download to view in Microsoft Excel or Google Sheets.
            </p>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              href={document.fileUrl}
              target="_blank"
            >
              Download to View
            </Button>
          </div>
        );

      default:
        return (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <FileTextOutlined
              style={{ fontSize: '4rem', color: '#666', marginBottom: '1rem' }}
            />
            <p
              style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}
            >
              Preview is not available for this file type.
            </p>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              href={document.fileUrl}
              target="_blank"
            >
              Download to View
            </Button>
          </div>
        );
    }
  };

  return (
    <Modal
      title={
        <span style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
          {document.fileName}
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={fullScreen ? '95vw' : '80vw'}
      style={{ top: fullScreen ? 20 : 50 }}
      footer={
        <Space>
          <Button
            icon={fullScreen ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={() => setFullScreen(!fullScreen)}
          >
            {fullScreen ? 'Exit Full Screen' : 'Full Screen'}
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            href={document.fileUrl}
            target="_blank"
          >
            Download
          </Button>
        </Space>
      }
    >
      {renderContent()}
    </Modal>
  );
}
