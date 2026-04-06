import { describe, it, expect } from 'vitest';
import {
  getCalendar, getSupportedCalendars, isRTL,
  getFirstDayOfWeek, resolveLocale, getWeekdayNames,
} from '../locale.js';

describe('getCalendar', () => {
  it('creates Gregorian calendar', () => {
    const cal = getCalendar('gregory');
    expect(cal.identifier).toBe('gregory');
  });

  it('creates Persian calendar', () => {
    const cal = getCalendar('persian');
    expect(cal.identifier).toBe('persian');
  });

  it('maps "islamic" to IslamicUmalqura (not Gregorian fallback)', () => {
    const cal = getCalendar('islamic');
    expect(cal.identifier).toBe('islamic-umalqura');
  });

  it('creates islamic-civil calendar', () => {
    const cal = getCalendar('islamic-civil');
    expect(cal.identifier).toBe('islamic-civil');
  });

  it('creates Hebrew calendar', () => {
    const cal = getCalendar('hebrew');
    expect(cal.identifier).toBe('hebrew');
  });

  it('falls back to Gregorian for unknown identifier', () => {
    const cal = getCalendar('unknown');
    expect(cal.identifier).toBe('gregory');
  });

  it('returns cached instance on repeated calls (Bug 15)', () => {
    const a = getCalendar('persian');
    const b = getCalendar('persian');
    expect(a).toBe(b);
  });

  it('supports all documented calendars', () => {
    const expected = [
      'gregory', 'persian', 'islamic', 'islamic-umalqura',
      'islamic-civil', 'islamic-tbla', 'hebrew', 'buddhist',
      'japanese', 'indian', 'ethiopic', 'ethioaa', 'coptic', 'roc',
    ];
    const supported = getSupportedCalendars();
    for (const id of expected) {
      expect(supported).toContain(id);
      const cal = getCalendar(id);
      expect(cal).toBeDefined();
    }
  });
});

describe('isRTL', () => {
  it('detects RTL for Persian', () => {
    expect(isRTL('fa-IR')).toBe(true);
  });

  it('detects RTL for Arabic', () => {
    expect(isRTL('ar-SA')).toBe(true);
  });

  it('detects RTL for Hebrew', () => {
    expect(isRTL('he')).toBe(true);
  });

  it('detects LTR for English', () => {
    expect(isRTL('en-US')).toBe(false);
  });

  it('detects LTR for French', () => {
    expect(isRTL('fr')).toBe(false);
  });
});

describe('getFirstDayOfWeek', () => {
  it('returns Saturday (6) for fa-IR', () => {
    // This uses the fallback table in jsdom
    expect(getFirstDayOfWeek('fa-IR')).toBe(6);
  });
});

describe('resolveLocale', () => {
  it('returns explicit locale when provided', () => {
    expect(resolveLocale('fa-IR')).toBe('fa-IR');
  });

  it('falls back to navigator.language', () => {
    const result = resolveLocale(null);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('getWeekdayNames', () => {
  it('returns 7 weekday names', () => {
    const names = getWeekdayNames('en-US', 'narrow');
    expect(names.length).toBe(7);
  });

  it('all names are non-empty strings', () => {
    const names = getWeekdayNames('fa-IR', 'short');
    for (const name of names) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
