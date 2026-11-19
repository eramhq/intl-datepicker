// Date + time (`time` attribute): value format, time selects, min/max,
// closing behavior, events and typed input.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { createState, parseDateTime, parseTime, resolveHourCycle, serializeValueForType, clampTime } from './core/state.js';
import { getCalendar } from './core/locale.js';
import { splitTime } from './core/date-input.js';

beforeAll(async () => {
  await import('./intl-datepicker.js');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function makePicker(attrs = {}) {
  const el = document.createElement('intl-datepicker');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v === true ? '' : v);
  document.body.appendChild(el);
  return el;
}

const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const timeSelect = (el, part) => $(el, `select[data-action="time-${part}"]`);
const optionValues = (select) => [...select.options].map(o => o.value);
const disabledValues = (select) => [...select.options].filter(o => o.disabled).map(o => o.value);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function change(select, value) {
  select.value = String(value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function clickDay(el, iso) {
  $(el, `.idp-day[data-iso="${iso}"]`).click();
}

describe('parsing and serializing', () => {
  const gregory = getCalendar('gregory');

  it('parses date-times with and without seconds', () => {
    expect(parseDateTime('2026-11-18T14:30', gregory).time).toEqual({ hour: 14, minute: 30, second: 0 });
    expect(parseDateTime('2026-11-18T14:30:05', gregory).time).toEqual({ hour: 14, minute: 30, second: 5 });
    expect(parseDateTime('2026-11-18', gregory).time).toBeNull();
  });

  it('rejects invalid times', () => {
    for (const v of ['2026-11-18T25:00', '2026-11-18T14', '2026-11-18T14:60', '2026-11-18T14:30:60', '2026-11-18 14:30', '2026-02-30T10:00']) {
      expect(parseDateTime(v, gregory)).toBeNull();
    }
  });

  it('parses default-time strings', () => {
    expect(parseTime('09:00')).toEqual({ hour: 9, minute: 0, second: 0 });
    expect(parseTime('9:05:30')).toEqual({ hour: 9, minute: 5, second: 30 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('nope')).toBeNull();
  });

  it('round-trips through the value, with and without seconds', () => {
    expect(makePicker({ time: true, value: '2026-11-18T14:30' }).value).toBe('2026-11-18T14:30');
    expect(makePicker({ time: 'second', value: '2026-11-18T14:30:05' }).value).toBe('2026-11-18T14:30:05');
  });

  it('drops seconds in minute mode', () => {
    expect(makePicker({ time: true, value: '2026-11-18T14:30:05' }).value).toBe('2026-11-18T14:30');
  });

  it('gives a date-only value the default time', () => {
    expect(makePicker({ time: true, value: '2026-11-18' }).value).toBe('2026-11-18T00:00');
    expect(makePicker({ time: true, value: '2026-11-18', 'default-time': '09:00' }).value).toBe('2026-11-18T09:00');
    expect(makePicker({ time: 'second', value: '2026-11-18', 'default-time': '09:00:15' }).value).toBe('2026-11-18T09:00:15');
  });

  it('ignores an invalid value with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = makePicker({ time: true, value: '2026-11-18T25:00' });
    expect(el.value).toBe('');
    expect(warn).toHaveBeenCalled();
    el.value = '2026-11-18T14';
    expect(el.value).toBe('');
  });

  it('keeps the date part Gregorian ISO in other calendars', () => {
    const state = createState({ calendarId: 'persian', locale: 'fa-IR', value: '2026-11-18T14:30', timeMode: 'minute' });
    expect(state.selectedDate.year).toBe(1405);
    expect(serializeValueForType(state)).toBe('2026-11-18T14:30');
  });

  it('a date-only picker still rejects a time', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(makePicker({ value: '2026-11-18T14:30' }).value).toBe('');
  });
});

describe('time attribute scope', () => {
  it('is ignored with a warning for other types', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const type of ['range', 'week', 'multiple', 'month', 'year']) {
      const el = makePicker({ type, time: true });
      expect($(el, '.idp-time')).toBeNull();
      expect(warn.mock.calls.some(([m]) => m.includes(`type="${type}"`))).toBe(true);
    }
    const range = makePicker({ type: 'range', time: true, value: '2026-11-18/2026-11-20' });
    expect(range.value).toBe('2026-11-18/2026-11-20');
  });

  it('leaves date-only pickers unchanged', () => {
    const el = makePicker({ value: '2026-11-18' });
    expect($(el, '.idp-time')).toBeNull();
    expect($(el, '[data-action="done"]')).toBeNull();
    expect($(el, '[data-action="today"]').textContent).toBe('Today');
    expect(el.getValue()).not.toHaveProperty('time');
  });

  it('turning time on and off keeps the day', () => {
    const el = makePicker({ value: '2026-11-18' });
    el.setAttribute('time', '');
    expect(el.value).toBe('2026-11-18T00:00');
    el.removeAttribute('time');
    expect(el.value).toBe('2026-11-18');
  });
});

