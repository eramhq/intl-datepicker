// Regression tests for the v0.3.0 bug-fix and accessibility pass. One
// describe block per fixed issue.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { LABELS_FA } from './labels/fa.js';

beforeAll(async () => {
  await import('./intl-datepicker.js');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function makePicker(attrs = {}, parent = document.body) {
  const el = document.createElement('intl-datepicker');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v === true ? '' : v);
  }
  parent.appendChild(el);
  return el;
}

const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const $$ = (el, sel) => Array.from(el.shadowRoot.querySelectorAll(sel));
const dayBtn = (el, month, day) => $(el, `.idp-day[data-month="${month}"][data-day="${day}"]`);
const isPanelOpen = (el) => !$(el, '.idp-calendar').hidden;

function recordEvents(el, name = 'intl-change') {
  const events = [];
  el.addEventListener(name, (e) => events.push(e.detail));
  return events;
}

describe('disabled day clicks', () => {
  it('ignores clicks on days disabled by disabled-dates', () => {
    const el = makePicker({ value: '2024-06-15', 'disabled-dates': '["2024-06-12"]', 'no-animation': true });
    el.open();
    const events = recordEvents(el, 'intl-select');
    dayBtn(el, 6, 12).click();
    expect(events).toHaveLength(0);
    expect(el.value).toBe('2024-06-15');
    expect(isPanelOpen(el)).toBe(true);
  });

  it('ignores clicks and Enter on days force-disabled by mapDays', () => {
    const el = makePicker({ value: '2024-06-15', inline: true });
    el.mapDays = ({ date }) => (date.day === 13 ? { disabled: true } : null);
    const events = recordEvents(el, 'intl-select');
    const btn = dayBtn(el, 6, 13);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    btn.click();
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    expect(events).toHaveLength(0);
    expect(el.value).toBe('2024-06-15');
  });
});

describe('attribute changes after mount', () => {
  it('placeholder updates the inner input (React sets attributes after mount)', () => {
    const el = makePicker();
    el.setAttribute('placeholder', 'Pick a date');
    expect($(el, '.idp-input').placeholder).toBe('Pick a date');
  });

  it('show-alternate toggles the Gregorian line', () => {
    const el = makePicker({ calendar: 'persian', value: '2024-06-15', inline: true });
    expect($(el, '.idp-alternate')).toBeNull();
    el.setAttribute('show-alternate', '');
    expect($(el, '.idp-alternate')).not.toBeNull();
  });

  it('required updates validity', () => {
    const el = makePicker();
    const spy = vi.spyOn(el._internals, 'setValidity');
    el.setAttribute('required', '');
    expect(spy).toHaveBeenCalledWith({ valueMissing: true }, expect.any(String), expect.anything());
  });

  it('inline toggles the panel open and closed', () => {
    const el = makePicker();
    expect(isPanelOpen(el)).toBe(false);
    el.setAttribute('inline', '');
    expect(isPanelOpen(el)).toBe(true);
    el.removeAttribute('inline');
    expect(isPanelOpen(el)).toBe(false);
    el.setAttribute('no-animation', '');
    el.open();
    expect(isPanelOpen(el)).toBe(true);
  });

  it('locale change keeps a value set from JS', () => {
    const el = makePicker();
    el.value = '2024-06-15';
    el.setAttribute('locale', 'de-DE');
    expect(el.value).toBe('2024-06-15');
  });
});

describe('reconnect (moving the element)', () => {
  it('keeps a JS-set value and does not duplicate listeners', () => {
    const el = makePicker({ value: '2024-01-01', 'no-animation': true });
    el.value = '2024-06-15';
    const other = document.createElement('div');
    document.body.appendChild(other);
    other.appendChild(el);
    expect(el.value).toBe('2024-06-15');

    // One click must open (duplicate listeners used to open and close at once)
    $(el, '.idp-input').click();
    expect(isPanelOpen(el)).toBe(true);
  });
});

