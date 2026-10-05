import { NextResponse } from 'next/server';
import { COVER_LETTER_TEMPLATES } from '@/lib/cover-letter/templates';
import { MERGE_FIELDS } from '@/lib/cover-letter/fill';

export function GET() {
  return NextResponse.json({ templates: COVER_LETTER_TEMPLATES, mergeFields: MERGE_FIELDS });
}
