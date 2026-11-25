'use client';

import { useEffect, useRef, useState } from 'react';
import type { GenerationResult } from '@/lib/schema';

const ACCEPT = '.pdf,.docx,.zip,.txt,.md';
// Matches MAX_UPLOAD_BYTES on the server; checked here because the host rejects larger bodies first.
const MAX_BYTES = 4 * 1024 * 1024;

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
  const [hiringManager, setHiringManager] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
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
    if (file.size > MAX_BYTES) return setError('The file is larger than 4 MB.');
    setError('');
    setBusy(true);
    setElapsed(0);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('company', company);
      form.set('hiringManager', hiringManager);
      form.set('jobDescription', jobDescription);
      const res = await fetch('/api/generate', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await errorMessage(res));
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  // Keeps the uploaded file and job details so the user can tweak them and generate again.
  function back() {
    setResult(null);
    setError('');
  }

  if (result) return <LetterEditor result={result} onChange={setResult} onBack={back} />;

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="company">
            Company name <span className="muted font-normal">(optional)</span>
          </label>
          <input id="company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="hiringManager">
            Hiring manager&apos;s name <span className="muted font-normal">(optional)</span>
          </label>
          <input
            id="hiringManager"
            className="input"
            placeholder="e.g. Priya Sharma"
            value={hiringManager}
            onChange={(e) => setHiringManager(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="jd">
            Job description <span className="muted font-normal">(optional)</span>
          </label>
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

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={!file || busy}>
          {busy ? 'Writing…' : 'Generate cover letter'}
        </button>
        {busy ? <span className="muted text-sm">Writing your cover letter with AI · {elapsed}s (usually under a minute)</span> : null}
      </div>
    </form>
  );
}

function LetterEditor({
  result,
  onChange,
  onBack,
}: {
  result: GenerationResult;
  onChange: (r: GenerationResult) => void;
  onBack: () => void;
}) {
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');
  const letter = result.coverLetter;
  const setLetter = (patch: Partial<GenerationResult['coverLetter']>) => onChange({ ...result, coverLetter: { ...letter, ...patch } });

  async function download(format: 'pdf' | 'docx') {
    setDownloading(format);
    setError('');
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, result }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `cover-letter.${format}`;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Your cover letter</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => download('pdf')} disabled={!!downloading}>
            {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
          <button className="btn btn-secondary" onClick={() => download('docx')} disabled={!!downloading}>
            {downloading === 'docx' ? 'Preparing…' : 'Download Word'}
          </button>
          <button className="btn btn-ghost" onClick={onBack}>
            ← Edit details
          </button>
        </div>
      </div>
      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <div className="card space-y-3">
        <p className="muted text-sm">Edit anything below. Downloads use your edited text.</p>
        <input className="input" aria-label="Greeting" value={letter.greeting} onChange={(e) => setLetter({ greeting: e.target.value })} />
        <textarea
          className="input min-h-96 leading-relaxed"
          aria-label="Cover letter body"
          value={letter.paragraphs.join('\n\n')}
          onChange={(e) => setLetter({ paragraphs: e.target.value.split(/\n\s*\n/) })}
        />
        <input className="input" aria-label="Closing" value={letter.closing} onChange={(e) => setLetter({ closing: e.target.value })} />
        <p className="text-sm">{result.candidate.name}</p>
      </div>
    </div>
  );
}