describe('time selects', () => {
  it('renders hour and minute selects in a group, padded', () => {
    const el = makePicker({ time: true, locale: 'en-GB', value: '2026-11-18T09:05' });
    const group = $(el, '.idp-time');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Time');
    const hour = timeSelect(el, 'hour');
    expect(hour.options).toHaveLength(24);
    expect(hour.options[0].textContent).toBe('00');
    expect(hour.value).toBe('9');
    expect(timeSelect(el, 'minute').options).toHaveLength(60);
    expect(timeSelect(el, 'minute').value).toBe('5');
    expect(timeSelect(el, 'second')).toBeNull();
    expect(timeSelect(el, 'period')).toBeNull();
  });

  it('adds a seconds select for time="second"', () => {
    const el = makePicker({ time: 'second', value: '2026-11-18T09:05:07' });
    expect(timeSelect(el, 'second').value).toBe('7');
  });

  it('offers minutes on the step, plus an off-step value', () => {
    const el = makePicker({ time: true, 'minute-step': '15', value: '2026-11-18T14:07' });
    expect(optionValues(timeSelect(el, 'minute'))).toEqual(['0', '7', '15', '30', '45']);
    expect(el.value).toBe('2026-11-18T14:07');
  });

  it.each([
    ['en-US', 12], ['ar-SA', 12], ['fa-IR', 24], ['he-IL', 24], ['en-GB', 24], ['ja-JP', 24], ['th-TH', 24],
  ])('uses the locale clock for %s (%sh)', (locale, cycle) => {
    expect(resolveHourCycle(locale, null)).toBe(cycle);
    const el = makePicker({ time: true, locale });
    expect(!!timeSelect(el, 'period')).toBe(cycle === 12);
  });

  it('hour-cycle overrides the locale', () => {
    expect(resolveHourCycle('en-US', '24')).toBe(24);
    expect(resolveHourCycle('fa-IR', '12')).toBe(12);
    const el = makePicker({ time: true, locale: 'en-US', 'hour-cycle': '24', value: '2026-11-18T14:30' });
    expect(timeSelect(el, 'period')).toBeNull();
    expect(el.displayValue).toBe('11/18/2026, 14:30');
  });

  it('12-hour mode lists 12, 1–11 for the current half and switches with AM/PM', () => {
    const el = makePicker({ time: true, locale: 'en-US', value: '2026-11-18T14:30' });
    const hour = timeSelect(el, 'hour');
    expect([...hour.options].map(o => o.textContent)).toEqual(['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']);
    expect(hour.value).toBe('14');
    const period = timeSelect(el, 'period');
    expect([...period.options].map(o => o.textContent)).toEqual(['AM', 'PM']);
    expect(period.value).toBe('pm');
    change(period, 'am');
    expect(el.value).toBe('2026-11-18T02:30');
    expect(timeSelect(el, 'hour').value).toBe('2');
  });

  it('uses Intl day periods and puts them where the locale does', () => {
    const ar = makePicker({ time: true, locale: 'ar-SA', calendar: 'islamic' });
    expect([...timeSelect(ar, 'period').options].map(o => o.textContent)).toEqual(['ص', 'م']);
    const ko = makePicker({ time: true, locale: 'ko-KR' });
    const group = $(ko, '.idp-time');
    expect(group.firstElementChild.dataset.action).toBe('time-period');
    const en = makePicker({ time: true, locale: 'en-US' });
    expect($(en, '.idp-time').lastElementChild.dataset.action).toBe('time-period');
  });

  it('keeps hours and minutes in a left-to-right block with locale digits', () => {
    const el = makePicker({ time: true, locale: 'fa-IR', calendar: 'persian', value: '2026-11-18T14:30' });
    const fields = $(el, '.idp-time-fields');
    expect(fields.getAttribute('dir')).toBe('ltr');
    expect(timeSelect(el, 'hour').selectedOptions[0].textContent).toBe('۱۴');
    expect(timeSelect(el, 'minute').selectedOptions[0].textContent).toBe('۳۰');
    expect(el.displayValue).toBe('۱۴۰۵/۰۸/۲۷, ۱۴:۳۰');
  });

  it('follows the numerals attribute', () => {
    const el = makePicker({ time: true, locale: 'fa-IR', numerals: 'latn', value: '2026-11-18T14:30' });
    expect(timeSelect(el, 'hour').selectedOptions[0].textContent).toBe('14');
  });

  it('changing a select updates the value and fires events', () => {
    const el = makePicker({ time: true, value: '2026-11-18T14:30' });
    const events = [];
    el.addEventListener('intl-select', e => events.push(['select', e.detail]));
    el.addEventListener('intl-change', e => events.push(['change', e.detail]));
    change(timeSelect(el, 'minute'), 45);
    expect(el.value).toBe('2026-11-18T14:45');
    expect(events.map(([n]) => n)).toEqual(['select', 'change']);
    expect(events[1][1]).toMatchObject({
      type: 'date',
      value: '2026-11-18T14:45',
      calendar: { year: 2026, month: 11, day: 18 },
      time: { hour: 14, minute: 45, second: 0 },
    });
    expect($(el, '.idp-input').value).toBe(el.displayValue);
  });

  it('keeps a time picked before the day', () => {
    const el = makePicker({ time: true, inline: true, locale: 'en-GB' });
    const changes = vi.fn();
    el.addEventListener('intl-change', changes);
    change(timeSelect(el, 'hour'), 16);
    expect(el.value).toBe('');
    expect(changes).not.toHaveBeenCalled();
    const iso = $(el, '.idp-day:not(.outside)').dataset.iso;
    clickDay(el, iso);
    expect(el.value).toBe(`${iso}T16:00`);
  });

  it('picking a day keeps the current time', () => {
    const el = makePicker({ time: true, inline: true, value: '2026-11-18T14:30' });
    clickDay(el, '2026-11-20');
    expect(el.value).toBe('2026-11-20T14:30');
  });

  it('clearing resets to the default time', () => {
    const el = makePicker({ time: true, inline: true, 'default-time': '09:00', value: '2026-11-18T14:30' });
    el.clear();
    expect(el.value).toBe('');
    expect(timeSelect(el, 'hour').value).toBe('9');
    clickDay(el, '2026-11-20');
    expect(el.value).toBe('2026-11-20T09:00');
  });
});

