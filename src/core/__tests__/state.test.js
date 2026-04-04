import { describe, it, expect } from 'vitest';
import { CalendarDate, toCalendar } from '@internationalized/date';
import {
  createState, updateState, selectDate, moveFocus,
  goToMonth, toISO, parseISOToCalendar, isDateDisabled,
  isInRange, getDayOfWeek, getWeekendDays,
} from '../state.js';
import { getCalendar } from '../locale.js';

describe('createState', () => {
  it('creates default state', () => {
    const state = createState();
    expect(state.calendarId).toBe('gregory');
    expect(state.type).toBe('date');
    expect(state.selectedDate).toBeNull();
    expect(state.isOpen).toBe(false);
  });

  it('parses initial value', () => {
    const state = createState({ value: '2024-06-15' });
    expect(state.selectedDate).not.toBeNull();
    expect(state.selectedDate.day).toBe(15);
  });

  it('parses range value', () => {
    const state = createState({ type: 'range', value: '2024-06-10/2024-06-20' });
    expect(state.rangeStart).not.toBeNull();
    expect(state.rangeEnd).not.toBeNull();
  });

  it('creates Persian calendar state', () => {
    const state = createState({ calendarId: 'persian', locale: 'fa-IR', value: '2024-03-20' });
    expect(state.calendarId).toBe('persian');
    expect(state.selectedDate.calendar.identifier).toBe('persian');
  });
});

describe('selectDate', () => {
  it('selects a single date', () => {
    const state = createState({ calendarId: 'gregory', value: '2024-01-01' });
    const date = new CalendarDate(2024, 3, 15);
    const newState = selectDate(state, date);
    expect(newState.selectedDate.day).toBe(15);
    expect(newState.selectedDate.month).toBe(3);
  });

  it('does not select disabled dates', () => {
    const state = createState({ calendarId: 'gregory', min: '2024-03-10' });
    const date = new CalendarDate(2024, 3, 5);
    const newState = selectDate(state, date);
    expect(newState.selectedDate).toBeNull();
  });

  it('handles range selection start', () => {
    const state = createState({ type: 'range' });
    const date = new CalendarDate(2024, 3, 10);
    const newState = selectDate(state, date);
    expect(newState.rangeStart).not.toBeNull();
    expect(newState.rangeEnd).toBeNull();
  });

  it('handles range selection end', () => {
    const state = createState({ type: 'range' });
    const start = new CalendarDate(2024, 3, 10);
    let s = selectDate(state, start);
    const end = new CalendarDate(2024, 3, 20);
    s = selectDate(s, end);
    expect(s.rangeStart.day).toBe(10);
    expect(s.rangeEnd.day).toBe(20);
  });

  it('orders range correctly when end < start', () => {
    const state = createState({ type: 'range' });
    const first = new CalendarDate(2024, 3, 20);
    let s = selectDate(state, first);
    const second = new CalendarDate(2024, 3, 10);
    s = selectDate(s, second);
    expect(s.rangeStart.day).toBe(10);
    expect(s.rangeEnd.day).toBe(20);
  });

  it('rejects disabled dates via selectDate (Bug 7)', () => {
    const state = createState({ min: '2024-03-10', max: '2024-03-20' });
    const disabled = new CalendarDate(2024, 3, 5);
    const result = selectDate(state, disabled);
    expect(result.selectedDate).toBeNull();
  });
});

describe('moveFocus', () => {
  it('moves forward by days', () => {
    const state = createState({ value: '2024-03-15' });
    const newState = moveFocus(state, { days: 1 });
    expect(newState.focusedDate.day).toBe(16);
  });

  it('moves backward by weeks', () => {
    const state = createState({ value: '2024-03-15' });
    const newState = moveFocus(state, { days: -7 });
    expect(newState.focusedDate.day).toBe(8);
  });

  it('crosses month boundaries', () => {
    const state = createState({ value: '2024-03-31' });
    const newState = moveFocus(state, { days: 1 });
    expect(newState.focusedDate.month).toBe(4);
    expect(newState.focusedDate.day).toBe(1);
    expect(newState.viewMonth).toBe(4);
  });
});

