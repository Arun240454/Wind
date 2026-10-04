import type { RecordType } from '@/lib/validation/profile';
import type { CanonicalImport } from './linkedin-export';

/** The fields of an existing DB record that the merge needs. */
export interface ExistingRecord {
  id: string;
  source: string;
  editedAt: Date | null;
  [key: string]: unknown;
}

export type DiffStatus = 'new' | 'update' | 'unchanged' | 'kept-manual';

export interface DiffItem<T> {
  key: string;
  status: DiffStatus;
  incoming: T;
  existingId?: string;
}

const clean = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Identity keys. Re-importing the same export must match the same rows, so keys use only
 * fields LinkedIn doesn't change between exports.
 */
export const recordKey: Record<RecordType, (r: Record<string, unknown>) => string> = {
  experience: (r) => [clean(r.company), clean(r.title), clean(r.startMonth)].join('|'),
  education: (r) => [clean(r.school), clean(r.degree), clean(r.startMonth)].join('|'),
  skills: (r) => clean(r.name),
  certifications: (r) => [clean(r.name), clean(r.issuer)].join('|'),
  projects: (r) => clean(r.title),
};

/** Fields compared to decide whether an imported record differs from the stored one. */
const COMPARED: Record<RecordType, string[]> = {
  experience: ['location', 'endMonth', 'bullets'],
  education: ['field', 'endMonth', 'notes'],
  skills: [],
  certifications: ['issuedMonth', 'url'],
  projects: ['description', 'url'],
};

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Decides what an incoming record would do:
 * - new: no match
 * - kept-manual: matched a record the user created or edited by hand; never overwritten
 * - update: matched an untouched imported record whose fields changed
 * - unchanged: matched and identical
 */
export function classify<T extends Record<string, unknown>>(
  type: RecordType,
  incoming: T,
  existingByKey: Map<string, ExistingRecord>
): DiffItem<T> {
  const key = recordKey[type](incoming);
  const existing = existingByKey.get(key);
  if (!existing) return { key, status: 'new', incoming };
  if (existing.source !== 'linkedin_export' || existing.editedAt) {
    return { key, status: 'kept-manual', incoming, existingId: existing.id };
  }
  const changed = COMPARED[type].some((f) => !sameValue(existing[f], incoming[f]));
  return { key, status: changed ? 'update' : 'unchanged', incoming, existingId: existing.id };
}

export function indexByKey(type: RecordType, records: ExistingRecord[]): Map<string, ExistingRecord> {
  return new Map(records.map((r) => [recordKey[type](r), r]));
}

export interface ProfileFieldChange {
  field: 'headline' | 'summary' | 'location';
  current: string;
  incoming: string;
}

/** Profile text fields are only filled when empty, so hand-written copy is never replaced. */
export function profileChanges(
  current: { headline: string; summary: string; location: string },
  incoming: CanonicalImport['profile']
): ProfileFieldChange[] {
  return (['headline', 'summary', 'location'] as const)
    .filter((f) => incoming[f] && !current[f].trim())
    .map((f) => ({ field: f, current: current[f], incoming: incoming[f] }));
}

export interface ImportDiff {
  profile: ProfileFieldChange[];
  experience: DiffItem<CanonicalImport['experience'][number]>[];
  education: DiffItem<CanonicalImport['education'][number]>[];
  skills: DiffItem<CanonicalImport['skills'][number]>[];
  certifications: DiffItem<CanonicalImport['certifications'][number]>[];
  projects: DiffItem<CanonicalImport['projects'][number]>[];
  filesRead: string[];
  unknownFiles: string[];
}

export function buildDiff(
  existing: Record<RecordType, ExistingRecord[]> & { profile: { headline: string; summary: string; location: string } },
  incoming: CanonicalImport
): ImportDiff {
  const diffFor = <T extends Record<string, unknown>>(type: RecordType, items: T[]) => {
    const index = indexByKey(type, existing[type]);
    return items.map((item) => classify(type, item, index));
  };
  return {
    profile: profileChanges(existing.profile, incoming.profile),
    experience: diffFor('experience', incoming.experience),
    education: diffFor('education', incoming.education),
    skills: diffFor('skills', incoming.skills),
    certifications: diffFor('certifications', incoming.certifications),
    projects: diffFor('projects', incoming.projects),
    filesRead: incoming.filesRead,
    unknownFiles: incoming.unknownFiles,
  };
}
