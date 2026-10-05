import { db } from '@/lib/db';
import { linkedInEnabled, signIn } from '@/lib/auth';
import { requirePageUser } from '@/lib/session';
import { LinkedInIcon } from '@/components/linkedin-icon';
import { DeleteAccountButton } from '@/components/delete-account-button';

export const metadata = { title: 'Settings' };

async function connectLinkedIn() {
  'use server';
  // Signing in with a new provider while signed in links it to the current account.
  await signIn('linkedin', { redirectTo: '/settings' });
}

export default async function SettingsPage() {
  const user = await requirePageUser();
  const accounts = await db.account.findMany({ where: { userId: user.id }, select: { provider: true, createdAt: true } });
  const hasLinkedIn = accounts.some((a) => a.provider === 'linkedin');

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="card space-y-3">
        <h2 className="font-semibold">Sign-in methods</h2>
        <div className="flex items-center justify-between text-sm">
          <span>
            Email <span className="muted">({user.email})</span>
          </span>
          <span className="chip">Active</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <LinkedInIcon className="h-4 w-4 text-brand" /> LinkedIn
          </span>
          {hasLinkedIn ? (
            <span className="chip">Connected</span>
          ) : linkedInEnabled ? (
            <form action={connectLinkedIn}>
              <button type="submit" className="btn btn-secondary">
                Connect
              </button>
            </form>
          ) : (
            <span className="muted text-xs">Not configured on this server</span>
          )}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Your data</h2>
        <p className="muted text-sm">Download everything WindSliter stores about you as a JSON file.</p>
        <a href="/api/me/export" className="btn btn-secondary">
          Download my data
        </a>
      </section>

      <section className="card space-y-2 border-red-200 dark:border-red-900">
        <h2 className="font-semibold text-red-700 dark:text-red-400">Delete account</h2>
        <p className="muted text-sm">Permanently deletes your profile, portfolio, resumes and cover letters. This can&apos;t be undone.</p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
