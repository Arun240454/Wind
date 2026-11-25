import { Document, Packer, Paragraph, TextRun } from 'docx';
import { contactLine, letterDate, type GenerationResult } from '@/lib/output';

const FONT = 'Calibri';
// A4 with roughly 0.75" margins (twips); docx sizes are half-points.
const PAGE = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1080, right: 1080 } } };

export function renderLetterDocx(r: GenerationResult): Promise<Buffer> {
  const { candidate: c, coverLetter: l } = r;
  const p = (text: string, after = 200, opts: { bold?: boolean; size?: number } = {}) =>
    new Paragraph({ spacing: { after }, children: [new TextRun({ text, font: FONT, size: opts.size ?? 22, bold: opts.bold })] });
  const contact = contactLine(c);
  const children = [
    ...(c.name ? [p(c.name, 0, { bold: true, size: 36 })] : []),
    ...(contact ? [p(contact, 240, { size: 20 })] : []),
    p(letterDate(), 240),
    p(l.greeting),
    ...l.paragraphs.map((t) => p(t)),
    p(l.closing, 0),
    ...(c.name ? [p(c.name, 0)] : []),
  ];
  return Packer.toBuffer(new Document({ creator: 'WindSliter', title: `${c.name} – Cover Letter`, sections: [{ properties: PAGE, children }] }));
}
