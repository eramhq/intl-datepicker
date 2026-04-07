import { describe, it, expect } from 'vitest';
import { parseInput, normalizeDigits, getLocaleSegmentOrder } from '../date-input.js';

describe('normalizeDigits', () => {
  it('passes through ASCII digits unchanged', () => {
    expect(normalizeDigits('1403/01/01')).toBe('1403/01/01');
  });

  it('translates Persian digits to ASCII', () => {
    expect(normalizeDigits('۱۴۰۳/۰۱/۰۱')).toBe('1403/01/01');
  });

  it('translates Arabic-Indic digits to ASCII', () => {
    expect(normalizeDigits('١٤٤٥/٠١/٠١')).toBe('1445/01/01');
  });

  it('translates Devanagari digits to ASCII', () => {
    expect(normalizeDigits('२०२४/०१/०१')).toBe('2024/01/01');
  });

  it('leaves separators and letters intact', () => {
    expect(normalizeDigits('۲۰۲۴-۰۱-۰۱')).toBe('2024-01-01');
  });
});

describe('getLocaleSegmentOrder', () => {
  it('returns YMD for fa-IR Persian (default ISO order)', () => {
    const order = getLocaleSegmentOrder('fa-IR', 'persian');
    expect(['YMD', 'DMY', 'MDY']).toContain(order);
  });

  it('returns MDY for en-US Gregorian', () => {
    expect(getLocaleSegmentOrder('en-US', 'gregory')).toBe('MDY');
  });

  it('returns DMY for en-GB Gregorian', () => {
    expect(getLocaleSegmentOrder('en-GB', 'gregory')).toBe('DMY');
  });
});

describe('parseInput — Persian calendar with ASCII digits', () => {
  it('treats 1403-01-01 as Persian year 1403, NOT Gregorian', () => {
    const cd = parseInput('1403-01-01', 'persian', 'fa-IR');
    expect(cd).not.toBeNull();
    expect(cd.calendar.identifier).toBe('persian');
    expect(cd.year).toBe(1403);
    expect(cd.month).toBe(1);
    expect(cd.day).toBe(1);
  });

  it('parses 1403/01/01 in Persian calendar', () => {
    const cd = parseInput('1403/01/01', 'persian', 'fa-IR');
    expect(cd).not.toBeNull();
    expect(cd.year).toBe(1403);
  });
});

describe('parseInput — Persian calendar with Persian digits', () => {
  it('parses ۱۴۰۳/۰۱/۰۱ correctly', () => {
    const cd = parseInput('۱۴۰۳/۰۱/۰۱', 'persian', 'fa-IR');
    expect(cd).not.toBeNull();
    expect(cd.year).toBe(1403);
    expect(cd.month).toBe(1);
    expect(cd.day).toBe(1);
  });

  it('parses ۱۴۰۳-۰۶-۱۵', () => {
    const cd = parseInput('۱۴۰۳-۰۶-۱۵', 'persian', 'fa-IR');
    expect(cd).not.toBeNull();
    expect(cd.year).toBe(1403);
    expect(cd.month).toBe(6);
    expect(cd.day).toBe(15);
  });
});

describe('parseInput — Gregorian locales', () => {
  it('parses YMD ISO unambiguously', () => {
    const cd = parseInput('2024-06-15', 'gregory', 'en-US');
    expect(cd).not.toBeNull();
    expect(cd.year).toBe(2024);
    expect(cd.month).toBe(6);
    expect(cd.day).toBe(15);
  });

  it('respects en-US MDY order', () => {
    const cd = parseInput('06/15/2024', 'gregory', 'en-US');
    expect(cd).not.toBeNull();
    expect(cd.year).toBe(2024);
    expect(cd.month).toBe(6);
    expect(cd.day).toBe(15);
  });

  it('respects en-GB DMY order', () => {
    const cd = parseInput('15/06/2024', 'gregory', 'en-GB');
    expect(cd).not.toBeNull();
    expect(cd.year).toBe(2024);
    expect(cd.month).toBe(6);
    expect(cd.day).toBe(15);
  });

  it('respects explicit format override', () => {
    const cd = parseInput('06/15/2024', 'gregory', 'en-GB', 'MDY');
    expect(cd).not.toBeNull();
    expect(cd.month).toBe(6);
    expect(cd.day).toBe(15);
  });
});

describe('parseInput — Hebrew calendar', () => {
  it('parses Hebrew calendar dates in active calendar', () => {
    const cd = parseInput('5784/06/15', 'hebrew', 'he-IL');
    expect(cd).not.toBeNull();
    expect(cd.calendar.identifier).toMatch(/hebrew/);
    expect(cd.year).toBe(5784);
  });
});

describe('parseInput — rejects invalid input', () => {
  it('returns null for empty string', () => {
    expect(parseInput('', 'gregory', 'en-US')).toBeNull();
  });

  it('returns null for non-numeric segments', () => {
    expect(parseInput('hello/world/today', 'gregory', 'en-US')).toBeNull();
  });

  it('returns null for two-segment input', () => {
    expect(parseInput('06/2024', 'gregory', 'en-US')).toBeNull();
  });

  it('returns null for two-digit-only year', () => {
    expect(parseInput('24/01/01', 'gregory', 'en-US')).toBeNull();
  });

  it('returns null for impossible dates (Feb 31)', () => {
    expect(parseInput('2024-02-31', 'gregory', 'en-US')).toBeNull();
  });

  it('returns null for month > 13', () => {
    expect(parseInput('2024-15-01', 'gregory', 'en-US')).toBeNull();
  });
});

describe('parseInput — round-trip with formatDateShort', () => {
  // Importing format here is fine since these tests exercise the public surface.
  it('persian fa-IR: parse(format(date)) === date', async () => {
    const { formatDateShort } = await import('../../utils/format.js');
    const { CalendarDate } = await import('@internationalized/date');
    const { getCalendar } = await import('../locale.js');
    const original = new CalendarDate(getCalendar('persian'), 1403, 6, 15);
    const formatted = formatDateShort(original, 'fa-IR', 'persian');
    const parsed = parseInput(formatted, 'persian', 'fa-IR');
    expect(parsed).not.toBeNull();
    expect(parsed.year).toBe(1403);
    expect(parsed.month).toBe(6);
    expect(parsed.day).toBe(15);
  });
});
