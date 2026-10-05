import type { ResumeDocument } from '@/lib/resume/build';

/** HTML twin of the PDF layout, used for the live preview. Always light: it's a picture of paper. */
export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  return (
    <div
      className="mx-auto w-full max-w-[816px] bg-white px-[7%] py-[6%] font-[Helvetica,Arial,sans-serif] text-[13px] leading-snug text-neutral-900 shadow-lg"
      style={{ aspectRatio: doc.paper === 'A4' ? '210 / 297' : '8.5 / 11' }}
      data-testid="resume-preview"
    >
      <h1 className="text-[26px] font-bold">{doc.name}</h1>
      {doc.headline && <p className="text-[14px]">{doc.headline}</p>}
      <p className="mb-3 text-[12px] text-neutral-700">{doc.contact.join('  |  ')}</p>
      {doc.sections.map((s) => (
        <section key={s.heading}>
          <h2 className="mb-1 mt-3 border-b border-neutral-400 pb-0.5 text-[14px] font-bold uppercase">{s.heading}</h2>
          {s.kind === 'text' ? (
            <p className="whitespace-pre-line">{s.text}</p>
          ) : (
            s.entries.map((e, i) => (
              <div key={i} className="mb-2">
                <p>
                  <strong>{e.title}</strong>
                  {e.org && `, ${e.org}`}
                </p>
                {(e.location || e.dates) && <p className="text-neutral-700">{[e.location, e.dates].filter(Boolean).join('  |  ')}</p>}
                {e.bullets.length > 0 && (
                  <ul className="list-disc pl-5">
                    {e.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </section>
      ))}
      {doc.sections.length === 0 && <p className="text-neutral-500">Your resume is empty. Add details to your profile or turn on some sections.</p>}
    </div>
  );
}
