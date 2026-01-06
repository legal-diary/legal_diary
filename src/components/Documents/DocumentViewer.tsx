'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Modal, Spin, Button, Space, Alert } from 'antd';
import {
  DownloadOutlined,
  ExpandOutlined,
  CompressOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import mammoth from 'mammoth';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);

  // PDF specific states
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.75);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [windowHeight, setWindowHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize PDF options to prevent unnecessary reloads
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

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

  // Measure container width and window height for responsive PDF rendering
  // Use a debounced update to prevent rapid re-renders during fullscreen transition
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateDimensions = () => {
      // Clear any pending update
      if (timeoutId) clearTimeout(timeoutId);

      // Debounce the dimension updates to avoid rapid changes during transitions
      timeoutId = setTimeout(() => {
        if (containerRef.current) {
          const width = containerRef.current.clientWidth - 32; // Account for padding
          setContainerWidth(Math.max(300, Math.min(width, 1400)));
        }
        setWindowHeight(window.innerHeight);
      }, 100);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [visible, fullScreen]);

  // Calculate responsive modal width based on screen size
  const getModalWidth = useCallback(() => {
    if (typeof window === 'undefined') return '90vw';
    const screenWidth = window.innerWidth;

    if (fullScreen) {
      return '98vw';
    }

    // Mobile
    if (screenWidth < 576) {
      return '95vw';
    }
    // Tablet
    if (screenWidth < 992) {
      return '92vw';
    }
    // Desktop
    if (screenWidth < 1400) {
      return '85vw';
    }
    // Large screens / 4K
    return '80vw';
  }, [fullScreen]);

  // Calculate PDF container height based on screen size
  const getPdfContainerHeight = useCallback(() => {
    const headerFooterHeight = fullScreen ? 120 : 180; // Approximate modal header + footer + controls
    const availableHeight = windowHeight - headerFooterHeight;
    return Math.max(300, availableHeight);
  }, [windowHeight, fullScreen]);

  // Load content when modal opens
  useEffect(() => {
    if (!document || !visible) return;

    const category = getFileCategory(document.fileType);
    setLoading(true);
    setPdfLoading(true);
    setError(null);
    setPdfError(null);
    setSignedUrl(null);
    setNumPages(0);

    const loadContent = async () => {
      try {
        if (category === 'text') {
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
          const url = await fetchSignedUrl(document.id);
          if (url) {
            setSignedUrl(url);
          } else {
            setError('Failed to load document URL');
            setPdfLoading(false);
          }
        } else if (category === 'docx') {
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
      setPdfError(null);
      setLoading(true);
      setPdfLoading(true);
      setFullScreen(false);
      setNumPages(0);
      setScale(0.75);
    }
  }, [visible]);

  // PDF document load success
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(null);
  }, []);

  // PDF document load error
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setPdfError('Failed to load PDF. Please try downloading instead.');
    setPdfLoading(false);
  }, []);

  // Handle image load complete
  const handleImageLoad = useCallback(() => {
    setPdfLoading(false);
  }, []);

  // Refresh signed URL
  const handleRefreshUrl = async () => {
    if (!document) return;
    setLoading(true);
    setError(null);
    setPdfError(null);
    const url = await fetchSignedUrl(document.id);
    if (url) {
      setSignedUrl(url);
      setPdfLoading(true);
    } else {
      setError('Failed to refresh document URL');
    }
    setLoading(false);
  };

  // Zoom handlers
  const zoomIn = () => setScale((prev) => Math.min(3, prev + 0.25));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.25));
  const resetZoom = () => setScale(0.75);

  if (!document) return null;

  const category = getFileCategory(document.fileType);

  // Check if we're on a small screen
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 576;

  const renderPdfControls = () => {
    if (category !== 'pdf' || pdfLoading || pdfError) return null;

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'clamp(0.5rem, 1vw, 1rem)',
          padding: 'clamp(0.5rem, 1vw, 0.75rem)',
          background: '#f5f5f5',
          borderRadius: '0.5rem',
          marginBottom: 'clamp(0.5rem, 1vw, 0.75rem)',
        }}
      >
        {/* Page Count Info */}
        <span style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', color: '#666' }}>
          {numPages} {numPages === 1 ? 'page' : 'pages'}
        </span>

        {/* Zoom Controls */}
        <Space size={isSmallScreen ? 4 : 'small'}>
          <Button icon={<ZoomOutOutlined />} onClick={zoomOut} disabled={scale <= 0.5} size="small" />
          <Button onClick={resetZoom} size="small" style={{ minWidth: isSmallScreen ? '50px' : '60px' }}>
            {Math.round(scale * 100)}%
          </Button>
          <Button icon={<ZoomInOutlined />} onClick={zoomIn} disabled={scale >= 3} size="small" />
        </Space>
      </div>
    );
  };

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
          <div ref={containerRef} style={{ width: '100%' }}>
            {renderPdfControls()}

            {pdfError ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Alert
                  type="warning"
                  message={pdfError}
                  showIcon
                  style={{ marginBottom: '1rem' }}
                />
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  href={signedUrl || ''}
                  target="_blank"
                >
                  Download PDF
                </Button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  overflow: 'auto',
                  height: '100%',
                  background: '#525659',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                }}
              >
                {pdfLoading && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3rem',
                      gap: '1rem',
                    }}
                  >
                    <FilePdfOutlined style={{ fontSize: '3rem', color: '#ff4d4f' }} />
                    <Spin size="large" />
                    <div style={{ color: '#fff', fontSize: '0.95rem' }}>
                      Loading PDF...
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.85rem' }}>
                      {formatFileSize(document.fileSize)}
                    </div>
                  </div>
                )}

                <Document
                  key={signedUrl} // Stable key prevents remounting on fullscreen toggle
                  file={signedUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={null}
                  options={pdfOptions}
                >
                  {Array.from({ length: numPages }, (_, index) => (
                    <Page
                      key={`page-${index + 1}`}
                      pageNumber={index + 1}
                      scale={scale}
                      width={containerWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={
                        <div style={{ padding: '2rem', color: '#fff' }}>
                          <Spin /> Loading page {index + 1}...
                        </div>
                      }
                      error={
                        <div style={{ padding: '2rem', color: '#ff6b6b' }}>
                          Error loading page {index + 1}. Please try again.
                        </div>
                      }
                    />
                  ))}
                </Document>
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div
            style={{
              textAlign: 'center',
              overflow: 'auto',
              height: `${getPdfContainerHeight()}px`,
              maxHeight: fullScreen ? '88vh' : '72vh',
              position: 'relative',
            }}
          >
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
              padding: 'clamp(0.75rem, 2vw, 1.5rem)',
              borderRadius: '0.5rem',
              overflow: 'auto',
              height: `${getPdfContainerHeight()}px`,
              maxHeight: fullScreen ? '88vh' : '75vh',
              fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
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
              padding: 'clamp(1rem, 2vw, 2rem)',
              borderRadius: '0.5rem',
              overflow: 'auto',
              height: `${getPdfContainerHeight()}px`,
              maxHeight: fullScreen ? '88vh' : '75vh',
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
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
        <span style={{ fontSize: 'clamp(0.85rem, 2vw, 1.1rem)' }}>
          {document.fileName}
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={getModalWidth()}
      centered={!fullScreen}
      style={{
        top: fullScreen ? 5 : undefined,
        maxWidth: '100vw',
        margin: fullScreen ? '0 auto' : undefined,
      }}
      styles={{
        body: {
          height: '100%',
          overflow: 'auto',
        },
      }}
      footer={
        <Space wrap style={{ justifyContent: 'center', width: '100%' }}>
          <Button
            icon={fullScreen ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={() => setFullScreen(!fullScreen)}
            size={windowHeight < 600 ? 'small' : 'middle'}
          >
            {fullScreen ? 'Exit' : 'Full Screen'}
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            href={signedUrl || ''}
            target="_blank"
            disabled={!signedUrl}
            size={windowHeight < 600 ? 'small' : 'middle'}
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
