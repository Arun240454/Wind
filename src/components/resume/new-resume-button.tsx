'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export function NewResumeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const { resume } = await api<{ resume: { id: string } }>('/api/resumes', { body: { name: 'My resume' } });
      router.push(`/resumes/${resume.id}`);
    } catch (err) {
      alert((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
      {busy ? 'Creating…' : '+ New resume'}
    </button>
  );
}
