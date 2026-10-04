import { NextResponse } from 'next/server';
import { handle, requireUser } from '@/lib/api';
import { ensureProfile } from '@/lib/profile';
import { deleteRecord, parseRecordType, updateRecord } from '@/lib/records';

type Ctx = { params: Promise<{ type: string; id: string }> };

export const PATCH = handle(async (req, { params }: Ctx) => {
  const user = await requireUser();
  const { type: rawType, id } = await params;
  const profile = await ensureProfile(user.id);
  const record = await updateRecord(profile.id, parseRecordType(rawType), id, await req.json());
  return NextResponse.json({ record });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  const user = await requireUser();
  const { type: rawType, id } = await params;
  const profile = await ensureProfile(user.id);
  await deleteRecord(profile.id, parseRecordType(rawType), id);
  return NextResponse.json({ ok: true });
});
