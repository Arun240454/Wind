'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { api } from '@/lib/client';
import type { LetterFields } from '@/lib/cover-letter/fill';

interface Props {
  letter: { id: string; name: string; content: object; fields: LetterFields };
  initialValues: Record<string, string>;
  initialParagraphs: string[];
  mergeFields: { key: string; label: string; fromProfile: boolean }[];
}

export function LetterEditor({ letter, initialValues, initialParagraphs, mergeFields }: Props) {
  const router = useRouter();
  const [name, setName] = useState(letter.name);
  const [fields, setFields] = useState(letter.fields);
  const [content, setContent] = useState<object>(letter.content);
  const [values, setValues] = useState(initialValues);
  const [paragraphs, setParagraphs] = useState(initialParagraphs);
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const lastSaved = useRef(JSON.stringify({ name: letter.name, fields: letter.fields, content: letter.content }));

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false })],
    content: letter.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose-sm min-h-80 rounded-lg border border-slate-300 bg-white p-4 text-[15px] leading-relaxed focus:outline-none dark:border-slate-700 dark:bg-slate-950 [&_p]:mb-3',
        'aria-label': 'Cover letter text',
      },
    },
    onUpdate: ({ editor }) => setContent(editor.getJSON()),
  });

  useEffect(() => {
    const body = { name: name.trim() || 'Cover letter', fields, content };
    const key = JSON.stringify(body);
    if (key === lastSaved.current) {
      setStatus('saved');
      return;
    }
    setStatus('saving');
    const t = setTimeout(async () => {
      try {
        const res = await api<{ values: Record<string, string>; document: { paragraphs: string[] } }>(`/api/cover-letters/${letter.id}`, {
          method: 'PATCH',
          body,
        });
        lastSaved.current = key;
        setValues(res.values);
        setParagraphs(res.document.paragraphs);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [name, fields, content, letter.id]);

  function insertField(key: string) {
    editor?.chain().focus().insertContent(`{{${key}}}`).run();
  }

  async function remove() {
    if (!confirm('Delete this cover letter?')) return;
    await api(`/api/cover-letters/${letter.id}`, { method: 'DELETE' });
    router.push('/cover-letters');
    router.refresh();
  }

  const fieldInput = (k: keyof LetterFields, label: string) => (
    <div>
      <label htmlFor={`f-${k}`} className="label">
        {label}
      </label>
      <input id={`f-${k}`} className="input" value={fields[k]} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} maxLength={200} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-sm text-lg font-semibold" value={name} onChange={(e) => setName(e.target.value)} aria-label="Letter name" maxLength={100} />
        <span className="muted text-sm" aria-live="polite">
          {status === 'saving' ? 'Saving…' : status === 'error' ? 'Save failed' : 'Saved'}
        </span>
        <div className="ml-auto flex gap-2">
          <a href={`/api/cover-letters/${letter.id}/export?format=pdf`} className="btn btn-primary">
            Download PDF
          </a>
          <a href={`/api/cover-letters/${letter.id}/export?format=docx`} className="btn btn-secondary">
            Download Word
          </a>
        </div>
      </div>

      <section className="card grid gap-3 sm:grid-cols-3">
        {fieldInput('company', 'Company')}
        {fieldInput('role', 'Role')}
        {fieldInput('hiringManager', 'Hiring manager')}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-semibold">Edit template</h2>
          <div className="flex flex-wrap gap-1.5" aria-label="Insert merge field">
            {mergeFields.map((f) => (
              <button
                key={f.key}
                type="button"
                className="chip cursor-pointer hover:ring-1 hover:ring-brand"
                onClick={() => insertField(f.key)}
                title={values[f.key] ? `Currently: ${values[f.key]}` : 'Not set yet'}
              >
                + {f.label}
              </button>
            ))}
          </div>
          <EditorContent editor={editor} />
          <p className="muted text-xs">Text in [square brackets] is a prompt for you to replace. Bold and lists are supported; exports use plain text.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Preview</h2>
          <div className="space-y-3 rounded-lg bg-white p-6 text-[15px] leading-relaxed text-neutral-900 shadow" data-testid="letter-preview">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p.split(/(\[[^\]]+\])/).map((part, j) =>
                  part.startsWith('[') ? (
                    <mark key={j} className="rounded bg-amber-100 px-0.5">
                      {part}
                    </mark>
                  ) : (
                    part
                  )
                )}
              </p>
            ))}
          </div>
        </section>
      </div>

      <button type="button" className="btn btn-danger" onClick={remove}>
        Delete letter
      </button>
    </div>
  );
}
