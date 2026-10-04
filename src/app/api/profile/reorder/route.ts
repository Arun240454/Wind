import { NextResponse } from 'next/server';
import { handle, readJson, requireUser } from '@/lib/api';
import { ensureProfile } from '@/lib/profile';
import { reorderInput, reorderRecords } from '@/lib/records';

export const PATCH = handle(async (req) => {
  const user = await requireUser();
  const { type, ids } = await readJson(req, reorderInput);
  const profile = await ensureProfile(user.id);
  await reorderRecords(profile.id, type, ids);
  return NextResponse.json({ ok: true });
});
