import { z } from 'zod';
import { formatMonth, formatRange } from '@/lib/dates';

/** What a resume version stores: references and toggles, never copies of profile data. */
export const resumeSelections = z.object({
  paper: z.enum(['LETTER', 'A4']).default('LETTER'),
  sections: z
    .object({
      summary: z.boolean().default(true),
      experience: z.boolean().default(true),
      education: z.boolean().default(true),
      skills: z.boolean().default(true),
      certifications: z.boolean().default(true),
      projects: z.boolean().default(false),
    })
    .default({}),
  /** Records left out of this resume. New records are included by default. */
  hiddenIds: z.array(z.string()).max(500).default([]),
  /** Per-experience bullet indexes left out, e.g. { "exp_1": [2, 3] }. */
  hiddenBullets: z.record(z.string(), z.array(z.number().int().min(0))).default({}),
});

export type ResumeSelections = z.infer<typeof resumeSelections>;

export function parseSelections(value: unknown): ResumeSelections {
  const parsed = resumeSelections.safeParse(value ?? {});
  return parsed.success ? parsed.data : resumeSelections.parse({});
}

export interface ResumeEntry {
  title: string;
  org: string;
  location: string;
  dates: string;
  bullets: string[];
}

export type ResumeSection =
  | { kind: 'text'; heading: string; text: string }
  | { kind: 'entries'; heading: string; entries: ResumeEntry[] };

/** Renderer-agnostic resume. The PDF, DOCX and HTML preview all draw this one object. */
export interface ResumeDocument {
  name: string;
  headline: string;
  contact: string[];
  paper: 'LETTER' | 'A4';
  sections: ResumeSection[];
}

/** The subset of the profile the builder reads. Structural so tests can pass plain objects. */
export interface ResumeSource {
  name: string;
  email: string;
  headline: string;
  summary: string;
  location: string;
  phone: string;
  website: string;
  experiences: { id: string; company: string; title: string; location: string; startMonth: string; endMonth: string | null; bullets: string[] }[];
  educations: { id: string; school: string; degree: string; field: string; startMonth: string; endMonth: string | null; notes: string }[];
  skills: { id: string; name: string }[];
  certifications: { id: string; name: string; issuer: string; issuedMonth: string }[];
  projects: { id: string; title: string; description: string; url: string; tags: string[] }[];
}

/**
 * ATS rules applied here, in one place:
 * - fixed, standard headings in a fixed order
 * - one date format ("Jan 2023 – Present")
 * - contact details in the body (renderers must not move them to a page header/footer)
 * - plain strings only: no icons, ratings or tables
 */
export function buildResumeDocument(src: ResumeSource, selections: ResumeSelections): ResumeDocument {
  const hidden = new Set(selections.hiddenIds);
  const on = selections.sections;
  const sections: ResumeSection[] = [];

  if (on.summary && src.summary.trim()) {
    sections.push({ kind: 'text', heading: 'Summary', text: src.summary.trim() });
  }

  if (on.experience) {
    const entries = src.experiences
      .filter((e) => !hidden.has(e.id))
      .map((e) => {
        const hiddenBullets = new Set(selections.hiddenBullets[e.id] ?? []);
        return {
          title: e.title,
          org: e.company,
          location: e.location,
          dates: formatRange(e.startMonth, e.endMonth, true),
          bullets: e.bullets.filter((_, i) => !hiddenBullets.has(i)),
        };
      });
    if (entries.length) sections.push({ kind: 'entries', heading: 'Experience', entries });
  }

  if (on.education) {
    const entries = src.educations
      .filter((e) => !hidden.has(e.id))
      .map((e) => ({
        title: [e.degree, e.field].filter(Boolean).join(', ') || e.school,
        org: e.degree || e.field ? e.school : '',
        location: '',
        dates: formatRange(e.startMonth, e.endMonth, false),
        bullets: e.notes ? [e.notes] : [],
      }));
    if (entries.length) sections.push({ kind: 'entries', heading: 'Education', entries });
  }

  if (on.skills) {
    const names = src.skills.filter((s) => !hidden.has(s.id)).map((s) => s.name);
    if (names.length) sections.push({ kind: 'text', heading: 'Skills', text: names.join(', ') });
  }

  if (on.certifications) {
    const entries = src.certifications
      .filter((c) => !hidden.has(c.id))
      .map((c) => ({ title: c.name, org: c.issuer, location: '', dates: formatMonth(c.issuedMonth), bullets: [] }));
    if (entries.length) sections.push({ kind: 'entries', heading: 'Certifications', entries });
  }

  if (on.projects) {
    const entries = src.projects
      .filter((p) => !hidden.has(p.id))
      .map((p) => ({
        title: p.title,
        org: p.tags.join(', '),
        location: '',
        dates: '',
        bullets: [p.description, p.url].filter(Boolean),
      }));
    if (entries.length) sections.push({ kind: 'entries', heading: 'Projects', entries });
  }

  return {
    name: src.name,
    headline: src.headline,
    contact: [src.email, src.phone, src.location, src.website].filter(Boolean),
    paper: selections.paper,
    sections,
  };
}

/** "Ada Lovelace" → "Ada-Lovelace-Resume.pdf" */
export function exportFileName(name: string, kind: 'Resume' | 'Cover-Letter', ext: 'pdf' | 'docx'): string {
  const base = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join('-');
  return `${base || 'WindSliter'}-${kind}.${ext}`;
}
