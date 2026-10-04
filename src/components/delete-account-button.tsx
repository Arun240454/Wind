'use client';

import { useState } from 'react';
import { api } from '@/lib/client';

export function DeleteAccountButton() {
  const [busy, setBusy] = useState(false);

  async function remove() {
    const typed = prompt('Type DELETE to permanently delete your account.');
    if (typed !== 'DELETE') return;
    setBusy(true);
    try {
      await api('/api/me', { method: 'DELETE' });
      window.location.href = '/';
    } catch (err) {
      alert((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
      {busy ? 'Deleting…' : 'Delete my account'}
    </button>
  );
}