describe('presets set from JS', () => {
  it('survive month navigation', () => {
    const el = makePicker({ type: 'range', inline: true });
    el.presets = [{ label: 'Last 7 days', value: '-7d/today' }];
    expect($(el, '.idp-presets')).not.toBeNull();
    $(el, '[data-action="next-month"]').click();
    expect($(el, '.idp-presets')).not.toBeNull();
  });

  it('accept a JSON string through the property (React 19 / Vue)', () => {
    const el = makePicker({ type: 'range', inline: true });
    el.presets = '[{"label":"Today","value":"today/today"}]';
    expect($(el, '.idp-preset-btn').textContent).toBe('Today');
  });
});

describe('type="multiple"', () => {
  it('keeps a single date as a one-item list', () => {
    const el = makePicker({ type: 'multiple', value: '2024-06-15' });
    expect(el.selectedDates).toHaveLength(1);
    expect(el.value).toBe('2024-06-15');
    expect(el.getValue().dates).toEqual([{ year: 2024, month: 6, day: 15 }]);
  });

  it('setValue honours max-dates (first N given) then sort-dates', () => {
    const el = makePicker({ type: 'multiple', 'max-dates': '2', 'sort-dates': true });
    el.setValue('2024-06-20,2024-06-10,2024-06-15');
    expect(el.value).toBe('2024-06-10,2024-06-20');
  });
});

describe('month/year values (Temporal format)', () => {
  it('Gregorian month stays YYYY-MM with ISO bounds', () => {
    const el = makePicker({ type: 'month', value: '2024-07' });
    expect(el.value).toBe('2024-07');
    const d = el.getValue();
    expect(d.calendar).toEqual({ year: 2024, month: 7 });
    expect(d.start).toBe('2024-07-01');
    expect(d.end).toBe('2024-07-31');
  });

  it('Persian month uses an annotated ISO date that round-trips through Temporal', () => {
    const el = makePicker({ type: 'month', calendar: 'persian', value: '2024-07-22[u-ca=persian]' });
    expect(el.value).toBe('2024-07-22[u-ca=persian]');
    const d = el.getValue();
    expect(d.calendar).toEqual({ year: 1403, month: 5 });
    expect(d.start).toBe('2024-07-22');
    expect(d.end).toBe('2024-08-21');

    const ym = Temporal.PlainYearMonth.from(el.value);
    expect([ym.year, ym.month, ym.calendarId]).toEqual([1403, 5, 'persian']);
    expect(ym.toString()).toBe(el.value);
  });

  it('snaps any plain ISO date to the month containing it', () => {
    const el = makePicker({ type: 'month', calendar: 'persian' });
    el.setValue('2024-08-10');
    expect(el.value).toBe('2024-07-22[u-ca=persian]');
  });

  it('rejects the ambiguous short form for non-Gregorian calendars', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = makePicker({ type: 'month', calendar: 'persian', value: '1403-05' });
    expect(el.value).toBe('');
    expect(console.warn).toHaveBeenCalled();
  });

  it('selecting a Persian month from the grid round-trips', () => {
    const el = makePicker({ type: 'month', calendar: 'persian', value: '2024-07-22[u-ca=persian]', inline: true });
    const events = recordEvents(el);
    $(el, '.idp-month-cell[data-month="6"]').click();
    expect(events[0].value).toBe('2024-08-22[u-ca=persian]');
    expect(events[0].calendar).toEqual({ year: 1403, month: 6 });
    const reparsed = makePicker({ type: 'month', calendar: 'persian', value: events[0].value });
    expect(reparsed.getValue().calendar).toEqual({ year: 1403, month: 6 });
  });

  it('uses the Intl/Temporal id for the Islamic calendar', () => {
    const el = makePicker({ type: 'month', calendar: 'islamic', value: '2024-07-15' });
    expect(el.value).toMatch(/\[u-ca=islamic-umalqura\]$/);
    expect(Temporal.PlainYearMonth.from(el.value).calendarId).toBe('islamic-umalqura');
  });

  it('Persian year uses the first day of the year', () => {
    const el = makePicker({ type: 'year', calendar: 'persian', value: '2024-06-01' });
    expect(el.value).toBe('2024-03-20[u-ca=persian]');
    const d = el.getValue();
    expect(d.calendar).toEqual({ year: 1403 });
    expect(d.start).toBe('2024-03-20');
    expect(d.end).toBe('2025-03-20');
  });

  it('Gregorian year stays YYYY', () => {
    const el = makePicker({ type: 'year', value: '2024' });
    expect(el.value).toBe('2024');
    expect(el.getValue().end).toBe('2024-12-31');
  });

  it('min/max accept the annotated format for month pickers', () => {
    const el = makePicker({
      type: 'month', calendar: 'persian', inline: true,
      value: '2024-07-22[u-ca=persian]', min: '2024-06-21[u-ca=persian]',
    });
    expect($(el, '.idp-month-cell[data-month="3"]').getAttribute('aria-disabled')).toBe('true');
    expect($(el, '.idp-month-cell[data-month="4"]').hasAttribute('aria-disabled')).toBe(false);
  });

  it('keeps the selection when the calendar changes', () => {
    const el = makePicker({ type: 'month', value: '2024-07' });
    el.setAttribute('calendar', 'persian');
    expect(el.value).toBe('2024-06-21[u-ca=persian]'); // Tir 1403 contains July 1
    el.setAttribute('calendar', 'gregory');
    expect(el.value).toBe('2024-06');
  });

  it('valueAsDate is the first day of the period', () => {
    const el = makePicker({ type: 'month', calendar: 'persian', value: '2024-07-22[u-ca=persian]' });
    const d = el.valueAsDate;
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2024, 7, 22]);
  });
});

