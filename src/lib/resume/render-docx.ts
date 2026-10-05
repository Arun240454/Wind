import { AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } from 'docx';
import type { ResumeDocument } from './build';
import type { LetterDocument } from './render-pdf';

const FONT = 'Calibri';
// docx sizes are half-points.
const BODY = 21;

const PAGE = {
  LETTER: { width: 12240, height: 15840 },
  A4: { width: 11906, height: 16838 },
};

function pageProps(paper: 'LETTER' | 'A4') {
  return { page: { size: PAGE[paper], margin: { top: 1000, bottom: 1000, left: 1080, right: 1080 } } };
}

/**
 * Real Word headings and real numbered-list bullets (not tables, text boxes or tab-aligned
 * columns), so ATS parsers and screen readers see the structure.
 */
export function renderResumeDocx(doc: ResumeDocument): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: doc.name, bold: true, size: 40, font: FONT })] }),
  ];
  if (doc.headline) children.push(new Paragraph({ children: [new TextRun({ text: doc.headline, size: 22, font: FONT })] }));
  children.push(
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: doc.contact.join('  |  '), size: 20, font: FONT })] })
  );

  for (const section of doc.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } },
        children: [new TextRun({ text: section.heading.toUpperCase(), bold: true, size: 23, font: FONT, color: '111111' })],
      })
    );

    if (section.kind === 'text') {
      children.push(new Paragraph({ children: [new TextRun({ text: section.text, size: BODY, font: FONT })] }));
      continue;
    }

    for (const e of section.entries) {
      children.push(
        new Paragraph({
          spacing: { before: 100 },
          keepNext: true,
          children: [
            new TextRun({ text: e.title, bold: true, size: BODY, font: FONT }),
            ...(e.org ? [new TextRun({ text: `, ${e.org}`, size: BODY, font: FONT })] : []),
          ],
        })
      );
      const meta = [e.location, e.dates].filter(Boolean).join('  |  ');
      if (meta) children.push(new Paragraph({ children: [new TextRun({ text: meta, size: 20, font: FONT, color: '333333' })] }));
      for (const b of e.bullets) {
        children.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: b, size: BODY, font: FONT })] }));
      }
    }
  }

  const document = new Document({
    creator: 'WindSliter',
    title: `${doc.name} – Resume`,
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }],
        },
      ],
    },
    sections: [{ properties: pageProps(doc.paper), children }],
  });
  return Packer.toBuffer(document);
}

export function renderLetterDocx(doc: LetterDocument): Promise<Buffer> {
  const run = (text: string, opts: { bold?: boolean; size?: number } = {}) =>
    new TextRun({ text, font: FONT, size: opts.size ?? 22, bold: opts.bold });
  const children = [
    new Paragraph({ children: [run(doc.name, { bold: true, size: 36 })] }),
    new Paragraph({ spacing: { after: 240 }, children: [run(doc.contact.join('  |  '), { size: 20 })] }),
    new Paragraph({ spacing: { after: 240 }, children: [run(doc.date)] }),
    ...doc.paragraphs.map((p) => new Paragraph({ spacing: { after: 200 }, children: [run(p)] })),
  ];
  const document = new Document({
    creator: 'WindSliter',
    title: `${doc.name} – Cover Letter`,
    sections: [{ properties: pageProps(doc.paper), children }],
  });
  return Packer.toBuffer(document);
}
