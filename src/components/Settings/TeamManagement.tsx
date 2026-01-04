'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  message,
  Modal,
  Avatar,
  Tooltip,
  Badge,
} from 'antd';
import {
  UserOutlined,
  CrownOutlined,
  SwapOutlined,
  UserDeleteOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface Firm {
  id: string;
  name: string;
  ownerId: string;
}

interface TeamManagementProps {
  token: string;
}

export default function TeamManagement({ token }: TeamManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [firm, setFirm] = useState<Firm | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  // Fetch team members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/firms/members', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
        setFirm(data.firm);
        setCurrentUserId(data.currentUserId);
      } else if (response.status === 403) {
        // Not an admin, don't show error
        setMembers([]);
      } else {
        message.error('Failed to load team members');
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    const member = members.find((m) => m.id === userId);
    const action = newRole === 'ADMIN' ? 'promote' : 'demote';

    Modal.confirm({
      title: `${action === 'promote' ? 'Promote' : 'Demote'} ${member?.name || member?.email}?`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            {action === 'promote'
              ? 'This user will gain admin privileges and can:'
              : 'This user will lose admin privileges and will no longer be able to:'}
          </p>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>View all cases in the firm</li>
            <li>Assign cases to advocates</li>
            <li>Delete cases</li>
            <li>Manage team members</li>
          </ul>
        </div>
      ),
      okText: action === 'promote' ? 'Promote to Admin' : 'Demote to Advocate',
      okType: action === 'promote' ? 'primary' : 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setUpdatingRole(userId);
        try {
          const response = await fetch(`/api/firms/members/${userId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: newRole }),
          });

          if (response.ok) {
            message.success(
              `${member?.name || 'User'} has been ${action === 'promote' ? 'promoted to Admin' : 'demoted to Advocate'}`
            );
            fetchMembers();
          } else {
            const error = await response.json();
            message.error(error.error || 'Failed to update role');
          }
        } catch (error) {
          message.error('Failed to update role');
        } finally {
          setUpdatingRole(null);
        }
      },
    });
  };

  // Handle member removal
  const handleRemoveMember = async (userId: string) => {
    const member = members.find((m) => m.id === userId);

    Modal.confirm({
      title: `Remove ${member?.name || member?.email} from firm?`,
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>This will remove the user from your firm. They will:</p>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>Lose access to all firm cases</li>
            <li>Be unassigned from all cases</li>
            <li>Need to rejoin or create a new firm</li>
          </ul>
          <p style={{ marginTop: '12px', color: '#ff4d4f', fontWeight: 500 }}>
            This action cannot be undone.
          </p>
        </div>
      ),
      okText: 'Remove from Firm',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setRemovingMember(userId);
        try {
          const response = await fetch(`/api/firms/members/${userId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            message.success(`${member?.name || 'User'} has been removed from the firm`);
            fetchMembers();
          } else {
            const error = await response.json();
            message.error(error.error || 'Failed to remove member');
          }
        } catch (error) {
          message.error('Failed to remove member');
        } finally {
          setRemovingMember(null);
        }
      },
    });
  };

  // Table columns
  const columns: ColumnsType<Member> = [
    {
      title: 'Member',
      key: 'member',
      render: (_, record) => (
        <Space>
          <Avatar
            icon={<UserOutlined />}
            style={{
              backgroundColor: record.role === 'ADMIN' ? '#d4af37' : '#1a3a52',
            }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.name || 'Unknown'}
              {record.id === firm?.ownerId && (
                <Tooltip title="Firm Owner">
                  <CrownOutlined
                    style={{ marginLeft: '8px', color: '#d4af37', fontSize: '14px' }}
                  />
                </Tooltip>
              )}
              {record.id === currentUserId && (
                <Tag color="blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                  You
                </Tag>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={role === 'ADMIN' ? 'gold' : 'blue'} style={{ fontWeight: 600 }}>
          {role}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        // Don't show actions for current user or firm owner
        if (record.id === currentUserId) {
          return <span style={{ color: '#999', fontSize: '12px' }}>-</span>;
        }

        if (record.id === firm?.ownerId) {
          return (
            <Tooltip title="Cannot modify firm owner">
              <span style={{ color: '#999', fontSize: '12px' }}>Protected</span>
            </Tooltip>
          );
        }

        return (
          <Space size="small">
            <Tooltip
              title={record.role === 'ADMIN' ? 'Demote to Advocate' : 'Promote to Admin'}
            >
              <Button
                type="text"
                size="small"
                icon={<SwapOutlined />}
                loading={updatingRole === record.id}
                onClick={() =>
                  handleRoleChange(
                    record.id,
                    record.role === 'ADMIN' ? 'ADVOCATE' : 'ADMIN'
                  )
                }
                style={{
                  color: record.role === 'ADMIN' ? '#fa8c16' : '#52c41a',
                }}
              >
                {record.role === 'ADMIN' ? 'Demote' : 'Promote'}
              </Button>
            </Tooltip>
            <Tooltip title="Remove from firm">
              <Button
                type="text"
                size="small"
                danger
                icon={<UserDeleteOutlined />}
                loading={removingMember === record.id}
                onClick={() => handleRemoveMember(record.id)}
              >
                Remove
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  // Count admins and advocates
  const adminCount = members.filter((m) => m.role === 'ADMIN').length;
  const advocateCount = members.filter((m) => m.role === 'ADVOCATE').length;

  return (
    <Card
      title={
        <Space>
          <TeamOutlined style={{ fontSize: '18px' }} />
          <span>Team Management</span>
          <Badge
            count={members.length}
            style={{ backgroundColor: '#1a3a52', marginLeft: '8px' }}
          />
        </Space>
      }
      extra={
        <Space>
          <Tag color="gold">{adminCount} Admin{adminCount !== 1 ? 's' : ''}</Tag>
          <Tag color="blue">{advocateCount} Advocate{advocateCount !== 1 ? 's' : ''}</Tag>
        </Space>
      }
      style={{ marginTop: '24px' }}
    >
      <Table
        columns={columns}
        dataSource={members}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        locale={{
          emptyText: 'No team members found',
        }}
      />

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666',
        }}
      >
        <strong>Role Permissions:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>
            <Tag color="gold" style={{ fontSize: '10px' }}>ADMIN</Tag> - Can view all cases, assign advocates, delete cases, and manage team
          </li>
          <li>
            <Tag color="blue" style={{ fontSize: '10px' }}>ADVOCATE</Tag> - Can only view and manage assigned cases
          </li>
        </ul>
      </div>
    </Card>
  );
}
