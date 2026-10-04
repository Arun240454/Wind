import { z } from 'zod';
import { CONTENT_TYPES, fileResponse, handle, requireUser } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { loadResume } from '@/lib/documents';
import { exportFileName } from '@/lib/resume/build';
import { renderResumePdf } from '@/lib/resume/render-pdf';
import { renderResumeDocx } from '@/lib/resume/render-docx';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };
const formatSchema = z.enum(['pdf', 'docx']);

/** Generates the file on demand and streams it. Exports are never stored. */
export const GET = handle(async (req, { params }: Ctx) => {
  const user = await requireUser();
  rateLimit(`export:${user.id}`);
  const format = formatSchema.parse(new URL(req.url).searchParams.get('format') ?? 'pdf');
  const { document } = await loadResume(user.id, (await params).id);
  const buffer = format === 'pdf' ? await renderResumePdf(document) : await renderResumeDocx(document);
  return fileResponse(buffer, exportFileName(document.name, 'Resume', format), CONTENT_TYPES[format]);
});
