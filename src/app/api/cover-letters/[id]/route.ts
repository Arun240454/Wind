import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handle, notFound, readJson, requireUser } from '@/lib/api';
import { loadLetter } from '@/lib/documents';
import { letterFields, tiptapDoc } from '@/lib/cover-letter/fill';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const user = await requireUser();
  const { letter, values, document } = await loadLetter(user.id, (await params).id);
  return NextResponse.json({ letter, values, document });
});

const updateLetter = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  content: tiptapDoc.optional(),
  fields: letterFields.optional(),
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const data = await readJson(req, updateLetter);
  const { count } = await db.coverLetter.updateMany({ where: { id, userId: user.id }, data });
  if (count === 0) throw notFound('Cover letter');
  const { letter, values, document } = await loadLetter(user.id, id);
  return NextResponse.json({ letter, values, document });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  const user = await requireUser();
  const { count } = await db.coverLetter.deleteMany({ where: { id: (await params).id, userId: user.id } });
  if (count === 0) throw notFound('Cover letter');
  return NextResponse.json({ ok: true });
});
