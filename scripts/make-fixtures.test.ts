/**
 * Writes sample import files for trying the import by hand (run with `npm run fixtures`):
 *   tests/fixtures/linkedin-profile.pdf  (laid out like LinkedIn's "Save to PDF")
 *   tests/fixtures/linkedin-export.zip   (LinkedIn data export)
 * Runs under Vitest because @react-pdf/renderer only loads as ESM.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'vitest';
import { buildFixtureZip } from '../tests/fixture-zip';
import { buildFixturePdf } from '../tests/fixture-pdf';

test('write sample import files', async () => {
  const dir = path.join(__dirname, '..', 'tests', 'fixtures');
  await writeFile(path.join(dir, 'linkedin-profile.pdf'), await buildFixturePdf());
  await writeFile(path.join(dir, 'linkedin-export.zip'), await buildFixtureZip());
  console.log(`Wrote ${dir}/linkedin-profile.pdf and linkedin-export.zip`);
}, 30_000);
