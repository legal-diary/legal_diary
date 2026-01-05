'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Spin, Button, Space, Alert, Progress } from 'antd';
import {
  DownloadOutlined,
  ExpandOutlined,
  CompressOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  ReloadOutlined,
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

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentViewer({
  visible,
  onClose,
  document,
  token,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(true); // Separate state for PDF iframe loading
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0); // Progress for visual feedback

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

  // Fetch signed URL from Supabase
  const fetchSignedUrl = async (docId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/documents/${docId}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.url) {
        return data.url;
      } else {
        console.error('Failed to get signed URL:', data.error);
        return null;
      }
    } catch (err) {
      console.error('Error fetching signed URL:', err);
      return null;
    }
  };

  // Simulate progress for better UX during loading
  useEffect(() => {
    if (!loading && !pdfLoading) {
      setLoadProgress(100);
      return;
    }

    if (loading || pdfLoading) {
      setLoadProgress(0);
      const interval = setInterval(() => {
        setLoadProgress((prev) => {
          // Slow down as we approach 90% (never reach 100 until actually loaded)
          if (prev >= 90) return prev;
          const increment = prev < 30 ? 10 : prev < 60 ? 5 : prev < 80 ? 2 : 1;
          return Math.min(prev + increment, 90);
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [loading, pdfLoading]);

  // Load content when modal opens
  useEffect(() => {
    if (!document || !visible) return;

    const category = getFileCategory(document.fileType);
    setLoading(true);
    setPdfLoading(true);
    setLoadProgress(0);
    setError(null);
    setSignedUrl(null);

    const loadContent = async () => {
      try {
        if (category === 'text') {
          // Fetch text content from API
          const response = await fetch(`/api/documents/${document.id}/content`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.content) {
            setTextContent(data.content);
          } else {
            setError(data.error || 'Failed to load text content');
          }
          setPdfLoading(false);
        } else if (category === 'pdf' || category === 'image') {
          // Fetch signed URL for PDF and images
          const url = await fetchSignedUrl(document.id);
          if (url) {
            setSignedUrl(url);
            // For PDFs, keep pdfLoading true until iframe loads
            // For images, we'll handle it in onLoad
          } else {
            setError('Failed to load document URL');
            setPdfLoading(false);
          }
        } else if (category === 'docx') {
          // Fetch signed URL first, then convert DOCX using mammoth.js
          const url = await fetchSignedUrl(document.id);
          if (url) {
            setSignedUrl(url);
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch document');
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setDocxHtml(result.value);
            if (result.messages.length > 0) {
              console.warn('Mammoth conversion warnings:', result.messages);
            }
          } else {
            setError('Failed to load document URL');
          }
          setPdfLoading(false);
        } else if (category === 'doc' || category === 'excel') {
          // For download-only files, just get the signed URL
          const url = await fetchSignedUrl(document.id);
          if (url) {
            setSignedUrl(url);
          } else {
            setError('Failed to generate download URL');
          }
          setPdfLoading(false);
        } else {
          setPdfLoading(false);
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
        setPdfLoading(false);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [document, visible, token]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setTextContent(null);
      setDocxHtml(null);
      setSignedUrl(null);
      setError(null);
      setLoading(true);
      setPdfLoading(true);
      setLoadProgress(0);
      setFullScreen(false);
    }
  }, [visible]);

  // Handle PDF/Image iframe load complete
  const handleIframeLoad = useCallback(() => {
    setPdfLoading(false);
    setLoadProgress(100);
  }, []);

  // Handle image load complete
  const handleImageLoad = useCallback(() => {
    setPdfLoading(false);
    setLoadProgress(100);
  }, []);

  // Refresh signed URL (useful if it expires)
  const handleRefreshUrl = async () => {
    if (!document) return;
    setLoading(true);
    setError(null);
    const url = await fetchSignedUrl(document.id);
    if (url) {
      setSignedUrl(url);
    } else {
      setError('Failed to refresh document URL');
    }
    setLoading(false);
  };

  if (!document) return null;

  const category = getFileCategory(document.fileType);

  const renderContent = () => {
    // Show initial loading only when fetching signed URL
    if (loading && !signedUrl) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
            gap: '1rem',
          }}
        >
          <Spin size="large" />
          <div style={{ color: '#666', fontSize: '0.95rem' }}>
            Preparing document...
          </div>
          {document && (
            <div style={{ color: '#999', fontSize: '0.85rem' }}>
              {formatFileSize(document.fileSize)}
            </div>
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: '1rem' }}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefreshUrl}>
            Retry
          </Button>
        </div>
      );
    }

    switch (category) {
      case 'pdf':
        return (
          <div style={{ position: 'relative' }}>
            {/* Loading overlay - shows while PDF is loading in iframe */}
            {pdfLoading && signedUrl && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.95)',
                  zIndex: 10,
                  borderRadius: '0.5rem',
                  gap: '1rem',
                }}
              >
                <FilePdfOutlined style={{ fontSize: '3rem', color: '#ff4d4f' }} />
                <div style={{ width: '60%', maxWidth: '300px' }}>
                  <Progress
                    percent={loadProgress}
                    status="active"
                    strokeColor={{ from: '#ff4d4f', to: '#ff7875' }}
                    showInfo={false}
                  />
                </div>
                <div style={{ color: '#666', fontSize: '0.95rem' }}>
                  Loading PDF...
                </div>
                <div style={{ color: '#999', fontSize: '0.85rem' }}>
                  {formatFileSize(document.fileSize)}
                </div>
              </div>
            )}
            <iframe
              src={signedUrl || ''}
              style={{
                width: '100%',
                height: fullScreen ? '85vh' : '70vh',
                border: 'none',
                borderRadius: '0.5rem',
                background: '#f5f5f5',
              }}
              title={document.fileName}
              onLoad={handleIframeLoad}
            />
          </div>
        );

      case 'image':
        return (
          <div
            style={{
              textAlign: 'center',
              overflow: 'auto',
              maxHeight: fullScreen ? '85vh' : '70vh',
              position: 'relative',
            }}
          >
            {/* Loading overlay for images */}
            {pdfLoading && signedUrl && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.9)',
                  zIndex: 10,
                  gap: '0.5rem',
                }}
              >
                <Spin size="large" />
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Loading image...</div>
              </div>
            )}
            <img
              src={signedUrl || ''}
              alt={document.fileName}
              style={{
                maxWidth: '100%',
                maxHeight: fullScreen ? '80vh' : '65vh',
                objectFit: 'contain',
                borderRadius: '0.5rem',
              }}
              onLoad={handleImageLoad}
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
              href={signedUrl || ''}
              target="_blank"
              disabled={!signedUrl}
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
              href={signedUrl || ''}
              target="_blank"
              disabled={!signedUrl}
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
              href={signedUrl || ''}
              target="_blank"
              disabled={!signedUrl}
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
            href={signedUrl || ''}
            target="_blank"
            disabled={!signedUrl}
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
