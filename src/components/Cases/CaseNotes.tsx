'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  Input,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { authHeaders } from '@/lib/apiClient';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface CaseNotesProps {
  caseId: string;
  token: string;
  isAdmin: boolean;
  currentUserId: string;
  // When false, the user is firm-scoped read-only on this case (not assigned).
  // The list still renders, but write affordances (compose, edit, delete) are
  // hidden so unassigned advocates can read-only browse colleagues' notes.
  canWrite?: boolean;
}

const MAX_NOTE_LENGTH = 5000;
const QUICK_START_PROMPTS = [
  'Initial client meeting summary',
  'Filed today — stamp received',
  'Discussed strategy with senior',
];

/* ---------- helpers ---------- */

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// Deterministic-ish color from a user id, drawn from the app's accepted palette.
const AVATAR_COLORS = ['#1a3a52', '#5a5a5a', '#3a6b8c', '#7a4a4a', '#4a6b4a', '#7a5a3a'];
function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function wasEdited(note: Note): boolean {
  return dayjs(note.updatedAt).diff(note.createdAt, 'second') > 0;
}

// Smart hybrid: relative for <7 days, absolute for older.
function smartTimestamp(iso: string): string {
  const d = dayjs(iso);
  const now = dayjs();
  const diffDays = now.diff(d, 'day');
  if (diffDays < 7) {
    if (now.diff(d, 'minute') < 1) return 'just now';
    if (now.diff(d, 'hour') < 1) return d.fromNow(); // "5 minutes ago"
    if (now.isSame(d, 'day')) return d.fromNow(); // "3 hours ago"
    if (now.subtract(1, 'day').isSame(d, 'day')) return `yesterday at ${d.format('HH:mm')}`;
    return d.fromNow(); // "3 days ago"
  }
  return d.format('MMM D, YYYY HH:mm');
}

/* ---------- types for grouping ---------- */

interface Group {
  authorId: string;
  authorName: string;
  authorEmail: string;
  notes: Note[]; // already sorted newest-first within group
}

function groupConsecutive(notes: Note[]): Group[] {
  // notes arrive newest-first; group runs of identical authorId.
  const groups: Group[] = [];
  for (const note of notes) {
    const last = groups[groups.length - 1];
    if (last && last.authorId === note.createdBy.id) {
      last.notes.push(note);
    } else {
      groups.push({
        authorId: note.createdBy.id,
        authorName: note.createdBy.name || note.createdBy.email,
        authorEmail: note.createdBy.email,
        notes: [note],
      });
    }
  }
  return groups;
}

/* ============================================================ */

