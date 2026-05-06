'use client';

import { useEffect, useState } from 'react';
import { Modal, Form, Input, Radio, Upload, Button, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { useAuth } from '@/context/AuthContext';
import RichTextEditor from './RichTextEditor';

interface JudgmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingJudgment?: {
    id: string;
    type: 'RESEARCH' | 'OFFICE_JUDGMENT';
    category: string;
    headnote: string;
    citation: string;
  } | null;
}

export default function JudgmentFormModal({
  open,
  onClose,
  onSuccess,
  editingJudgment,
}: JudgmentFormModalProps) {
  const { token } = useAuth();
  const [form] = Form.useForm();
  const [headnote, setHeadnote] = useState('');
  const [headnoteError, setHeadnoteError] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<RcFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingJudgment) {
      form.setFieldsValue({
        type: editingJudgment.type,
        category: editingJudgment.category,
        citation: editingJudgment.citation,
      });
      setHeadnote(editingJudgment.headnote);
    } else {
      form.resetFields();
      setHeadnote('');
      setPendingFiles([]);
    }
    setHeadnoteError(false);
  }, [open, editingJudgment, form]);

  const handleClose = () => {
    onClose();
    form.resetFields();
    setHeadnote('');
    setPendingFiles([]);
    setHeadnoteError(false);
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const isHeadnoteEmpty = !headnote || headnote.replace(/<[^>]*>/g, '').trim() === '';
    if (isHeadnoteEmpty) {
      setHeadnoteError(true);
      return;
    }
    setHeadnoteError(false);
    setSubmitting(true);

    try {
      let judgmentId: string;

      if (editingJudgment) {
        const res = await fetch(`/api/judgments/${editingJudgment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: values.type,
            category: values.category,
            headnote,
            citation: values.citation,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update judgment');
        }
        judgmentId = editingJudgment.id;
      } else {
        const res = await fetch('/api/judgments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: values.type,
            category: values.category,
            headnote,
            citation: values.citation,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create judgment');
        }
        const newJudgment = await res.json();
        judgmentId = newJudgment.id;

        if (pendingFiles.length > 0) {
          const formData = new FormData();
          pendingFiles.forEach((f) => formData.append('files', f));
          await fetch(`/api/judgments/${judgmentId}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
        }
      }

      message.success(
        editingJudgment ? 'Judgment updated' : 'Judgment created'
      );
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: '.pdf,.jpg,.jpeg,.png',
    multiple: true,
    beforeUpload: () => false,
    onChange(info) {
      const files = info.fileList
        .map((f: UploadFile) => f.originFileObj)
        .filter((f): f is RcFile => !!f);
      setPendingFiles(files);
    },
  };

  return (
    <Modal
      title={`Judgment (${editingJudgment ? 'Edit' : 'Create'})`}
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          style={{ background: '#1a3a52', borderColor: '#1a3a52' }}
        >
          Save
        </Button>,
      ]}
      width="min(90vw, 680px)"
      destroyOnClose={false}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: '1rem' }}
      >
        <Form.Item
          name="type"
          label="Type"
          rules={[{ required: true, message: 'Please select a type' }]}
        >
          <Radio.Group>
            <Radio value="RESEARCH">Research</Radio>
            <Radio value="OFFICE_JUDGMENT">Office Judgments</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Please enter a category' }]}
        >
          <Input placeholder="e.g. Family, Land" />
        </Form.Item>

        <Form.Item label="Headnote / Notes" required>
          <RichTextEditor
            value={headnote}
            onChange={(html) => {
              setHeadnote(html);
              if (html && html !== '<p></p>') setHeadnoteError(false);
            }}
            placeholder="Write headnote / notes here..."
            minHeight="180px"
          />
          {headnoteError && (
            <div
              style={{
                color: '#ff4d4f',
                fontSize: '0.85rem',
                marginTop: '0.25rem',
              }}
            >
              Please enter headnote / notes
            </div>
          )}
        </Form.Item>

        <Form.Item
          name="citation"
          label="Citation / Reference"
          rules={[
            { required: true, message: 'Please enter a citation / reference' },
          ]}
        >
          <Input placeholder="Enter citation / reference" />
        </Form.Item>

        {!editingJudgment && (
          <Form.Item label="Attachments">
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Click to upload or drag and drop
              </p>
              <p className="ant-upload-hint">
                PDF, JPG, PNG (Max. 10MB each)
              </p>
            </Upload.Dragger>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