describe('week values', () => {
  it('round-trip in Sunday- and Saturday-start locales', () => {
    for (const locale of ['en-US', 'fa-IR', 'en-GB']) {
      const el = makePicker({ type: 'week', locale, inline: true, value: '2024-07-24' });
      const { start, end } = el.getValue();
      const value = el.value;
      expect(value, locale).toBe('2024-W30');
      el.setAttribute('min', '2024-01-01'); // re-parses the current value
      expect(el.value, locale).toBe(value);
      expect(el.getValue().start, locale).toEqual(start);
      expect(el.getValue().end, locale).toEqual(end);
    }
  });
});

describe('external input (for)', () => {
  it('shows the month of a pre-filled value', () => {
    document.body.innerHTML = '<input id="ext" value="2024-03-05">';
    const el = makePicker({ for: 'ext', inline: true, locale: 'en-CA' });
    expect(el.value).toBe('2024-03-05');
    expect($(el, '#idp-title-0').textContent).toBe('March 2024');
  });
});

describe('switching to inline after opening', () => {
  it('clears the popup position styles', () => {
    const el = makePicker({ 'no-animation': true });
    el.open();
    el.setAttribute('inline', '');
    expect($(el, '.idp-calendar').style.position).toBe('');
  });
});

describe('localized min/max validation messages', () => {
  it('uses the dateTooEarly label with the formatted date', () => {
    const el = makePicker({ locale: 'fa-IR', calendar: 'persian', min: '2024-06-10' });
    const spy = vi.spyOn(el._internals, 'setValidity');
    el._state = { ...el._state, selectedDate: el._state.min.subtract({ days: 3 }) };
    el._updateFormValue();
    const [flags, message] = spy.mock.calls.at(-1);
    expect(flags).toEqual({ rangeUnderflow: true });
    expect(message).toBe(LABELS_FA.dateTooEarly.replace('{date}', '۱۴۰۳/۰۳/۲۱'));
  });
});