export default function CaseNotes({ caseId, token, isAdmin, currentUserId, canWrite = true }: CaseNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newNote, setNewNote] = useState('');

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const composeRef = useRef<any>(null);
  const newestIdRef = useRef<string | null>(null); // for slide-in animation target

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/notes`, {
        headers: authHeaders(token),
      });
      if (response.ok) {
        const data = (await response.json()) as Note[];
        setNotes(data);
      } else {
        const error = await response.json().catch(() => ({}));
        message.error(error.error || 'Failed to load notes');
      }
    } catch {
      message.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [caseId, token]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handlePost = useCallback(async () => {
    const content = newNote.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ content }),
      });
      if (response.ok) {
        const created = (await response.json()) as Note;
        newestIdRef.current = created.id;
        setNotes((prev) => [created, ...prev]);
        setNewNote('');
      } else {
        const error = await response.json().catch(() => ({}));
        message.error(error.error || 'Failed to post note');
      }
    } catch {
      message.error('Failed to post note');
    } finally {
      setSubmitting(false);
    }
  }, [caseId, newNote, token]);

  const handleComposeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd+Enter (Mac) / Ctrl+Enter (Win) to post
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (newNote.trim() && !submitting) handlePost();
      }
    },
    [handlePost, newNote, submitting]
  );

  const startEdit = useCallback((note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingNoteId(null);
    setEditContent('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingNoteId) return;
    const content = editContent.trim();
    if (!content) {
      message.error('Note cannot be empty');
      return;
    }
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/notes/${editingNoteId}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ content }),
      });
      if (response.ok) {
        const updated = (await response.json()) as Note;
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        setEditingNoteId(null);
        setEditContent('');
      } else {
        const error = await response.json().catch(() => ({}));
        message.error(error.error || 'Failed to update note');
      }
    } catch {
      message.error('Failed to update note');
    } finally {
      setSavingEdit(false);
    }
  }, [caseId, editingNoteId, editContent, token]);

  const handleDelete = useCallback(
    async (noteId: string) => {
      try {
        const response = await fetch(`/api/cases/${caseId}/notes/${noteId}`, {
          method: 'DELETE',
          headers: authHeaders(token),
        });
        if (response.ok) {
          setNotes((prev) => prev.filter((n) => n.id !== noteId));
          message.success('Note deleted');
        } else {
          const error = await response.json().catch(() => ({}));
          message.error(error.error || 'Failed to delete note');
        }
      } catch {
        message.error('Failed to delete note');
      }
    },
    [caseId, token]
  );

  const insertPrompt = useCallback((prompt: string) => {
    setNewNote(prompt);
    composeRef.current?.focus();
  }, []);

  const grouped = useMemo(() => groupConsecutive(notes), [notes]);
  const postDisabled = useMemo(() => !newNote.trim() || submitting, [newNote, submitting]);

  return (
    <div className="case-notes-root">
      <style jsx>{`
        .case-notes-root {
          max-width: 760px;
          margin: 0 auto;
          padding: 8px 0;
        }

        /* Compose */
        .compose {
          background: #fafafa;
          border: 1px solid #f0f0f0;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 24px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .compose:focus-within {
          border-color: #1a3a52;
          box-shadow: 0 0 0 3px rgba(26, 58, 82, 0.08);
        }
        .compose-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #1a3a52;
          font-size: 0.95rem;
          margin-bottom: 8px;
        }
        .compose-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }
        .shortcut-hint {
          font-size: 0.72rem;
          color: #999;
          letter-spacing: 0.2px;
        }

        /* Timeline */
        .timeline {
          position: relative;
          padding-left: 0;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 14px;
          top: 12px;
          bottom: 12px;
          width: 2px;
          background: #efefef;
          border-radius: 1px;
        }
        .timeline-group {
          position: relative;
          margin-bottom: 18px;
        }
        .timeline-group:last-child {
          margin-bottom: 0;
        }
        .group-head {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          margin-bottom: 6px;
          z-index: 1;
        }
        .group-head .name-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
        }
        .author-name {
          font-weight: 600;
          color: #262626;
          font-size: 0.92rem;
        }
        .timestamp {
          font-size: 0.78rem;
          color: #8c8c8c;
        }
        .edited-tag {
          font-size: 0.68rem;
          padding: 0 6px;
          line-height: 16px;
          height: 16px;
          background: #f5f5f5;
          color: #8c8c8c;
          border: none;
          border-radius: 4px;
          margin-left: 4px;
        }
        .note-card {
          margin-left: 42px;
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 10px;
          padding: 10px 14px;
          transition: background 0.15s ease, border-color 0.15s ease;
          position: relative;
        }
        .note-card:hover {
          background: #fafafa;
          border-color: #e0e0e0;
        }
        .note-card + .note-card {
          margin-top: 8px;
        }
        .note-content {
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 0.93rem;
          line-height: 1.55;
          color: #262626;
          padding-right: 64px; /* room for hover actions */
        }
        .note-actions {
          position: absolute;
          top: 6px;
          right: 6px;
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .note-card:hover .note-actions,
        .note-card:focus-within .note-actions {
          opacity: 1;
        }
        .stacked-meta {
          font-size: 0.72rem;
          color: #b0b0b0;
          margin-bottom: 4px;
          margin-left: 42px;
        }

        /* Slide-in for newest */
        .slide-in {
          animation: noteSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes noteSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 36px 24px;
          color: #8c8c8c;
        }
        .empty-icon {
          font-size: 30px;
          color: #d0d0d0;
          margin-bottom: 8px;
        }
        .empty-title {
          font-weight: 600;
          color: #595959;
          font-size: 0.95rem;
          margin-bottom: 4px;
        }
        .empty-sub {
          font-size: 0.85rem;
          margin-bottom: 16px;
        }
        .quickstart-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: stretch;
          max-width: 360px;
          margin: 0 auto;
        }
        .quickstart-btn {
          background: #fafafa;
          border: 1px dashed #d9d9d9;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          color: #595959;
          text-align: left;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .quickstart-btn:hover {
          background: #fff;
          border-color: #1a3a52;
          color: #1a3a52;
        }

        /* Loading skeleton */
        .skeleton-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .skeleton-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #f0f0f0;
          animation: pulse 1.4s ease-in-out infinite;
        }
        .skeleton-bar {
          height: 12px;
          background: #f0f0f0;
          border-radius: 6px;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Mobile */
        @media (max-width: 600px) {
          .note-card {
            margin-left: 36px;
            padding: 9px 12px;
          }
          .timeline::before {
            left: 11px;
          }
          .stacked-meta {
            margin-left: 36px;
          }
          .note-content {
            padding-right: 0;
          }
          .note-actions {
            opacity: 1; /* always show on touch */
          }
        }
      `}</style>

      {/* ----------- Compose ----------- */}
      {canWrite && (
        <div className="compose">
          <div className="compose-header">
            <span>Add a note</span>
          </div>
          <Input.TextArea
            ref={composeRef}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleComposeKeyDown}
            rows={3}
            maxLength={MAX_NOTE_LENGTH}
            showCount
            placeholder="What just happened? Phone call, research finding, opponent move, next step…"
            disabled={submitting}
            style={{ resize: 'vertical' }}
          />
          <div className="compose-actions">
            <span className="shortcut-hint">⌘ / Ctrl + Enter to post</span>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              disabled={postDisabled}
              onClick={handlePost}
              style={{ background: '#1a3a52', borderColor: '#1a3a52' }}
            >
              Post note
            </Button>
          </div>
        </div>
      )}

      {/* ----------- List ----------- */}
      {loading ? (
        <div>
          {[0, 1, 2].map((i) => (
            <div className="skeleton-row" key={i}>
              <div className="skeleton-avatar" />
              <div style={{ flex: 1 }}>
                <div className="skeleton-bar" style={{ width: '40%', marginBottom: 8 }} />
                <div className="skeleton-bar" style={{ width: '90%', height: 36 }} />
              </div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FileTextOutlined />
          </div>
          <div className="empty-title">
            {canWrite ? 'No notes yet — add the first one' : 'No notes on this case yet'}
          </div>
          {canWrite && (
            <>
              <div className="empty-sub">Quick start:</div>
              <div className="quickstart-list">
                {QUICK_START_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="quickstart-btn"
                    onClick={() => insertPrompt(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="timeline">
          {grouped.map((group) => {
            const headNote = group.notes[0];
            const headEdited = wasEdited(headNote);
            return (
              <div className="timeline-group" key={group.authorId + headNote.id}>
                {/* Group header — avatar + name + first timestamp */}
                <div className="group-head">
                  <Avatar
                    size={30}
                    style={{
                      background: colorForUser(group.authorId),
                      border: '3px solid #fff',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(group.authorName, group.authorEmail)}
                  </Avatar>
                  <div className="name-row">
                    <span className="author-name">
                      {group.authorId === currentUserId ? 'You' : group.authorName}
                    </span>
                    <Tooltip title={dayjs(headNote.createdAt).format('dddd, MMM D, YYYY [at] HH:mm')}>
                      <span className="timestamp">· {smartTimestamp(headNote.createdAt)}</span>
                    </Tooltip>
                    {headEdited && (
                      <Tooltip title={`Last edited ${smartTimestamp(headNote.updatedAt)}`}>
                        <Tag className="edited-tag">edited</Tag>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Notes in this group */}
                {group.notes.map((note, idx) => {
                  const isAuthor = note.createdBy.id === currentUserId;
                  // Edit stays with the author (assignment-gated). Delete is
                  // admin-only — even authors cannot retract their own notes.
                  // They can edit to clarify or correct, but the row stays
                  // for audit trail purposes.
                  const canEdit = isAuthor && canWrite;
                  const canDelete = isAdmin;
                  const edited = wasEdited(note);
                  const isEditing = editingNoteId === note.id;
                  const isStacked = idx > 0;
                  const isNewest = newestIdRef.current === note.id;

                  return (
                    <React.Fragment key={note.id}>
                      {isStacked && (
                        <Tooltip
                          title={dayjs(note.createdAt).format('dddd, MMM D, YYYY [at] HH:mm')}
                        >
                          <div className="stacked-meta">
                            {smartTimestamp(note.createdAt)}
                            {edited && <Tag className="edited-tag">edited</Tag>}
                          </div>
                        </Tooltip>
                      )}
                      <div className={`note-card${isNewest ? ' slide-in' : ''}`}>
                        {isEditing ? (
                          <div>
                            <Input.TextArea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                              maxLength={MAX_NOTE_LENGTH}
                              showCount
                              disabled={savingEdit}
                              autoFocus
                            />
                            <Space style={{ marginTop: 8 }}>
                              <Button
                                type="primary"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={handleSaveEdit}
                                loading={savingEdit}
                                disabled={!editContent.trim()}
                                style={{ background: '#1a3a52', borderColor: '#1a3a52' }}
                              >
                                Save
                              </Button>
                              <Button
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={cancelEdit}
                                disabled={savingEdit}
                              >
                                Cancel
                              </Button>
                            </Space>
                          </div>
                        ) : (
                          <>
                            <div className="note-content">{note.content}</div>
                            <div className="note-actions">
                              {canEdit && (
                                <Tooltip title="Edit">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => startEdit(note)}
                                  />
                                </Tooltip>
                              )}
                              {canDelete && (
                                <Popconfirm
                                  title="Delete this note?"
                                  description="This cannot be undone."
                                  onConfirm={() => handleDelete(note.id)}
                                  okText="Delete"
                                  okButtonProps={{ danger: true }}
                                  cancelText="Cancel"
                                >
                                  <Tooltip title="Delete">
                                    <Button
                                      type="text"
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                    />
                                  </Tooltip>
                                </Popconfirm>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Subtle footer count for orientation on long lists */}
      {!loading && notes.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 24, color: '#bfbfbf', fontSize: '0.78rem' }}>
          <Text type="secondary" style={{ fontSize: 'inherit' }}>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} on this case
          </Text>
        </div>
      )}
    </div>
  );
}
