import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/session';
import { COVER_LETTER_TEMPLATES } from '@/lib/cover-letter/templates';
import { NewLetterForm } from '@/components/cover-letter/new-letter-form';

export const metadata = { title: 'Cover letters' };

export default async function CoverLettersPage() {
  const user = await requirePageUser();
  const letters = await db.coverLetter.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cover letters</h1>
        <p className="muted">Start from a template. Merge fields such as {'{{company}}'} fill in from your profile and the job details.</p>
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">New cover letter</h2>
        <NewLetterForm templates={COVER_LETTER_TEMPLATES.map(({ key, name, description }) => ({ key, name, description }))} />
      </section>

      {letters.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Your letters</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {letters.map((l) => (
              <li key={l.id}>
                <Link href={`/cover-letters/${l.id}`} className="card block hover:border-brand">
                  <p className="font-semibold">{l.name}</p>
                  <p className="muted text-sm">Updated {l.updatedAt.toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
