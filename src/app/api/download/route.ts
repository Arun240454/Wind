import { ApiError, CONTENT_TYPES, clientKey, fileResponse, handle } from '@/lib/api';
import { exportFileName } from '@/lib/output';
import { rateLimit } from '@/lib/rate-limit';
import { renderLetterDocx, renderSummaryDocx } from '@/lib/render-docx';
import { renderLetterPdf, renderSummaryPdf } from '@/lib/render-pdf';
import { downloadSchema } from '@/lib/schema';

export const runtime = 'nodejs';

/**
 * Renders a generated result as a file. The browser sends the result back (including any
 * edits the user made), so the server never has to keep it.
 */
export const POST = handle(async (req) => {
  rateLimit(`download:${clientKey(req)}`, 30);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'BAD_JSON', 'Request body must be JSON.');
  }
  const { kind, format, result } = downloadSchema.parse(body);

  const render = {
    summary: { pdf: renderSummaryPdf, docx: renderSummaryDocx },
    'cover-letter': { pdf: renderLetterPdf, docx: renderLetterDocx },
  }[kind][format];

  const buffer = await render(result);
  const fileName = exportFileName(result.candidate.name, kind === 'summary' ? 'Summary' : 'Cover-Letter', format);
  return fileResponse(buffer, fileName, CONTENT_TYPES[format]);
});
