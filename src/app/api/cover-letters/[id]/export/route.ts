import { z } from 'zod';
import { CONTENT_TYPES, fileResponse, handle, requireUser } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { loadLetter } from '@/lib/documents';
import { exportFileName } from '@/lib/resume/build';
import { renderLetterPdf } from '@/lib/resume/render-pdf';
import { renderLetterDocx } from '@/lib/resume/render-docx';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };
const formatSchema = z.enum(['pdf', 'docx']);

export const GET = handle(async (req, { params }: Ctx) => {
  const user = await requireUser();
  rateLimit(`export:${user.id}`);
  const format = formatSchema.parse(new URL(req.url).searchParams.get('format') ?? 'pdf');
  const { document } = await loadLetter(user.id, (await params).id);
  const buffer = format === 'pdf' ? await renderLetterPdf(document) : await renderLetterDocx(document);
  return fileResponse(buffer, exportFileName(document.name, 'Cover-Letter', format), CONTENT_TYPES[format]);
});
