'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Button, Popconfirm, Space, Tooltip, message } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import RichTextEditor from './RichTextEditor';

dayjs.extend(relativeTime);

interface Thread {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null };
}

interface JudgmentThreadsProps {
  judgmentId: string;
  token: string;
  isAdmin: boolean;
  currentUserId: string;
}

const EMPTY_HTML = '<p></p>';

function isContentEmpty(html: string): boolean {
  return !html || html.replace(/<[^>]*>/g, '').trim() === '';
}

function getInitial(name: string | null): string {
  return (name || '?').charAt(0).toUpperCase();
}

export default function JudgmentThreads({
  judgmentId,
  token,
  isAdmin,
  currentUserId,
}: JudgmentThreadsProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const newestIdRef = useRef<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };
  const base = `/api/judgments/${judgmentId}/threads`;

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(base, { headers: authHeaders });
      if (res.ok) setThreads(await res.json());
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judgmentId, token]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const handlePost = async () => {
    if (isContentEmpty(newContent)) {
      message.warning('Thread content cannot be empty');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      if (res.ok) {
        const created: Thread = await res.json();
        newestIdRef.current = created.id;
        setThreads(prev => [...prev, created]);
        setNewContent('');
        message.success('Thread posted');
      } else {
        const err = await res.json();
        message.error(err.error || 'Failed to post thread');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (thread: Thread) => {
    setEditingThreadId(thread.id);
    setEditContent(thread.content);
  };

  const cancelEdit = () => {
    setEditingThreadId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (threadId: string) => {
    if (isContentEmpty(editContent)) {
      message.warning('Thread content cannot be empty');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`${base}/${threadId}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated: Thread = await res.json();
        setThreads(prev => prev.map(t => (t.id === threadId ? updated : t)));
        cancelEdit();
        message.success('Thread updated');
      } else {
        const err = await res.json();
        message.error(err.error || 'Failed to update thread');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (threadId: string) => {
    try {
      const res = await fetch(`${base}/${threadId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setThreads(prev => prev.filter(t => t.id !== threadId));
        message.success('Thread deleted');
      } else {
        message.error('Failed to delete thread');
      }
    } catch {
      message.error('Failed to delete thread');
    }
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8e8e8',
      borderRadius: '0.75rem',
      padding: '1.5rem 2rem',
      marginTop: '1.5rem',
    }}>
      <h3 style={{ fontWeight: 700, color: '#1a3a52', marginBottom: '1.25rem', fontSize: '1rem' }}>
        Threads
        {threads.length > 0 && (
          <span style={{
            marginLeft: '0.5rem',
            background: '#f0f4f8',
            color: '#1a3a52',
            borderRadius: '1rem',
            padding: '0 0.5rem',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            {threads.length}
          </span>
        )}
      </h3>

      {/* Thread timeline */}
      {loading ? (
        <div style={{ color: '#999', fontSize: '0.9rem', padding: '1rem 0' }}>Loading threads…</div>
      ) : threads.length === 0 ? (
        <div style={{ color: '#bbb', fontSize: '0.9rem', padding: '0.5rem 0 1.25rem' }}>
          No threads yet.{isAdmin ? ' Add one below.' : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {threads.map(thread => {
            const isOwn = thread.createdBy.id === currentUserId;
            const canEdit = isOwn || isAdmin;
            const isEditing = editingThreadId === thread.id;
            const isNewest = newestIdRef.current === thread.id;

            return (
              <div
                key={thread.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  animation: isNewest ? 'threadSlideIn 0.3s ease' : undefined,
                }}
              >
                {/* Avatar */}
                <Avatar
                  size={32}
                  style={{
                    background: '#1a3a52',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: '0.1rem',
                  }}
                >
                  {getInitial(thread.createdBy.name)}
                </Avatar>

                {/* Thread body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Header row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.4rem',
                    flexWrap: 'wrap',
                    gap: '0.25rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#1a3a52', fontSize: '0.9rem' }}>
                        {thread.createdBy.name || 'Unknown'}
                      </span>
                      <span style={{ color: '#bbb', fontSize: '0.8rem' }}>·</span>
                      <span
                        title={dayjs(thread.createdAt).format('DD MMM YYYY, h:mm A')}
                        style={{ color: '#999', fontSize: '0.8rem', cursor: 'default' }}
                      >
                        {dayjs(thread.createdAt).fromNow()}
                      </span>
                      {thread.updatedAt !== thread.createdAt && (
                        <span style={{ color: '#ccc', fontSize: '0.75rem' }}>(edited)</span>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <Space size={4}>
                        {canEdit && (
                          <Tooltip title="Edit">
                            <Button
                              size="small"
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => startEdit(thread)}
                              style={{ color: '#999' }}
                            />
                          </Tooltip>
                        )}
                        {isAdmin && (
                          <Popconfirm
                            title="Delete this thread?"
                            onConfirm={() => handleDelete(thread.id)}
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                          >
                            <Tooltip title="Delete">
                              <Button
                                size="small"
                                type="text"
                                icon={<DeleteOutlined />}
                                style={{ color: '#ff4d4f' }}
                              />
                            </Tooltip>
                          </Popconfirm>
                        )}
                      </Space>
                    )}
                  </div>

                  {/* Content: read-only or inline edit */}
                  {isEditing ? (
                    <div>
                      <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        minHeight="100px"
                        placeholder="Edit thread…"
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckOutlined />}
                          loading={savingEdit}
                          onClick={() => handleSaveEdit(thread.id)}
                          style={{ background: '#1a3a52', borderColor: '#1a3a52' }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="thread-content"
                      dangerouslySetInnerHTML={{ __html: thread.content }}
                      style={{
                        color: '#333',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        background: '#f8f9fb',
                        borderRadius: '0.5rem',
                        padding: '0.65rem 0.9rem',
                        border: '1px solid #eef0f3',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose area — admin only */}
      {isAdmin && (
        <div style={{
          borderTop: threads.length > 0 ? '1px solid #f0f0f0' : 'none',
          paddingTop: threads.length > 0 ? '1.25rem' : 0,
        }}>
          <div style={{ marginBottom: '0.5rem', color: '#555', fontSize: '0.85rem', fontWeight: 500 }}>
            Add a thread
          </div>
          <RichTextEditor
            value={newContent}
            onChange={setNewContent}
            placeholder="Add an annotation or update to this judgment…"
            minHeight="110px"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handlePost}
              disabled={isContentEmpty(newContent)}
              style={{ background: '#1a3a52', borderColor: '#1a3a52', fontWeight: 600 }}
            >
              Post Thread
            </Button>
          </div>
        </div>
      )}

      <style>{`
        .thread-content p { margin: 0.25em 0; }
        .thread-content ul, .thread-content ol { padding-left: 1.4em; margin: 0.25em 0; }
        .thread-content blockquote { border-left: 3px solid #d9d9d9; padding-left: 0.8em; color: #666; margin: 0.25em 0; }
        .thread-content a { color: #1a3a52; }
        .thread-content h1, .thread-content h2, .thread-content h3 { color: #1a3a52; margin: 0.4em 0 0.1em; }
        .thread-content strong { color: #1a3a52; }
        @keyframes threadSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
