'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, Button, message, Progress, Spin } from 'antd';
import {
  CameraOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import styles from './CameraCapture.module.css';

interface CameraCaptureProps {
  caseId?: string; // Optional - if not provided, operates in "capture only" mode
  onSuccess: () => void;
  onCancel: () => void;
  visible: boolean;
  onCaptureComplete?: (images: Blob[]) => void; // Called in capture-only mode with the captured images
}

interface CapturedImage {
  id: string;
  dataUrl: string;
  blob: Blob;
}

type ProcessingStatus = 'idle' | 'capturing' | 'processing' | 'uploading' | 'ocr' | 'generating';

const CameraCapture: React.FC<CameraCaptureProps> = ({
  caseId,
  onSuccess,
  onCancel,
  visible,
  onCaptureComplete,
}) => {
  // Determine mode: "upload" (has caseId) or "capture-only" (no caseId)
  const isCaptureOnlyMode = !caseId;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Start camera when modal opens
  useEffect(() => {
    if (visible) {
      startCamera();
    } else {
      stopCamera();
      // Reset state when modal closes
      setCapturedImages([]);
      setProcessingStatus('idle');
      setUploadProgress(0);
      setCameraError(null);
    }

    return () => {
      stopCamera();
    };
  }, [visible, facingMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraReady(false);

      // Stop any existing stream first
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (error: unknown) {
      console.error('Camera error:', error);
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Failed to access camera. Please try again.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    setProcessingStatus('capturing');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const newImage: CapturedImage = {
            id: `img-${Date.now()}`,
            dataUrl,
            blob,
          };
          setCapturedImages(prev => [...prev, newImage]);
          message.success(`Page ${capturedImages.length + 1} captured`);
        }
        setProcessingStatus('idle');
      },
      'image/jpeg',
      0.85
    );
  }, [cameraReady, capturedImages.length]);

  const deleteImage = (id: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleUpload = async () => {
    if (capturedImages.length === 0) {
      message.warning('Please capture at least one image');
      return;
    }

    // Capture-only mode: return images without uploading
    if (isCaptureOnlyMode) {
      const blobs = capturedImages.map(img => img.blob);
      if (onCaptureComplete) {
        onCaptureComplete(blobs);
      }
      setCapturedImages([]);
      onSuccess();
      return;
    }

    // Upload mode: requires caseId and token
    const token = localStorage.getItem('authToken');
    if (!token) {
      message.error('Please login again');
      return;
    }

    try {
      setProcessingStatus('uploading');
      setUploadProgress(10);

      // Create FormData with all images
      const formData = new FormData();
      capturedImages.forEach((img, index) => {
        formData.append('images', img.blob, `page-${index + 1}.jpg`);
      });

      setUploadProgress(20);
      setProcessingStatus('processing');

      // Upload to API
      const response = await fetch(`/api/cases/${caseId}/upload-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      setUploadProgress(60);
      setProcessingStatus('ocr');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setUploadProgress(90);
      setProcessingStatus('generating');

      const result = await response.json();
      setUploadProgress(100);

      message.success(`Document created with ${result.document.pageCount} pages`);

      // Reset and close
      setCapturedImages([]);
      setProcessingStatus('idle');
      onSuccess();
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const err = error as Error;
      message.error(err.message || 'Failed to create document');
      setProcessingStatus('idle');
      setUploadProgress(0);
    }
  };

  const getStatusText = () => {
    switch (processingStatus) {
      case 'capturing':
        return 'Capturing...';
      case 'uploading':
        return 'Uploading images...';
      case 'processing':
        return 'Processing images...';
      case 'ocr':
        return 'Extracting text (OCR)...';
      case 'generating':
        return 'Creating PDF...';
      default:
        return '';
    }
  };

  const isProcessing = processingStatus !== 'idle' && processingStatus !== 'capturing';

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width="100%"
      style={{ top: 0, padding: 0, maxWidth: '100vw' }}
      styles={{
        body: { padding: 0, height: '100dvh', background: '#000' },
        content: { borderRadius: 0, height: '100dvh' },
      }}
      closable={false}
      destroyOnClose
    >
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onCancel}
            className={styles.closeButton}
            disabled={isProcessing}
          />
          <span className={styles.title}>Scan Document</span>
          <Button
            type="text"
            icon={<SyncOutlined />}
            onClick={switchCamera}
            className={styles.switchButton}
            disabled={isProcessing || !cameraReady}
          />
        </div>

        {/* Camera Preview */}
        <div className={styles.cameraContainer}>
          {/* Always render video so ref is available for stream attachment */}
          <video
            ref={videoRef}
            className={styles.video}
            playsInline
            muted
            autoPlay
            style={{ display: cameraReady && !cameraError ? 'block' : 'none' }}
          />

          {cameraError ? (
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>{cameraError}</p>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={startCamera}
              >
                Try Again
              </Button>
            </div>
          ) : !cameraReady ? (
            <div className={styles.loadingContainer}>
              <Spin size="large" />
              <p>Starting camera...</p>
            </div>
          ) : null}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Captured Images Thumbnails */}
        {capturedImages.length > 0 && (
          <div className={styles.thumbnailContainer}>
            <div className={styles.thumbnailScroll}>
              {capturedImages.map((img, index) => (
                <div key={img.id} className={styles.thumbnail}>
                  <img src={img.dataUrl} alt={`Page ${index + 1}`} />
                  <span className={styles.pageNumber}>{index + 1}</span>
                  <button
                    className={styles.deleteButton}
                    onClick={() => deleteImage(img.id)}
                    disabled={isProcessing}
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              ))}
            </div>
            <span className={styles.pageCount}>
              {capturedImages.length} page{capturedImages.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className={styles.processingOverlay}>
            <div className={styles.processingContent}>
              <Spin size="large" />
              <p className={styles.processingText}>{getStatusText()}</p>
              <Progress
                percent={uploadProgress}
                status="active"
                strokeColor="#1890ff"
                className={styles.progressBar}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actionBar}>
          <Button
            type="primary"
            size="large"
            icon={<CameraOutlined />}
            onClick={captureImage}
            disabled={!cameraReady || isProcessing}
            className={styles.captureButton}
          >
            Capture
          </Button>

          {capturedImages.length > 0 && (
            <Button
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              onClick={handleUpload}
              disabled={isProcessing}
              className={styles.uploadButton}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              {isCaptureOnlyMode
                ? `Save (${capturedImages.length})`
                : `Create PDF (${capturedImages.length})`
              }
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CameraCapture;
