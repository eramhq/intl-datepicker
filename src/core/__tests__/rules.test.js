// v0.4 selection rules: range rules, richer disabling, today-derived bounds
// and first-day-of-week, at the state level.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { CalendarDate, toCalendar } from '@internationalized/date';
import {
  createState, selectDate, isDateDisabled, rangeError, getRangeLimits, isRangeBlocked,
  parseDisabledDates, parseValueForType, serializeValueForType, refreshToday, toISO, parseISOToCalendar, viewOf,
} from '../state.js';
import { generateMonthGrid } from '../calendar-grid.js';
import { getCalendar, resolveFirstDayOfWeek, parseDayOfWeek, getWeekdayNames } from '../locale.js';

const d = (iso, cal = 'gregory') => parseISOToCalendar(iso, getCalendar(cal));
const iso = (date) => (date ? toISO(date) : null);
const pick = (state, ...isos) => isos.reduce((s, x) => selectDate(s, d(x, s.calendarId)), state);
const showing = (state, x) => ({ ...state, ...viewOf(d(x)) });

afterEach(() => {
  vi.useRealTimers();
});

describe('rangeError: nights', () => {
  it('counts nights as end − start, across months', () => {
    const state = createState({ type: 'range', minNights: 3 });
    expect(rangeError(state, d('2026-01-30'), d('2026-02-01'))).toBe('short');
    expect(rangeError(state, d('2026-01-30'), d('2026-02-02'))).toBeNull();
    // Either order.
    expect(rangeError(state, d('2026-02-02'), d('2026-01-30'))).toBeNull();
  });

  it('counts nights across the Persian new year', () => {
    const state = createState({ type: 'range', calendarId: 'persian', locale: 'fa-IR', maxNights: 3 });
    // 1403-12-29 (2025-03-19) → 1404-01-02 (2025-03-22) is 3 nights.
    const start = new CalendarDate(getCalendar('persian'), 1403, 12, 29);
    expect(rangeError(state, start, start.add({ days: 3 }))).toBeNull();
    expect(rangeError(state, start, start.add({ days: 4 }))).toBe('long');
    expect(toISO(start.add({ days: 3 }))).toBe('2025-03-22');
  });

  it('defaults to v0.3: a same-day range is allowed', () => {
    const state = createState({ type: 'range' });
    expect(rangeError(state, d('2026-03-10'), d('2026-03-10'))).toBeNull();
    expect(iso(pick(state, '2026-03-10', '2026-03-10').rangeEnd)).toBe('2026-03-10');
  });
});

describe('rangeError: exclude-disabled', () => {
  // Booked nights 12th and 13th: someone checks in on the 12th.
  const booked = ['2026-03-12/2026-03-13'];

  it('without exclusion, a range may span disabled days but not end on one', () => {
    const state = createState({ type: 'range', disabledDates: booked });
    expect(rangeError(state, d('2026-03-10'), d('2026-03-15'))).toBeNull();
    expect(rangeError(state, d('2026-03-10'), d('2026-03-12'))).toBe('unavailable');
    expect(rangeError(state, d('2026-03-12'), d('2026-03-15'))).toBe('unavailable');
  });

  it('days mode excludes every day in [start, end]', () => {
    const state = createState({ type: 'range', disabledDates: booked, excludeDisabled: '' });
    expect(state.excludeDisabled).toBe('days');
    expect(rangeError(state, d('2026-03-10'), d('2026-03-11'))).toBeNull();
    expect(rangeError(state, d('2026-03-10'), d('2026-03-12'))).toBe('unavailable');
    expect(rangeError(state, d('2026-03-10'), d('2026-03-15'))).toBe('unavailable');
  });

  it('nights mode lets check-out land on the first booked day, never check-in', () => {
    const state = createState({ type: 'range', disabledDates: booked, excludeDisabled: 'nights' });
    expect(rangeError(state, d('2026-03-10'), d('2026-03-12'))).toBeNull();
    expect(rangeError(state, d('2026-03-10'), d('2026-03-13'))).toBe('unavailable');
    expect(rangeError(state, d('2026-03-12'), d('2026-03-14'))).toBe('unavailable');
    // Check-out the day after the last booked night is a fresh stay.
    expect(rangeError(state, d('2026-03-14'), d('2026-03-16'))).toBeNull();
    // A selection via clicks agrees.
    expect(iso(pick(state, '2026-03-10', '2026-03-12').rangeEnd)).toBe('2026-03-12');
    expect(pick(state, '2026-03-12').rangeStart).toBeNull();
  });

  it('nights mode still keeps the end within max', () => {
    const state = createState({ type: 'range', max: '2026-03-20', excludeDisabled: 'nights' });
    expect(rangeError(state, d('2026-03-18'), d('2026-03-21'))).toBe('unavailable');
  });

  it('reports unavailable before short/long', () => {
    const state = createState({ type: 'range', disabledDates: booked, excludeDisabled: 'days', maxNights: 1 });
    expect(rangeError(state, d('2026-03-10'), d('2026-03-14'))).toBe('unavailable');
  });
});