describe('toISO', () => {
  it('converts Gregorian to ISO', () => {
    const date = new CalendarDate(2024, 6, 15);
    expect(toISO(date)).toBe('2024-06-15');
  });

  it('converts Persian to ISO', () => {
    const cal = getCalendar('persian');
    const date = new CalendarDate(cal, 1403, 1, 1);
    const iso = toISO(date);
    expect(iso).toBe('2024-03-20');
  });

  it('returns empty string for null', () => {
    expect(toISO(null)).toBe('');
  });
});

describe('parseISOToCalendar', () => {
  it('parses ISO to Gregorian', () => {
    const cal = getCalendar('gregory');
    const date = parseISOToCalendar('2024-06-15', cal);
    expect(date.year).toBe(2024);
    expect(date.month).toBe(6);
    expect(date.day).toBe(15);
  });

  it('parses ISO to Persian', () => {
    const cal = getCalendar('persian');
    const date = parseISOToCalendar('2024-03-20', cal);
    expect(date.year).toBe(1403);
    expect(date.month).toBe(1);
    expect(date.day).toBe(1);
  });

  it('returns null for invalid input', () => {
    const cal = getCalendar('gregory');
    expect(parseISOToCalendar('invalid', cal)).toBeNull();
    expect(parseISOToCalendar('', cal)).toBeNull();
    expect(parseISOToCalendar(null, cal)).toBeNull();
  });

  it('returns null for out-of-range month/day (Bug 1)', () => {
    const cal = getCalendar('gregory');
    expect(parseISOToCalendar('2024-13-40', cal)).toBeNull();
    expect(parseISOToCalendar('0000-00-00', cal)).toBeNull();
  });

  it('returns null for impossible dates like Feb 30 (Bug 1)', () => {
    const cal = getCalendar('gregory');
    expect(parseISOToCalendar('2024-02-30', cal)).toBeNull();
  });
});

describe('isDateDisabled', () => {
  it('disables dates before min', () => {
    const state = createState({ min: '2024-03-10' });
    const date = new CalendarDate(2024, 3, 5);
    expect(isDateDisabled(state, date)).toBe(true);
  });

  it('disables dates after max', () => {
    const state = createState({ max: '2024-03-20' });
    const date = new CalendarDate(2024, 3, 25);
    expect(isDateDisabled(state, date)).toBe(true);
  });

  it('allows dates within range', () => {
    const state = createState({ min: '2024-03-10', max: '2024-03-20' });
    const date = new CalendarDate(2024, 3, 15);
    expect(isDateDisabled(state, date)).toBe(false);
  });

  it('disables dates above max when min is also set (Bug 4)', () => {
    const state = createState({ min: '2024-03-10', max: '2024-03-20' });
    const date = new CalendarDate(2024, 3, 25);
    expect(isDateDisabled(state, date)).toBe(true);
  });

  it('disables dates below min when max is also set (Bug 4)', () => {
    const state = createState({ min: '2024-03-10', max: '2024-03-20' });
    const date = new CalendarDate(2024, 3, 5);
    expect(isDateDisabled(state, date)).toBe(true);
  });
});

describe('isInRange', () => {
  it('returns false for non-range type', () => {
    const state = createState({ value: '2024-03-15' });
    const date = new CalendarDate(2024, 3, 15);
    expect(isInRange(state, date)).toBe(false);
  });

  it('returns true for dates in range', () => {
    let state = createState({ type: 'range' });
    state = selectDate(state, new CalendarDate(2024, 3, 10));
    state = selectDate(state, new CalendarDate(2024, 3, 20));
    const date = new CalendarDate(2024, 3, 15);
    expect(isInRange(state, date)).toBe(true);
  });

  it('returns false for dates outside range', () => {
    let state = createState({ type: 'range' });
    state = selectDate(state, new CalendarDate(2024, 3, 10));
    state = selectDate(state, new CalendarDate(2024, 3, 20));
    const date = new CalendarDate(2024, 3, 25);
    expect(isInRange(state, date)).toBe(false);
  });
});

