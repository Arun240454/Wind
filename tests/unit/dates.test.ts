import { describe, expect, it } from 'vitest';
import { formatMonth, formatRange, parseLinkedInDate } from '@/lib/dates';

describe('parseLinkedInDate', () => {
  it.each([
    ['Mar 2021', '2021-03'],
    ['March 2021', '2021-03'],
    ['Mar 15, 2021', '2021-03'],
    ['2021-03-15', '2021-03'],
    ['2021', '2021'],
    ['3/2021', '2021-03'],
    ['', ''],
    ['someday', ''],
  ])('%s → %s', (input, expected) => {
    expect(parseLinkedInDate(input)).toBe(expected);
  });
});

describe('formatRange', () => {
  it('shows Present for open-ended jobs', () => {
    expect(formatRange('2023-01', null)).toBe('Jan 2023 – Present');
  });
  it('omits the end for schools with no end date', () => {
    expect(formatRange('2016', null, false)).toBe('2016');
  });
  it('formats closed ranges', () => {
    expect(formatRange('2020-06', '2022-03')).toBe('Jun 2020 – Mar 2022');
  });
  it('formats single months', () => {
    expect(formatMonth('2023-12')).toBe('Dec 2023');
  });
});
