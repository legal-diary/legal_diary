'use client';

import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Card,
  Table,
  Tag,
  Empty,
  message,
  Button,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/lib/apiClient';

const Modal = lazy(() => import('antd').then(mod => ({ default: mod.Modal })));

const { Text } = Typography;
const { TextArea } = Input;

interface TodoItem {
  id: string;
  description: string;
  status: string;
  caseId: string | null;
  assignedTo: string | null;
  createdAt: string;
  case: { id: string; caseNumber: string; caseTitle: string } | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
  createdBy: { id: string; name: string | null };
}

interface CaseOption {
  id: string;
  caseNumber: string;
  caseTitle: string;
}

interface MemberOption {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function TodosPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchTodos = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/todos', {
        headers: authHeaders(token),
      });
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch {
      message.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCasesAndMembers = useCallback(async () => {
    if (!token) return;
    try {
      const [casesRes, membersRes] = await Promise.all([
        fetch('/api/cases?minimal=true', { headers: authHeaders(token) }),
        fetch('/api/firms/members', { headers: authHeaders(token) }),
      ]);

      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setCases(Array.isArray(casesData) ? casesData : []);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }
      // Non-admins get 403 from /api/firms/members - that's fine since they can't create todos
    } catch {
      console.error('Failed to fetch cases/members');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchTodos();
      fetchCasesAndMembers();
    }
  }, [token, fetchTodos, fetchCasesAndMembers]);

  const handleAdd = useCallback(() => {
    setEditingTodo(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const handleEdit = useCallback((todo: TodoItem) => {
    setEditingTodo(todo);
    form.setFieldsValue({
      description: todo.description,
      caseId: todo.caseId || undefined,
      assignedTo: todo.assignedTo || undefined,
      status: todo.status,
    });
    setModalOpen(true);
  }, [form]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      if (response.ok) {
        message.success('Todo deleted');
        fetchTodos();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to delete todo');
      }
    } catch {
      message.error('Failed to delete todo');
    }
  }, [token, fetchTodos]);

  const handleSubmit = useCallback(async (values: any) => {
    setSubmitting(true);
    try {
      const url = editingTodo ? `/api/todos/${editingTodo.id}` : '/api/todos';
      const method = editingTodo ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: authHeaders(token),
        body: JSON.stringify({
          description: values.description,
          caseId: values.caseId || null,
          assignedTo: values.assignedTo || null,
          status: values.status || 'PENDING',
        }),
      });

      if (response.ok) {
        message.success(editingTodo ? 'Todo updated' : 'Todo created');
        setModalOpen(false);
        form.resetFields();
        setEditingTodo(null);
        fetchTodos();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to save todo');
      }
    } catch {
      message.error('Failed to save todo');
    } finally {
      setSubmitting(false);
    }
  }, [editingTodo, token, form, fetchTodos]);

  const columns = useMemo(() => [
    {
      title: 'Case Number',
      key: 'caseNumber',
      width: 140,
      render: (_: any, record: TodoItem) =>
        record.case ? (
          <Text strong style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>
            {record.case.caseNumber}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'To-Do',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Text style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>{text}</Text>
      ),
    },
    {
      title: 'Assigned To',
      key: 'assignedTo',
      width: 160,
      render: (_: any, record: TodoItem) =>
        record.assignedUser ? (
          <Text style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>
            {record.assignedUser.name || record.assignedUser.email}
          </Text>
        ) : (
          <Text type="secondary">Unassigned</Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>
          {status === 'COMPLETED' ? 'Completed' : 'Pending'}
        </Tag>
      ),
    },
    ...(isAdmin ? [{
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: TodoItem) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ fontSize: '14px' }} />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this todo?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, size: 'small' }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: '14px' }} />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ], [isAdmin, handleEdit, handleDelete]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckSquareOutlined style={{ color: '#722ed1' }} />
              <span>To-Do List</span>
              <Tag color="purple">{todos.length} item{todos.length !== 1 ? 's' : ''}</Tag>
            </div>
          }
          extra={
            isAdmin && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Add To-Do
              </Button>
            )
          }
        >
          {todos.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text>No to-do items yet</Text>
                  {isAdmin && (
                    <>
                      <br />
                      <Text type="secondary">Click &quot;Add To-Do&quot; to create one</Text>
                    </>
                  )}
                </div>
              }
            />
          ) : (
            <Table
              dataSource={todos}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
              size="small"
              scroll={{ x: 500 }}
            />
          )}
        </Card>

        {modalOpen && (
          <Suspense fallback={null}>
            <Modal
              title={editingTodo ? 'Edit To-Do' : 'Add To-Do'}
              open={modalOpen}
              onCancel={() => { setModalOpen(false); setEditingTodo(null); form.resetFields(); }}
              footer={null}
              destroyOnClose
              centered
              width="min(520px, 95vw)"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ status: 'PENDING' }}
              >
                <Form.Item name="caseId" label="Case Number">
                  <Select
                    placeholder="Select a case (optional)"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {cases.map((c) => (
                      <Select.Option key={c.id} value={c.id}>
                        {c.caseNumber} - {c.caseTitle}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="description"
                  label="To-Do"
                  rules={[{ required: true, message: 'Please enter a description' }]}
                >
                  <TextArea rows={3} placeholder="Describe the task..." />
                </Form.Item>

                <Form.Item name="assignedTo" label="Assigned To">
                  <Select
                    placeholder="Assign to a team member (optional)"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {members.map((m) => (
                      <Select.Option key={m.id} value={m.id}>
                        {m.name || m.email} ({m.role})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                {editingTodo && (
                  <Form.Item name="status" label="Status">
                    <Select>
                      <Select.Option value="PENDING">Pending</Select.Option>
                      <Select.Option value="COMPLETED">Completed</Select.Option>
                    </Select>
                  </Form.Item>
                )}

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => { setModalOpen(false); setEditingTodo(null); form.resetFields(); }}>
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>
                      {editingTodo ? 'Update' : 'Create'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>
          </Suspense>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