describe('disabled dates (Phase 1)', () => {
  it('static list disables correct dates', () => {
    const state = createState({
      disabledDates: ['2024-12-25', '2024-12-31'],
    });
    expect(isDateDisabled(state, new CalendarDate(2024, 12, 25))).toBe(true);
    expect(isDateDisabled(state, new CalendarDate(2024, 12, 31))).toBe(true);
    expect(isDateDisabled(state, new CalendarDate(2024, 12, 24))).toBe(false);
  });

  it('callback filter disables dates', () => {
    const state = createState({
      disabledDatesFilter: ({ dayOfWeek }) => dayOfWeek === 0 || dayOfWeek === 6,
    });
    // 2024-03-16 is Saturday (6), 2024-03-17 is Sunday (0)
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 16))).toBe(true);
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 17))).toBe(true);
    // 2024-03-15 is Friday
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 15))).toBe(false);
  });

  it('disabled dates cannot be selected via selectDate', () => {
    const state = createState({
      disabledDates: ['2024-03-15'],
    });
    const result = selectDate(state, new CalendarDate(2024, 3, 15));
    expect(result.selectedDate).toBeNull();
  });

  it('disable-weekends works with en-US locale', () => {
    const state = createState({
      locale: 'en-US',
      disableWeekends: true,
    });
    // Saturday 2024-03-16, Sunday 2024-03-17
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 16))).toBe(true);
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 17))).toBe(true);
    // Monday 2024-03-18
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 18))).toBe(false);
  });

  it('disable-weekends works with fa-IR locale (Friday)', () => {
    const state = createState({
      locale: 'fa-IR',
      calendarId: 'persian',
      disableWeekends: true,
    });
    // 2024-03-22 is Friday (dayOfWeek=5) — always a weekend in Iran
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 22))).toBe(true);
    // 2024-03-20 is Wednesday — weekday
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 20))).toBe(false);
    // 2024-03-18 is Monday — weekday
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 18))).toBe(false);
  });

  it('disabled dates + min/max compound (AND logic)', () => {
    const state = createState({
      min: '2024-03-01',
      max: '2024-03-31',
      disabledDates: ['2024-03-15'],
    });
    // Out of range
    expect(isDateDisabled(state, new CalendarDate(2024, 2, 28))).toBe(true);
    // In range but in disabled list
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 15))).toBe(true);
    // In range and not in disabled list
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 14))).toBe(false);
  });

  it('callback + static list both apply', () => {
    const state = createState({
      disabledDates: ['2024-03-15'],
      disabledDatesFilter: ({ day }) => day === 20,
    });
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 15))).toBe(true);
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 20))).toBe(true);
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 14))).toBe(false);
  });

  it('range can span disabled dates', () => {
    const state = createState({
      type: 'range',
      disabledDates: ['2024-03-15'],
    });
    let s = selectDate(state, new CalendarDate(2024, 3, 10));
    s = selectDate(s, new CalendarDate(2024, 3, 20));
    expect(s.rangeStart.day).toBe(10);
    expect(s.rangeEnd.day).toBe(20);
    // The disabled date in the middle is still in the range
    expect(isInRange(s, new CalendarDate(2024, 3, 15))).toBe(true);
  });

  it('getDayOfWeek returns correct values', () => {
    // 2024-03-18 is Monday
    expect(getDayOfWeek(new CalendarDate(2024, 3, 18))).toBe(1);
    // 2024-03-16 is Saturday
    expect(getDayOfWeek(new CalendarDate(2024, 3, 16))).toBe(6);
    // 2024-03-17 is Sunday
    expect(getDayOfWeek(new CalendarDate(2024, 3, 17))).toBe(0);
  });

  it('filter errors do not crash', () => {
    const state = createState({
      disabledDatesFilter: () => { throw new Error('boom'); },
    });
    expect(isDateDisabled(state, new CalendarDate(2024, 3, 15))).toBe(false);
  });
});

