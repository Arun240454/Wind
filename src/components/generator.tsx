'use client';

import { useEffect, useRef, useState } from 'react';
import type { GenerationResult } from '@/lib/schema';

type Tab = 'summary' | 'cover-letter';

const ACCEPT = '.pdf,.docx,.zip,.txt,.md';

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

export function Generator() {
  const [file, setFile] = useState<File | null>(null);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [busy]);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError('Choose a file first.');
    // Matches MAX_UPLOAD_BYTES on the server; checked here because the host rejects larger bodies first.
    if (file.size > 4 * 1024 * 1024) return setError('The file is larger than 4 MB.');
    setError('');
    setBusy(true);
    setElapsed(0);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('company', company);
      form.set('role', role);
      form.set('jobDescription', jobDescription);
      const res = await fetch('/api/generate', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await errorMessage(res));
      setResult(await res.json());
      setTab('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  if (result) {
    return <Results result={result} onChange={setResult} tab={tab} setTab={setTab} onReset={reset} />;
  }

  return (
    <form onSubmit={onGenerate} className="card space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) setFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
          dragging ? 'border-brand bg-sky-50 dark:bg-sky-950' : 'border-slate-300 hover:border-brand dark:border-slate-700'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Upload your LinkedIn profile or resume"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <p className="font-semibold">{file.name}</p>
            <p className="muted text-sm">{(file.size / 1024).toFixed(0)} KB · click to choose another file</p>
          </>
        ) : (
          <>
            <p className="font-semibold">Drop your LinkedIn profile or resume here</p>
            <p className="muted mt-1 text-sm">PDF, Word (.docx), text, or LinkedIn data export (.zip) · up to 4 MB</p>
          </>
        )}
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-brand">Tailor the cover letter to a job (optional)</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="company">Company</label>
            <input id="company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} />
          </div>
          <div>
            <label className="label" htmlFor="role">Role</label>
            <input id="role" className="input" value={role} onChange={(e) => setRole(e.target.value)} maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="jd">Job description</label>
            <textarea
              id="jd"
              className="input min-h-32"
              placeholder="Paste the job posting for a closer match"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              maxLength={15000}
            />
          </div>
        </div>
      </details>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={!file || busy}>
          {busy ? 'Generating…' : 'Generate summary & cover letter'}
        </button>
        {busy ? <span className="muted text-sm">Reading your file with AI · {elapsed}s (usually under a minute)</span> : null}
      </div>
    </form>
  );
}

function Results({
  result,
  onChange,
  tab,
  setTab,
  onReset,
}: {
  result: GenerationResult;
  onChange: (r: GenerationResult) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  onReset: () => void;
}) {
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');

  async function download(format: 'pdf' | 'docx') {
    setDownloading(format);
    setError('');
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: tab, format, result }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `download.${format}`;
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading('');
    }
  }

  const letterText = result.coverLetter.paragraphs.join('\n\n');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-300 p-1 dark:border-slate-700" role="tablist">
          {(['summary', 'cover-letter'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? 'bg-brand text-white' : 'muted hover:text-brand'}`}
            >
              {t === 'summary' ? 'Summary' : 'Cover letter'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => download('pdf')} disabled={!!downloading}>
            {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
          <button className="btn btn-secondary" onClick={() => download('docx')} disabled={!!downloading}>
            {downloading === 'docx' ? 'Preparing…' : 'Download Word'}
          </button>
          <button className="btn btn-ghost" onClick={onReset}>Start over</button>
        </div>
      </div>
      {error ? <p className="error-text" role="alert">{error}</p> : null}

      {tab === 'summary' ? (
        <SummaryView r={result} />
      ) : (
        <div className="card space-y-3">
          <p className="muted text-sm">Edit anything below. Downloads use your edited text.</p>
          <input
            className="input"
            aria-label="Greeting"
            value={result.coverLetter.greeting}
            onChange={(e) => onChange({ ...result, coverLetter: { ...result.coverLetter, greeting: e.target.value } })}
          />
          <textarea
            className="input min-h-96 leading-relaxed"
            aria-label="Cover letter body"
            value={letterText}
            onChange={(e) =>
              onChange({ ...result, coverLetter: { ...result.coverLetter, paragraphs: e.target.value.split(/\n\s*\n/) } })
            }
          />
          <input
            className="input"
            aria-label="Closing"
            value={result.coverLetter.closing}
            onChange={(e) => onChange({ ...result, coverLetter: { ...result.coverLetter, closing: e.target.value } })}
          />
          <p className="text-sm">{result.candidate.name}</p>
        </div>
      )}
    </div>
  );
}

function SummaryView({ r }: { r: GenerationResult }) {
  const { candidate: c, summary: s } = r;
  const contact = [c.email, c.phone, c.location, ...c.links].filter(Boolean);
  return (
    <article className="card space-y-5">
      <header>
        <h2 className="text-2xl font-bold">{c.name || 'Career summary'}</h2>
        {c.headline ? <p className="mt-1">{c.headline}</p> : null}
        {contact.length ? <p className="muted mt-1 text-sm break-words">{contact.join(' · ')}</p> : null}
      </header>

      <Block title="Overview">
        <p>{s.overview}</p>
        {s.experienceLevel ? <p className="muted mt-1 text-sm">{s.experienceLevel}</p> : null}
      </Block>

      {s.strengths.length ? (
        <Block title="Key strengths">
          <ul className="list-disc space-y-1 pl-5">{s.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Block>
      ) : null}

      {s.keySkills.length ? (
        <Block title="Skills">
          <div className="flex flex-wrap gap-2">{s.keySkills.map((x) => <span key={x} className="chip">{x}</span>)}</div>
        </Block>
      ) : null}

      {s.experience.length ? (
        <Block title="Experience">
          <div className="space-y-4">
            {s.experience.map((e, i) => (
              <div key={i}>
                <p className="font-semibold">
                  {e.title}
                  {e.company ? <span className="font-normal">, {e.company}</span> : null}
                </p>
                {e.dates ? <p className="muted text-sm">{e.dates}</p> : null}
                <ul className="mt-1 list-disc space-y-1 pl-5">{e.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
              </div>
            ))}
          </div>
        </Block>
      ) : null}

      {s.education.length ? (
        <Block title="Education">
          <ul className="space-y-2">
            {s.education.map((e, i) => (
              <li key={i}>
                <p className="font-semibold">{e.degree || e.school}</p>
                <p className="muted text-sm">{[e.degree ? e.school : '', e.dates].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {s.certifications.length ? (
        <Block title="Certifications">
          <ul className="list-disc space-y-1 pl-5">{s.certifications.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Block>
      ) : null}
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 border-b border-slate-200 pb-1 text-sm font-bold tracking-wide uppercase dark:border-slate-800">{title}</h3>
      {children}
    </section>
  );
}
