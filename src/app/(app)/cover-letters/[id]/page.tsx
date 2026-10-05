import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/session';
import { loadLetter } from '@/lib/documents';
import { ApiError } from '@/lib/api';
import { MERGE_FIELDS } from '@/lib/cover-letter/fill';
import { LetterEditor } from '@/components/cover-letter/letter-editor';

export const metadata = { title: 'Cover letter' };

export default async function CoverLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const loaded = await loadLetter(user.id, (await params).id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
  if (!loaded) notFound();
  const { letter, values, document } = loaded;

  return (
    <LetterEditor
      letter={{ id: letter.id, name: letter.name, content: letter.content as object, fields: letter.fields }}
      initialValues={values}
      initialParagraphs={document.paragraphs}
      mergeFields={MERGE_FIELDS.map(({ key, label, fromProfile }) => ({ key, label, fromProfile }))}
    />
  );
}
