import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, emailDeliveryEnabled, linkedInEnabled, signIn } from '@/lib/auth';
import { LinkedInIcon } from '@/components/linkedin-icon';

export const metadata = { title: 'Sign in' };

const ERRORS: Record<string, string> = {
  Verification: 'That sign-in link has expired or was already used. Request a new one below.',
  OAuthAccountNotLinked:
    'This email already has an account with a different sign-in method. Sign in with email, then connect LinkedIn in Settings.',
  UnverifiedEmail: 'Your LinkedIn email is not verified. Sign in with email instead, then connect LinkedIn in Settings.',
  AccessDenied: 'Sign-in was cancelled.',
};

async function signInWithLinkedIn() {
  'use server';
  await signIn('linkedin', { redirectTo: '/dashboard' });
}

async function signInWithEmail(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect('/login?error=InvalidEmail');
  await signIn('email', { email, redirectTo: '/dashboard' });
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  if ((await auth())?.user) redirect('/dashboard');
  const { sent, error } = await searchParams;
  const message = error ? (ERRORS[error] ?? (error === 'InvalidEmail' ? 'Enter a valid email address.' : 'Sign-in failed. Please try again.')) : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-8">
        <Link href="/" className="text-2xl font-bold text-brand">
          WindSliter
        </Link>

        {sent ? (
          <div className="mt-6" role="status">
            <h1 className="text-lg font-semibold">Check your inbox</h1>
            <p className="muted mt-2 text-sm">
              We sent you a sign-in link. It works once and expires in 15 minutes.
              {!emailDeliveryEnabled && ' (Local dev: the link is printed in the server console.)'}
            </p>
            <Link href="/login" className="btn btn-secondary mt-6 w-full">
              Use a different email
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-lg font-semibold">Sign in or create an account</h1>
            {message && (
              <p className="error-text mt-3" role="alert">
                {message}
              </p>
            )}

            {linkedInEnabled && (
              <>
                <form action={signInWithLinkedIn} className="mt-6">
                  <button type="submit" className="btn btn-primary w-full py-2.5">
                    <LinkedInIcon /> Sign in with LinkedIn
                  </button>
                </form>
                <div className="muted my-5 flex items-center gap-3 text-xs">
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /> or <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>
              </>
            )}

            <form action={signInWithEmail} className={linkedInEnabled ? '' : 'mt-6'}>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input" />
              <button type="submit" className="btn btn-secondary mt-3 w-full">
                Continue with email
              </button>
            </form>

            {!linkedInEnabled && (
              <p className="muted mt-6 text-xs">
                LinkedIn sign-in is off because AUTH_LINKEDIN_ID and AUTH_LINKEDIN_SECRET are not set. See the README.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
