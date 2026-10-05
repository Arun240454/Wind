import { requirePageUser } from '@/lib/session';
import { OnboardingFlow } from '@/components/onboarding-flow';

export const metadata = { title: 'Get started' };

function suggestUsername(name: string | null | undefined, email: string | null | undefined) {
  const base = (name || email?.split('@')[0] || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  return base.length >= 3 ? base : '';
}

export default async function OnboardingPage() {
  const user = await requirePageUser({ allowNoUsername: true });
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
      <p className="muted mt-1">Three quick steps and your portfolio is ready.</p>
      <OnboardingFlow
        initialUsername={user.username ?? suggestUsername(user.name, user.email)}
        hasUsername={!!user.username}
        needsName={!user.name}
      />
    </main>
  );
}
