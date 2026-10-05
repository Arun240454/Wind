'use client';

import { useState } from 'react';
import { api, ClientApiError } from '@/lib/client';
import { formatMonth, formatRange } from '@/lib/dates';
import type { RecordType } from '@/lib/validation/profile';

type FieldKind = 'text' | 'textarea' | 'month' | 'endMonth' | 'lines' | 'tags' | 'url';
interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  wide?: boolean;
  placeholder?: string;
}
type Rec = { id: string } & Record<string, unknown>;

const CONFIG: Record<RecordType, { title: string; empty: string; fields: FieldDef[]; summary: (r: Rec) => { title: string; sub: string } }> = {
  experience: {
    title: 'Experience',
    empty: 'Add your jobs, most recent first.',
    fields: [
      { name: 'title', label: 'Job title', kind: 'text', required: true },
      { name: 'company', label: 'Company', kind: 'text', required: true },
      { name: 'location', label: 'Location', kind: 'text' },
      { name: 'startMonth', label: 'Start', kind: 'month' },
      { name: 'endMonth', label: 'End', kind: 'endMonth' },
      { name: 'bullets', label: 'Achievements (one per line)', kind: 'lines', wide: true, placeholder: 'Cut page load time by 40% by…' },
    ],
    summary: (r) => ({
      title: `${r.title} · ${r.company}`,
      sub: [formatRange(r.startMonth as string, r.endMonth as string | null), r.location].filter(Boolean).join(' · '),
    }),
  },
  education: {
    title: 'Education',
    empty: 'Add schools, degrees and courses.',
    fields: [
      { name: 'school', label: 'School', kind: 'text', required: true },
      { name: 'degree', label: 'Degree', kind: 'text' },
      { name: 'field', label: 'Field of study', kind: 'text' },
      { name: 'startMonth', label: 'Start', kind: 'month' },
      { name: 'endMonth', label: 'End', kind: 'month' },
      { name: 'notes', label: 'Notes', kind: 'textarea', wide: true },
    ],
    summary: (r) => ({
      title: String(r.school),
      sub: [[r.degree, r.field].filter(Boolean).join(', '), formatRange(r.startMonth as string, r.endMonth as string | null, false)].filter(Boolean).join(' · '),
    }),
  },
  skills: {
    title: 'Skills',
    empty: 'Add at least five skills. The first one is used as your "top skill" in cover letters.',
    fields: [
      { name: 'name', label: 'Skill', kind: 'text', required: true },
      { name: 'category', label: 'Category (optional)', kind: 'text' },
    ],
    summary: (r) => ({ title: String(r.name), sub: String(r.category ?? '') }),
  },
  certifications: {
    title: 'Certifications',
    empty: 'Add certificates and licenses.',
    fields: [
      { name: 'name', label: 'Name', kind: 'text', required: true },
      { name: 'issuer', label: 'Issuer', kind: 'text' },
      { name: 'issuedMonth', label: 'Issued', kind: 'month' },
      { name: 'url', label: 'Credential URL', kind: 'url' },
    ],
    summary: (r) => ({ title: String(r.name), sub: [r.issuer, formatMonth(r.issuedMonth as string)].filter(Boolean).join(' · ') }),
  },
  projects: {
    title: 'Projects',
    empty: 'Projects show as cards on your portfolio.',
    fields: [
      { name: 'title', label: 'Title', kind: 'text', required: true },
      { name: 'url', label: 'Link', kind: 'url' },
      { name: 'description', label: 'Description', kind: 'textarea', wide: true },
      { name: 'tags', label: 'Tags (comma separated)', kind: 'tags', wide: true },
      { name: 'imageUrl', label: 'Image URL (optional)', kind: 'url', wide: true },
    ],
    summary: (r) => ({ title: String(r.title), sub: ((r.tags as string[]) ?? []).join(', ') }),
  },
};

/** Converts between API values and form strings. */
function toForm(fields: FieldDef[], r?: Rec): Record<string, string> {
  return Object.fromEntries(
    fields.map((f) => {
      const v = r?.[f.name];
      if (f.kind === 'lines') return [f.name, ((v as string[]) ?? []).join('\n')];
      if (f.kind === 'tags') return [f.name, ((v as string[]) ?? []).join(', ')];
      return [f.name, (v as string | null) ?? ''];
    })
  );
}

function fromForm(fields: FieldDef[], values: Record<string, string>, current: boolean) {
  return Object.fromEntries(
    fields.map((f) => {
      const v = values[f.name] ?? '';
      if (f.kind === 'lines') return [f.name, v.split('\n').map((l) => l.trim()).filter(Boolean)];
      if (f.kind === 'tags') return [f.name, v.split(',').map((t) => t.trim()).filter(Boolean)];
      if (f.kind === 'endMonth') return [f.name, current || !v ? null : v];
      if (f.name === 'endMonth') return [f.name, v || null];
      return [f.name, v];
    })
  );
}

