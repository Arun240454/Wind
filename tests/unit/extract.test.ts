import { Document, Packer, Paragraph } from 'docx';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { fileToContent } from '@/lib/extract';

const file = (data: BlobPart, name: string) => new File([data], name);

function textOf(blocks: Awaited<ReturnType<typeof fileToContent>>): string {
  const b = blocks[0];
  if (b.type !== 'document' || b.source.type !== 'text') throw new Error('expected a text document');
  return b.source.data;
}

describe('fileToContent', () => {
  it('passes a PDF through as a base64 document', async () => {
    const pdf = Buffer.from('%PDF-1.7\n% fake but has the magic bytes\n');
    const [block] = await fileToContent(file(pdf, 'Profile.pdf'));
    expect(block).toMatchObject({ type: 'document', source: { type: 'base64', media_type: 'application/pdf' } });
  });

  it('rejects a .pdf that is not a PDF', async () => {
    await expect(fileToContent(file('hello there, not a pdf at all', 'x.pdf'))).rejects.toBeInstanceOf(ApiError);
  });

  it('extracts the text of a Word document', async () => {
    const doc = new Document({
      sections: [{ children: [new Paragraph('Jordan Lee'), new Paragraph('Senior Data Analyst at Northwind Analytics')] }],
    });
    const text = textOf(await fileToContent(file(new Uint8Array(await Packer.toBuffer(doc)), 'resume.docx')));
    expect(text).toContain('Jordan Lee');
    expect(text).toContain('Senior Data Analyst at Northwind Analytics');
  });

  it('reads only career CSVs from a LinkedIn export', async () => {
    const zip = new JSZip();
    zip.file('Profile.csv', '﻿First Name,Last Name,Headline\nJordan,Lee,Data Analyst');
    zip.file('Positions.csv', 'Company Name,Title,Started On\nNorthwind,Senior Data Analyst,Jan 2024');
    zip.file('messages.csv', 'FROM,TO,CONTENT\nA,B,private message text');
    zip.file('Connections.csv', 'First Name\nSomeone');
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });
    const text = textOf(await fileToContent(file(bytes, 'Basic_LinkedInDataExport.zip')));
    expect(text).toContain('=== Profile.csv ===');
    expect(text).toContain('Northwind,Senior Data Analyst');
    expect(text).not.toContain('private message text');
    expect(text).not.toContain('Someone');
  });

  it('rejects a ZIP with no LinkedIn profile files', async () => {
    const zip = new JSZip();
    zip.file('notes.csv', 'a,b\n1,2');
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });
    await expect(fileToContent(file(bytes, 'other.zip'))).rejects.toThrow(/No profile files/);
  });

  it('rejects unsupported and empty files', async () => {
    await expect(fileToContent(file('x', 'photo.png'))).rejects.toThrow(/Upload a PDF/);
    await expect(fileToContent(file('', 'resume.txt'))).rejects.toThrow(/empty/);
  });
});
