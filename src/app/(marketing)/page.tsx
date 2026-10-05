import Link from 'next/link';
import { auth } from '@/lib/auth';

const STEPS = [
  { title: 'Sign in', body: 'Use LinkedIn or your email. We only ask LinkedIn for your name, photo and email.' },
  { title: 'Import', body: 'Upload the data export LinkedIn emails you. Review every change before it is saved.' },
  { title: 'Publish', body: 'Get a portfolio page at your own URL, with light and dark themes.' },
  { title: 'Apply', body: 'Download an ATS-ready resume as PDF or Word, plus a cover letter that fills itself in.' },
];

export default async function Landing() {
  const session = await auth();

  return (
    <main>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-lg font-bold text-brand">WindSliter</span>
        <Link href={session ? '/dashboard' : '/login'} className="btn btn-secondary">
          {session ? 'Dashboard' : 'Sign in'}
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 text-center sm:pt-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Your LinkedIn profile, turned into a portfolio, a resume and a cover letter
        </h1>
        <p className="muted mx-auto mt-5 max-w-2xl text-lg">
          Enter your career history once, then publish it three ways. Every resume follows ATS formatting rules, so it parses
          cleanly in applicant tracking systems.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={session ? '/dashboard' : '/login'} className="btn btn-primary px-6 py-3 text-base">
            {session ? 'Go to your dashboard' : 'Get started free'}
          </Link>
          <Link href="/u/demo" className="btn btn-secondary px-6 py-3 text-base">
            See a sample portfolio
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card">
            <span className="chip">Step {i + 1}</span>
            <h2 className="mt-3 font-semibold">{s.title}</h2>
            <p className="muted mt-1 text-sm">{s.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