describe('getRangeLimits / isRangeBlocked', () => {
  const window = [d('2026-03-01'), d('2026-04-11')];
  const limitsOf = (state) => {
    const l = getRangeLimits(state, ...window);
    return l && { lo: iso(l.lo), hi: iso(l.hi), checkout: iso(l.checkout) };
  };

  it('is null without a pending start or without rules', () => {
    const rules = createState({ type: 'range', minNights: 2 });
    expect(getRangeLimits(rules, ...window)).toBeNull();
    expect(getRangeLimits(pick(createState({ type: 'range' }), '2026-03-10'), ...window)).toBeNull();
    expect(getRangeLimits(pick(rules, '2026-03-10', '2026-03-15'), ...window)).toBeNull();
  });

  it('bounds both directions by max-nights', () => {
    const state = pick(createState({ type: 'range', maxNights: 5 }), '2026-03-10');
    expect(limitsOf(state)).toEqual({ lo: '2026-03-05', hi: '2026-03-15', checkout: null });
  });

  it('stops at the first disabled day in nights mode, keeping it as check-out', () => {
    const state = pick(createState({
      type: 'range', excludeDisabled: 'nights', maxNights: 28,
      disabledDates: ['2026-03-05', '2026-03-12/2026-03-13'],
    }), '2026-03-08');
    expect(limitsOf(state)).toEqual({ lo: '2026-03-06', hi: '2026-03-12', checkout: '2026-03-12' });
  });

  it('stops before the first disabled day in days mode', () => {
    const state = pick(createState({
      type: 'range', excludeDisabled: 'days', disabledDates: ['2026-03-05', '2026-03-12'],
    }), '2026-03-08');
    expect(limitsOf(state)).toEqual({ lo: '2026-03-06', hi: '2026-03-11', checkout: null });
  });

  it('blocks ends within min-nights but never the start', () => {
    const state = pick(createState({ type: 'range', minNights: 2 }), '2026-03-10');
    const limits = getRangeLimits(state, ...window);
    const blocked = (x) => isRangeBlocked(state, d(x), limits);
    expect(blocked('2026-03-10')).toBe(false);
    expect(blocked('2026-03-11')).toBe(true);
    expect(blocked('2026-03-09')).toBe(true);
    expect(blocked('2026-03-12')).toBe(false);
    expect(blocked('2026-03-08')).toBe(false);
  });

  it('agrees with rangeError for every cell in the grid', () => {
    const state = pick(createState({
      type: 'range', excludeDisabled: 'nights', minNights: 2, maxNights: 9,
      disabledDates: ['2026-03-03', '2026-03-17/2026-03-18'],
    }), '2026-03-08');
    const cells = generateMonthGrid(showing(state, '2026-03-01')).flat();
    expect(cells.some(c => c.isRangeBlocked) && cells.some(c => c.isCheckoutOnly)).toBe(true);
    for (const cell of cells) {
      if (isSameIso(cell.date, '2026-03-08')) continue;
      const selectable = (!cell.disabled || cell.isCheckoutOnly) && !cell.isRangeBlocked;
      expect([toISO(cell.date), selectable]).toEqual([toISO(cell.date), rangeError(state, state.rangeStart, cell.date) === null]);
    }
  });

  it('marks only the first disabled day after the start as check-out in the grid', () => {
    const state = pick(createState({
      type: 'range', excludeDisabled: 'nights', disabledDates: ['2026-03-12/2026-03-13'],
    }), '2026-03-10');
    const cells = generateMonthGrid(showing(state, '2026-03-01')).flat();
    const at = (x) => cells.find(c => isSameIso(c.date, x));
    expect(at('2026-03-12')).toMatchObject({ disabled: true, isCheckoutOnly: true, isRangeBlocked: false });
    expect(at('2026-03-13')).toMatchObject({ isCheckoutOnly: false, isRangeBlocked: true });
    expect(at('2026-03-20')).toMatchObject({ isRangeBlocked: true });
  });
});

