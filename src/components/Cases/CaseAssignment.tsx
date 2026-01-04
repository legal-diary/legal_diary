'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Select,
  Button,
  Tag,
  Space,
  message,
  Avatar,
  List,
  Tooltip,
  Empty,
  Spin,
} from 'antd';
import {
  UserAddOutlined,
  UserDeleteOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';

interface Advocate {
  id: string;
  name: string | null;
  email: string;
}

interface Assignment {
  id: string;
  userId: string;
  assignedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface CaseAssignmentProps {
  caseId: string;
  assignments: Assignment[];
  token: string;
  isAdmin: boolean;
  onAssignmentChange: () => void;
}

export default function CaseAssignment({
  caseId,
  assignments,
  token,
  isAdmin,
  onAssignmentChange,
}: CaseAssignmentProps) {
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [selectedAdvocates, setSelectedAdvocates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Fetch available advocates
  const fetchAdvocates = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const response = await fetch('/api/firms/advocates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAdvocates(data);
      }
    } catch (error) {
      console.error('Failed to fetch advocates:', error);
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    fetchAdvocates();
  }, [fetchAdvocates]);

  // Get IDs of already assigned advocates
  const assignedIds = assignments.map((a) => a.user.id);

  // Filter out already assigned advocates from the dropdown
  const availableAdvocates = advocates.filter(
    (adv) => !assignedIds.includes(adv.id)
  );

  // Handle assigning advocates
  const handleAssign = async () => {
    if (selectedAdvocates.length === 0) {
      message.warning('Please select at least one advocate');
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: selectedAdvocates }),
      });

      if (response.ok) {
        message.success('Advocate(s) assigned successfully');
        setSelectedAdvocates([]);
        onAssignmentChange();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to assign advocates');
      }
    } catch (error) {
      message.error('Failed to assign advocates');
    } finally {
      setAssigning(false);
    }
  };

  // Handle removing an advocate
  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      const response = await fetch(`/api/cases/${caseId}/assign`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: [userId] }),
      });

      if (response.ok) {
        message.success('Advocate removed from case');
        onAssignmentChange();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to remove advocate');
      }
    } catch (error) {
      message.error('Failed to remove advocate');
    } finally {
      setRemoving(null);
    }
  };

  // Read-only view for non-admins
  if (!isAdmin) {
    return (
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>Assigned Advocates</span>
          </Space>
        }
        size="small"
        style={{ marginTop: '16px' }}
      >
        {assignments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No advocates assigned"
          />
        ) : (
          <List
            size="small"
            dataSource={assignments}
            renderItem={(assignment) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1a3a52' }} />
                  }
                  title={assignment.user.name || 'Unknown'}
                  description={assignment.user.email}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    );
  }

  // Admin view with assignment controls
  return (
    <Card
      title={
        <Space>
          <TeamOutlined />
          <span>Case Assignments</span>
          <Tag color="blue">{assignments.length} assigned</Tag>
        </Space>
      }
      size="small"
      style={{ marginTop: '16px' }}
    >
      {/* Assignment Form */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Select
            mode="multiple"
            placeholder="Select advocates to assign"
            value={selectedAdvocates}
            onChange={setSelectedAdvocates}
            style={{ flex: 1, minWidth: '200px' }}
            loading={loading}
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={availableAdvocates.map((adv) => ({
              value: adv.id,
              label: adv.name || adv.email,
              title: adv.email,
            }))}
            notFoundContent={
              loading ? (
                <Spin size="small" />
              ) : availableAdvocates.length === 0 ? (
                'No advocates available'
              ) : null
            }
          />
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleAssign}
            loading={assigning}
            disabled={selectedAdvocates.length === 0}
          >
            Assign
          </Button>
        </div>
      </div>

      {/* Assigned Advocates List */}
      {assignments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No advocates assigned to this case"
        />
      ) : (
        <List
          size="small"
          dataSource={assignments}
          renderItem={(assignment) => (
            <List.Item
              actions={[
                <Tooltip title="Remove from case" key="remove">
                  <Button
                    type="text"
                    danger
                    icon={<UserDeleteOutlined />}
                    loading={removing === assignment.user.id}
                    onClick={() => handleRemove(assignment.user.id)}
                    size="small"
                  />
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1a3a52' }} />
                }
                title={
                  <Space>
                    {assignment.user.name || 'Unknown'}
                    <Tag color="geekblue" style={{ fontSize: '0.7rem' }}>
                      {assignment.user.role}
                    </Tag>
                  </Space>
                }
                description={assignment.user.email}
              />
            </List.Item>
          )}
        />
      )}

      <style jsx global>{`
        .ant-list-item-meta-title {
          margin-bottom: 0 !important;
        }
      `}</style>
    </Card>
  );
}
