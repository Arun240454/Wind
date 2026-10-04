import { db } from '@/lib/db';
import { notFound } from '@/lib/api';
import { getFullProfile, type FullProfile } from '@/lib/profile';
import { buildResumeDocument, parseSelections, type ResumeSource } from '@/lib/resume/build';
import { fillDocument, letterFields, mergeValues, type TipTapNode } from '@/lib/cover-letter/fill';
import type { LetterDocument } from '@/lib/resume/render-pdf';

export function resumeSource(p: FullProfile): ResumeSource {
  return {
    name: p.user.name ?? p.user.username ?? 'Your Name',
    email: p.user.email ?? '',
    headline: p.headline,
    summary: p.summary,
    location: p.location,
    phone: p.phone,
    website: p.website,
    experiences: p.experiences,
    educations: p.educations,
    skills: p.skills,
    certifications: p.certifications,
    projects: p.projects,
  };
}

export async function loadResume(userId: string, id: string) {
  const resume = await db.resume.findFirst({ where: { id, userId } });
  if (!resume) throw notFound('Resume');
  const profile = await getFullProfile(userId);
  const selections = parseSelections(resume.selections);
  const document = buildResumeDocument(resumeSource(profile), selections);
  return { resume: { ...resume, selections }, profile, document };
}

export async function loadLetter(userId: string, id: string) {
  const letter = await db.coverLetter.findFirst({ where: { id, userId } });
  if (!letter) throw notFound('Cover letter');
  const profile = await getFullProfile(userId);
  const fields = letterFields.parse(letter.fields ?? {});
  const src = resumeSource(profile);
  const values = mergeValues(fields, { name: src.name, skills: profile.skills, experiences: profile.experiences });
  const paragraphs = fillDocument(letter.content as { content?: TipTapNode[] }, values);
  const document: LetterDocument = {
    name: src.name,
    contact: [src.email, src.phone, src.location].filter(Boolean),
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    paragraphs,
    paper: 'LETTER',
  };
  return { letter: { ...letter, fields }, values, document };
}