describe('min and max', () => {
  it('disables options outside the bounds on the min and max day', () => {
    const el = makePicker({ time: true, locale: 'en-GB', min: '2026-11-18T09:30', max: '2026-11-20T17:00', value: '2026-11-18T10:00' });
    expect(disabledValues(timeSelect(el, 'hour'))).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8']);
    change(timeSelect(el, 'hour'), 9);
    expect(disabledValues(timeSelect(el, 'minute'))).toEqual([...Array(30).keys()].map(String));
    el.value = '2026-11-19T10:00';
    expect(disabledValues(timeSelect(el, 'hour'))).toEqual([]);
    el.value = '2026-11-20T10:00';
    expect(disabledValues(timeSelect(el, 'hour'))).toEqual(['18', '19', '20', '21', '22', '23']);
  });

  it('disables AM or PM when that half is out of bounds', () => {
    const el = makePicker({ time: true, locale: 'en-US', min: '2026-11-18T13:00', value: '2026-11-18T14:00' });
    expect(disabledValues(timeSelect(el, 'period'))).toEqual(['am']);
  });

  it('moves the time inside the bounds when a day or hour is picked', () => {
    const el = makePicker({ time: true, inline: true, locale: 'en-GB', min: '2026-11-18T09:30', value: '2026-11-19T08:15' });
    clickDay(el, '2026-11-18');
    expect(el.value).toBe('2026-11-18T09:30');
    change(timeSelect(el, 'hour'), 12);
    change(timeSelect(el, 'minute'), 15);
    change(timeSelect(el, 'hour'), 9);
    expect(el.value).toBe('2026-11-18T09:30');
  });

  it('a date-only min is the start of the day, a date-only max the whole day', () => {
    const el = makePicker({ time: true, min: '2026-11-18', max: '2026-11-20', value: '2026-11-18T00:00' });
    expect(el.validity.valid).toBe(true);
    el.value = '2026-11-20T23:59';
    expect(el.validity.valid).toBe(true);
    expect(disabledValues(timeSelect(el, 'hour'))).toEqual([]);
  });

  it('reports times outside the bounds through validity', () => {
    const setValidity = vi.spyOn(ElementInternals.prototype, 'setValidity');
    const el = makePicker({ time: true, locale: 'en-US', min: '2026-11-18T09:30', max: '2026-11-20T17:00', value: '2026-11-18T09:00' });
    expect(setValidity).toHaveBeenLastCalledWith({ rangeUnderflow: true }, 'Date must be 11/18/2026, 9:30 AM or later', expect.anything());
    el.value = '2026-11-20T17:01';
    expect(setValidity).toHaveBeenLastCalledWith({ rangeOverflow: true }, 'Date must be 11/20/2026, 5:00 PM or earlier', expect.anything());
    el.value = '2026-11-20T17:00';
    expect(setValidity).toHaveBeenLastCalledWith({});
  });

  it('a date-only max message shows the date alone', () => {
    const setValidity = vi.spyOn(ElementInternals.prototype, 'setValidity');
    makePicker({ time: true, locale: 'en-US', max: '2026-11-20', value: '2026-11-21T00:00' });
    expect(setValidity).toHaveBeenLastCalledWith({ rangeOverflow: true }, 'Date must be 11/20/2026 or earlier', expect.anything());
  });

  it('clampTime rounds to whole minutes in minute mode', () => {
    const state = createState({ value: '2026-11-18T10:00', min: '2026-11-18T09:30:20', timeMode: 'minute' });
    expect(clampTime(state, new CalendarDate(2026, 11, 18), { hour: 9, minute: 0, second: 0 })).toEqual({ hour: 9, minute: 31, second: 0 });
  });
});

