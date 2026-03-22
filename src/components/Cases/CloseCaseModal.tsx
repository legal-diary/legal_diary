'use client';

import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, Typography } from 'antd';
import { UploadOutlined, LockOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { apiHeaders } from '@/lib/apiClient';

const { Text } = Typography;

interface CloseCaseModalProps {
  open: boolean;
  caseId: string;
  caseNumber: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CloseCaseModal: React.FC<CloseCaseModalProps> = ({
  open,
  caseId,
  caseNumber,
  token,
  onClose,
  onSuccess,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (fileList.length === 0) {
      message.error('Please upload the final order document');
      return;
    }

    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.error('Invalid file');
      return;
    }

    setClosing(true);
    try {
      const formData = new FormData();
      formData.append('finalOrder', file);

      const response = await fetch(`/api/cases/${caseId}/close`, {
        method: 'POST',
        headers: {
          ...apiHeaders(),
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to close case');
      }

      message.success('Case closed successfully');
      setFileList([]);
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to close case';
      message.error(errorMessage);
    } finally {
      setClosing(false);
    }
  };

  const handleCancel = () => {
    setFileList([]);
    onClose();
  };

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LockOutlined style={{ color: '#ff4d4f' }} />
          Close Case - {caseNumber}
        </span>
      }
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={closing}>
          Cancel
        </Button>,
        <Button
          key="close"
          type="primary"
          danger
          onClick={handleClose}
          loading={closing}
          disabled={fileList.length === 0}
          icon={<LockOutlined />}
        >
          Close Case
        </Button>,
      ]}
      destroyOnClose
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: '16px' }}
        message="This action will make the case read-only"
        description="Once closed, no further edits, hearings, or document uploads will be allowed. An admin can re-open the case later if needed."
      />

      <div style={{ marginBottom: '8px' }}>
        <Text strong>Upload Final Order Document <Text type="danger">*</Text></Text>
      </div>
      <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '0.85rem' }}>
        A final order document is required to close the case. Allowed formats: PDF, Word, JPEG, PNG.
      </Text>

      <Upload.Dragger
        fileList={fileList}
        beforeUpload={(file) => {
          const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
          ];
          if (!allowedTypes.includes(file.type)) {
            message.error('Only PDF, Word, JPEG, and PNG files are allowed');
            return Upload.LIST_IGNORE;
          }
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            message.error('File must be smaller than 10MB');
            return Upload.LIST_IGNORE;
          }
          setFileList([{ ...file, originFileObj: file, uid: file.uid || '-1', name: file.name }]);
          return false; // Prevent auto-upload
        }}
        onRemove={() => {
          setFileList([]);
        }}
        maxCount={1}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      >
        <p className="ant-upload-drag-icon">
          <UploadOutlined style={{ color: '#d4af37', fontSize: '32px' }} />
        </p>
        <p className="ant-upload-text">Click or drag final order document here</p>
      </Upload.Dragger>
    </Modal>
  );
};

export default CloseCaseModal;
