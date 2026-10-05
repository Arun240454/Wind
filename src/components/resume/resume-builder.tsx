'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { ResumeDocument, ResumeSelections } from '@/lib/resume/build';
import { ResumePreview } from './resume-preview';

type SectionKey = keyof ResumeSelections['sections'];
interface Item {
  id: string;
  label: string;
  bullets?: string[];
}

const SECTIONS: { key: SectionKey; label: string; records?: 'experience' | 'education' | 'skills' | 'certifications' | 'projects' }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'experience', label: 'Experience', records: 'experience' },
  { key: 'education', label: 'Education', records: 'education' },
  { key: 'skills', label: 'Skills', records: 'skills' },
  { key: 'certifications', label: 'Certifications', records: 'certifications' },
  { key: 'projects', label: 'Projects', records: 'projects' },
];

export function ResumeBuilder({
  resume,
  initialDocument,
  records,
}: {
  resume: { id: string; name: string; selections: ResumeSelections };
  initialDocument: ResumeDocument;
  records: Record<NonNullable<(typeof SECTIONS)[number]['records']>, Item[]>;
}) {
  const router = useRouter();
  const [name, setName] = useState(resume.name);
  const [sel, setSel] = useState(resume.selections);
  const [doc, setDoc] = useState(initialDocument);
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const lastSaved = useRef(JSON.stringify({ name: resume.name, selections: resume.selections }));

  // Autosave 400 ms after the last change; the server returns the rebuilt document.
  useEffect(() => {
    const body = { name: name.trim() || 'My resume', selections: sel };
    const key = JSON.stringify(body);
    if (key === lastSaved.current) {
      setStatus('saved');
      return;
    }
    setStatus('saving');
    const t = setTimeout(async () => {
      try {
        const res = await api<{ document: ResumeDocument }>(`/api/resumes/${resume.id}`, { method: 'PATCH', body });
        lastSaved.current = key;
        setDoc(res.document);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name, sel, resume.id]);

  const hidden = new Set(sel.hiddenIds);
  const toggleId = (id: string) =>
    setSel((s) => ({ ...s, hiddenIds: hidden.has(id) ? s.hiddenIds.filter((x) => x !== id) : [...s.hiddenIds, id] }));
  const toggleBullet = (expId: string, i: number) =>
    setSel((s) => {
      const cur = s.hiddenBullets[expId] ?? [];
      const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
      return { ...s, hiddenBullets: { ...s.hiddenBullets, [expId]: next } };
    });

  async function remove() {
    if (!confirm('Delete this resume?')) return;
    await api(`/api/resumes/${resume.id}`, { method: 'DELETE' });
    router.push('/resumes');
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <div className="card space-y-3">
          <label htmlFor="resume-name" className="label">
            Resume name
          </label>
          <input id="resume-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <div className="flex items-center gap-3">
            <label htmlFor="paper" className="label mb-0">
              Paper
            </label>
            <select id="paper" className="input w-auto" value={sel.paper} onChange={(e) => setSel((s) => ({ ...s, paper: e.target.value as 'LETTER' | 'A4' }))}>
              <option value="LETTER">US Letter</option>
              <option value="A4">A4</option>
            </select>
            <span className="muted ml-auto text-xs" aria-live="polite">
              {status === 'saving' ? 'Saving…' : status === 'error' ? 'Save failed' : 'Saved'}
            </span>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">What to include</h2>
          {SECTIONS.map(({ key, label, records: rk }) => {
            const items = rk ? records[rk] : [];
            return (
              <div key={key}>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={sel.sections[key]}
                    onChange={(e) => setSel((s) => ({ ...s, sections: { ...s.sections, [key]: e.target.checked } }))}
                  />
                  {label}
                  {rk && <span className="muted font-normal">({items.length})</span>}
                </label>
                {sel.sections[key] && items.length > 0 && (
                  <ul className="mt-2 space-y-1.5 border-l border-slate-200 pl-4 dark:border-slate-800">
                    {items.map((it) => (
                      <li key={it.id} className="text-sm">
                        <label className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" checked={!hidden.has(it.id)} onChange={() => toggleId(it.id)} />
                          <span>{it.label}</span>
                        </label>
                        {it.bullets && !hidden.has(it.id) && it.bullets.length > 0 && (
                          <ul className="mt-1 space-y-1 pl-6">
                            {it.bullets.map((b, i) => (
                              <li key={i}>
                                <label className="muted flex items-start gap-2 text-xs">
                                  <input type="checkbox" className="mt-0.5" checked={!(sel.hiddenBullets[it.id] ?? []).includes(i)} onChange={() => toggleBullet(it.id, i)} />
                                  <span className="line-clamp-2">{b}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <p className="muted text-xs">
            Missing something?{' '}
            <Link href="/profile" className="text-brand underline">
              Edit your profile
            </Link>
            . Changes there update every resume.
          </p>
        </div>

        <button type="button" className="btn btn-danger w-full" onClick={remove}>
          Delete resume
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="muted mr-auto text-sm">Single column, standard headings and selectable text, so ATS parsers read it cleanly.</span>
          <a href={`/api/resumes/${resume.id}/export?format=pdf`} className="btn btn-primary" data-testid="download-pdf">
            Download PDF
          </a>
          <a href={`/api/resumes/${resume.id}/export?format=docx`} className="btn btn-secondary" data-testid="download-docx">
            Download Word
          </a>
        </div>
        <div className="rounded-xl bg-slate-200 p-4 sm:p-8 dark:bg-slate-800">
          <ResumePreview doc={doc} />
        </div>
      </div>
    </div>
  );
}
