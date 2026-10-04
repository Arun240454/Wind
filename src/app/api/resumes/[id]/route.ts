import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handle, notFound, readJson, requireUser } from '@/lib/api';
import { loadResume } from '@/lib/documents';
import { resumeSelections } from '@/lib/resume/build';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const user = await requireUser();
  const { resume, document } = await loadResume(user.id, (await params).id);
  return NextResponse.json({ resume, document });
});

const updateResume = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  selections: resumeSelections.optional(),
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const data = await readJson(req, updateResume);
  const { count } = await db.resume.updateMany({ where: { id, userId: user.id }, data });
  if (count === 0) throw notFound('Resume');
  const { resume, document } = await loadResume(user.id, id);
  return NextResponse.json({ resume, document });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  const user = await requireUser();
  const { count } = await db.resume.deleteMany({ where: { id: (await params).id, userId: user.id } });
  if (count === 0) throw notFound('Resume');
  return NextResponse.json({ ok: true });
});