function RecordForm({
  fields,
  initial,
  onSave,
  onCancel,
}: {
  fields: FieldDef[];
  initial?: Rec;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(() => toForm(fields, initial));
  const [current, setCurrent] = useState(() => initial !== undefined && initial.endMonth == null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await onSave(fromForm(fields, values, current));
    } catch (err) {
      const f = (err as ClientApiError).fields ?? {};
      setErrors({ ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0]])), form: Object.keys(f).length ? undefined : (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 dark:bg-slate-950">
      {fields.map((f) => {
        const id = `f-${f.name}-${initial?.id ?? 'new'}`;
        const common = {
          id,
          className: 'input',
          value: values[f.name],
          required: f.required,
          placeholder: f.placeholder,
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [f.name]: e.target.value })),
        };
        return (
          <div key={f.name} className={f.wide ? 'sm:col-span-2' : ''}>
            <label htmlFor={id} className="label">
              {f.label}
            </label>
            {f.kind === 'textarea' || f.kind === 'lines' ? (
              <textarea {...common} className="input min-h-24" />
            ) : f.kind === 'endMonth' ? (
              <div className="flex items-center gap-3">
                <input {...common} type="text" inputMode="numeric" placeholder="YYYY-MM" pattern="[0-9]{4}(-[0-9]{2})?" disabled={current} />
                <label className="flex shrink-0 items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} /> Current
                </label>
              </div>
            ) : (
              <input {...common} {...(f.kind === 'month' ? { inputMode: 'numeric' as const, placeholder: 'YYYY-MM', pattern: '[0-9]{4}(-[0-9]{2})?' } : {})} type={f.kind === 'url' ? 'url' : 'text'} />
            )}
            {errors[f.name] && <p className="error-text mt-1">{errors[f.name]}</p>}
          </div>
        );
      })}
      {errors.form && <p className="error-text sm:col-span-2">{errors.form}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function RecordSection({ type, initial }: { type: RecordType; initial: Rec[] }) {
  const config = CONFIG[type];
  const [records, setRecords] = useState<Rec[]>(initial);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(data: Record<string, unknown>) {
    const { record } = await api<{ record: Rec }>(`/api/profile/${type}`, { body: data });
    setRecords((r) => [...r, record]);
    setEditing(null);
  }

  async function update(id: string, data: Record<string, unknown>) {
    const { record } = await api<{ record: Rec }>(`/api/profile/${type}/${id}`, { method: 'PATCH', body: data });
    setRecords((rs) => rs.map((r) => (r.id === id ? record : r)));
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      await api(`/api/profile/${type}/${id}`, { method: 'DELETE' });
      setRecords((rs) => rs.filter((r) => r.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function move(index: number, delta: number) {
    const next = [...records];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setRecords(next);
    try {
      await api('/api/profile/reorder', { method: 'PATCH', body: { type, ids: next.map((r) => r.id) } });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="card" aria-labelledby={`h-${type}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 id={`h-${type}`} className="font-semibold">
          {config.title} <span className="muted text-sm font-normal">({records.length})</span>
        </h2>
        {editing !== 'new' && (
          <button type="button" className="btn btn-secondary" onClick={() => setEditing('new')}>
            + Add
          </button>
        )}
      </div>

      {error && <p className="error-text mb-2">{error}</p>}
      {editing === 'new' && <RecordForm fields={config.fields} onSave={create} onCancel={() => setEditing(null)} />}
      {records.length === 0 && editing !== 'new' && <p className="muted text-sm">{config.empty}</p>}

      <ul className={type === 'skills' ? 'flex flex-wrap gap-2' : 'divide-y divide-slate-100 dark:divide-slate-800'}>
        {records.map((r, i) => {
          const { title, sub } = config.summary(r);
          if (editing === r.id) {
            return (
              <li key={r.id} className="w-full py-2">
                <RecordForm fields={config.fields} initial={r} onSave={(d) => update(r.id, d)} onCancel={() => setEditing(null)} />
              </li>
            );
          }
          if (type === 'skills') {
            return (
              <li key={r.id} className="chip gap-1 py-1 text-sm">
                <button type="button" onClick={() => setEditing(r.id)} title="Edit">
                  {title}
                </button>
                <button type="button" onClick={() => remove(r.id)} aria-label={`Delete ${title}`} className="ml-1 opacity-60 hover:opacity-100">
                  ×
                </button>
              </li>
            );
          }
          return (
            <li key={r.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{title}</p>
                {sub && <p className="muted text-sm">{sub}</p>}
                {type === 'experience' && (r.bullets as string[]).length > 0 && (
                  <p className="muted text-xs">{(r.bullets as string[]).length} bullets</p>
                )}
              </div>
              <div className="flex shrink-0 items-center">
                <button type="button" className="btn btn-ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => move(i, 1)} disabled={i === records.length - 1} aria-label="Move down">
                  ↓
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(r.id)}>
                  Edit
                </button>
                <button type="button" className="btn btn-ghost text-red-700 dark:text-red-400" onClick={() => remove(r.id)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
