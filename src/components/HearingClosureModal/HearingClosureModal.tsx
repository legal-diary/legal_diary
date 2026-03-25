'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Switch,
  Descriptions,
  Divider,
  App,
} from 'antd';
import dayjs from 'dayjs';
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
  };
}

interface HearingClosureModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hearing: HearingForClosure | null;
  token: string | null;
}

export default function HearingClosureModal({
  open,
  onClose,
  onSuccess,
  hearing,
  token,
}: HearingClosureModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [scheduleNext, setScheduleNext] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setScheduleNext(false);
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const body: Record<string, unknown> = {
        closureNote: values.closureNote,
      };

      if (scheduleNext) {
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
        message.success('Hearing closed successfully');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to close hearing');
      }
    } catch (error) {
      // Form validation error — do nothing
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
          Close Hearing
        </span>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Close Hearing"
      okButtonProps={{
        style: { backgroundColor: '#d4af37', borderColor: '#d4af37' },
      }}
      cancelText="Cancel"
      width={600}
      destroyOnClose
    >
      {/* Hearing Summary */}
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

      <Form form={form} layout="vertical">
        {/* Closure Note */}
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

        <Divider style={{ margin: '12px 0' }} />

        {/* Schedule Next Hearing Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: scheduleNext ? 16 : 0 }}>
          <Switch
            checked={scheduleNext}
            onChange={setScheduleNext}
            size="small"
          />
          <span style={{ fontWeight: 500 }}>Schedule next hearing for this case</span>
        </div>

        {scheduleNext && (
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
              rules={[{ required: true, message: 'Please enter the court hall' }]}
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
      </Form>
    </Modal>
  );
}