function isSameIso(date, x) {
  return toISO(date) === x;
}

describe('selectDate with range rules', () => {
  it('refuses an end that breaks the rules', () => {
    const state = pick(createState({ type: 'range', minNights: 2, maxNights: 5 }), '2026-03-10');
    expect(selectDate(state, d('2026-03-11'))).toBe(state);
    expect(selectDate(state, d('2026-03-16'))).toBe(state);
    expect(iso(selectDate(state, d('2026-03-15')).rangeEnd)).toBe('2026-03-15');
  });

  it('swaps a click before the pending start', () => {
    const state = pick(createState({ type: 'range', minNights: 2 }), '2026-03-10', '2026-03-07');
    expect([iso(state.rangeStart), iso(state.rangeEnd)]).toEqual(['2026-03-07', '2026-03-10']);
  });

  it('re-picking the start cancels it when a same-day range is not allowed', () => {
    const state = pick(createState({ type: 'range', minNights: 1 }), '2026-03-10', '2026-03-10');
    expect(state.rangeStart).toBeNull();
    expect(state.rangeEnd).toBeNull();
  });

  it('replaces a pending start that is itself unavailable', () => {
    const state = createState({ type: 'range', value: '2026-03-10', disabledDates: ['2026-03-10'], minNights: 2, excludeDisabled: 'days' });
    expect(iso(state.rangeStart)).toBe('2026-03-10');
    // No limits are drawn around it, so every selectable day can start anew.
    expect(getRangeLimits(state, d('2026-03-01'), d('2026-04-11'))).toBeNull();
    expect(generateMonthGrid(showing(state, '2026-03-01')).flat().some(c => c.isRangeBlocked)).toBe(false);
    const next = selectDate(state, d('2026-03-12'));
    expect([iso(next.rangeStart), next.rangeEnd]).toEqual(['2026-03-12', null]);
  });
});

describe('parseDisabledDates', () => {
  it('normalizes single dates and inclusive ranges into merged intervals', () => {
    expect(parseDisabledDates([
      '2026-05-10', '2026-01-10/2026-01-01', '2026-01-05/2026-01-20', 'junk', 42, '2026-02-30',
      '2026-03-01/2026-03-02/2026-03-03', '2026-05-10', '2026-04-01/nope',
    ])).toEqual([['2026-01-01', '2026-01-20'], ['2026-05-10', '2026-05-10']]);
  });

  it('is null for empty or invalid input', () => {
    expect(parseDisabledDates(null)).toBeNull();
    expect(parseDisabledDates(['x'])).toBeNull();
    expect(parseDisabledDates('2026-01-01')).toBeNull();
  });

  it('binary-searches interval edges', () => {
    const state = createState({ disabledDates: ['2026-01-01/2026-01-03', '2026-02-10', '2026-12-31/2027-01-02'] });
    const off = (x) => isDateDisabled(state, d(x));
    expect(['2025-12-31', '2026-01-01', '2026-01-03', '2026-01-04'].map(off)).toEqual([false, true, true, false]);
    expect(['2026-02-09', '2026-02-10', '2026-02-11'].map(off)).toEqual([false, true, false]);
    expect(['2026-12-30', '2026-12-31', '2027-01-02', '2027-01-03'].map(off)).toEqual([false, true, true, false]);
  });

  it('matches ranges in non-Gregorian calendars by ISO date', () => {
    const state = createState({ calendarId: 'persian', disabledDates: ['2025-03-20/2025-03-23'] });
    const nowruz = new CalendarDate(getCalendar('persian'), 1404, 1, 1); // 2025-03-21
    expect(isDateDisabled(state, nowruz)).toBe(true);
    expect(isDateDisabled(state, nowruz.add({ days: 3 }))).toBe(false);
  });
});

