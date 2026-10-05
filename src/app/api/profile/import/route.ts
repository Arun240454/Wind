import { NextResponse } from 'next/server';
import { ApiError, handle, requireUser } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { getFullProfile } from '@/lib/profile';
import { ImportError, MAX_ZIP_BYTES, parseLinkedInExport } from '@/lib/import/linkedin-export';
import { parseLinkedInPdf } from '@/lib/import/linkedin-pdf';
import { buildDiff } from '@/lib/import/merge';

/** Parses the uploaded profile PDF or export ZIP in memory and returns a preview diff. Nothing is saved. */
export const POST = handle(async (req) => {
  const user = await requireUser();
  rateLimit(`import:${user.id}`);

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new ApiError(400, 'NO_FILE', 'Choose your LinkedIn profile PDF to upload.');
  if (file.size > MAX_ZIP_BYTES) throw new ApiError(413, 'TOO_LARGE', 'The file is larger than 10 MB.');

  // Detect the format from the file's first bytes, not its name: "%PDF" or a ZIP's "PK".
  const bytes = new Uint8Array(await file.arrayBuffer());
  const magic = String.fromCharCode(...bytes.subarray(0, 4));

  let parsed;
  try {
    if (magic === '%PDF') parsed = await parseLinkedInPdf(bytes, file.name);
    else if (magic.startsWith('PK')) parsed = await parseLinkedInExport(bytes);
    else throw new ImportError('Upload the PDF from your LinkedIn profile (More → Save to PDF), or LinkedIn’s data export ZIP.');
  } catch (err) {
    if (err instanceof ImportError) throw new ApiError(422, 'IMPORT_FAILED', err.message);
    throw err;
  }

  const p = await getFullProfile(user.id);
  const diff = buildDiff(
    {
      profile: p,
      experience: p.experiences,
      education: p.educations,
      skills: p.skills,
      certifications: p.certifications,
      projects: p.projects,
    },
    parsed
  );
  return NextResponse.json({ fileName: file.name, diff });
});
