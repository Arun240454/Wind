import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

export const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'linkedin-export');

/** Builds a ZIP shaped like LinkedIn's export (files inside a top-level folder) from the CSV fixtures. */
export async function buildFixtureZip(): Promise<Buffer> {
  const zip = new JSZip();
  const folder = zip.folder('Basic_LinkedInDataExport_10-05-2026')!;
  for (const name of await readdir(FIXTURE_DIR)) {
    folder.file(name, await readFile(path.join(FIXTURE_DIR, name)));
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}
