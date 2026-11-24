import { Generator } from '@/components/generator';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Wind<span className="text-brand">Sliter</span>
        </h1>
        <p className="muted mx-auto mt-3 max-w-xl">
          Upload your LinkedIn profile or resume. AI reads it and gives you a career summary and a cover letter, ready to
          download as PDF or Word.
        </p>
      </header>
      <Generator />
      <p className="muted mt-8 text-center text-xs">
        Your file is read in memory, sent to the AI to generate the documents, and never stored.
      </p>
    </main>
  );
}
