import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPublicProfile } from '@/lib/profile';
import { PortfolioView } from '@/components/portfolio/portfolio-view';

type Props = { params: Promise<{ username: string }> };

/** Owners can preview their own page before publishing; everyone else needs isPublic. */
async function load(username: string) {
  const profile = await getPublicProfile(username);
  if (!profile) return null;
  if (profile.isPublic) return { profile, isOwner: false };
  const session = await auth();
  return session?.user?.id === profile.userId ? { profile, isOwner: true } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await load((await params).username);
  if (!result) return { title: 'Not found', robots: { index: false } };
  const { profile: p } = result;
  const name = p.user.name ?? p.user.username ?? 'Portfolio';
  const description = (p.headline || p.summary).slice(0, 200);
  return {
    title: { absolute: p.headline ? `${name} – ${p.headline}` : name },
    description,
    robots: p.isPublic && !p.unlisted ? undefined : { index: false, follow: false },
    openGraph: {
      type: 'profile',
      title: name,
      description,
      url: `/u/${p.user.username}`,
      images: p.user.image ? [{ url: p.user.image, alt: name }] : undefined,
    },
    twitter: { card: 'summary', title: name, description },
  };
}

export default async function PublicPortfolio({ params }: Props) {
  const result = await load((await params).username);
  if (!result) notFound();

  return (
    <>
      {result.isOwner && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Preview: only you can see this page until you publish it.{' '}
          <Link href="/portfolio" className="font-semibold underline" target="_top">
            Portfolio settings
          </Link>
        </div>
      )}
      <PortfolioView profile={result.profile} />
      <footer className="muted py-8 text-center text-xs">
        Built with{' '}
        <Link href="/" className="text-brand hover:underline">
          WindSliter
        </Link>
      </footer>
    </>
  );
}
