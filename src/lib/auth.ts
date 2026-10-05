import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import NextAuth, { type DefaultSession } from 'next-auth';
import type { Provider } from 'next-auth/providers';
import LinkedIn from 'next-auth/providers/linkedin';
import Nodemailer from 'next-auth/providers/nodemailer';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: { id: string; username: string | null } & DefaultSession['user'];
  }
}

const MAGIC_LINK_MAX_AGE = 15 * 60; // seconds

export const linkedInEnabled = Boolean(process.env.AUTH_LINKEDIN_ID && process.env.AUTH_LINKEDIN_SECRET);
// EMAIL_DELIVERY=console forces console-only links (used by the e2e test so it never sends real mail).
const consoleOnly = process.env.EMAIL_DELIVERY === 'console' && process.env.NODE_ENV !== 'production';
export const resendEnabled = !consoleOnly && Boolean(process.env.RESEND_API_KEY);
export const smtpEnabled =
  !consoleOnly && Boolean(process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD);
/** True when magic links are actually emailed (Resend or SMTP), false when they only go to the console. */
export const emailDeliveryEnabled = resendEnabled || smtpEnabled;

/**
 * Without Resend or SMTP settings (local dev, CI) magic links are printed to the console and written to
 * .dev-mail/last-link.txt so the Playwright test can read them. Never used in production.
 */
const devEmailProvider = {
  id: 'email',
  type: 'email' as const,
  name: 'Email',
  from: 'dev@localhost',
  maxAge: MAGIC_LINK_MAX_AGE,
  options: {},
  async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Set RESEND_API_KEY or the EMAIL_SERVER_* SMTP settings in production.');
    }
    console.log(`\n[dev mail] Magic link for ${identifier}:\n${url}\n`);
    const dir = path.join(process.cwd(), '.dev-mail');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'last-link.txt'), url, 'utf8');
  },
};

function emailProvider(): Provider {
  if (resendEnabled) {
    return Resend({ id: 'email', name: 'Email', from: process.env.EMAIL_FROM || 'WindSliter <onboarding@resend.dev>', maxAge: MAGIC_LINK_MAX_AGE });
  }
  if (smtpEnabled) {
    const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
    return Nodemailer({
      id: 'email',
      name: 'Email',
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
      },
      from: process.env.EMAIL_FROM || `WindSliter <${process.env.EMAIL_SERVER_USER}>`,
      maxAge: MAGIC_LINK_MAX_AGE,
    });
  }
  return devEmailProvider as unknown as Provider;
}

const providers: Provider[] = [emailProvider()];

if (linkedInEnabled) {
  providers.unshift(
    LinkedIn({
      // A LinkedIn login links to an existing account with the same email. The signIn callback
      // below only allows this when LinkedIn says the email is verified.
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: { strategy: 'database', maxAge: 30 * 24 * 60 * 60 },
  theme: { brandColor: '#0a66c2', buttonText: '#ffffff' },
  pages: { signIn: '/login', verifyRequest: '/check-email', error: '/login' },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === 'linkedin' && profile && (profile as { email_verified?: boolean }).email_verified === false) {
        return '/login?error=UnverifiedEmail';
      }
      return true;
    },
    session({ session, user }) {
      session.user.id = user.id;
      session.user.username = (user as { username?: string | null }).username ?? null;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) await db.profile.create({ data: { userId: user.id } });
    },
  },
});
