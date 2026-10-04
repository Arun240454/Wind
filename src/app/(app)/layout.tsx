import Link from 'next/link';
import { signOut } from '@/lib/auth';
import { requirePageUser } from '@/lib/session';
import { NavLinks } from '@/components/nav-links';

async function doSignOut() {
  'use server';
  await signOut({ redirectTo: '/' });
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="font-bold text-brand">
            WindSliter
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-3">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : null}
            <form action={doSignOut}>
              <button type="submit" className="btn btn-ghost">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