describe('mapDays output is escaped', () => {
  it('cannot break out of the style or class attribute', () => {
    const el = makePicker({ value: '2024-06-15', inline: true });
    el.mapDays = ({ date }) => (date.day === 15
      ? { style: 'color:red" onclick="alert(1)', className: 'x" onfocus="alert(1)' }
      : null);
    const btn = dayBtn(el, 6, 15);
    expect(btn.hasAttribute('onclick')).toBe(false);
    expect(btn.hasAttribute('onfocus')).toBe(false);
    expect(btn.getAttribute('style')).toBe('color:red" onclick="alert(1)');
  });
});

describe('formDisabledCallback (<fieldset disabled>)', () => {
  it('disables the input and blocks opening', () => {
    const el = makePicker({ 'no-animation': true });
    el.formDisabledCallback(true);
    expect($(el, '.idp-input').disabled).toBe(true);
    el.open();
    expect(isPanelOpen(el)).toBe(false);
    el.formDisabledCallback(false);
    el.open();
    expect(isPanelOpen(el)).toBe(true);
  });
});

describe('grid accessibility structure', () => {
  it('renders a table grid labelled by the month heading', () => {
    const el = makePicker({ value: '2024-06-15', inline: true });
    const grid = $(el, 'table[role="grid"]');
    const heading = el.shadowRoot.getElementById(grid.getAttribute('aria-labelledby'));
    expect(heading.textContent.trim()).toBe('June 2024');
    const headers = $$(el, 'thead th[scope="col"]');
    expect(headers).toHaveLength(7);
    expect(headers.every(th => th.getAttribute('abbr').length > 1)).toBe(true);
    expect($$(el, 'tbody tr').length).toBeGreaterThanOrEqual(4);
    expect(el.shadowRoot.innerHTML).not.toContain('display:contents');
  });

  it('labels each panel of a multi-month view', () => {
    const el = makePicker({ value: '2024-06-15', inline: true, months: '2' });
    const grids = $$(el, 'table[role="grid"]');
    const names = grids.map(g => el.shadowRoot.getElementById(g.getAttribute('aria-labelledby')).textContent);
    expect(names).toEqual(['June 2024', 'July 2024']);
  });

  it('marks today with aria-current and adds state to labels', () => {
    const el = makePicker({ type: 'range', value: '2024-06-10/2024-06-12', inline: true });
    expect($$(el, '.idp-day[aria-current="date"]').length).toBeLessThanOrEqual(1);
    expect(dayBtn(el, 6, 10).getAttribute('aria-label')).toMatch(/, range start$/);
    expect(dayBtn(el, 6, 11).getAttribute('aria-label')).toMatch(/, selected$/);
    expect(dayBtn(el, 6, 12).getAttribute('aria-label')).toMatch(/, range end$/);
    expect(dayBtn(el, 6, 11).parentElement.getAttribute('aria-selected')).toBe('true');
    expect(dayBtn(el, 6, 13).parentElement.getAttribute('aria-selected')).toBe('false');
  });

  it('keeps one persistent live region and announces month changes', () => {
    const el = makePicker({ value: '2024-06-15', inline: true });
    const live = $(el, '[aria-live]');
    expect(live.textContent).toBe('');
    $(el, '[data-action="next-month"]').click();
    expect($(el, '[aria-live]')).toBe(live);
    expect(live.textContent).toBe('July 2024');
    expect($$(el, '[aria-live]')).toHaveLength(1);
  });

  it('announces a completed range', () => {
    const el = makePicker({ type: 'range', value: '2024-06-15', inline: true });
    dayBtn(el, 6, 18).click();
    expect($(el, '[aria-live]').textContent).toBe('Saturday, June 15, 2024 to Tuesday, June 18, 2024');
  });

  it('aria-disables prev/next at min/max instead of removing them', () => {
    const el = makePicker({ value: '2024-06-15', inline: true, min: '2024-06-01', max: '2024-07-31' });
    const prev = $(el, '[data-action="prev-month"]');
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    prev.click();
    expect($(el, '#idp-title-0').textContent).toBe('June 2024');
    $(el, '[data-action="next-month"]').click();
    expect($(el, '[data-action="next-month"]').getAttribute('aria-disabled')).toBe('true');
  });

  it('ArrowDown on the input opens the calendar', () => {
    const el = makePicker({ 'no-animation': true });
    $(el, '.idp-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    expect(isPanelOpen(el)).toBe(true);
    expect($(el, '.idp-input').getAttribute('aria-expanded')).toBe('true');
  });

  it('mirrors the host aria-label onto the inner input', () => {
    const el = makePicker({ 'aria-label': 'Birth date' });
    expect($(el, '.idp-input').getAttribute('aria-label')).toBe('Birth date');
  });
});

describe('typed input (allow-input)', () => {
  const type = (el, text, key) => {
    const input = $(el, '.idp-input');
    input.value = text;
    if (key) input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
    else input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
  };

  it('shows a format hint linked by aria-describedby and uses a numeric keypad', () => {
    const el = makePicker({ 'allow-input': true, locale: 'en-US' });
    const input = $(el, '.idp-input');
    expect($(el, '#idp-hint').textContent).toBe('Format: MM/DD/YYYY');
    expect(input.getAttribute('aria-describedby')).toBe('idp-hint');
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });

  it('keeps a persistent error until a valid date is entered', () => {
    vi.useFakeTimers();
    const el = makePicker({ 'allow-input': true, locale: 'en-US' });
    type(el, 'nonsense');
    vi.advanceTimersByTime(5000);
    const input = $(el, '.idp-input');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.value).toBe('nonsense');
    expect($(el, '#idp-error').hidden).toBe(false);
    expect(input.getAttribute('aria-describedby')).toBe('idp-hint idp-error');

    type(el, '06/17/2024', 'Enter');
    expect(el.value).toBe('2024-06-17');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect($(el, '#idp-error').hidden).toBe(true);
    vi.useRealTimers();
  });

  it('flags typed input as badInput for form validation', () => {
    const el = makePicker({ 'allow-input': true });
    const spy = vi.spyOn(el._internals, 'setValidity');
    type(el, '99/99/9999');
    expect(spy.mock.calls.at(-1)[0]).toEqual({ badInput: true });
  });

  it('accepts compact digits without separators', () => {
    const el = makePicker({ 'allow-input': true, locale: 'en-US' });
    type(el, '06172024', 'Enter');
    expect(el.value).toBe('2024-06-17');
  });

  it('clearing the text clears the value', () => {
    const el = makePicker({ 'allow-input': true, value: '2024-06-17' });
    type(el, '');
    expect(el.value).toBe('');
  });
});

