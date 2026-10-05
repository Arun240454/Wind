import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handle, readJson, requireUser } from '@/lib/api';
import { resumeSelections } from '@/lib/resume/build';

export const GET = handle(async () => {
  const user = await requireUser();
  const resumes = await db.resume.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ resumes });
});

const createResume = z.object({
  name: z.string().trim().min(1).max(100).default('My resume'),
  selections: resumeSelections.default({}),
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const data = await readJson(req, createResume);
  const resume = await db.resume.create({ data: { userId: user.id, name: data.name, selections: data.selections } });
  return NextResponse.json({ resume }, { status: 201 });
});
