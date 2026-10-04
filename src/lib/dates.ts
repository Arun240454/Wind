const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Matches the stored month format: "YYYY-MM" or "YYYY", or empty. */
export const MONTH_PATTERN = /^(\d{4}(-(0[1-9]|1[0-2]))?)?$/;

function monthIndex(name: string): number {
  return MONTHS.findIndex((m) => m.toLowerCase() === name.slice(0, 3).toLowerCase());
}

/**
 * Normalizes the date strings found in LinkedIn exports ("Mar 2021", "2021",
 * "Mar 15, 2021", "2021-03-15") to "YYYY-MM" or "YYYY". Returns "" when unparseable.
 */
export function parseLinkedInDate(raw: string | undefined | null): string {
  const value = (raw ?? '').trim();
  if (!value) return '';

  let m = value.match(/^(\d{4})-(\d{2})(-\d{2})?$/);
  if (m) return `${m[1]}-${m[2]}`;

  m = value.match(/^([A-Za-z]{3,})\.?\s+(?:\d{1,2},\s*)?(\d{4})$/);
  if (m) {
    const i = monthIndex(m[1]);
    return i >= 0 ? `${m[2]}-${String(i + 1).padStart(2, '0')}` : m[2];
  }

  m = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;

  m = value.match(/^(\d{4})$/);
  if (m) return m[1];

  return '';
}

/** "2023-01" → "Jan 2023", "2023" → "2023". */
export function formatMonth(value: string | null | undefined): string {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!month) return year;
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/**
 * Formats a start/end pair for resumes and the portfolio.
 * An empty end means "Present" when `openEnded` is true (jobs), otherwise it is omitted (schools).
 */
export function formatRange(start: string | null | undefined, end: string | null | undefined, openEnded = true): string {
  const s = formatMonth(start);
  const e = end ? formatMonth(end) : openEnded ? 'Present' : '';
  if (s && e) return s === e ? s : `${s} – ${e}`;
  return s || (end ? e : '');
}

/** Sort key so the most recent record comes first. */
export function recency(start: string | null | undefined, end: string | null | undefined): string {
  return `${end ?? '9999-99'}|${start ?? ''}`;
}