describe('disable-past and disable-future with a time', () => {
  function at(h, m, s = 0) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, h, m, s));
  }

  it('disable-past disables earlier times today, from now rounded up to the step', () => {
    at(14, 37, 12);
    const el = makePicker({ time: true, locale: 'en-GB', 'disable-past': true, 'minute-step': '15', value: '2026-11-18T15:00' });
    expect(disabledValues(timeSelect(el, 'hour'))).toEqual([...Array(14).keys()].map(String));
    change(timeSelect(el, 'hour'), 14);
    expect(el.value).toBe('2026-11-18T14:45');
    expect(disabledValues(timeSelect(el, 'minute'))).toEqual(['0', '15', '30']);
    el.value = '2026-11-19T08:00';
    expect(disabledValues(timeSelect(el, 'hour'))).toEqual([]);
  });

  it('picking today or Now moves the time to the first allowed slot', () => {
    at(14, 37, 12);
    const el = makePicker({ time: true, inline: true, locale: 'en-GB', 'disable-past': true, 'minute-step': '15', 'default-time': '09:00' });
    clickDay(el, '2026-11-18');
    expect(el.value).toBe('2026-11-18T14:45');
    el.clear();
    $(el, '[data-action="today"]').click();
    expect(el.value).toBe('2026-11-18T14:45');
  });

  it('reports a past time today through validity', () => {
    at(14, 37, 12);
    const setValidity = vi.spyOn(ElementInternals.prototype, 'setValidity');
    makePicker({ time: true, locale: 'en-US', 'disable-past': true, value: '2026-11-18T08:00' });
    expect(setValidity).toHaveBeenLastCalledWith({ rangeUnderflow: true }, 'Date must be 11/18/2026, 2:38 PM or later', expect.anything());
  });

  it('disable-future disables later times today', () => {
    at(14, 37, 12);
    const setValidity = vi.spyOn(ElementInternals.prototype, 'setValidity');
    const el = makePicker({ time: true, locale: 'en-GB', 'disable-future': true, value: '2026-11-18T10:00' });
    expect(disabledValues(timeSelect(el, 'hour'))).toEqual(['15', '16', '17', '18', '19', '20', '21', '22', '23']);
    expect(setValidity).toHaveBeenLastCalledWith({});
    el.value = '2026-11-18T15:00';
    expect(setValidity).toHaveBeenLastCalledWith({ rangeOverflow: true }, 'Date must be 18/11/2026, 14:37 or earlier', expect.anything());
  });

  it('keeps the time when no slot is left today', () => {
    at(23, 50);
    const el = makePicker({ time: true, inline: true, locale: 'en-GB', 'disable-past': true, 'minute-step': '15', 'default-time': '09:00' });
    clickDay(el, '2026-11-18');
    expect(el.value).toBe('2026-11-18T09:00');
  });
});

