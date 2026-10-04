import { formatMonth, formatRange } from '@/lib/dates';
import { visibleSections, type FullProfile } from '@/lib/profile';

function Avatar({ p, size }: { p: FullProfile; size: string }) {
  const name = p.user.name ?? p.user.username ?? '';
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return p.user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.user.image} alt={name} className={`${size} shrink-0 rounded-full object-cover ring-4 ring-white dark:ring-slate-900`} referrerPolicy="no-referrer" />
  ) : (
    <div className={`${size} grid shrink-0 place-items-center rounded-full bg-brand text-3xl font-bold text-white ring-4 ring-white dark:ring-slate-900`} aria-hidden="true">
      {initials}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-xl font-bold tracking-tight">{children}</h2>;
}

function Experience({ p }: { p: FullProfile }) {
  return (
    <ol className="relative space-y-6 border-l-2 border-slate-200 pl-6 dark:border-slate-800">
      {p.experiences.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-4 border-white bg-brand dark:border-slate-950" aria-hidden="true" />
          <h3 className="font-semibold">{e.title}</h3>
          <p className="text-brand dark:text-sky-400">{e.company}</p>
          <p className="muted text-sm">{[formatRange(e.startMonth, e.endMonth), e.location].filter(Boolean).join(' · ')}</p>
          {e.bullets.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {e.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

function Projects({ p }: { p: FullProfile }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {p.projects.map((pr) => (
        <article key={pr.id} className="card flex flex-col overflow-hidden p-0">
          {pr.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pr.imageUrl} alt="" className="h-36 w-full object-cover" />
          )}
          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-semibold">{pr.title}</h3>
            <p className="muted mt-1 flex-1 text-sm">{pr.description}</p>
            {pr.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pr.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {pr.url && (
              <a href={pr.url} className="mt-3 text-sm font-semibold text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                View project →
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function Skills({ p }: { p: FullProfile }) {
  return (
    <div className="flex flex-wrap gap-2">
      {p.skills.map((s) => (
        <span key={s.id} className="chip px-3 py-1 text-sm">
          {s.name}
        </span>
      ))}
    </div>
  );
}

function EducationAndCerts({ p, show }: { p: FullProfile; show: ReturnType<typeof visibleSections> }) {
  return (
    <ul className="space-y-3">
      {show.education &&
        p.educations.map((e) => (
          <li key={e.id}>
            <p className="font-semibold">{e.school}</p>
            <p className="muted text-sm">{[[e.degree, e.field].filter(Boolean).join(', '), formatRange(e.startMonth, e.endMonth, false)].filter(Boolean).join(' · ')}</p>
          </li>
        ))}
      {show.certifications &&
        p.certifications.map((c) => (
          <li key={c.id}>
            <p className="font-semibold">
              {c.url ? (
                <a href={c.url} className="hover:underline" target="_blank" rel="noopener noreferrer">
                  {c.name}
                </a>
              ) : (
                c.name
              )}
            </p>
            <p className="muted text-sm">{[c.issuer, formatMonth(c.issuedMonth)].filter(Boolean).join(' · ')}</p>
          </li>
        ))}
    </ul>
  );
}

function Contact({ p }: { p: FullProfile }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {p.user.email && (
        <a href={`mailto:${p.user.email}`} className="btn btn-primary">
          Email me
        </a>
      )}
      {p.website && (
        <a href={p.website} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
          Website
        </a>
      )}
    </div>
  );
}

/** Server-rendered portfolio. All text is rendered through React, which escapes it. */
export function PortfolioView({ profile: p }: { profile: FullProfile }) {
  const show = visibleSections(p);
  const name = p.user.name ?? p.user.username ?? '';
  const has = {
    about: show.about && !!p.summary,
    experience: show.experience && p.experiences.length > 0,
    projects: show.projects && p.projects.length > 0,
    skills: show.skills && p.skills.length > 0,
    edu: (show.education && p.educations.length > 0) || (show.certifications && p.certifications.length > 0),
  };

  if (p.theme === 'modern') {
    return (
      <div className="min-h-screen">
        <header className="bg-gradient-to-br from-brand to-indigo-700 text-white">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-14 text-center sm:flex-row sm:text-left">
            <Avatar p={p} size="h-32 w-32" />
            <div>
              <h1 className="text-4xl font-bold">{name}</h1>
              {p.headline && <p className="mt-2 text-lg text-sky-100">{p.headline}</p>}
              {p.location && <p className="mt-1 text-sm text-sky-200">{p.location}</p>}
              <div className="[&_.btn-primary]:bg-white [&_.btn-primary]:text-brand [&_.btn-secondary]:border-white/60 [&_.btn-secondary]:bg-transparent [&_.btn-secondary]:text-white">
                <Contact p={p} />
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_300px]">
          <div className="space-y-12">
            {has.about && (
              <section>
                <SectionTitle>About</SectionTitle>
                <p className="whitespace-pre-line leading-relaxed">{p.summary}</p>
              </section>
            )}
            {has.experience && (
              <section>
                <SectionTitle>Experience</SectionTitle>
                <Experience p={p} />
              </section>
            )}
            {has.projects && (
              <section>
                <SectionTitle>Projects</SectionTitle>
                <Projects p={p} />
              </section>
            )}
          </div>
          <aside className="space-y-10">
            {has.skills && (
              <section>
                <SectionTitle>Skills</SectionTitle>
                <Skills p={p} />
              </section>
            )}
            {has.edu && (
              <section>
                <SectionTitle>Education</SectionTitle>
                <EducationAndCerts p={p} show={show} />
              </section>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // Classic: single centered column.
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="card flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <Avatar p={p} size="h-28 w-28" />
        <div>
          <h1 className="text-3xl font-bold">{name}</h1>
          {p.headline && <p className="mt-1 text-lg">{p.headline}</p>}
          {p.location && <p className="muted text-sm">{p.location}</p>}
          <Contact p={p} />
        </div>
      </header>
      <div className="mt-10 space-y-12">
        {has.about && (
          <section>
            <SectionTitle>About</SectionTitle>
            <p className="whitespace-pre-line leading-relaxed">{p.summary}</p>
          </section>
        )}
        {has.experience && (
          <section>
            <SectionTitle>Experience</SectionTitle>
            <Experience p={p} />
          </section>
        )}
        {has.projects && (
          <section>
            <SectionTitle>Projects</SectionTitle>
            <Projects p={p} />
          </section>
        )}
        {has.skills && (
          <section>
            <SectionTitle>Skills</SectionTitle>
            <Skills p={p} />
          </section>
        )}
        {has.edu && (
          <section>
            <SectionTitle>Education &amp; certifications</SectionTitle>
            <EducationAndCerts p={p} show={show} />
          </section>
        )}
      </div>
    </div>
  );
}