describe('multiple date selection (Phase 2)', () => {
  it('creates state with selectedDates array for type=multiple', () => {
    const state = createState({ type: 'multiple' });
    expect(state.selectedDates).toEqual([]);
  });

  it('toggles date selection on/off', () => {
    const state = createState({ type: 'multiple' });
    const date = new CalendarDate(2024, 3, 15);
    let s = selectDate(state, date);
    expect(s.selectedDates.length).toBe(1);
    // Toggle off
    s = selectDate(s, date);
    expect(s.selectedDates.length).toBe(0);
  });

  it('selects multiple dates', () => {
    const state = createState({ type: 'multiple' });
    let s = selectDate(state, new CalendarDate(2024, 3, 15));
    s = selectDate(s, new CalendarDate(2024, 3, 20));
    s = selectDate(s, new CalendarDate(2024, 3, 25));
    expect(s.selectedDates.length).toBe(3);
  });

  it('respects maxDates limit', () => {
    const state = createState({ type: 'multiple' });
    state.maxDates = 2;
    let s = selectDate(state, new CalendarDate(2024, 3, 15));
    s = selectDate(s, new CalendarDate(2024, 3, 20));
    s = selectDate(s, new CalendarDate(2024, 3, 25));
    expect(s.selectedDates.length).toBe(2);
  });

  it('parses comma-separated value for multiple type', () => {
    const state = createState({
      type: 'multiple',
      value: '2024-03-15,2024-03-20,2024-03-25',
    });
    expect(state.selectedDates.length).toBe(3);
  });

  it('does not select disabled dates in multiple mode', () => {
    const state = createState({
      type: 'multiple',
      disabledDates: ['2024-03-15'],
    });
    const result = selectDate(state, new CalendarDate(2024, 3, 15));
    expect(result.selectedDates.length).toBe(0);
  });
});

describe('month/year picker (Phase 3)', () => {
  it('month type creates state with type=month', () => {
    const state = createState({ type: 'month' });
    expect(state.type).toBe('month');
  });

  it('year type creates state with type=year', () => {
    const state = createState({ type: 'year' });
    expect(state.type).toBe('year');
  });
});

describe('resolveRelativeDate (Phase 6)', () => {
  // These tests use the resolver from common.js
  const { resolveRelativeDate } = require('../../utils/common.js');

  it('resolves "today"', () => {
    const cal = getCalendar('gregory');
    const result = resolveRelativeDate('today', cal, null, null);
    expect(result).not.toBeNull();
    // Should be today's date — just verify it's a valid CalendarDate
    expect(result.year).toBeGreaterThan(2020);
  });

  it('resolves relative days "-6d"', () => {
    const cal = getCalendar('gregory');
    const result = resolveRelativeDate('-6d', cal, null, null);
    expect(result).not.toBeNull();
  });

  it('resolves "monthStart"', () => {
    const cal = getCalendar('gregory');
    const result = resolveRelativeDate('monthStart', cal, null, null);
    expect(result.day).toBe(1);
  });

  it('resolves absolute ISO date', () => {
    const cal = getCalendar('gregory');
    const result = resolveRelativeDate('2024-06-15', cal, null, null);
    expect(result.year).toBe(2024);
    expect(result.month).toBe(6);
    expect(result.day).toBe(15);
  });

  it('clamps to min/max', () => {
    const cal = getCalendar('gregory');
    const min = new CalendarDate(2024, 6, 10);
    const result = resolveRelativeDate('2024-06-01', cal, min, null);
    // Should be clamped to min
    expect(result.compare(min)).toBeGreaterThanOrEqual(0);
  });

  it('returns null for invalid expression', () => {
    const cal = getCalendar('gregory');
    const result = resolveRelativeDate('invalid', cal, null, null);
    expect(result).toBeNull();
  });
});
