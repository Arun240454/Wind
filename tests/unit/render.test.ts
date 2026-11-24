import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import { exportFileName } from '@/lib/output';
import { renderLetterDocx, renderSummaryDocx } from '@/lib/render-docx';
import { renderLetterPdf, renderSummaryPdf } from '@/lib/render-pdf';
import { downloadSchema } from '@/lib/schema';
import { sampleResult } from './fixtures';

const docxText = async (buf: Buffer) => (await mammoth.extractRawText({ buffer: buf })).value;

describe('renderers', () => {
  it('writes the summary to Word in reading order', async () => {
    const text = await docxText(await renderSummaryDocx(sampleResult));
    const order = ['Jordan Lee', 'OVERVIEW', 'KEY STRENGTHS', 'SKILLS', 'EXPERIENCE', 'Senior Data Analyst', 'EDUCATION', 'CERTIFICATIONS'];
    const positions = order.map((s) => text.indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('writes the cover letter to Word with greeting, body and sign-off', async () => {
    const text = await docxText(await renderLetterDocx(sampleResult));
    expect(text).toMatch(/Dear Hiring Manager,[\s\S]*First paragraph[\s\S]*Second paragraph[\s\S]*Sincerely,[\s\S]*Jordan Lee/);
  });

  it('skips empty sections', async () => {
    const bare = { ...sampleResult, summary: { ...sampleResult.summary, certifications: [], strengths: [] } };
    const text = await docxText(await renderSummaryDocx(bare));
    expect(text).not.toContain('CERTIFICATIONS');
    expect(text).not.toContain('KEY STRENGTHS');
  });

  it('produces PDFs', async () => {
    for (const buf of [await renderSummaryPdf(sampleResult), await renderLetterPdf(sampleResult)]) {
      expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(buf.length).toBeGreaterThan(1000);
    }
  }, 30_000);
});

describe('helpers', () => {
  it('builds safe file names', () => {
    expect(exportFileName('Zoë O’Brien', 'Cover-Letter', 'pdf')).toBe('Zoe-OBrien-Cover-Letter.pdf');
    expect(exportFileName('', 'Summary', 'docx')).toBe('WindSliter-Summary.docx');
  });

  it('validates download requests', () => {
    expect(downloadSchema.safeParse({ kind: 'summary', format: 'pdf', result: sampleResult }).success).toBe(true);
    expect(downloadSchema.safeParse({ kind: 'resume', format: 'pdf', result: sampleResult }).success).toBe(false);
    expect(downloadSchema.safeParse({ kind: 'summary', format: 'pdf', result: {} }).success).toBe(false);
  });
});