describe('range hover preview', () => {
  it('updates classes in place without re-rendering (keeps focus)', () => {
    const el = makePicker({ type: 'range', value: '2024-06-10', inline: true });
    const target = dayBtn(el, 6, 12);
    const focused = dayBtn(el, 6, 10);
    focused.focus();
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
    expect(dayBtn(el, 6, 12)).toBe(target);
    expect(target.classList.contains('range-end')).toBe(true);
    expect(dayBtn(el, 6, 11).classList.contains('in-range')).toBe(true);
    expect(el.shadowRoot.activeElement).toBe(focused);
  });
});

describe('value property before connection (React 19 assigns properties)', () => {
  it('applies a value set before the element is connected', () => {
    const el = document.createElement('intl-datepicker');
    el.type = 'range';
    el.value = '2024-06-10/2024-06-12';
    expect(el.getAttribute('type')).toBe('range');
    document.body.appendChild(el);
    expect(el.value).toBe('2024-06-10/2024-06-12');
  });

  it('does not emit intl-change when the same value is set again', () => {
    const el = makePicker({ value: '2024-06-10' });
    const events = recordEvents(el);
    el.value = '2024-06-10';
    expect(events).toHaveLength(0);
    el.value = '2024-06-11';
    expect(events).toHaveLength(1);
  });
});
