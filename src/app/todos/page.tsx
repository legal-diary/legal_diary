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
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/lib/apiClient';
import dayjs from 'dayjs';

const Modal = lazy(() => import('antd').then(mod => ({ default: mod.Modal })));

const { Text } = Typography;
const { TextArea } = Input;

interface TodoItem {
  id: string;
  description: string;
  status: string;
  caseId: string | null;
  assignedTo: string | null;
  closingComment: string | null;
  closedAt: string | null;
  closedBy: { id: string; name: string | null } | null;
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
  const [completedHistory, setCompletedHistory] = useState<TodoItem[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Closing modal state
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [closingTodo, setClosingTodo] = useState<TodoItem | null>(null);
  const [closingSubmitting, setClosingSubmitting] = useState(false);
  const [closingForm] = Form.useForm();

  const fetchTodos = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/todos', {
        headers: authHeaders(token),
      });
      if (response.ok) {
        const data = await response.json();
        setTodos(data.todos || []);
        setCompletedHistory(data.completedHistory || []);
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

  // Close todo handler
  const handleCloseTodo = useCallback((todo: TodoItem) => {
    setClosingTodo(todo);
    closingForm.resetFields();
    setClosingModalOpen(true);
  }, [closingForm]);

  const handleCloseSubmit = useCallback(async (values: any) => {
    if (!closingTodo) return;
    setClosingSubmitting(true);
    try {
      const response = await fetch(`/api/todos/${closingTodo.id}/close`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ closingComment: values.closingComment }),
      });

      if (response.ok) {
        message.success('Todo closed successfully');
        setClosingModalOpen(false);
        setClosingTodo(null);
        closingForm.resetFields();
        fetchTodos();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to close todo');
      }
    } catch {
      message.error('Failed to close todo');
    } finally {
      setClosingSubmitting(false);
    }
  }, [closingTodo, token, closingForm, fetchTodos]);

  // Check if current user can close a specific todo
  const canCloseTodo = useCallback((todo: TodoItem) => {
    if (todo.status !== 'PENDING') return false;
    if (isAdmin) return true;
    return todo.assignedTo === user?.id;
  }, [isAdmin, user?.id]);

  // Check if current user has any action on a todo
  const hasActions = useCallback((todo: TodoItem) => {
    return isAdmin || canCloseTodo(todo);
  }, [isAdmin, canCloseTodo]);

  // Check if any todo has actions for the current user (to show/hide actions column)
  const showActionsColumn = useMemo(() => {
    return todos.some(todo => hasActions(todo));
  }, [todos, hasActions]);

  const columns = useMemo(() => {
    const cols: any[] = [
      {
        title: 'Case No.',
        key: 'caseNumber',
        width: '18%',
        ellipsis: true,
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
        width: '18%',
        ellipsis: true,
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
        width: '12%',
        render: (status: string) => (
          <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>
            {status === 'COMPLETED' ? 'Completed' : 'Pending'}
          </Tag>
        ),
      },
    ];

    if (showActionsColumn) {
      cols.push({
        title: '',
        key: 'actions',
        width: '18%',
        render: (_: any, record: TodoItem) => (
          <Space size={2}>
            {/* Update button - visible to admin or assigned user for pending todos */}
            {canCloseTodo(record) && (
              <Button
                size="small"
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
                onClick={() => handleCloseTodo(record)}
              >
                Update
              </Button>
            )}
            {/* Edit/Delete - admin only */}
            {isAdmin && (
              <>
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
              </>
            )}
          </Space>
        ),
      });
    }

    return cols;
  }, [isAdmin, showActionsColumn, canCloseTodo, handleEdit, handleDelete, handleCloseTodo]);

  // History columns
  const historyColumns = useMemo(() => [
    {
      title: 'Case',
      key: 'caseNumber',
      width: '15%',
      ellipsis: true,
      render: (_: any, record: TodoItem) =>
        record.case ? (
          <Text style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)' }}>{record.case.caseNumber}</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'To-Do',
      dataIndex: 'description',
      key: 'description',
      width: '25%',
      ellipsis: true,
      render: (text: string) => (
        <Text style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)' }}>{text}</Text>
      ),
    },
    {
      title: 'Closing Comment',
      dataIndex: 'closingComment',
      key: 'closingComment',
      ellipsis: true,
      render: (text: string | null) => (
        <Text type="secondary" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)' }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: 'Closed By',
      key: 'closedBy',
      width: '15%',
      ellipsis: true,
      render: (_: any, record: TodoItem) => (
        <Text style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)' }}>
          {record.closedBy?.name || '-'}
        </Text>
      ),
    },
    {
      title: 'Closed',
      key: 'closedAt',
      width: '12%',
      render: (_: any, record: TodoItem) => (
        <Text type="secondary" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)' }}>
          {record.closedAt ? dayjs(record.closedAt).format('DD/MM/YY') : '-'}
        </Text>
      ),
    },
  ], []);

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
              className="responsive-todo-table"
            />
          )}
        </Card>

        {/* Completed History - Collapsible Section */}
        {completedHistory.length > 0 && (
          <Card style={{ marginTop: 16 }} styles={{ body: { padding: 0 } }}>
            <Collapse
              ghost
              items={[{
                key: 'history',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HistoryOutlined style={{ color: '#8c8c8c' }} />
                    <span style={{ fontWeight: 500 }}>Recent Completed</span>
                    <Tag color="default">{completedHistory.length}</Tag>
                  </div>
                ),
                children: (
                  <Table
                    dataSource={completedHistory}
                    columns={historyColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    className="responsive-todo-table"
                  />
                ),
              }]}
            />
          </Card>
        )}

        {/* Add/Edit Todo Modal */}
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

        {/* Close Todo Modal */}
        {closingModalOpen && (
          <Suspense fallback={null}>
            <Modal
              title="Close To-Do"
              open={closingModalOpen}
              onCancel={() => { setClosingModalOpen(false); setClosingTodo(null); closingForm.resetFields(); }}
              footer={null}
              destroyOnClose
              centered
              width="min(480px, 95vw)"
            >
              {closingTodo && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fafafa', borderRadius: '0.5rem' }}>
                  <Text type="secondary" style={{ fontSize: '0.8rem' }}>Task:</Text>
                  <div>
                    <Text strong>{closingTodo.description}</Text>
                  </div>
                  {closingTodo.case && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <Text type="secondary" style={{ fontSize: '0.8rem' }}>Case: {closingTodo.case.caseNumber}</Text>
                    </div>
                  )}
                </div>
              )}
              <Form
                form={closingForm}
                layout="vertical"
                onFinish={handleCloseSubmit}
              >
                <Form.Item
                  name="closingComment"
                  label="Closing Comment"
                  rules={[
                    { required: true, message: 'Closing comment is required' },
                    { min: 3, message: 'Comment must be at least 3 characters' },
                  ]}
                >
                  <TextArea
                    rows={3}
                    placeholder="Describe the resolution or reason for closing..."
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => { setClosingModalOpen(false); setClosingTodo(null); closingForm.resetFields(); }}>
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={closingSubmitting}
                      disabled={closingSubmitting}
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Close Todo
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>
          </Suspense>
        )}
        <style>{`
          .responsive-todo-table .ant-table {
            table-layout: fixed !important;
          }
          .responsive-todo-table .ant-table-cell {
            word-break: break-word;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          @media (max-width: 576px) {
            .responsive-todo-table .ant-table-cell {
              padding: 6px 4px !important;
              font-size: 0.75rem;
            }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
