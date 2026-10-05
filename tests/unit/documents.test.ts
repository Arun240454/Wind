import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildResumeDocument, exportFileName, parseSelections, type ResumeSource } from '@/lib/resume/build';
import { renderLetterPdf, renderResumePdf } from '@/lib/resume/render-pdf';
import { renderLetterDocx, renderResumeDocx } from '@/lib/resume/render-docx';
import { docToParagraphs, fillDocument, fillText, mergeValues, paragraphsToDoc } from '@/lib/cover-letter/fill';
import { COVER_LETTER_TEMPLATES } from '@/lib/cover-letter/templates';

const source: ResumeSource = {
  name: 'Jordan Lee',
  email: 'jordan@example.com',
  headline: 'Data Analyst',
  summary: 'Analyst who turns messy data into decisions.',
  location: 'Toronto, Canada',
  phone: '',
  website: '',
  experiences: [
    { id: 'e1', company: 'Northwind', title: 'Data Analyst', location: 'Toronto', startMonth: '2022-04', endMonth: null, bullets: ['Built dashboards', 'Automated reports', 'Secret bullet'] },
    { id: 'e2', company: 'Maple Retail', title: 'Junior Analyst', location: '', startMonth: '2020-06', endMonth: '2022-03', bullets: ['Wrote SQL'] },
  ],
  educations: [{ id: 'd1', school: 'University of Toronto', degree: 'BS', field: 'Statistics', startMonth: '2016', endMonth: '2020', notes: '' }],
  skills: [
    { id: 's1', name: 'SQL' },
    { id: 's2', name: 'Python' },
  ],
  certifications: [{ id: 'c1', name: 'Google Data Analytics', issuer: 'Google', issuedMonth: '2021-01' }],
  projects: [{ id: 'p1', title: 'Sales dashboard', description: 'Tableau dashboard', url: '', tags: ['Tableau'] }],
};

describe('buildResumeDocument', () => {
  it('uses standard headings in a fixed order', () => {
    const doc = buildResumeDocument(source, parseSelections({}));
    expect(doc.sections.map((s) => s.heading)).toEqual(['Summary', 'Experience', 'Education', 'Skills', 'Certifications']);
  });

  it('applies hidden records, hidden bullets and section toggles', () => {
    const doc = buildResumeDocument(
      source,
      parseSelections({ hiddenIds: ['e2'], hiddenBullets: { e1: [2] }, sections: { summary: false, projects: true } })
    );
    const exp = doc.sections.find((s) => s.heading === 'Experience');
    expect(exp?.kind === 'entries' && exp.entries.map((e) => e.org)).toEqual(['Northwind']);
    expect(exp?.kind === 'entries' && exp.entries[0].bullets).toEqual(['Built dashboards', 'Automated reports']);
    expect(doc.sections.map((s) => s.heading)).toEqual(['Experience', 'Education', 'Skills', 'Certifications', 'Projects']);
  });

  it('uses one date format and puts contact details in the body', () => {
    const doc = buildResumeDocument(source, parseSelections({}));
    const exp = doc.sections.find((s) => s.heading === 'Experience');
    expect(exp?.kind === 'entries' && exp.entries.map((e) => e.dates)).toEqual(['Apr 2022 – Present', 'Jun 2020 – Mar 2022']);
    expect(doc.contact).toEqual(['jordan@example.com', 'Toronto, Canada']);
  });

  it('builds ATS-friendly file names', () => {
    expect(exportFileName('Jordan Lee', 'Resume', 'pdf')).toBe('Jordan-Lee-Resume.pdf');
    expect(exportFileName('José  Núñez', 'Cover-Letter', 'docx')).toBe('Jose-Nunez-Cover-Letter.docx');
  });
});

/** Extracts the visible text of a PDF, the way an ATS parser would. */
async function pdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false, verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  return pages.join('\n').replace(/\s+/g, ' ');
}

async function docxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')!.async('string');
  return xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ');
}

/** Golden checks: every section heading and bullet survives, in order, in both formats. */
function expectInOrder(text: string, parts: string[]) {
  let from = 0;
  for (const part of parts) {
    const at = text.indexOf(part, from);
    expect(at, `"${part}" missing or out of order`).toBeGreaterThanOrEqual(0);
    from = at + part.length;
  }
}

const GOLDEN = [
  'Jordan Lee',
  'jordan@example.com',
  'SUMMARY',
  'Analyst who turns messy data into decisions.',
  'EXPERIENCE',
  'Data Analyst',
  'Northwind',
  'Apr 2022 – Present',
  'Built dashboards',
  'Automated reports',
  'Junior Analyst',
  'EDUCATION',
  'University of Toronto',
  'SKILLS',
  'SQL, Python',
  'CERTIFICATIONS',
  'Google Data Analytics',
];

describe('resume exports', () => {
  const doc = buildResumeDocument(source, parseSelections({}));

  it('PDF has a real text layer with every section in order', async () => {
    const buffer = await renderResumePdf(doc);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    const text = await pdfText(buffer);
    // react-pdf uppercases headings at render time via textTransform.
    expectInOrder(text.replace(/Summary|Experience|Education|Skills|Certifications/g, (m) => m.toUpperCase()), GOLDEN);
  }, 30_000);

  it('DOCX has the same content in the same order', async () => {
    const buffer = await renderResumeDocx(doc);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expectInOrder(await docxText(buffer), GOLDEN);
  });
});

describe('cover letters', () => {
  const values = mergeValues({ company: 'Acme', role: 'Analyst', hiringManager: '' }, { name: 'Jordan Lee', skills: source.skills, experiences: source.experiences });

  it('derives merge values from the profile', () => {
    expect(values).toMatchObject({ hiringManager: 'Hiring Manager', topSkill: 'SQL', recentRole: 'Data Analyst at Northwind', name: 'Jordan Lee' });
  });

  it('fills tokens and flags missing values', () => {
    expect(fillText('Hi {{company}}, re {{ role }} and {{unknown}}', { company: 'Acme', role: 'Analyst' })).toBe('Hi Acme, re Analyst and [unknown]');
    expect(fillText('{{company}}', {})).toBe('[Company]');
  });

  it('round-trips every template through TipTap JSON with no unfilled tokens', () => {
    for (const t of COVER_LETTER_TEMPLATES) {
      const filled = fillDocument(paragraphsToDoc(t.paragraphs), values);
      expect(filled.length).toBe(t.paragraphs.length);
      expect(filled.join('\n')).not.toMatch(/\{\{/);
      expect(filled.at(-1)).toBe('Jordan Lee');
    }
  });

  it('flattens lists and hard breaks', () => {
    const doc = {
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Line one' }, { type: 'hardBreak' }, { type: 'text', text: 'line two' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Point' }] }] }] },
        { type: 'paragraph' },
      ],
    };
    expect(docToParagraphs(doc)).toEqual(['Line one\nline two', '• Point']);
  });

  it('exports letters as PDF and DOCX', async () => {
    const letter = { name: 'Jordan Lee', contact: ['jordan@example.com'], date: 'October 5, 2026', paragraphs: ['Dear Hiring Manager,', 'Body text.'], paper: 'LETTER' as const };
    const pdf = await renderLetterPdf(letter);
    expect(await pdfText(pdf)).toContain('Body text.');
    expect(await docxText(await renderLetterDocx(letter))).toContain('Dear Hiring Manager,');
  }, 30_000);
});
