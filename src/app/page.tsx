import { Generator } from '@/components/generator';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Wind<span className="text-brand">Sliter</span>
        </h1>
        <p className="muted mx-auto mt-3 max-w-xl">
          Upload your LinkedIn profile or resume and AI writes your cover letter. Add the company, hiring manager and job
          description to tailor it. Download as PDF or Word.
        </p>
      </header>
      <Generator />
      <p className="muted mt-8 text-center text-xs">
        Your file is read in memory, sent to the AI to write the letter, and never stored.
      </p>
    </main>
  );
}