describe('disabled-days-of-week', () => {
  it('accepts numbers and names', () => {
    expect(['5', 'fri', ' FRI ', 'sun', '0', '7', 'friday', ''].map(parseDayOfWeek)).toEqual([5, 5, 5, 0, 0, -1, -1, -1]);
    const byNumber = createState({ disabledDaysOfWeek: '5,6' });
    const byName = createState({ disabledDaysOfWeek: 'fri, sat' });
    // 2026-10-02 is a Friday.
    for (const state of [byNumber, byName]) {
      expect(isDateDisabled(state, d('2026-10-02'))).toBe(true);
      expect(isDateDisabled(state, d('2026-10-03'))).toBe(true);
      expect(isDateDisabled(state, d('2026-10-04'))).toBe(false);
    }
  });

  it('combines with the locale weekend', () => {
    const state = createState({ locale: 'en-US', disableWeekends: true, disabledDaysOfWeek: 'wed' });
    expect(state._disabledDows.sort()).toEqual([0, 3, 6]);
  });

  it('is null when nothing is disabled', () => {
    expect(createState({ disabledDaysOfWeek: 'nope' })._disabledDows).toBeNull();
  });
});

describe('disabledDatesFilter input', () => {
  it('gets the Gregorian ISO date, and dayOfWeek from Sunday', () => {
    const seen = [];
    const state = createState({
      calendarId: 'persian', locale: 'fa-IR', firstDayOfWeek: 'mon',
      disabledDatesFilter: (day) => { seen.push(day); return day.iso === '2025-03-21'; },
    });
    expect(isDateDisabled(state, new CalendarDate(getCalendar('persian'), 1404, 1, 1))).toBe(true);
    expect(seen[0]).toEqual({ year: 1404, month: 1, day: 1, dayOfWeek: 5, iso: '2025-03-21' });
  });
});

describe('disable-past / disable-future', () => {
  const at = (when) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(when));
  };
  const bounds = (opts) => {
    const s = createState({ locale: 'en-US', ...opts });
    return [iso(s.min), iso(s.max)];
  };

  it('uses today for date, range and multiple', () => {
    at('2026-10-15T12:00:00');
    for (const type of ['date', 'range', 'multiple']) {
      expect(bounds({ type, disablePast: true })).toEqual(['2026-10-15', null]);
      expect(bounds({ type, disableFuture: true })).toEqual([null, '2026-10-15']);
    }
  });

  it('uses this week, month and year for those types', () => {
    at('2026-10-15T12:00:00'); // Thursday
    expect(bounds({ type: 'week', disablePast: true, disableFuture: true })).toEqual(['2026-10-11', '2026-10-17']);
    expect(bounds({ type: 'week', firstDayOfWeek: 'mon', disablePast: true })).toEqual(['2026-10-12', null]);
    expect(bounds({ type: 'month', disablePast: true, disableFuture: true })).toEqual(['2026-10-01', '2026-10-01']);
    expect(bounds({ type: 'year', disablePast: true, disableFuture: true })).toEqual(['2026-01-01', '2026-01-01']);
    const persian = createState({ type: 'month', calendarId: 'persian', disablePast: true });
    expect(iso(persian.min)).toBe('2026-09-23'); // 1 Mehr 1405
  });

  it('keeps the tighter of min/max and the today bound', () => {
    at('2026-10-15T12:00:00');
    expect(bounds({ min: '2026-11-01', disablePast: true })).toEqual(['2026-11-01', null]);
    expect(bounds({ min: '2026-01-01', disablePast: true })).toEqual(['2026-10-15', null]);
    expect(bounds({ max: '2026-09-01', disableFuture: true })).toEqual([null, '2026-09-01']);
    expect(bounds({ max: '2027-01-01', disableFuture: true })).toEqual([null, '2026-10-15']);
  });

  it('counts the current month as valid for card expiry', () => {
    at('2026-10-15T12:00:00');
    const state = createState({ type: 'month', value: '2026-10', disablePast: true });
    expect(state.selectedDate.compare(state.min)).toBe(0);
  });

  it('rolls over at midnight', () => {
    at('2026-10-15T23:59:00');
    const state = createState({ disablePast: true });
    expect(refreshToday(state)).toBe(state);
    vi.setSystemTime(new Date('2026-10-16T00:01:00'));
    const next = refreshToday(state);
    expect(iso(next.today)).toBe('2026-10-16');
    expect(iso(next.min)).toBe('2026-10-16');
    expect(isDateDisabled(next, d('2026-10-15'))).toBe(true);
  });
});

