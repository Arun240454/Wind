import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handle, readJson, requireUser } from '@/lib/api';
import { ensureProfile, getFullProfile } from '@/lib/profile';
import { profileUpdate } from '@/lib/validation/profile';

export const GET = handle(async () => {
  const user = await requireUser();
  return NextResponse.json({ profile: await getFullProfile(user.id) });
});

export const PATCH = handle(async (req) => {
  const user = await requireUser();
  const data = await readJson(req, profileUpdate);
  await ensureProfile(user.id);
  const profile = await db.profile.update({ where: { userId: user.id }, data });
  return NextResponse.json({ profile });
});
