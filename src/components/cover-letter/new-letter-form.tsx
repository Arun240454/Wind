'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export function NewLetterForm({ templates }: { templates: { key: string; name: string; description: string }[] }) {
  const router = useRouter();
  const [templateKey, setTemplateKey] = useState(templates[0].key);
  const [fields, setFields] = useState({ company: '', role: '', hiringManager: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { letter } = await api<{ letter: { id: string } }>('/api/cover-letters', { body: { templateKey, fields } });
      router.push(`/cover-letters/${letter.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const input = (k: keyof typeof fields, label: string) => (
    <div>
      <label htmlFor={`new-${k}`} className="label">
        {label}
      </label>
      <input id={`new-${k}`} className="input" value={fields[k]} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} maxLength={200} />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="label">Template</legend>
        {templates.map((t) => (
          <label
            key={t.key}
            className={`cursor-pointer rounded-lg border-2 p-3 text-sm ${templateKey === t.key ? 'border-brand' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <input type="radio" name="template" value={t.key} checked={templateKey === t.key} onChange={() => setTemplateKey(t.key)} className="sr-only" />
            <span className="font-semibold">{t.name}</span>
            <span className="muted mt-1 block text-xs">{t.description}</span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        {input('company', 'Company')}
        {input('role', 'Role')}
        {input('hiringManager', 'Hiring manager (optional)')}
      </div>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Creating…' : 'Create letter'}
      </button>
    </form>
  );
}
