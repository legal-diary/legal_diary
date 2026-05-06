'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({
  value = '',
  onChange,
  readOnly = false,
  placeholder = 'Start typing...',
  minHeight = '150px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  const getHeadingValue = () => {
    if (!editor) return 'paragraph';
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'paragraph';
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editor) return;
    const val = e.target.value;
    if (val === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else if (val === 'h1') {
      editor.chain().focus().setHeading({ level: 1 }).run();
    } else if (val === 'h2') {
      editor.chain().focus().setHeading({ level: 2 }).run();
    } else if (val === 'h3') {
      editor.chain().focus().setHeading({ level: 3 }).run();
    }
  };

  const handleLinkClick = () => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    border: 'none',
    background: active ? '#e6f4ff' : 'transparent',
    color: active ? '#1a3a52' : 'inherit',
    cursor: 'pointer',
    padding: '0.3rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.9rem',
    fontWeight: active ? 600 : 400,
    lineHeight: 1,
  });

  return (
    <>
      <style>{`
        .tiptap-editor-content p { margin: 0.5em 0; }
        .tiptap-editor-content ul,
        .tiptap-editor-content ol { padding-left: 1.5em; }
        .tiptap-editor-content blockquote {
          border-left: 3px solid #d9d9d9;
          padding-left: 1em;
          color: #666;
          margin: 0.5em 0;
        }
        .tiptap-editor-content a { color: #1a3a52; }
        .tiptap-editor-content:focus { outline: none; }
        .tiptap-editor-content { outline: none; }
      `}</style>

      <div
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: '0.5rem',
          overflow: 'hidden',
        }}
      >
        {!readOnly && (
          <div
            style={{
              background: '#fafafa',
              borderBottom: '1px solid #d9d9d9',
              padding: '0.5rem',
              display: 'flex',
              gap: '0.25rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <select
              value={getHeadingValue()}
              onChange={handleHeadingChange}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '0.25rem',
                padding: '0.2rem 0.4rem',
                fontSize: '0.85rem',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="paragraph">Normal</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              style={btnStyle(editor?.isActive('bold') ?? false)}
              title="Bold"
            >
              <strong>B</strong>
            </button>

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              style={btnStyle(editor?.isActive('italic') ?? false)}
              title="Italic"
            >
              <em>I</em>
            </button>

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              style={btnStyle(editor?.isActive('underline') ?? false)}
              title="Underline"
            >
              <span style={{ textDecoration: 'underline' }}>U</span>
            </button>

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              style={btnStyle(editor?.isActive('orderedList') ?? false)}
              title="Ordered List"
            >
              ≡
            </button>

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              style={btnStyle(editor?.isActive('bulletList') ?? false)}
              title="Bullet List"
            >
              •
            </button>

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              style={btnStyle(editor?.isActive('blockquote') ?? false)}
              title="Blockquote"
            >
              ❝
            </button>

            <button
              type="button"
              onClick={handleLinkClick}
              style={btnStyle(editor?.isActive('link') ?? false)}
              title="Insert Link"
            >
              🔗
            </button>
          </div>
        )}

        <div
          style={{
            padding: '0.75rem',
            minHeight,
            cursor: readOnly ? 'default' : 'text',
          }}
          onClick={() => {
            if (!readOnly) editor?.commands.focus();
          }}
        >
          {!editor?.getText() && !readOnly && (
            <div
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                color: '#bfbfbf',
                fontSize: '0.9rem',
              }}
            >
              {placeholder}
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}
