import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { ImportError, parseCsv, parseLinkedInExport, toBullets } from '@/lib/import/linkedin-export';
import { buildDiff, classify, indexByKey } from '@/lib/import/merge';
import { buildFixtureZip } from '../fixture-zip';

describe('parseLinkedInExport', () => {
  it('maps the fixture export to the canonical profile', async () => {
    const result = await parseLinkedInExport(await buildFixtureZip());

    expect(result.profile).toMatchObject({ firstName: 'Jordan', lastName: 'Lee', location: 'Toronto, Ontario, Canada' });
    expect(result.experience).toHaveLength(2);
    expect(result.experience[0]).toMatchObject({
      company: 'Northwind Analytics',
      title: 'Data Analyst',
      startMonth: '2022-04',
      endMonth: null,
    });
    expect(result.experience[0].bullets).toHaveLength(3);
    expect(result.experience[1]).toMatchObject({ startMonth: '2020-06', endMonth: '2022-03' });
    expect(result.education[0]).toMatchObject({ school: 'University of Toronto', degree: 'Bachelor of Science - BS', startMonth: '2016', endMonth: '2020' });
    // "sql" is a case-insensitive duplicate of "SQL".
    expect(result.skills.map((s) => s.name)).toEqual(['SQL', 'Python', 'Tableau', 'Data Visualization', 'Excel']);
    expect(result.certifications[0]).toMatchObject({ name: 'Google Data Analytics Certificate', issuer: 'Google', issuedMonth: '2021-01' });
    expect(result.unknownFiles).toContain('Connections.csv');
  });

  it('rejects files that are not ZIPs', async () => {
    await expect(parseLinkedInExport(new TextEncoder().encode('not a zip'))).rejects.toBeInstanceOf(ImportError);
  });

  it('rejects ZIPs without LinkedIn files', async () => {
    const zip = new JSZip();
    zip.file('notes.txt', 'hello');
    await expect(parseLinkedInExport(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/No LinkedIn profile files/);
  });

  it('rejects archives with too many entries', async () => {
    const zip = new JSZip();
    for (let i = 0; i < 201; i++) zip.file(`f${i}.txt`, 'x');
    await expect(parseLinkedInExport(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/more than 200 files/);
  });
});

describe('parseCsv', () => {
  it('skips LinkedIn "Notes:" preambles before the header', () => {
    const rows = parseCsv('Notes:\n"some note"\n\nFirst Name,Last Name\nSam,Rivera\n', 'First Name');
    expect(rows).toEqual([{ firstname: 'Sam', lastname: 'Rivera' }]);
  });
});

describe('toBullets', () => {
  it('splits on newlines and strips bullet glyphs', () => {
    expect(toBullets('• One\n- Two\n\n* Three')).toEqual(['One', 'Two', 'Three']);
  });
});

describe('merge rules', () => {
  const imported = { company: 'Acme', title: 'Engineer', location: 'Remote', startMonth: '2020-01', endMonth: null, bullets: ['Did things'] };

  it('marks unseen records as new', () => {
    expect(classify('experience', imported, new Map()).status).toBe('new');
  });

  it('never overwrites a record the user edited by hand', () => {
    const existing = [{ id: 'e1', source: 'linkedin_export', editedAt: new Date(), ...imported, bullets: ['Edited'] }];
    const d = classify('experience', imported, indexByKey('experience', existing));
    expect(d).toMatchObject({ status: 'kept-manual', existingId: 'e1' });
  });

  it('never overwrites a manually created record', () => {
    const existing = [{ id: 'e1', source: 'manual', editedAt: null, ...imported }];
    expect(classify('experience', imported, indexByKey('experience', existing)).status).toBe('kept-manual');
  });

  it('updates an untouched imported record when LinkedIn data changed', () => {
    const existing = [{ id: 'e1', source: 'linkedin_export', editedAt: null, ...imported, bullets: ['Old'] }];
    expect(classify('experience', imported, indexByKey('experience', existing)).status).toBe('update');
  });

  it('matches on company, title and start date regardless of case and spacing', () => {
    const existing = [{ id: 'e1', source: 'linkedin_export', editedAt: null, ...imported, company: '  ACME ' }];
    expect(classify('experience', imported, indexByKey('experience', existing)).status).toBe('unchanged');
  });

  it('only fills empty profile fields', async () => {
    const parsed = await parseLinkedInExport(await buildFixtureZip());
    const empty = { experience: [], education: [], skills: [], certifications: [], projects: [] };
    const diff = buildDiff({ ...empty, profile: { headline: 'Mine', summary: '', location: '' } }, parsed);
    expect(diff.profile.map((c) => c.field)).toEqual(['summary', 'location']);
  });
});
