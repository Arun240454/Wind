import type { GenerationResult } from '@/lib/schema';

export type { GenerationResult };

export function contactLine(c: GenerationResult['candidate']): string {
  return [c.email, c.phone, c.location, ...c.links].filter(Boolean).join('  |  ');
}

export function letterDate(now = new Date()): string {
  return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** "Ada Lovelace" → "Ada-Lovelace-Cover-Letter.pdf" */
export function exportFileName(name: string, kind: 'Summary' | 'Cover-Letter', ext: 'pdf' | 'docx'): string {
  const base = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join('-');
  return `${base || 'WindSliter'}-${kind}.${ext}`;
}
