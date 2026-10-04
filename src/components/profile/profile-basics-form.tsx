'use client';

import { useState } from 'react';
import { api, ClientApiError } from '@/lib/client';

interface Basics {
  headline: string;
  summary: string;
  location: string;
  phone: string;
  website: string;
}

export function ProfileBasicsForm({ initial }: { initial: Basics }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const set = (k: keyof Basics) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setStatus('idle');
  };

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setStatus('saving');
    setErrors({});
    try {
      await api('/api/profile', { method: 'PATCH', body: values });
      setStatus('saved');
    } catch (err) {
      const fields = (err as ClientApiError).fields ?? {};
      setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v?.[0]])));
      if (!Object.keys(fields).length) setErrors({ form: (err as Error).message });
      setStatus('idle');
    }
  }

  const field = (k: keyof Basics, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={k} className="label">
        {label}
      </label>
      <input id={k} className="input" value={values[k]} onChange={set(k)} onBlur={() => save()} {...props} />
      {errors[k] && <p className="error-text mt-1">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">{field('headline', 'Headline', { placeholder: 'Frontend Engineer · React, TypeScript', maxLength: 220 })}</div>
      <div className="sm:col-span-2">
        <label htmlFor="summary" className="label">
          About
        </label>
        <textarea id="summary" className="input min-h-28" value={values.summary} onChange={set('summary')} onBlur={() => save()} maxLength={4000} />
        {errors.summary && <p className="error-text mt-1">{errors.summary}</p>}
      </div>
      {field('location', 'Location', { placeholder: 'Berlin, Germany' })}
      {field('phone', 'Phone (shown on resumes only)', { type: 'tel' })}
      <div className="sm:col-span-2">{field('website', 'Website', { type: 'url', placeholder: 'https://' })}</div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
          Save
        </button>
        <span className="muted text-sm" aria-live="polite">
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
        {errors.form && <span className="error-text">{errors.form}</span>}
      </div>
    </form>
  );
}
