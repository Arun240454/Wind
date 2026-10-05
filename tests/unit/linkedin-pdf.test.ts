import { describe, expect, it } from 'vitest';
import { ImportError } from '@/lib/import/linkedin-export';
import { mapPdfLines, parseLinkedInPdf, type PdfLine } from '@/lib/import/linkedin-pdf';
import { renderResumePdf } from '@/lib/resume/render-pdf';
import { buildFixturePdf } from '../fixture-pdf';

describe('parseLinkedInPdf', () => {
  it('reads the header, summary and sidebar', async () => {
    const r = await parseLinkedInPdf(await buildFixturePdf());
    expect(r.profile).toMatchObject({
      firstName: 'Jordan',
      lastName: 'Lee',
      headline: 'Data Analyst | SQL, Python, Tableau | Turning data into decisions',
      location: 'Toronto, Ontario, Canada',
    });
    expect(r.profile.summary).toMatch(/^Analyst who turns messy data into decisions\. .*spreadsheets\.$/);
    expect(r.skills.map((s) => s.name)).toEqual(['SQL', 'Python', 'Tableau']);
    expect(r.certifications.map((c) => c.name)).toEqual(['Google Data Analytics Certificate', 'Tableau Desktop Specialist']);
  }, 30_000);

  it('reads several roles at one company and a single-role company', async () => {
    const { experience } = await parseLinkedInPdf(await buildFixturePdf());
    expect(experience.map(({ company, title, startMonth, endMonth, location }) => ({ company, title, startMonth, endMonth, location }))).toEqual([
      { company: 'Northwind Analytics', title: 'Senior Data Analyst', startMonth: '2024-01', endMonth: null, location: 'Toronto, Ontario, Canada' },
      { company: 'Northwind Analytics', title: 'Data Analyst', startMonth: '2022-04', endMonth: '2023-12', location: 'Toronto, Ontario, Canada' },
      { company: 'Maple Retail Group', title: 'Junior Analyst', startMonth: '2020-06', endMonth: '2022-03', location: 'Mississauga, Ontario, Canada' },
    ]);
  }, 30_000);

  it('joins wrapped description lines into whole bullets', async () => {
    const { experience } = await parseLinkedInPdf(await buildFixturePdf());
    expect(experience[0].bullets).toEqual([
      'Built a Tableau sales dashboard used weekly by 40 account managers.',
      'Automated a monthly reporting process in Python, saving 12 hours a month for the finance team and cutting errors.',
    ]);
    expect(experience[1].bullets).toEqual([
      'Partnered with finance to define 15 shared KPI definitions that are now used across the company in every quarterly business review.',
    ]);
  }, 30_000);

  it('reads education with degree, field and years', async () => {
    const { education } = await parseLinkedInPdf(await buildFixturePdf());
    expect(education).toEqual([
      { school: 'University of Toronto', degree: 'Bachelor of Science - BS', field: 'Statistics', startMonth: '2016', endMonth: '2020', notes: '' },
    ]);
  }, 30_000);

  it('rejects PDFs that are not LinkedIn profiles', async () => {
    const resume = await renderResumePdf({ name: 'Someone', headline: '', contact: [], paper: 'LETTER', sections: [{ kind: 'text', heading: 'Notes', text: 'Hello' }] });
    await expect(parseLinkedInPdf(resume)).rejects.toThrow(/doesn’t look like a LinkedIn profile/);
  }, 30_000);

  it('rejects files that are not PDFs', async () => {
    await expect(parseLinkedInPdf(new TextEncoder().encode('%PDF- broken'))).rejects.toBeInstanceOf(ImportError);
  });
});

describe('mapPdfLines', () => {
  const line = (y: number, size: number, text: string, x = 220): PdfLine => ({ page: 1, x, y, size, text });

  it('uses the company from a duration header for every role under it', () => {
    const r = mapPdfLines([
      line(750, 26, 'Sam Rivera'),
      line(720, 10.5, 'Austin, Texas'),
      line(690, 15.75, 'Experience'),
      line(670, 12, 'Acme'),
      line(655, 10.5, '5 years 2 months'),
      line(640, 11.5, 'Staff Engineer'),
      line(625, 10.5, 'Mar 2023 - Present (2 years)'),
      line(610, 11.5, 'Senior Engineer'),
      line(595, 10.5, '2020 - 2023 (3 years)'),
      line(580, 10.5, 'Remote'),
      line(565, 10.5, 'Led the platform team.'),
    ]);
    expect(r.experience.map((e) => [e.company, e.title, e.startMonth, e.endMonth, e.location, e.bullets])).toEqual([
      ['Acme', 'Staff Engineer', '2023-03', null, '', []],
      ['Acme', 'Senior Engineer', '2020', '2023', 'Remote', ['Led the platform team.']],
    ]);
  });
});
