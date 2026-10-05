import { z } from 'zod';

export const MERGE_FIELDS = [
  { key: 'company', label: 'Company', fromProfile: false },
  { key: 'role', label: 'Role', fromProfile: false },
  { key: 'hiringManager', label: 'Hiring manager', fromProfile: false },
  { key: 'name', label: 'Your name', fromProfile: true },
  { key: 'topSkill', label: 'Top skill', fromProfile: true },
  { key: 'recentRole', label: 'Most recent role', fromProfile: true },
] as const;

export type MergeFieldKey = (typeof MERGE_FIELDS)[number]['key'];

/** The job details the user types; the rest of the merge fields come from the profile. */
export const letterFields = z.object({
  company: z.string().trim().max(200).default(''),
  role: z.string().trim().max(200).default(''),
  hiringManager: z.string().trim().max(200).default(''),
});
export type LetterFields = z.infer<typeof letterFields>;

/** Minimal TipTap / ProseMirror JSON shape. */
export interface TipTapNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
}

export const tiptapDoc = z.object({ type: z.literal('doc'), content: z.array(z.any()).max(500).default([]) });

const TOKEN = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

/** Values for every merge field: typed job fields plus profile-derived ones. */
export function mergeValues(
  fields: LetterFields,
  profile: { name: string; skills: { name: string }[]; experiences: { title: string; company: string }[] }
): Record<MergeFieldKey, string> {
  const recent = profile.experiences[0];
  return {
    company: fields.company,
    role: fields.role,
    hiringManager: fields.hiringManager || 'Hiring Manager',
    name: profile.name,
    topSkill: profile.skills[0]?.name ?? '',
    recentRole: recent ? `${recent.title} at ${recent.company}` : '',
  };
}

/** Replaces {{tokens}}. Unknown or empty values become a visible [Label] so nothing ships blank. */
export function fillText(text: string, values: Partial<Record<string, string>>): string {
  return text.replace(TOKEN, (_, key: string) => {
    const v = values[key];
    if (v) return v;
    const label = MERGE_FIELDS.find((f) => f.key === key)?.label ?? key;
    return `[${label}]`;
  });
}

function inlineText(node: TipTapNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(inlineText).join('');
}

/** Flattens a TipTap document into plain paragraphs for the exporters. */
export function docToParagraphs(doc: { content?: TipTapNode[] }): string[] {
  const out: string[] = [];
  for (const node of doc.content ?? []) {
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      (node.content ?? []).forEach((item, i) => {
        const prefix = node.type === 'bulletList' ? '• ' : `${i + 1}. `;
        out.push(prefix + inlineText(item).trim());
      });
    } else {
      out.push(inlineText(node));
    }
  }
  return out.filter((p) => p.trim() !== '');
}

export function fillDocument(doc: { content?: TipTapNode[] }, values: Partial<Record<string, string>>): string[] {
  return docToParagraphs(doc).map((p) => fillText(p, values));
}

export function paragraphsToDoc(paragraphs: string[]): { type: 'doc'; content: TipTapNode[] } {
  return {
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: p ? [{ type: 'text', text: p }] : undefined,
    })),
  };
}
