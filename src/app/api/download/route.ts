import { ApiError, CONTENT_TYPES, clientKey, fileResponse, handle } from '@/lib/api';
import { exportFileName } from '@/lib/output';
import { rateLimit } from '@/lib/rate-limit';
import { renderLetterDocx } from '@/lib/render-docx';
import { renderLetterPdf } from '@/lib/render-pdf';
import { downloadSchema } from '@/lib/schema';

export const runtime = 'nodejs';

/**
 * Renders the cover letter as a file. The browser sends the letter back (including any edits
 * the user made), so the server never has to keep it.
 */
export const POST = handle(async (req) => {
  rateLimit(`download:${clientKey(req)}`, 30);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'BAD_JSON', 'Request body must be JSON.');
  }
  const { format, result } = downloadSchema.parse(body);

  const buffer = await (format === 'pdf' ? renderLetterPdf : renderLetterDocx)(result);
  return fileResponse(buffer, exportFileName(result.candidate.name, format), CONTENT_TYPES[format]);
});