describe('closing, Done and Now', () => {
  it('picking a day does not close the popup', async () => {
    const el = makePicker({ time: true });
    el.open();
    clickDay(el, $(el, '.idp-day:not(.outside)').dataset.iso);
    await wait(250);
    expect($(el, '.idp-calendar').hidden).toBe(false);
    $(el, '[data-action="done"]').click();
    await wait(450);
    expect($(el, '.idp-calendar').hidden).toBe(true);
  });

  it('Escape closes the popup', async () => {
    const el = makePicker({ time: true, 'no-animation': true });
    el.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect($(el, '.idp-calendar').hidden).toBe(true);
  });

  it('has no Done button inline', () => {
    const el = makePicker({ time: true, inline: true });
    expect($(el, '[data-action="done"]')).toBeNull();
    expect($(el, '.idp-done-btn')).toBeNull();
  });

  it('shows a Done button styled as the main action', () => {
    const el = makePicker({ time: true });
    const done = $(el, '[data-action="done"]');
    expect(done.getAttribute('part')).toBe('done-button');
    expect(done.textContent).toBe('Done');
  });

  it('Now picks today at the current time, rounded down to the step', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 14, 37, 12));
    const el = makePicker({ time: true, 'minute-step': '15', inline: true });
    const now = $(el, '[data-action="today"]');
    expect(now.textContent).toBe('Now');
    now.click();
    expect(el.value).toBe('2026-11-18T14:30');
  });

  it('Now keeps seconds with time="second"', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 14, 37, 12));
    const el = makePicker({ time: 'second', inline: true });
    $(el, '[data-action="today"]').click();
    expect(el.value).toBe('2026-11-18T14:37:12');
  });

  it('uses localized labels', () => {
    const el = makePicker({ time: true, locale: 'fa-IR' });
    expect($(el, '[data-action="today"]').textContent).toBe('اکنون');
    expect($(el, '[data-action="done"]').textContent).toBe('تأیید');
    expect(timeSelect(el, 'hour').getAttribute('aria-label')).toBe('ساعت');
  });
});

describe('getters', () => {
  it('valueAsDate is the local wall-clock date and time', () => {
    const el = makePicker({ time: 'second', value: '2026-11-18T14:30:05' });
    expect(el.valueAsDate).toEqual(new Date(2026, 10, 18, 14, 30, 5));
  });

  it('getValue includes the time', () => {
    const el = makePicker({ time: true, value: '2026-11-18T14:30' });
    expect(el.getValue().time).toEqual({ hour: 14, minute: 30, second: 0 });
  });

  it('displayValue formats date and time for the locale', () => {
    expect(makePicker({ time: true, locale: 'en-US', value: '2026-11-18T14:30' }).displayValue).toBe('11/18/2026, 2:30 PM');
    expect(makePicker({ time: true, locale: 'ja-JP', 'hour-cycle': '12', value: '2026-11-18T14:30' }).displayValue).toBe('2026/11/18 午後2:30');
  });
});

