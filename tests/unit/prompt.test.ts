import { describe, expect, it } from 'vitest';
import { buildRequest } from '@/lib/generate';
import { jobSchema } from '@/lib/schema';

const job = (fields: Record<string, string>) => jobSchema.parse(fields);

describe('buildRequest', () => {
  it('attaches every optional field the user entered', () => {
    const text = buildRequest(job({ company: 'Acme', hiringManager: 'Priya Sharma', jobDescription: 'Lead the analytics team.' }));
    expect(text).toContain('<company>Acme</company>');
    expect(text).toContain('<hiring_manager>Priya Sharma</hiring_manager>');
    expect(text).toContain('<job_description>\nLead the analytics team.\n</job_description>');
  });

  it('attaches only the fields that were entered', () => {
    const text = buildRequest(job({ company: 'Acme', hiringManager: '  ', jobDescription: '' }));
    expect(text).toContain('<company>Acme</company>');
    expect(text).not.toContain('hiring_manager');
    expect(text).not.toContain('job_description');
  });

  it('asks for a general letter when nothing was entered', () => {
    expect(buildRequest(job({}))).toBe('Write a general cover letter (no job details were given).');
  });
});
