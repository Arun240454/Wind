import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/session';
import { NewResumeButton } from '@/components/resume/new-resume-button';

export const metadata = { title: 'Resumes' };

export default async function ResumesPage() {
  const user = await requirePageUser();
  const resumes = await db.resume.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resumes</h1>
          <p className="muted">Built from your profile. Every template follows ATS formatting rules.</p>
        </div>
        <NewResumeButton />
      </div>

      {resumes.length === 0 ? (
        <div className="card text-center">
          <p className="font-semibold">No resumes yet</p>
          <p className="muted mt-1 text-sm">Create one and it is filled from your profile straight away.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <li key={r.id}>
              <Link href={`/resumes/${r.id}`} className="card block hover:border-brand">
                <p className="font-semibold">{r.name}</p>
                <p className="muted text-sm">Updated {r.updatedAt.toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
