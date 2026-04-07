// jsdom's `formAssociated` plumbing isn't fully wired, so these tests verify
// the value contract that drives form submission rather than asserting on
// FormData directly.
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('./intl-datepicker.js');
});

function makePicker(attrs = {}) {
  const el = document.createElement('intl-datepicker');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

describe('value getter', () => {
  it('returns ISO format for date type with initial value', () => {
    const el = makePicker({ name: 'dob', value: '2024-06-15' });
    expect(el.value).toBe('2024-06-15');
    el.remove();
  });

  it('returns range format for range type', () => {
    const el = makePicker({ type: 'range', value: '2024-06-10/2024-06-20' });
    expect(el.value).toBe('2024-06-10/2024-06-20');
    el.remove();
  });

  it('returns YYYY-MM for month type', () => {
    const el = makePicker({ type: 'month', value: '2024-06' });
    expect(el.value).toBe('2024-06');
    el.remove();
  });

  it('returns YYYY for year type', () => {
    const el = makePicker({ type: 'year', value: '2024' });
    expect(el.value).toBe('2024');
    el.remove();
  });

  it('returns ISO week format for week type', () => {
    const el = makePicker({ type: 'week', value: '2024-W24' });
    // Value should be parseable round-trip
    expect(el.value).toMatch(/^\d{4}-W\d{2}$/);
    el.remove();
  });

  it('returns empty string when no selection', () => {
    const el = makePicker();
    expect(el.value).toBe('');
    el.remove();
  });
});

describe('setValue / programmatic API', () => {
  it('setValue updates the value', () => {
    const el = makePicker();
    el.setValue('2024-12-25');
    expect(el.value).toBe('2024-12-25');
    el.remove();
  });

  it('setting .value updates the value', () => {
    const el = makePicker();
    el.value = '2024-12-25';
    expect(el.value).toBe('2024-12-25');
    el.remove();
  });

  it('clear() empties the value', () => {
    const el = makePicker({ value: '2024-06-15' });
    expect(el.value).toBe('2024-06-15');
    el.clear();
    expect(el.value).toBe('');
    el.remove();
  });
});

describe('formResetCallback', () => {
  it('resets to the initial value attribute', () => {
    const el = makePicker({ value: '2024-06-15' });
    el.setValue('2024-12-25');
    expect(el.value).toBe('2024-12-25');
    el.formResetCallback();
    expect(el.value).toBe('2024-06-15');
    el.remove();
  });

  it('resets to empty when no initial attribute', () => {
    const el = makePicker();
    el.setValue('2024-12-25');
    el.formResetCallback();
    expect(el.value).toBe('');
    el.remove();
  });
});

describe('valueAsDate', () => {
  it('returns a Date for single-date type', () => {
    const el = makePicker({ value: '2024-06-15' });
    const d = el.valueAsDate;
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5); // 0-based
    expect(d.getDate()).toBe(15);
    el.remove();
  });

  it('returns null for range type', () => {
    const el = makePicker({ type: 'range', value: '2024-06-10/2024-06-20' });
    expect(el.valueAsDate).toBeNull();
    el.remove();
  });

  it('returns null for empty value', () => {
    const el = makePicker();
    expect(el.valueAsDate).toBeNull();
    el.remove();
  });
});

describe('SelectDetail shape', () => {
  it('getValue() returns null when nothing selected', () => {
    const el = makePicker();
    expect(el.getValue()).toBeNull();
    el.remove();
  });

  it('getValue() returns date detail with calendar object', () => {
    const el = makePicker({ value: '2024-06-15' });
    const detail = el.getValue();
    expect(detail).not.toBeNull();
    expect(detail.type).toBe('date');
    expect(detail.value).toBe('2024-06-15');
    expect(detail.calendar).toEqual({ year: 2024, month: 6, day: 15 });
    expect(typeof detail.formatted).toBe('string');
    el.remove();
  });

  it('getValue() returns range detail with start/end', () => {
    const el = makePicker({ type: 'range', value: '2024-06-10/2024-06-20' });
    const detail = el.getValue();
    expect(detail.type).toBe('range');
    expect(detail.start).toEqual({ year: 2024, month: 6, day: 10 });
    expect(detail.end).toEqual({ year: 2024, month: 6, day: 20 });
    el.remove();
  });
});

describe('rangeStart / rangeEnd getters', () => {
  it('return ISO strings for range type', () => {
    const el = makePicker({ type: 'range', value: '2024-06-10/2024-06-20' });
    expect(el.rangeStart).toBe('2024-06-10');
    expect(el.rangeEnd).toBe('2024-06-20');
    el.remove();
  });

  it('return null when range is empty', () => {
    const el = makePicker({ type: 'range' });
    expect(el.rangeStart).toBeNull();
    expect(el.rangeEnd).toBeNull();
    el.remove();
  });
});
