import { parseLinkedInDate } from '@/lib/dates';
import { ImportError, toBullets, type CanonicalImport } from './linkedin-export';

/**
 * Parses the PDF LinkedIn generates from a profile (Profile → More → Save to PDF).
 *
 * The PDF is a two-column layout: a narrow sidebar (Contact, Top Skills, Languages,
 * Certifications) and a main column (name, headline, location, then Summary, Experience and
 * Education). There are no tags or fields in it, only positioned text, so the parser works from
 * x/y positions and font sizes, which LinkedIn keeps consistent between profiles:
 *   name (largest) > section headings > company / job title / school > body text.
 * Everything still goes through the review step, so a misread line can be unticked or edited.
 */

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 30;

export interface PdfLine {
  page: number;
  x: number;
  y: number;
  size: number;
  text: string;
}

const MAIN_HEADINGS = new Set(['summary', 'about', 'experience', 'education', 'licenses & certifications', 'volunteer experience', 'projects', 'honors & awards', 'publications', 'skills']);
const SIDEBAR_HEADINGS = new Set(['contact', 'top skills', 'languages', 'certifications', 'honors-awards', 'publications', 'patents', 'skills']);

const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec';
const DATE = `(?:(?:${MONTHS})\\.?\\s+)?\\d{4}`;
const DATE_RANGE = new RegExp(`^(${DATE})\\s*[-–—]\\s*(${DATE}|present)\\s*(?:\\(.*\\))?$`, 'i');
const SINGLE_DATE = new RegExp(`^(${DATE})\\s*\\(.*\\)$`, 'i');
const DURATION_ONLY = /^(?:\d+\s+(?:years?|yrs?)(?:\s+\d+\s+(?:months?|mos?))?|\d+\s+(?:months?|mos?))$/i;
const PAGE_FOOTER = /^page\s+\d+\s+of\s+\d+$/i;