describe('first-day-of-week', () => {
  it('resolves numbers and names, falling back to the locale', () => {
    expect(['0', 1, 'Mon', 'sat', '6'].map(v => resolveFirstDayOfWeek(v, 'en-US'))).toEqual(['sun', 'mon', 'mon', 'sat', 'sat']);
    expect(resolveFirstDayOfWeek(null, 'en-US')).toBe('sun');
    expect(resolveFirstDayOfWeek('', 'en-GB')).toBe('mon');
    expect(resolveFirstDayOfWeek('7', 'fa-IR')).toBe('sat');
    expect(resolveFirstDayOfWeek('monday', 'en-US')).toBe('sun');
  });

  it('header names and grid columns agree', () => {
    for (const [locale, firstDayOfWeek] of [['en-US', 'mon'], ['fa-IR', 'mon'], ['en-GB', 'sun'], ['ar-EG', null]]) {
      const state = createState({ locale, firstDayOfWeek, value: '2026-10-15' });
      const names = getWeekdayNames(locale, 'long', null, state.firstDayOfWeek);
      const fmt = new Intl.DateTimeFormat(locale, { weekday: 'long' });
      const row = generateMonthGrid(state)[1].map(c => fmt.format(new Date(toISO(c.date) + 'T12:00')));
      expect(row).toEqual(names);
    }
  });

  it('selects locale weeks from the chosen first day', () => {
    const state = selectDate(createState({ type: 'week', locale: 'en-US', firstDayOfWeek: 'mon' }), d('2026-10-18'));
    expect([iso(state.rangeStart), iso(state.rangeEnd)]).toEqual(['2026-10-12', '2026-10-18']);
  });

  it('round-trips week values for every first day across a year boundary', () => {
    for (const firstDayOfWeek of ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']) {
      for (let day = d('2026-12-20'); day.compare(d('2027-01-12')) <= 0; day = day.add({ days: 1 })) {
        const picked = selectDate(createState({ type: 'week', locale: 'en-US', firstDayOfWeek }), day);
        const value = serializeValueForType(picked);
        const parsed = parseValueForType(value, 'week', getCalendar('gregory'), 'en-US', firstDayOfWeek);
        expect([firstDayOfWeek, toISO(day), iso(parsed.rangeStart)]).toEqual([firstDayOfWeek, toISO(day), iso(picked.rangeStart)]);
      }
    }
  });

  it('round-trips the 53-week year 2020 in a Persian calendar', () => {
    const persian = getCalendar('persian');
    const state = createState({ type: 'week', calendarId: 'persian', locale: 'fa-IR' });
    for (let day = toCalendar(d('2020-12-24'), persian); toISO(day) <= '2021-01-08'; day = day.add({ days: 1 })) {
      const picked = selectDate(state, day);
      const parsed = parseValueForType(serializeValueForType(picked), 'week', persian, 'fa-IR', state.firstDayOfWeek);
      expect(iso(parsed.rangeStart)).toBe(iso(picked.rangeStart));
    }
  });
});
