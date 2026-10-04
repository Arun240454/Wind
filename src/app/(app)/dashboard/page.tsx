import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/session';
import { completeness, getFullProfile } from '@/lib/profile';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requirePageUser();
  const [profile, resumeCount, letterCount, lastImport] = await Promise.all([
    getFullProfile(user.id),
    db.resume.count({ where: { userId: user.id } }),
    db.coverLetter.count({ where: { userId: user.id } }),
    db.importLog.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
  ]);
  const { score, missing } = completeness(profile);

  const cards = [
    {
      title: 'Portfolio',
      body: profile.isPublic ? `Live at /u/${user.username}` : 'Not published yet',
      href: '/portfolio',
      cta: profile.isPublic ? 'Manage' : 'Publish',
      extra: profile.isPublic ? { href: `/u/${user.username}`, label: 'View' } : null,
    },
    { title: 'Resumes', body: `${resumeCount} saved`, href: '/resumes', cta: resumeCount ? 'Open' : 'Create your first', extra: null },
    { title: 'Cover letters', body: `${letterCount} saved`, href: '/cover-letters', cta: letterCount ? 'Open' : 'Write one', extra: null },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
        <p className="muted">
          {lastImport
            ? `Last LinkedIn import: ${lastImport.createdAt.toLocaleDateString('en-US', { dateStyle: 'medium' })}`
            : 'No LinkedIn import yet. '}
          {!lastImport && (
            <Link href="/profile#import" className="text-brand underline">
              Import now
            </Link>
          )}
        </p>
      </div>

      <section className="card" aria-labelledby="completeness">
        <div className="flex items-center justify-between">
          <h2 id="completeness" className="font-semibold">
            Profile completeness
          </h2>
          <span className="text-2xl font-bold text-brand">{score}%</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-brand" style={{ width: `${score}%` }} />
        </div>
        {missing.length > 0 && (
          <p className="muted mt-3 text-sm">
            Still missing: {missing.join(', ')}.{' '}
            <Link href="/profile" className="text-brand underline">
              Edit profile
            </Link>
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="card flex flex-col">
            <h2 className="font-semibold">{c.title}</h2>
            <p className="muted mt-1 flex-1 text-sm">{c.body}</p>
            <div className="mt-4 flex gap-2">
              <Link href={c.href} className="btn btn-primary">
                {c.cta}
              </Link>
              {c.extra && (
                <Link href={c.extra.href} className="btn btn-secondary" target="_blank">
                  {c.extra.label}
                </Link>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