/** Reads every text item with its position and size, then groups items into lines per column. */
export async function extractPdfLines(data: ArrayBuffer | Uint8Array): Promise<PdfLine[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
  } catch {
    throw new ImportError('That file is not a readable PDF.');
  }
  if (pdf.numPages > MAX_PAGES) throw new ImportError(`The PDF has more than ${MAX_PAGES} pages.`);

  interface Item { page: number; x: number; y: number; w: number; size: number; str: string }
  const items: Item[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const [, , c, d, e, f] = it.transform as number[];
      items.push({ page: p, x: e, y: f, w: it.width, size: Math.round(Math.hypot(c, d) * 10) / 10, str: it.str });
    }
  }
  await pdf.destroy();
  if (items.length === 0) {
    throw new ImportError('This PDF has no selectable text (it may be a scan). Use the PDF from LinkedIn’s “Save to PDF” button.');
  }

  // Group into lines: first into rows (same page, baseline within 2pt), then split each row
  // wherever there is a wide horizontal gap, so the sidebar and main column never merge.
  items.sort((a, b) => a.page - b.page || b.y - a.y);
  const rows: Item[][] = [];
  for (const it of items) {
    const row = rows.at(-1);
    if (row && row[0].page === it.page && Math.abs(row[0].y - it.y) <= 2) row.push(it);
    else rows.push([it]);
  }
  const lines: PdfLine[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let cur: (PdfLine & { end: number }) | null = null;
    for (const it of row) {
      if (cur && it.x - cur.end < 40) {
        cur.text += (it.x - cur.end > 1 && !cur.text.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '') + it.str;
        cur.end = Math.max(cur.end, it.x + it.w);
        cur.size = Math.max(cur.size, it.size);
      } else {
        if (cur) lines.push(cur);
        cur = { page: it.page, x: it.x, y: it.y, size: it.size, text: it.str, end: it.x + it.w };
      }
    }
    if (cur) lines.push(cur);
  }
  // Reading order: page, then top to bottom; sidebar vs main is decided later by x.
  lines.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);

  return lines
    .map(({ page, x, y, size, text }) => ({ page, x, y, size, text: text.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text && !PAGE_FOOTER.test(l.text));
}

/** Most common font size among the given lines: the body text size. */
function bodySize(lines: PdfLine[]): number {
  const counts = new Map<number, number>();
  for (const l of lines) counts.set(l.size, (counts.get(l.size) ?? 0) + l.text.length);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
}

/** Splits lines into sections keyed by heading (lowercased), in order. */
function sections(lines: PdfLine[], headings: Set<string>, body: number) {
  const out: { heading: string; lines: PdfLine[] }[] = [{ heading: '', lines: [] }];
  for (const l of lines) {
    const key = l.text.toLowerCase();
    if (headings.has(key) && l.size > body + 0.5) out.push({ heading: key, lines: [] });
    else out.at(-1)!.lines.push(l);
  }
  return out;
}

/** Joins wrapped lines into paragraphs, starting a new one at a bullet, a sentence end or a vertical gap. */
function paragraphs(lines: PdfLine[]): string[] {
  const out: string[] = [];
  let prev: PdfLine | null = null;
  for (const l of lines) {
    const gap = prev && prev.page === l.page ? prev.y - l.y : 0;
    // A page break (gap 0) continues the paragraph unless the previous line ended a sentence.
    const startsNew = !prev || /^[•·▪◦\-*–]\s/.test(l.text) || /[.!?:]$/.test(prev.text) || gap > l.size * 1.9;
    if (startsNew || out.length === 0) out.push(l.text);
    else out[out.length - 1] += ` ${l.text}`;
    prev = l;
  }
  return out;
}

const looksLikeLocation = (s: string) =>
  s.length < 80 && !/[.!?]$/.test(s) && !/^[•·▪◦\-*–]/.test(s) && (/,/.test(s) || /\b(remote|hybrid|on-site|area|metropolitan)\b/i.test(s));

function parseRange(text: string): { start: string; end: string | null } {
  const m = text.match(DATE_RANGE);
  if (m) return { start: parseLinkedInDate(m[1]), end: /present/i.test(m[2]) ? null : parseLinkedInDate(m[2]) || null };
  const s = text.match(SINGLE_DATE);
  if (s) return { start: parseLinkedInDate(s[1]), end: parseLinkedInDate(s[1]) || null };
  return { start: '', end: null };
}

/** Pure mapping from extracted lines to the canonical profile. Exported for tests. */
export function mapPdfLines(lines: PdfLine[]): Omit<CanonicalImport, 'filesRead' | 'unknownFiles'> {
  // The name is the largest text on page 1; it marks where the main column starts.
  const page1 = lines.filter((l) => l.page === 1);
  const nameLine = page1.reduce((a, b) => (b.size > a.size ? b : a), page1[0]);
  const splitX = nameLine.x - 15;
  const main = lines.filter((l) => l.x >= splitX);
  const side = lines.filter((l) => l.x < splitX);

  const mainBody = bodySize(main);
  const mainSecs = sections(main, MAIN_HEADINGS, mainBody);
  const sideSecs = sections(side, SIDEBAR_HEADINGS, bodySize(side));
  const sec = (name: string) => mainSecs.find((s) => s.heading === name)?.lines ?? [];

  if (!mainSecs.some((s) => ['experience', 'summary', 'education'].includes(s.heading))) {
    throw new ImportError('This doesn’t look like a LinkedIn profile PDF. On your LinkedIn profile, use More → Save to PDF.');
  }

  // Header: name, then headline (larger than body), then location (body size).
  const header = mainSecs[0].lines.filter((l) => l !== nameLine);
  const headline = header.filter((l) => l.size > mainBody + 0.4).map((l) => l.text).join(' ');
  const rest = header.filter((l) => l.size <= mainBody + 0.4).map((l) => l.text);
  const location = rest.find(looksLikeLocation) ?? rest.at(-1) ?? '';
  const [firstName, ...lastParts] = nameLine.text.split(' ');

  // Experience: company/title lines are larger than body; a date range closes each role header.
  type Exp = CanonicalImport['experience'][number] & { desc: PdfLine[] };
  const experience: Exp[] = [];
  let company = '';
  let pending: string[] = [];
  let expectLocation = false;
  for (const l of sec('experience')) {
    if (l.size > mainBody + 0.4) {
      pending.push(l.text);
      continue;
    }
    if (DATE_RANGE.test(l.text) || SINGLE_DATE.test(l.text)) {
      const title = pending.pop() ?? '';
      if (pending.length) company = pending.join(' ');
      pending = [];
      const { start, end } = parseRange(l.text);
      experience.push({ company, title, location: '', startMonth: start, endMonth: end, bullets: [], desc: [] });
      expectLocation = true;
      continue;
    }
    if (DURATION_ONLY.test(l.text)) {
      // Header of a company with several roles: "Company" / "4 years 9 months" / roles…
      company = pending.join(' ');
      pending = [];
      continue;
    }
    const current = experience.at(-1);
    if (!current) continue;
    if (expectLocation && looksLikeLocation(l.text)) current.location = l.text;
    else current.desc.push(l);
    expectLocation = false;
  }

  // Education: a larger school line, then "Degree, Field · (2016 - 2020)" in body text.
  const education: CanonicalImport['education'] = [];
  let school: { name: string; detail: string[] } | null = null;
  const flushSchool = () => {
    if (!school) return;
    const detail = school.detail.join(' ').trim();
    const dates = detail.match(/\(([^()]*\d{4}[^()]*)\)\s*$/);
    const before = (dates ? detail.slice(0, dates.index) : detail).replace(/[·•]\s*$/, '').trim();
    const [degree, ...field] = before.split(/,\s*/);
    const range = dates ? parseRange(dates[1].replace(/\s*[-–—]\s*/, ' - ')) : { start: '', end: null };
    education.push({ school: school.name, degree: degree ?? '', field: field.join(', '), startMonth: range.start, endMonth: range.end, notes: '' });
    school = null;
  };
  for (const l of sec('education')) {
    if (l.size > mainBody + 0.4) {
      if (school && school.detail.length === 0) school.name += ` ${l.text}`;
      else {
        flushSchool();
        school = { name: l.text, detail: [] };
      }
    } else if (school) school.detail.push(l.text);
  }
  flushSchool();

  // Sidebar lists have one item per line, but long items wrap: rejoin a line that continues the
  // previous one (previous ends with a hyphen, or this one starts in lowercase).
  const sideSec = (name: string) =>
    (sideSecs.find((s) => s.heading === name)?.lines.map((l) => l.text) ?? []).reduce<string[]>((out, t) => {
      const prev = out.at(-1);
      if (prev?.endsWith('-')) out[out.length - 1] = prev.slice(0, -1) + t;
      else if (prev && /^[a-z]/.test(t)) out[out.length - 1] = `${prev} ${t}`;
      else out.push(t);
      return out;
    }, []);
  const seen = new Set<string>();
  const skills = sideSec('top skills')
    .filter((n) => !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
    .map((name) => ({ name, category: '' }));
  const certifications = sideSec('certifications').map((name) => ({ name, issuer: '', issuedMonth: '', url: '' }));

  return {
    profile: {
      firstName: firstName ?? '',
      lastName: lastParts.join(' '),
      headline,
      summary: paragraphs(sec('summary').length ? sec('summary') : sec('about')).join('\n\n'),
      location,
    },
    experience: experience
      .filter((e) => e.company && e.title)
      .map(({ desc, ...e }) => ({ ...e, bullets: paragraphs(desc).flatMap(toBullets) })),
    education,
    skills,
    certifications,
    projects: [],
  };
}

export async function parseLinkedInPdf(data: ArrayBuffer | Uint8Array, fileName = 'Profile.pdf'): Promise<CanonicalImport> {
  if (data.byteLength > MAX_PDF_BYTES) throw new ImportError('The file is larger than 10 MB.');
  const lines = await extractPdfLines(data);
  return { ...mapPdfLines(lines), filesRead: [fileName], unknownFiles: [] };
}
