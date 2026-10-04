import { z } from 'zod';
import { db } from '@/lib/db';
import { notFound } from '@/lib/api';
import { classify, indexByKey, profileChanges, type ExistingRecord } from '@/lib/import/merge';
import {
  RECORD_SCHEMAS,
  RECORD_TYPES,
  certificationInput,
  educationInput,
  experienceInput,
  projectInput,
  skillInput,
  type RecordType,
} from '@/lib/validation/profile';

/** The handful of Prisma delegate methods the generic CRUD needs. */
interface RecordDelegate {
  findMany(args: object): Promise<ExistingRecord[]>;
  findFirst(args: object): Promise<ExistingRecord | null>;
  create(args: object): Promise<ExistingRecord>;
  updateMany(args: object): Promise<{ count: number }>;
  deleteMany(args: object): Promise<{ count: number }>;
  count(args: object): Promise<number>;
}

export function delegate(type: RecordType): RecordDelegate {
  const map = {
    experience: db.experience,
    education: db.education,
    skills: db.skill,
    certifications: db.certification,
    projects: db.project,
  };
  return map[type] as unknown as RecordDelegate;
}

export function parseRecordType(value: string): RecordType {
  if (!(RECORD_TYPES as string[]).includes(value)) throw notFound('Record type');
  return value as RecordType;
}

export async function createRecord(profileId: string, type: RecordType, input: unknown) {
  const data = RECORD_SCHEMAS[type].parse(input);
  const d = delegate(type);
  const sortOrder = await d.count({ where: { profileId } });
  return d.create({ data: { ...data, profileId, sortOrder, source: 'manual' } });
}

export async function updateRecord(profileId: string, type: RecordType, id: string, input: unknown) {
  const data = RECORD_SCHEMAS[type].partial().parse(input);
  const d = delegate(type);
  // `editedAt` marks the record as hand-edited so a later re-import never overwrites it.
  const { count } = await d.updateMany({ where: { id, profileId }, data: { ...data, editedAt: new Date() } });
  if (count === 0) throw notFound('Record');
  return d.findFirst({ where: { id, profileId } });
}

export async function deleteRecord(profileId: string, type: RecordType, id: string) {
  const { count } = await delegate(type).deleteMany({ where: { id, profileId } });
  if (count === 0) throw notFound('Record');
}

export const reorderInput = z.object({
  type: z.enum(RECORD_TYPES as [RecordType, ...RecordType[]]),
  ids: z.array(z.string()).max(500),
});

export async function reorderRecords(profileId: string, type: RecordType, ids: string[]) {
  const d = delegate(type);
  await db.$transaction(
    ids.map((id, i) => d.updateMany({ where: { id, profileId }, data: { sortOrder: i } }) as never)
  );
}

// ---------- Import confirm ----------

export const importSelection = z.object({
  fileName: z.string().max(255).default('linkedin-export.zip'),
  profile: z
    .object({ headline: z.string().max(220), summary: z.string().max(4000), location: z.string().max(200) })
    .partial()
    .default({}),
  experience: z.array(experienceInput).max(200).default([]),
  education: z.array(educationInput).max(100).default([]),
  skills: z.array(skillInput).max(300).default([]),
  certifications: z.array(certificationInput).max(200).default([]),
  projects: z.array(projectInput).max(200).default([]),
});
export type ImportSelection = z.infer<typeof importSelection>;

/**
 * Applies the records the user ticked in the review step. The merge rules are re-checked
 * against the database here rather than trusted from the client.
 */
export async function applyImport(userId: string, profileId: string, selection: ImportSelection) {
  const counts: Record<string, { created: number; updated: number; skipped: number }> = {};

  await db.$transaction(async (tx) => {
    const profile = await tx.profile.findUniqueOrThrow({ where: { id: profileId } });
    const fill = profileChanges(profile, {
      firstName: '',
      lastName: '',
      headline: selection.profile.headline ?? '',
      summary: selection.profile.summary ?? '',
      location: selection.profile.location ?? '',
    });
    if (fill.length) {
      await tx.profile.update({ where: { id: profileId }, data: Object.fromEntries(fill.map((c) => [c.field, c.incoming])) });
    }

    for (const type of RECORD_TYPES) {
      const map = { experience: tx.experience, education: tx.education, skills: tx.skill, certifications: tx.certification, projects: tx.project };
      const d = map[type] as unknown as RecordDelegate;
      const existing = await d.findMany({ where: { profileId } });
      const index = indexByKey(type, existing);
      let next = existing.length;
      const c = { created: 0, updated: 0, skipped: 0 };

      for (const item of selection[type] as Record<string, unknown>[]) {
        const diff = classify(type, item, index);
        if (diff.status === 'new') {
          const created = await d.create({ data: { ...item, profileId, sortOrder: next++, source: 'linkedin_export' } });
          index.set(diff.key, created); // a duplicate later in the same file now matches it
          c.created++;
        } else if (diff.status === 'update') {
          await d.updateMany({ where: { id: diff.existingId, profileId }, data: item });
          c.updated++;
        } else {
          c.skipped++;
        }
      }
      counts[type] = c;
    }

    await tx.importLog.create({
      data: { userId, source: 'linkedin_export', fileName: selection.fileName, counts, status: 'applied' },
    });
  });

  return counts;
}
