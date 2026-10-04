'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { SectionKey } from '@/lib/validation/profile';

interface Settings {
  theme: 'classic' | 'modern';
  isPublic: boolean;
  unlisted: boolean;
  sectionVisibility: Record<SectionKey, boolean>;
}

const SECTION_LABELS: Record<SectionKey, string> = {
  about: 'About',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
};

export function PortfolioSettings({ username, initial }: { username: string; initial: Settings }) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/u/${username}`;

  async function save(next: Settings) {
    setS(next);
    setSaving(true);
    setError(null);
    try {
      await api('/api/profile', { method: 'PATCH', body: next });
      setPreviewKey((k) => k + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <section className="card space-y-3">
          <h2 className="font-semibold">Visibility</h2>
          <p className="text-sm">
            Status:{' '}
            <strong className={s.isPublic ? 'text-emerald-700 dark:text-emerald-400' : ''}>{s.isPublic ? 'Published' : 'Private draft'}</strong>
          </p>
          <button type="button" className={`btn w-full ${s.isPublic ? 'btn-secondary' : 'btn-primary'}`} onClick={() => save({ ...s, isPublic: !s.isPublic })} disabled={saving}>
            {s.isPublic ? 'Unpublish' : 'Publish portfolio'}
          </button>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={s.unlisted} onChange={(e) => save({ ...s, unlisted: e.target.checked })} />
            <span>
              Unlisted <span className="muted block text-xs">Anyone with the link can view it, but search engines won&apos;t index it.</span>
            </span>
          </label>
          {s.isPublic && (
            <div className="flex gap-2">
              <input className="input text-xs" readOnly value={url} aria-label="Portfolio link" />
              <button
                type="button"
                className="btn btn-secondary shrink-0"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Theme</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['classic', 'modern'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => save({ ...s, theme: t })}
                aria-pressed={s.theme === t}
                className={`rounded-lg border-2 p-3 text-sm font-medium capitalize ${s.theme === t ? 'border-brand text-brand' : 'border-slate-200 dark:border-slate-700'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="muted text-xs">Both themes follow the visitor&apos;s light or dark mode.</p>
        </section>

        <section className="card space-y-2">
          <h2 className="font-semibold">Sections</h2>
          {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.sectionVisibility[k]}
                onChange={(e) => save({ ...s, sectionVisibility: { ...s.sectionVisibility, [k]: e.target.checked } })}
              />
              {SECTION_LABELS[k]}
            </label>
          ))}
        </section>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-sm dark:border-slate-800">
          <span className="muted">Preview{saving ? ' · saving…' : ''}</span>
          <a href={`/u/${username}`} target="_blank" className="text-brand hover:underline">
            Open in new tab ↗
          </a>
        </div>
        <iframe key={previewKey} src={`/u/${username}`} title="Portfolio preview" className="h-[75vh] w-full bg-white dark:bg-slate-950" />
      </div>
    </div>
  );
}
