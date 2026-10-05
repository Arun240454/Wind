import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

/** For pages inside the app: sends signed-out users to /login and new users to onboarding. */
export async function requirePageUser({ allowNoUsername = false } = {}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!allowNoUsername && !session.user.username) redirect('/onboarding');
  return session.user;
}
