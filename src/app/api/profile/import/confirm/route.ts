import { NextResponse } from 'next/server';
import { handle, readJson, requireUser } from '@/lib/api';
import { ensureProfile } from '@/lib/profile';
import { applyImport, importSelection } from '@/lib/records';

export const POST = handle(async (req) => {
  const user = await requireUser();
  const selection = await readJson(req, importSelection);
  const profile = await ensureProfile(user.id);
  const counts = await applyImport(user.id, profile.id, selection);
  return NextResponse.json({ counts });
});
