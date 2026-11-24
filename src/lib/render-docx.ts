import { AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } from 'docx';
import { contactLine, letterDate, type GenerationResult } from '@/lib/output';

const FONT = 'Calibri';
// docx sizes are half-points.
const BODY = 21;
const PAGE = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1080, right: 1080 } } };

const run = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text, font: FONT, size: opts.size ?? BODY, bold: opts.bold, color: opts.color });

const heading = (text: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } },
    children: [run(text.toUpperCase(), { bold: true, size: 23, color: '111111' })],
  });

const bullet = (text: string) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [run(text)] });

const NUMBERING = {
  config: [
    {
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }],
    },
  ],
};

/** Real Word headings and list bullets, so the file stays editable and screen-reader friendly. */
export function renderSummaryDocx(r: GenerationResult): Promise<Buffer> {
  const { candidate: c, summary: s } = r;
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run(c.name || 'Career Summary', { bold: true, size: 40 })] }),
  ];
  if (c.headline) children.push(new Paragraph({ children: [run(c.headline, { size: 22 })] }));
  children.push(new Paragraph({ spacing: { after: 160 }, children: [run(contactLine(c), { size: 20 })] }));

  children.push(heading('Overview'), new Paragraph({ children: [run(s.overview)] }));
  if (s.experienceLevel) children.push(new Paragraph({ spacing: { before: 60 }, children: [run(s.experienceLevel, { color: '444444' })] }));

  if (s.strengths.length) children.push(heading('Key strengths'), ...s.strengths.map(bullet));
  if (s.keySkills.length) children.push(heading('Skills'), new Paragraph({ children: [run(s.keySkills.join(', '))] }));

  if (s.experience.length) {
    children.push(heading('Experience'));
    for (const e of s.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 100 },
          keepNext: true,
          children: [run(e.title, { bold: true }), ...(e.company ? [run(`, ${e.company}`)] : [])],
        })
      );
      if (e.dates) children.push(new Paragraph({ keepNext: true, children: [run(e.dates, { size: 20, color: '444444' })] }));
      children.push(...e.highlights.map(bullet));
    }
  }

  if (s.education.length) {
    children.push(heading('Education'));
    for (const e of s.education) {
      children.push(new Paragraph({ spacing: { before: 100 }, children: [run(e.degree || e.school, { bold: true })] }));
      const meta = [e.degree ? e.school : '', e.dates].filter(Boolean).join('  |  ');
      if (meta) children.push(new Paragraph({ children: [run(meta, { size: 20, color: '444444' })] }));
    }
  }

  if (s.certifications.length) children.push(heading('Certifications'), ...s.certifications.map(bullet));

  return Packer.toBuffer(
    new Document({ creator: 'WindSliter', title: `${c.name} – Summary`, numbering: NUMBERING, sections: [{ properties: PAGE, children }] })
  );
}

export function renderLetterDocx(r: GenerationResult): Promise<Buffer> {
  const { candidate: c, coverLetter: l } = r;
  const p = (text: string, after = 200, opts: Parameters<typeof run>[1] = { size: 22 }) =>
    new Paragraph({ spacing: { after }, children: [run(text, opts)] });
  const children = [
    ...(c.name ? [p(c.name, 0, { bold: true, size: 36 })] : []),
    p(contactLine(c), 240, { size: 20 }),
    p(letterDate(), 240),
    p(l.greeting),
    ...l.paragraphs.map((t) => p(t)),
    p(l.closing, 0),
    ...(c.name ? [p(c.name, 0)] : []),
  ];
  return Packer.toBuffer(new Document({ creator: 'WindSliter', title: `${c.name} – Cover Letter`, sections: [{ properties: PAGE, children }] }));
}
