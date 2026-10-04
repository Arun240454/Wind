import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handle, readJson, requireUser } from '@/lib/api';
import { templateDoc } from '@/lib/cover-letter/templates';
import { letterFields } from '@/lib/cover-letter/fill';

export const GET = handle(async () => {
  const user = await requireUser();
  const letters = await db.coverLetter.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, templateKey: true, fields: true, updatedAt: true },
  });
  return NextResponse.json({ letters });
});

const createLetter = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  templateKey: z.string().max(50).default('concise'),
  fields: letterFields.default({}),
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const data = await readJson(req, createLetter);
  const { template, doc } = templateDoc(data.templateKey);
  const letter = await db.coverLetter.create({
    data: {
      userId: user.id,
      name: data.name ?? (data.fields.company ? `${data.fields.company} – ${template.name}` : `${template.name} letter`),
      templateKey: template.key,
      content: doc as object,
      fields: data.fields,
    },
  });
  return NextResponse.json({ letter }, { status: 201 });
});
