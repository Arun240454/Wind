import { NextResponse } from 'next/server';
import { ApiError, clientKey, handle } from '@/lib/api';
import { fileToContent } from '@/lib/extract';
import { generate } from '@/lib/generate';
import { rateLimit } from '@/lib/rate-limit';
import { jobSchema } from '@/lib/schema';

export const runtime = 'nodejs';
// Generation usually takes 20–60 s; give hosts like Vercel room before they cut the request.
export const maxDuration = 120;

/** multipart/form-data: file (required), company, hiringManager, jobDescription (optional). Stores nothing. */
export const POST = handle(async (req) => {
  rateLimit(`generate:${clientKey(req)}`, 5);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, 'BAD_FORM', 'Send the file as multipart/form-data.');
  }
  const file = form.get('file');
  if (!(file instanceof File)) throw new ApiError(400, 'NO_FILE', 'Choose a file to upload.');

  const text = (k: string) => (typeof form.get(k) === 'string' ? (form.get(k) as string) : undefined);
  const job = jobSchema.parse({
    company: text('company'),
    hiringManager: text('hiringManager'),
    jobDescription: text('jobDescription'),
  });

  const content = await fileToContent(file);
  const result = await generate(content, job);
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
});
