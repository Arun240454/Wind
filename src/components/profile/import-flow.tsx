'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { formatRange, formatMonth } from '@/lib/dates';
import type { DiffItem, ImportDiff } from '@/lib/import/merge';

type ListKey = 'experience' | 'education' | 'skills' | 'certifications' | 'projects';
const LISTS: { key: ListKey; label: string }[] = [
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'projects', label: 'Projects' },
];

const STATUS_LABEL: Record<DiffItem<unknown>['status'], string> = {
  new: 'New',
  update: 'Updated',
  unchanged: 'Already saved',
  'kept-manual': 'You edited this; kept yours',
};

function describe(key: ListKey, r: Record<string, unknown>): { title: string; sub: string } {
  switch (key) {
    case 'experience':
      return { title: `${r.title} · ${r.company}`, sub: formatRange(r.startMonth as string, r.endMonth as string | null) };
    case 'education':
      return { title: String(r.school), sub: [r.degree, formatRange(r.startMonth as string, r.endMonth as string | null, false)].filter(Boolean).join(' · ') };
    case 'skills':
      return { title: String(r.name), sub: '' };
    case 'certifications':
      return { title: String(r.name), sub: [r.issuer, formatMonth(r.issuedMonth as string)].filter(Boolean).join(' · ') };
    case 'projects':
      return { title: String(r.title), sub: String(r.description ?? '').slice(0, 90) };
  }
}

export function ImportGuide() {
  return (
    <div className="muted space-y-3 text-sm">
      <ol className="list-decimal space-y-1 pl-5">
        <li>On LinkedIn (desktop), open your own profile page.</li>
        <li>
          Click <strong>Resources</strong> (or <strong>More</strong>) under your name, then <strong>Save to PDF</strong>.
        </li>
        <li>Upload the downloaded <strong>Profile.pdf</strong> here.</li>
      </ol>
      <p>
        <strong>Want everything?</strong> The profile PDF lists only your top skills. For all skills, certifications and projects, request your
        data export at <strong>Settings &amp; Privacy → Data privacy → Get a copy of your data</strong>. LinkedIn emails you a ZIP, usually
        within a day, and you can upload it here too.
      </p>
    </div>
  );
}

export function ImportFlow({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [diff, setDiff] = useState<ImportDiff | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Record<string, { created: number; updated: number; skipped: number }> | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api<{ fileName: string; diff: ImportDiff }>('/api/profile/import', { form });
      setFileName(res.fileName);
      setDiff(res.diff);
      // Everything that would change is ticked by default; the user unticks what they don't want.
      const initial: Record<string, boolean> = {};
      res.diff.profile.forEach((c) => (initial[`profile:${c.field}`] = true));
      LISTS.forEach(({ key }) =>
        (res.diff[key] as DiffItem<unknown>[]).forEach((d, i) => (initial[`${key}:${i}`] = d.status === 'new' || d.status === 'update'))
      );
      setChecked(initial);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  const selectedCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);

  async function confirm() {
    if (!diff) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        fileName,
        profile: Object.fromEntries(diff.profile.filter((c) => checked[`profile:${c.field}`]).map((c) => [c.field, c.incoming])),
      };
      LISTS.forEach(({ key }) => {
        body[key] = (diff[key] as DiffItem<unknown>[]).filter((_, i) => checked[`${key}:${i}`]).map((d) => d.incoming);
      });
      const res = await api<{ counts: typeof result }>('/api/profile/import/confirm', { body });
      setResult(res.counts);
      setDiff(null);
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const created = Object.values(result).reduce((n, c) => n + c.created, 0);
    const updated = Object.values(result).reduce((n, c) => n + c.updated, 0);
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" role="status">
        Import complete: {created} added, {updated} updated.
        <button type="button" className="btn btn-ghost ml-2" onClick={() => setResult(null)}>
          Import another file
        </button>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand dark:border-slate-700">
          <span className="font-semibold">{busy ? 'Reading your profile…' : 'Upload your LinkedIn profile PDF'}</span>
          <span className="muted mt-1 text-sm">The PDF from “Save to PDF” on your profile (a data export .zip also works). Read in memory and never stored. Max 10 MB.</span>
          <input
            type="file"
            accept=".pdf,application/pdf,.zip,application/zip"
            className="sr-only"
            onChange={upload}
            disabled={busy}
            data-testid="import-file"
          />
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">How do I get my profile PDF?</summary>
          <div className="mt-2">
            <ImportGuide />
          </div>
        </details>
      </div>
    );
  }

  const toggle = (k: string) => setChecked((c) => ({ ...c, [k]: !c[k] }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Review what will be saved</h3>
        <p className="muted text-sm">
          From <strong>{fileName}</strong>
          {diff.filesRead.length > 1 || diff.filesRead[0] !== fileName ? ` (${diff.filesRead.join(', ')})` : ''}. Untick anything you don&apos;t
          want; you can edit everything afterwards.
          {diff.unknownFiles.length > 0 && ` ${diff.unknownFiles.length} other files in the archive were ignored.`}
        </p>
      </div>

      {diff.profile.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Profile</legend>
          {diff.profile.map((c) => (
            <label key={c.field} className="flex items-start gap-3 border-b border-slate-100 py-2 text-sm dark:border-slate-800">
              <input type="checkbox" checked={!!checked[`profile:${c.field}`]} onChange={() => toggle(`profile:${c.field}`)} className="mt-1" />
              <span>
                <span className="font-medium capitalize">{c.field}:</span> {c.incoming.slice(0, 160)}
                {c.incoming.length > 160 ? '…' : ''}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {LISTS.map(({ key, label }) => {
        const items = diff[key] as DiffItem<Record<string, unknown>>[];
        if (!items.length) return null;
        return (
          <fieldset key={key}>
            <legend className="mb-2 text-sm font-semibold">
              {label} ({items.length})
            </legend>
            <div className={key === 'skills' ? 'flex flex-wrap gap-2' : ''}>
              {items.map((d, i) => {
                const k = `${key}:${i}`;
                const actionable = d.status === 'new' || d.status === 'update';
                const { title, sub } = describe(key, d.incoming);
                return key === 'skills' ? (
                  <label key={k} className={`chip gap-1.5 ${actionable ? '' : 'opacity-50'}`}>
                    <input type="checkbox" checked={!!checked[k]} disabled={!actionable} onChange={() => toggle(k)} />
                    {title}
                  </label>
                ) : (
                  <label key={k} className="flex items-start gap-3 border-b border-slate-100 py-2 text-sm dark:border-slate-800">
                    <input type="checkbox" checked={!!checked[k]} disabled={!actionable} onChange={() => toggle(k)} className="mt-1" />
                    <span className="flex-1">
                      <span className="font-medium">{title}</span>
                      {sub && <span className="muted block">{sub}</span>}
                    </span>
                    <span className={`chip ${actionable ? '' : 'opacity-60'}`}>{STATUS_LABEL[d.status]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy || selectedCount === 0}>
          {busy ? 'Saving…' : `Save ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setDiff(null)} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