describe('typed input', () => {
  it('splits a typed time off the date', () => {
    expect(splitTime('۱۴۰۵/۰۸/۲۷ ۱۴:۳۰', 'fa-IR')).toEqual({ text: '1405/08/27', time: { hour: 14, minute: 30, second: 0 } });
    expect(splitTime('11/18/2026, 2:30 PM', 'en-US')).toEqual({ text: '11/18/2026', time: { hour: 14, minute: 30, second: 0 } });
    expect(splitTime('2026/11/18 12:05 am', 'en-US').time).toEqual({ hour: 0, minute: 5, second: 0 });
    expect(splitTime('٢٥/١١/٢٠٢٦، ٢:٣٠ م', 'ar-SA').time).toEqual({ hour: 14, minute: 30, second: 0 });
    expect(splitTime('۱۴۰۵/۰۸/۲۷ ۲:۳۰ ب.ظ', 'fa-IR').time).toEqual({ hour: 14, minute: 30, second: 0 });
    expect(splitTime('2026. 11. 18. 오후 2:30', 'ko-KR')).toEqual({ text: '2026. 11. 18', time: { hour: 14, minute: 30, second: 0 } });
    expect(splitTime('2026-11-18', 'en-US')).toEqual({ text: '2026-11-18', time: null });
    expect(splitTime('2026-11-18 25:00', 'en-US')).toBeNull();
    expect(splitTime('2026-11-18 13:00 pm', 'en-US')).toBeNull();
  });

  function type(el, text) {
    const input = $(el, '.idp-input');
    input.value = text;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  }

  it('commits a typed Persian date and time', () => {
    const el = makePicker({ time: true, 'allow-input': true, locale: 'fa-IR', calendar: 'persian' });
    type(el, '۱۴۰۵/۰۸/۲۷ ۱۴:۳۰');
    expect(el.value).toBe('2026-11-18T14:30');
  });

  it('a typed date without a time gets the default time', () => {
    const el = makePicker({ time: true, 'allow-input': true, locale: 'en-US', 'default-time': '09:00' });
    type(el, '11/18/2026');
    expect(el.value).toBe('2026-11-18T09:00');
  });

  it('re-commits its own display text unchanged', () => {
    const el = makePicker({ time: true, 'allow-input': true, locale: 'en-US' });
    type(el, '11/18/2026 2:30 pm');
    expect(el.value).toBe('2026-11-18T14:30');
    type(el, el.displayValue);
    expect(el.value).toBe('2026-11-18T14:30');
  });

  it('shows an error for an invalid time', () => {
    const el = makePicker({ time: true, 'allow-input': true, locale: 'en-US' });
    type(el, '11/18/2026 25:00');
    expect(el.value).toBe('');
    expect($(el, '.idp-error').hidden).toBe(false);
  });

  it('the hint includes the time format', () => {
    const el = makePicker({ time: true, 'allow-input': true, locale: 'en-GB' });
    expect($(el, '.idp-hint').textContent).toBe('Format: DD/MM/YYYY HH:mm');
    const us = makePicker({ time: true, 'allow-input': true, locale: 'en-US' });
    expect($(us, '.idp-hint').textContent).toBe('Format: MM/DD/YYYY hh:mm PM');
    expect($(us, '.idp-input').hasAttribute('inputmode')).toBe(false);
  });
});

describe('forms', () => {
  it('reset restores the attribute value', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);
    const el = document.createElement('intl-datepicker');
    el.setAttribute('time', '');
    el.setAttribute('value', '2026-11-18T14:30');
    form.appendChild(el);
    el.value = '2026-12-01T08:00';
    el.formResetCallback();
    expect(el.value).toBe('2026-11-18T14:30');
  });

  it('restores saved state', () => {
    const el = makePicker({ time: true });
    el.formStateRestoreCallback('2026-11-18T14:30');
    expect(el.value).toBe('2026-11-18T14:30');
  });
});
