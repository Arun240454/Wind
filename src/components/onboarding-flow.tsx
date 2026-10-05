'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ClientApiError } from '@/lib/client';
import { ImportFlow } from '@/components/profile/import-flow';

const STEPS = ['Choose your URL', 'Import from LinkedIn', 'Done'];

export function OnboardingFlow({ initialUsername, hasUsername, needsName }: { initialUsername: string; hasUsername: boolean; needsName: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(hasUsername ? 1 : 0);
  const [username, setUsername] = useState(initialUsername);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/me', { method: 'PATCH', body: needsName ? { username, name } : { username } });
      setStep(1);
    } catch (err) {
      const fields = (err as ClientApiError).fields;
      setError(fields?.username?.[0] ?? fields?.name?.[0] ?? (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <ol className="mb-6 flex gap-2 text-sm" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? 'step' : undefined}
            className={`flex-1 rounded-full px-3 py-1.5 text-center ${i <= step ? 'bg-brand text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="card">
        {step === 0 && (
          <form onSubmit={saveUsername} className="space-y-4">
            {needsName && (
              <div>
                <label htmlFor="name" className="label">
                  Your full name
                </label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
              </div>
            )}
            <div>
              <label htmlFor="username" className="label">
                Portfolio URL
              </label>
              <div className="flex items-center gap-1 text-sm">
                <span className="muted">/u/</span>
                <input
                  id="username"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]"
                  aria-describedby="username-help"
                />
              </div>
              <p id="username-help" className="muted mt-1 text-xs">
                3–30 characters: lowercase letters, numbers and dashes.
              </p>
            </div>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <ImportFlow onDone={() => setStep(2)} />
            <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
              Skip for now and enter details by hand →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-semibold">You&apos;re all set</h2>
            <p className="muted text-sm">Fill any gaps in your profile, publish your portfolio and download your first resume.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                router.push('/dashboard');
                router.refresh();
              }}
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
