import { describe, it, expect } from 'vitest';
import { CalendarDate, toCalendar } from '@internationalized/date';
import {
  createState, updateState, selectDate, moveFocus,
  goToMonth, toISO, parseISOToCalendar, isDateDisabled,
  isInRange,
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
