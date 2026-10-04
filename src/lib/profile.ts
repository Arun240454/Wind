import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { recency } from '@/lib/dates';
import { SECTION_KEYS, type SectionKey } from '@/lib/validation/profile';

const fullProfileInclude = {
  user: { select: { id: true, name: true, email: true, image: true, username: true } },
  experiences: { orderBy: { sortOrder: 'asc' } },
  educations: { orderBy: { sortOrder: 'asc' } },
  skills: { orderBy: { sortOrder: 'asc' } },
  certifications: { orderBy: { sortOrder: 'asc' } },
  projects: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProfileInclude;

export type FullProfile = Prisma.ProfileGetPayload<{ include: typeof fullProfileInclude }>;

/** Every user gets a profile row; this creates it lazily for accounts made before that rule. */
export async function ensureProfile(userId: string) {
  return db.profile.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function getFullProfile(userId: string): Promise<FullProfile> {
  await ensureProfile(userId);
  return db.profile.findUniqueOrThrow({ where: { userId }, include: fullProfileInclude });
}

export async function getPublicProfile(username: string): Promise<FullProfile | null> {
  const user = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
  if (!user) return null;
  return db.profile.findUnique({ where: { userId: user.id }, include: fullProfileInclude });
}

export function visibleSections(profile: { sectionVisibility: Prisma.JsonValue }): Record<SectionKey, boolean> {
  const stored = (profile.sectionVisibility ?? {}) as Partial<Record<SectionKey, boolean>>;
  return Object.fromEntries(SECTION_KEYS.map((k) => [k, stored[k] !== false])) as Record<SectionKey, boolean>;
}

/** Sort comparator for date-ranged records when the user hasn't set an explicit order. */
export function byRecency(a: { startMonth: string; endMonth: string | null }, b: { startMonth: string; endMonth: string | null }) {
  return recency(b.startMonth, b.endMonth).localeCompare(recency(a.startMonth, a.endMonth));
}

/** 0–100 score shown on the dashboard. */
export function completeness(p: FullProfile): { score: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [!!p.user.image, 'Profile photo'],
    [!!p.headline, 'Headline'],
    [p.summary.length >= 80, 'About (80+ characters)'],
    [!!p.location, 'Location'],
    [p.experiences.length > 0, 'At least one job'],
    [p.experiences.some((e) => e.bullets.length >= 2), 'Two or more bullets on a job'],
    [p.educations.length > 0, 'Education'],
    [p.skills.length >= 5, 'Five or more skills'],
    [p.projects.length > 0, 'A project'],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return { score: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, l]) => l) };
}
