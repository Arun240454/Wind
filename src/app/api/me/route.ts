import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, handle, readJson, requireUser } from '@/lib/api';
import { usernameSchema } from '@/lib/validation/profile';
import { completeness, getFullProfile } from '@/lib/profile';

export const GET = handle(async () => {
  const user = await requireUser();
  const profile = await getFullProfile(user.id);
  const accounts = await db.account.findMany({ where: { userId: user.id }, select: { provider: true } });
  return NextResponse.json({
    user: profile.user,
    providers: accounts.map((a) => a.provider),
    completeness: completeness(profile),
  });
});

const meUpdate = z.object({ username: usernameSchema.optional(), name: z.string().trim().min(1).max(120).optional() });

export const PATCH = handle(async (req) => {
  const user = await requireUser();
  const data = await readJson(req, meUpdate);
  if (data.username) {
    const taken = await db.user.findFirst({ where: { username: data.username, NOT: { id: user.id } }, select: { id: true } });
    if (taken) throw new ApiError(409, 'USERNAME_TAKEN', 'That username is taken.', { username: ['That username is taken.'] });
  }
  const updated = await db.user.update({ where: { id: user.id }, data, select: { id: true, name: true, username: true } });
  return NextResponse.json({ user: updated });
});

/** Deletes the account. Every owned row cascades from User. */
export const DELETE = handle(async () => {
  const user = await requireUser();
  await db.user.delete({ where: { id: user.id } });
  return NextResponse.json({ ok: true });
});
