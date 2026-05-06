'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Radio,
  Descriptions,
  Divider,
  Alert,
  Tooltip,
  App,
} from 'antd';
import {
  InfoCircleOutlined,
  ArrowRightOutlined,
  LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { STAGE_OPTIONS, STAGE_LABEL_MAP } from '@/lib/constants';
import { authHeaders } from '@/lib/apiClient';

interface HearingForClosure {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingType: string;
  courtHall: string;
  notes?: string | null;
  Case: {
    id?: string;
    caseNumber: string;
    caseTitle: string;
    petitionerName?: string;
    respondentName?: string;
    courtName?: string | null;
    status?: string;
  };
}

interface HearingClosureModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hearing: HearingForClosure | null;
  token: string | null;
}

type ClosureMode = 'next' | 'final';

export default function HearingClosureModal({
  open,
  onClose,
  onSuccess,
  hearing,
  token,
}: HearingClosureModalProps) {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [closureMode, setClosureMode] = useState<ClosureMode>('next');

  const isAdmin = user?.role === 'ADMIN';
  const isCaseClosed = hearing?.Case.status === 'CLOSED';
  const caseDetailHref = hearing
    ? `/cases/${hearing.Case.id || hearing.caseId}`
    : '#';

  useEffect(() => {
    if (open) {
      form.resetFields();
      setClosureMode('next');
    }
  }, [open, form]);

  const submitBlocked = !isCaseClosed && closureMode === 'final';

  const okText = useMemo(() => {
    if (isCaseClosed) return 'Close Final Hearing';
    if (submitBlocked && isAdmin) return 'Close the case first';
    if (submitBlocked) return 'Ask admin to close case';
    return 'Close Hearing';
  }, [isCaseClosed, submitBlocked, isAdmin]);

  const handleSubmit = async () => {
    if (submitBlocked) {
      if (isAdmin) {
        message.warning(
          'Please close the case first before closing this hearing as the final hearing.'
        );
      } else {
        message.warning(
          'Only admins can close cases. Ask your firm admin to close this case first.'
        );
      }
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const body: Record<string, unknown> = {
        closureNote: values.closureNote,
      };

      // Only attach next-hearing payload when the case is still open and the
      // user chose to schedule the next hearing. When the case is CLOSED we
      // intentionally omit nextHearing — the server accepts that as "final
      // hearing" and the existing check blocks scheduling on a closed case.
      if (!isCaseClosed && closureMode === 'next') {
        body.nextHearing = {
          hearingDate: values.nextHearingDate.toISOString(),
          hearingType: values.nextHearingType || 'ARGUMENTS',
          courtHall: values.nextCourtHall,
          notes: values.nextNotes || null,
        };
      }

      const response = await fetch(`/api/hearings/${hearing?.id}/close`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });

      if (response.ok) {
        message.success(
          isCaseClosed
            ? 'Final hearing closed successfully'
            : 'Hearing closed successfully'
        );
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to close hearing');
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error('Failed to close hearing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hearing) return null;

  return (
    <Modal
      title={
        <span style={{ color: '#d4af37', fontWeight: 600 }}>
          {isCaseClosed ? 'Close Final Hearing' : 'Close Hearing'}
        </span>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={okText}
      okButtonProps={{
        style: { backgroundColor: '#d4af37', borderColor: '#d4af37' },
        disabled: submitBlocked,
      }}
      cancelText="Cancel"
      width={600}
      destroyOnClose
    >
      <Descriptions
        size="small"
        column={2}
        bordered
        style={{ marginBottom: 16 }}
      >
        <Descriptions.Item label="Case No.">
          {hearing.Case.caseNumber}
        </Descriptions.Item>
        <Descriptions.Item label="Case Title">
          {hearing.Case.caseTitle}
        </Descriptions.Item>
        <Descriptions.Item label="Hearing Date">
          {dayjs(hearing.hearingDate).format('DD/MM/YYYY')}
        </Descriptions.Item>
        <Descriptions.Item label="Stage">
          {STAGE_LABEL_MAP[hearing.hearingType] || hearing.hearingType}
        </Descriptions.Item>
        <Descriptions.Item label="Court Hall">
          {hearing.courtHall}
        </Descriptions.Item>
        {hearing.Case.courtName && (
          <Descriptions.Item label="Court">
            {hearing.Case.courtName}
          </Descriptions.Item>
        )}
      </Descriptions>

      {isCaseClosed && (
        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          message="Case has been closed"
          description="This is the final hearing — no further hearings needed."
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="closureNote"
          label="Closure Note"
          rules={[{ required: true, message: 'Please enter a closure note' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="What happened in this hearing? Key outcomes, orders, next steps..."
            maxLength={2000}
            showCount
          />
        </Form.Item>

        {!isCaseClosed && (
          <>
            <Divider style={{ margin: '12px 0' }} />

            <Form.Item label="After this hearing" style={{ marginBottom: 12 }}>
              <Radio.Group
                value={closureMode}
                onChange={(e) => setClosureMode(e.target.value)}
              >
                <Radio value="next">Schedule next hearing</Radio>
                {isAdmin ? (
                  <Radio value="final">This is the final hearing</Radio>
                ) : (
                  <Tooltip
                    title="Only admins can close cases. Ask your firm admin to close this case first."
                    placement="right"
                  >
                    <span>
                      <Radio value="final" disabled>
                        This is the final hearing
                      </Radio>
                    </span>
                  </Tooltip>
                )}
              </Radio.Group>
            </Form.Item>

            {closureMode === 'next' && (
              <div
                style={{
                  padding: 16,
                  background: '#f5f7fa',
                  borderRadius: 8,
                  border: '1px solid #e8e8e8',
                }}
              >
                <Form.Item
                  name="nextHearingDate"
                  label="Next Hearing Date"
                  rules={[{ required: true, message: 'Please select a date' }]}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    disabledDate={(current) =>
                      current && current < dayjs().startOf('day')
                    }
                  />
                </Form.Item>

                <Form.Item
                  name="nextHearingType"
                  label="Stage"
                  initialValue="ARGUMENTS"
                  rules={[{ required: true, message: 'Please select a stage' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={STAGE_OPTIONS.map((s) => ({
                      value: s.value,
                      label: s.label,
                    }))}
                  />
                </Form.Item>

                <Form.Item
                  name="nextCourtHall"
                  label="Court Hall"
                  rules={[
                    { required: true, message: 'Please enter the court hall' },
                  ]}
                  initialValue={hearing.courtHall}
                >
                  <Input placeholder="e.g., Court Hall 5" />
                </Form.Item>

                <Form.Item name="nextNotes" label="Notes">
                  <Input.TextArea
                    rows={2}
                    placeholder="Any notes for the next hearing..."
                  />
                </Form.Item>
              </div>
            )}

            {closureMode === 'final' && isAdmin && (
              <Alert
                type="warning"
                showIcon
                icon={<InfoCircleOutlined />}
                message="Close the case first"
                description={
                  <>
                    <div style={{ marginBottom: 8 }}>
                      To mark this as the final hearing, close the case first by
                      uploading the final order. Once the case is closed, come
                      back here to close this hearing.
                    </div>
                    <Link
                      href={caseDetailHref}
                      style={{ color: '#d4af37', fontWeight: 600 }}
                    >
                      Go to case details <ArrowRightOutlined />
                    </Link>
                  </>
                }
              />
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
