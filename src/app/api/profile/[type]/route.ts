import { NextResponse } from 'next/server';
import { handle, requireUser } from '@/lib/api';
import { ensureProfile } from '@/lib/profile';
import { createRecord, delegate, parseRecordType } from '@/lib/records';

type Ctx = { params: Promise<{ type: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const user = await requireUser();
  const type = parseRecordType((await params).type);
  const profile = await ensureProfile(user.id);
  const records = await delegate(type).findMany({ where: { profileId: profile.id }, orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({ records });
});

export const POST = handle(async (req, { params }: Ctx) => {
  const user = await requireUser();
  const type = parseRecordType((await params).type);
  const profile = await ensureProfile(user.id);
  const record = await createRecord(profile.id, type, await req.json());
  return NextResponse.json({ record }, { status: 201 });
});
