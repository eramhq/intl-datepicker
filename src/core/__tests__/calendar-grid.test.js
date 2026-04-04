import { describe, it, expect } from 'vitest';
import { CalendarDate, toCalendar } from '@internationalized/date';
import { generateMonthGrid, getMonthCount } from '../calendar-grid.js';
import { createState } from '../state.js';
import { getCalendar } from '../locale.js';

describe('generateMonthGrid', () => {
  it('generates a 6-week grid for a typical month', () => {
    const state = createState({ calendarId: 'gregory', locale: 'en-US', value: '2024-01-15' });
    const grid = generateMonthGrid(state);
    expect(grid.length).toBeGreaterThanOrEqual(4);
    expect(grid.length).toBeLessThanOrEqual(6);
    expect(grid[0].length).toBe(7);
  });

  it('marks today correctly', () => {
    const state = createState({ calendarId: 'gregory', locale: 'en-US' });
    const grid = generateMonthGrid(state);
    const todayCells = grid.flat().filter((c) => c.isToday);
    expect(todayCells.length).toBe(1);
  });

  it('marks selected date', () => {
    const state = createState({ calendarId: 'gregory', locale: 'en-US', value: '2024-03-15' });
    const grid = generateMonthGrid(state);
    const selected = grid.flat().filter((c) => c.isSelected);
    expect(selected.length).toBe(1);
    expect(selected[0].day).toBe(15);
  });

  it('marks outside-month days', () => {
    const state = createState({ calendarId: 'gregory', locale: 'en-US', value: '2024-02-01' });
    const grid = generateMonthGrid(state);
    const outside = grid.flat().filter((c) => !c.isCurrentMonth);
    expect(outside.length).toBeGreaterThan(0);
  });

  it('handles Persian calendar (Farvardin has 31 days)', () => {
    // Farvardin 1, 1403 ≈ 2024-03-20
    const state = createState({ calendarId: 'persian', locale: 'fa-IR', value: '2024-03-20' });
    const grid = generateMonthGrid(state);
    const currentMonthDays = grid.flat().filter((c) => c.isCurrentMonth);
    expect(currentMonthDays.length).toBe(31);
  });

  it('handles Persian calendar (Esfand non-leap has 29 days)', () => {
    // Esfand 1404 ≈ Feb 2026 (1404 is not a leap year)
    const state = createState({ calendarId: 'persian', locale: 'fa-IR', value: '2026-02-20' });
    const grid = generateMonthGrid(state);
    const currentMonthDays = grid.flat().filter((c) => c.isCurrentMonth);
    expect(currentMonthDays.length).toBe(29);
  });

  it('handles Islamic calendar months (29 or 30 days)', () => {
    const state = createState({ calendarId: 'islamic-umalqura', locale: 'ar-SA', value: '2024-03-15' });
    const grid = generateMonthGrid(state);
    const currentMonthDays = grid.flat().filter((c) => c.isCurrentMonth);
    expect(currentMonthDays.length).toBeGreaterThanOrEqual(29);
    expect(currentMonthDays.length).toBeLessThanOrEqual(30);
  });

  it('respects min/max constraints', () => {
    const state = createState({
      calendarId: 'gregory',
      locale: 'en-US',
      value: '2024-03-15',
      min: '2024-03-10',
      max: '2024-03-20',
    });
    const grid = generateMonthGrid(state);
    const disabled = grid.flat().filter((c) => c.disabled && c.isCurrentMonth);
    // Days 1-9 and 21-31 should be disabled
    expect(disabled.length).toBeGreaterThan(0);
  });
});

describe('getMonthCount', () => {
  it('returns 12 for Gregorian', () => {
    const cal = getCalendar('gregory');
    expect(getMonthCount(cal, 2024)).toBe(12);
  });

  it('returns 12 for Persian', () => {
    const cal = getCalendar('persian');
    expect(getMonthCount(cal, 1403)).toBe(12);
  });

  it('returns 13 for Hebrew leap year', () => {
    const cal = getCalendar('hebrew');
    // 5784 is a Hebrew leap year (13 months)
    expect(getMonthCount(cal, 5784)).toBe(13);
  });

  it('returns 12 for Hebrew non-leap year', () => {
    const cal = getCalendar('hebrew');
    // 5785 is not a leap year
    expect(getMonthCount(cal, 5785)).toBe(12);
  });
});
