'use client';

import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Form, Input, DatePicker, Select, Button, message, Row, Col, Space } from 'antd';
import { EditOutlined, PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authHeaders } from '@/lib/apiClient';
import { STAGE_OPTIONS, HEARING_STATUS_OPTIONS } from '@/lib/constants';

const Modal = lazy(() => import('antd').then(mod => ({ default: mod.Modal })));

const { TextArea } = Input;
const { Option } = Select;

interface CaseOption {
  id: string;
  caseNumber: string;
  caseTitle: string;
}

interface EditingHearing {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingType: string;
  courtHall: string;
  notes?: string | null;
  status?: string;
}

interface HearingFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cases: CaseOption[];
  token: string | null;
  editingHearing?: EditingHearing | null;
  initialDate?: dayjs.Dayjs;
  /** Show the status field (useful for editing existing hearings) */
  showStatus?: boolean;
  /** Show success animation after submit (calendar style) */
  showSuccessAnimation?: boolean;
  /** Called when case selection changes */
  onCaseChange?: (caseId: string) => void;
}

export default function HearingFormModal({
  open,
  onClose,
  onSuccess,
  cases,
  token,
  editingHearing,
  initialDate,
  showStatus = false,
  showSuccessAnimation = false,
  onCaseChange,
}: HearingFormModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isEditMode = !!editingHearing;

  // Pre-fill form when editing or when initialDate changes
  useEffect(() => {
    if (!open) return;

    if (editingHearing) {
      form.setFieldsValue({
        caseId: editingHearing.caseId,
        hearingDate: dayjs(editingHearing.hearingDate),
        hearingType: editingHearing.hearingType,
        courtHall: editingHearing.courtHall,
        notes: editingHearing.notes,
        status: editingHearing.status || 'UPCOMING',
      });
    } else {
      form.resetFields();
      if (initialDate) {
        form.setFieldsValue({ hearingDate: initialDate });
      }
    }
  }, [open, editingHearing, initialDate, form]);

  const handleSubmit = useCallback(
    async (values: any) => {
      setSubmitting(true);
      try {
        const payload: Record<string, any> = {
          caseId: values.caseId,
          hearingDate: values.hearingDate.toISOString(),
          hearingType: values.hearingType,
          courtHall: values.courtHall,
          notes: values.notes || null,
        };

        if (showStatus && values.status) {
          payload.status = values.status;
        }

        const url = isEditMode ? `/api/hearings/${editingHearing!.id}` : '/api/hearings';
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: authHeaders(token),
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          if (showSuccessAnimation) {
            setSubmitSuccess(true);
            message.success(isEditMode ? 'Hearing updated successfully' : 'Hearing scheduled successfully');
            setTimeout(() => {
              setSubmitSuccess(false);
              onClose();
              form.resetFields();
              onSuccess();
            }, 1500);
          } else {
            message.success(isEditMode ? 'Hearing updated successfully' : 'Hearing added successfully');
            onClose();
            form.resetFields();
            onSuccess();
          }
        } else {
          const error = await response.json();
          message.error(error.error || 'Failed to save hearing');
        }
      } catch {
        message.error('Failed to save hearing');
      } finally {
        if (!showSuccessAnimation) {
          setSubmitting(false);
        } else {
          // Delay resetting submitting so the success animation shows
          setTimeout(() => setSubmitting(false), 1600);
        }
      }
    },
    [isEditMode, editingHearing, token, form, showStatus, showSuccessAnimation, onClose, onSuccess]
  );

  const handleClose = useCallback(() => {
    form.resetFields();
    setSubmitSuccess(false);
    setSubmitting(false);
    onClose();
  }, [form, onClose]);

  const caseOptions = cases.map((c) => (
    <Option key={c.id} value={c.id}>
      {c.caseNumber} - {c.caseTitle}
    </Option>
  ));

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode ? <EditOutlined /> : <PlusOutlined />}
            <span style={{ fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' }}>
              {isEditMode ? 'Edit Hearing' : 'Schedule Hearing'}
            </span>
          </div>
        }
        open={open}
        onCancel={handleClose}
        footer={null}
        width="min(600px, 95vw)"
        destroyOnClose
        centered
        className="responsive-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            hearingType: 'ARGUMENTS',
            status: 'UPCOMING',
          }}
        >
          <Form.Item
            name="caseId"
            label="Select Case"
            rules={[{ required: true, message: 'Please select a case' }]}
          >
            <Select
              placeholder="Select a case"
              showSearch
              optionFilterProp="children"
              disabled={isEditMode}
              onChange={(value) => onCaseChange?.(value)}
            >
              {caseOptions}
            </Select>
          </Form.Item>

          <Form.Item
            name="hearingDate"
            label="Hearing Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Row gutter={[12, 0]}>
            <Col xs={24} sm={showStatus ? 12 : 24}>
              <Form.Item
                name="hearingType"
                label="Stage"
                rules={[{ required: true, message: 'Please select a stage' }]}
              >
                <Select showSearch optionFilterProp="children" placeholder="Select a stage">
                  {STAGE_OPTIONS.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {showStatus && (
              <Col xs={24} sm={12}>
                <Form.Item name="status" label="Status">
                  <Select>
                    {HEARING_STATUS_OPTIONS.map((status) => (
                      <Option key={status.value} value={status.value}>
                        {status.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>

          <Form.Item
            name="courtHall"
            label="Court Hall"
            rules={[{ required: true, message: 'Please enter court hall' }]}
          >
            <Input placeholder="e.g., Court Hall 5" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Any notes or preparation reminders for this hearing..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleClose}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={submitting || submitSuccess}
                icon={submitSuccess ? <CheckCircleOutlined /> : undefined}
                style={submitSuccess ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
              >
                {submitSuccess
                  ? 'Success!'
                  : isEditMode
                    ? 'Update Hearing'
                    : 'Schedule Hearing'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Suspense>
  );
}
