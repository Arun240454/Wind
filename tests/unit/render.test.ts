import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import { exportFileName } from '@/lib/output';
import { renderLetterDocx } from '@/lib/render-docx';
import { renderLetterPdf } from '@/lib/render-pdf';
import { downloadSchema } from '@/lib/schema';
import { sampleResult } from './fixtures';

describe('renderers', () => {
  it('writes the cover letter to Word with header, greeting, body and sign-off in order', async () => {
    const text = (await mammoth.extractRawText({ buffer: await renderLetterDocx(sampleResult) })).value;
    expect(text).toMatch(
      /Jordan Lee[\s\S]*jordan@example\.com[\s\S]*Dear Priya Sharma,[\s\S]*First paragraph[\s\S]*Second paragraph[\s\S]*Sincerely,[\s\S]*Jordan Lee/
    );
  });

  it('skips an empty contact line', async () => {
    const bare = { ...sampleResult, candidate: { name: 'Jordan Lee', email: '', phone: '', location: '', links: [] } };
    const text = (await mammoth.extractRawText({ buffer: await renderLetterDocx(bare) })).value;
    expect(text).not.toContain('|');
  });

  it('produces a PDF', async () => {
    const buf = await renderLetterPdf(sampleResult);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(1000);
  }, 30_000);
});

describe('helpers', () => {
  it('builds safe file names', () => {
    expect(exportFileName('Zoë O’Brien', 'pdf')).toBe('Zoe-OBrien-Cover-Letter.pdf');
    expect(exportFileName('', 'docx')).toBe('WindSliter-Cover-Letter.docx');
  });

  it('validates download requests', () => {
    expect(downloadSchema.safeParse({ format: 'pdf', result: sampleResult }).success).toBe(true);
    expect(downloadSchema.safeParse({ format: 'txt', result: sampleResult }).success).toBe(false);
    expect(downloadSchema.safeParse({ format: 'pdf', result: {} }).success).toBe(false);
  });
});
