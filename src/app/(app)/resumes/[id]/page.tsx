import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/session';
import { loadResume } from '@/lib/documents';
import { ApiError } from '@/lib/api';
import { ResumeBuilder } from '@/components/resume/resume-builder';

export const metadata = { title: 'Resume builder' };

export default async function ResumeBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const loaded = await loadResume(user.id, (await params).id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
  if (!loaded) notFound();
  const { resume, profile, document } = loaded;

  return (
    <ResumeBuilder
      resume={{ id: resume.id, name: resume.name, selections: resume.selections }}
      initialDocument={document}
      records={{
        experience: profile.experiences.map((e) => ({ id: e.id, label: `${e.title} · ${e.company}`, bullets: e.bullets })),
        education: profile.educations.map((e) => ({ id: e.id, label: e.school })),
        skills: profile.skills.map((s) => ({ id: s.id, label: s.name })),
        certifications: profile.certifications.map((c) => ({ id: c.id, label: c.name })),
        projects: profile.projects.map((p) => ({ id: p.id, label: p.title })),
      }}
    />
  );
}
