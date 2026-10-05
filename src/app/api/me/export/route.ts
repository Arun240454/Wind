import { db } from '@/lib/db';
import { handle, requireUser } from '@/lib/api';
import { getFullProfile } from '@/lib/profile';

/** "Download my data": everything stored about the user, as JSON. */
export const GET = handle(async () => {
  const user = await requireUser();
  const [profile, resumes, coverLetters, imports] = await Promise.all([
    getFullProfile(user.id),
    db.resume.findMany({ where: { userId: user.id } }),
    db.coverLetter.findMany({ where: { userId: user.id } }),
    db.importLog.findMany({ where: { userId: user.id } }),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), profile, resumes, coverLetters, imports }, null, 2);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="windsliter-data.json"',
      'Cache-Control': 'no-store',
    },
  });
});
