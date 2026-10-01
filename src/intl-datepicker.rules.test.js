// v0.4 component behaviour: range rules in the UI, kept programmatic values,
// validity, first-day-of-week, midnight rollover, plural messages, Japanese eras.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

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
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v === true ? '' : v);
  }
  document.body.appendChild(el);
  return el;
}

const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const $$ = (el, sel) => Array.from(el.shadowRoot.querySelectorAll(sel));
const day = (el, iso) => $(el, `.idp-day[data-iso="${iso}"]`);
const live = (el) => $(el, '#idp-live').textContent.trim();
const press = (el, key) => el.shadowRoot.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
const lastValidity = (spy) => spy.mock.calls.at(-1);
const at = (when) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(when));
};

// Hotel: booked nights Mar 12–13 (someone checks in on the 12th).
const hotel = (extra = {}) => makePicker({
  type: 'range', inline: true, value: '2026-03-01/2026-03-02',
  'min-nights': '2', 'max-nights': '28', 'exclude-disabled': 'nights',
  'disabled-dates': '["2026-03-12/2026-03-13"]',
  ...extra,
});

describe('hotel booking', () => {
  it('blocks ends past the first booked night but keeps check-out on it', () => {
    const el = hotel();
    day(el, '2026-03-08').click();
    expect(el.value).toBe('2026-03-08');

    expect(day(el, '2026-03-09').getAttribute('aria-disabled')).toBe('true'); // 1 night < 2
    expect(day(el, '2026-03-09').classList.contains('range-blocked')).toBe(true);
    expect(day(el, '2026-03-10').hasAttribute('aria-disabled')).toBe(false);
    const checkout = day(el, '2026-03-12');
    expect(checkout.hasAttribute('aria-disabled')).toBe(false);
    expect(checkout.classList.contains('checkout-only')).toBe(true);
    expect(day(el, '2026-03-13').getAttribute('aria-disabled')).toBe('true');
    expect(day(el, '2026-03-20').classList.contains('range-blocked')).toBe(true);
    // The start itself is never blocked.
    expect(day(el, '2026-03-08').hasAttribute('aria-disabled')).toBe(false);

    checkout.click();
    expect(el.value).toBe('2026-03-08/2026-03-12');
    expect($$(el, '.range-blocked')).toHaveLength(0);
  });

  it('never checks in on a booked night', () => {
    const el = hotel();
    day(el, '2026-03-12').click();
    expect(el.value).toBe('2026-03-01/2026-03-02');
  });

  it('shows and announces the length limits while a start is pending', () => {
    const el = hotel();
    expect($(el, '[part="range-hint"]')).toBeNull();
    day(el, '2026-03-08').click();
    expect($(el, '[part="range-hint"]').textContent).toBe('Minimum stay: 2 nights · Maximum: 28 nights');
    expect(live(el)).toContain('range start. Minimum stay: 2 nights · Maximum: 28 nights');
  });

  it('Enter on a blocked cell announces the reason and selects nothing', () => {
    const el = hotel();
    day(el, '2026-03-08').click();
    // Move to the 9th with the keyboard (1 night: too short).
    day(el, '2026-03-08').focus();
    press(el, 'ArrowRight');
    press(el, 'Enter');
    expect(live(el)).toBe('Choose at least 2 nights');
    expect(el.value).toBe('2026-03-08');

    press(el, 'ArrowDown'); // the 16th: past the booked nights
    press(el, 'Enter');
    expect(live(el)).toBe('The range includes unavailable dates');
    expect(el.value).toBe('2026-03-08');
  });

  it('re-picking the start cancels it', () => {
    const el = hotel();
    day(el, '2026-03-08').click();
    day(el, '2026-03-08').click();
    expect(el.value).toBe('');
    expect($(el, '[part="range-hint"]')).toBeNull();
  });

  it('passes range state to mapDays', () => {
    const seen = new Map();
    const el = hotel();
    el.mapDays = (info) => { seen.set(info.date.iso, info); };
    day(el, '2026-03-08').click();
    expect(seen.get('2026-03-12')).toMatchObject({ isDisabled: true, isCheckoutOnly: true, isRangeBlocked: false });
    expect(seen.get('2026-03-13')).toMatchObject({ isDisabled: true, isRangeBlocked: true });
    expect(seen.get('2026-03-09').date).toEqual({ year: 2026, month: 3, day: 9, dayOfWeek: 1, iso: '2026-03-09' });
  });

  it('keeps a pending start and the visible month when availability changes', () => {
    const el = hotel();
    day(el, '2026-03-08').click();
    $(el, '[data-action="next-month"]').click();
    el.setAttribute('disabled-dates', '["2026-03-12/2026-03-13","2026-04-20"]');
    expect(el.value).toBe('2026-03-08');
    expect(day(el, '2026-04-15')).not.toBeNull();
    expect(day(el, '2026-04-21').classList.contains('range-blocked')).toBe(true);
  });
});

describe('leave request (no exclusion)', () => {
  it('spans weekends and holidays but cannot end on one', () => {
    const el = makePicker({
      type: 'range', inline: true, value: '2026-03-02', locale: 'en-US',
      'disable-weekends': true, 'disabled-dates': '["2026-03-10/2026-03-11"]',
    });
    expect(day(el, '2026-03-07').getAttribute('aria-disabled')).toBe('true');
    day(el, '2026-03-07').click();
    expect(el.value).toBe('2026-03-02');
    day(el, '2026-03-13').click();
    expect(el.value).toBe('2026-03-02/2026-03-13');
  });
});

describe('programmatic values are kept', () => {
  it('keeps a stored past value and reports rangeUnderflow', () => {
    at('2026-10-01T12:00:00');
    const el = makePicker({ value: '2026-09-01', 'disable-past': true });
    const spy = vi.spyOn(el._internals, 'setValidity');
    el.value = '2026-08-15';
    expect(el.value).toBe('2026-08-15');
    expect($(el, '.idp-input').value).not.toBe('');
    const [flags, message] = lastValidity(spy);
    expect(flags).toEqual({ rangeUnderflow: true });
    expect(message).toMatch(/^Date must be .+ or later$/);
  });

  it('keeps values on disabled dates with a customError', () => {
    const el = makePicker({ 'disabled-dates': '["2026-05-01"]' });
    const spy = vi.spyOn(el._internals, 'setValidity');
    el.setValue('2026-05-01');
    expect(el.value).toBe('2026-05-01');
    expect(lastValidity(spy).slice(0, 2)).toEqual([{ customError: true }, 'This date is not available']);
  });

  it('keeps every multiple date', () => {
    const el = makePicker({ type: 'multiple', 'disabled-dates': '["2026-05-02"]' });
    el.value = '2026-05-01,2026-05-02';
    expect(el.value).toBe('2026-05-01,2026-05-02');
  });

  it('reports range rules as tooShort / tooLong / customError', () => {
    const el = makePicker({ type: 'range', 'min-nights': '2', 'max-nights': '5', 'exclude-disabled': true, 'disabled-dates': '["2026-05-10"]' });
    const spy = vi.spyOn(el._internals, 'setValidity');
    el.value = '2026-05-01/2026-05-02';
    expect(el.value).toBe('2026-05-01/2026-05-02');
    expect(lastValidity(spy).slice(0, 2)).toEqual([{ tooShort: true }, 'Choose at least 2 nights']);
    el.value = '2026-05-01/2026-05-08';
    expect(lastValidity(spy).slice(0, 2)).toEqual([{ tooLong: true }, 'Choose at most 5 nights']);
    el.value = '2026-05-08/2026-05-11';
    expect(lastValidity(spy).slice(0, 2)).toEqual([{ customError: true }, 'The range includes unavailable dates']);
    el.value = '2026-05-01/2026-05-04';
    expect(lastValidity(spy)[0]).toEqual({});
  });

  it('a required half range is valueMissing', () => {
    const el = makePicker({ type: 'range', required: true });
    const spy = vi.spyOn(el._internals, 'setValidity');
    el.value = '2026-05-01';
    expect(lastValidity(spy).slice(0, 2)).toEqual([{ valueMissing: true }, 'Select an end date']);
    el.value = '2026-05-01/2026-05-03';
    expect(lastValidity(spy)[0]).toEqual({});
  });
});

describe('plural messages', () => {
  it('pluralizes nights with native digits', () => {
    const msg = (locale, n) => {
      const el = makePicker({ type: 'range', locale, 'min-nights': String(n) });
      const spy = vi.spyOn(el._internals, 'setValidity');
      el.value = '2026-05-01/2026-05-01';
      return lastValidity(spy)[1];
    };
    expect(msg('en-US', 1)).toBe('Choose at least 1 night');
    expect(msg('en-US', 3)).toBe('Choose at least 3 nights');
    expect(msg('fa-IR', 3)).toBe('حداقل ۳ شب انتخاب کنید');
    expect(msg('ar-EG', 1)).toBe('اختر ليلة واحدة على الأقل');
    expect(msg('ar-EG', 2)).toBe('اختر ليلتان على الأقل');
    expect(msg('ar-EG', 3)).toBe('اختر ٣ ليالٍ على الأقل');
    expect(msg('ar-EG', 11)).toBe('اختر ١١ ليلة على الأقل');
    expect(msg('he-IL', 2)).toBe('יש לבחור לפחות שני לילות');
  });

  it('accepts plural objects in the labels attribute and property', () => {
    const el = makePicker({ type: 'range', 'min-nights': '2', labels: '{"nights":{"one":"# {n}","other":"{n} nuits"}}' });
    expect(el.labels.nights).toEqual({ one: '# {n}', other: '{n} nuits' });
    el.labels = { nights: { one: 'une nuit', other: '{n} nuits' } };
    expect(el.labels.nights.one).toBe('une nuit');
    el.labels = { nights: { two: 'x' } }; // no `other`: ignored
    expect(el.labels.nights).toEqual({ one: '{n} night', other: '{n} nights' });
  });
});

describe('presets with range rules', () => {
  it('disables presets that break the rules instead of clamping them', () => {
    at('2026-10-15T12:00:00');
    const el = makePicker({
      type: 'range', inline: true, 'max-nights': '30', 'disable-future': true,
      presets: JSON.stringify([
        { label: 'Last 7 days', value: '-6d/today' },
        { label: 'Last 90 days', value: '-89d/today' },
      ]),
    });
    const [week, quarter] = $$(el, '.idp-preset-btn');
    expect(week.hasAttribute('aria-disabled')).toBe(false);
    expect(quarter.getAttribute('aria-disabled')).toBe('true');
    quarter.click();
    expect(el.value).toBe('');
    week.click();
    expect(el.value).toBe('2026-10-09/2026-10-15');
  });
});

describe('first-day-of-week in the component', () => {
  it('drives the header, grid, Home/End and week numbers', () => {
    const el = makePicker({ inline: true, locale: 'en-US', 'first-day-of-week': 'mon', value: '2026-10-15', 'show-week-numbers': true });
    const firstHeader = $(el, '.idp-weekday[part="weekday"] .idp-sr-only').textContent;
    expect(firstHeader).toBe('Monday');
    expect($(el, 'tbody tr').querySelector('.idp-day').dataset.iso).toBe('2026-09-28');
    day(el, '2026-10-15').focus();
    press(el, 'Home');
    expect(el.shadowRoot.activeElement.dataset.iso).toBe('2026-10-12');
    press(el, 'End');
    expect(el.shadowRoot.activeElement.dataset.iso).toBe('2026-10-18');
    const weekOf = (iso) => day(el, iso).closest('tr').querySelector('.idp-week-number').textContent;
    expect(weekOf('2026-10-12')).toBe(weekOf('2026-10-18'));
  });

  it('numbers weeks by the locale minimal days, whatever the engine reports', () => {
    const el = makePicker({ inline: true, locale: 'en-US', value: '2026-01-15', 'show-week-numbers': true });
    const weekOf = (minimalDays, iso) => {
      el._minimalDays = minimalDays;
      el.goToMonth(2026, Number(iso.slice(5, 7))); // re-renders
      return day(el, iso).closest('tr').querySelector('.idp-week-number').textContent;
    };
    // Sunday starts. Jan 1 2026 is a Thursday: the week of Dec 28 has 3 days in 2026.
    expect(weekOf(1, '2026-01-01')).toBe('1'); // US: the week containing Jan 1
    expect(weekOf(4, '2026-01-01')).toBe('53'); // needs 4 days: still 2025's last week
    expect(weekOf(4, '2026-01-04')).toBe('1');
    el.setAttribute('first-day-of-week', 'mon');
    expect(weekOf(4, '2026-10-12')).toBe('42'); // ISO week 42
    expect(weekOf(1, '2026-10-12')).toBe('42');
  });

  it('works for fa-IR with Monday starts', () => {
    const el = makePicker({ inline: true, locale: 'fa-IR', calendar: 'persian', 'first-day-of-week': '1', value: '2026-10-15' });
    expect($(el, '.idp-weekday .idp-sr-only').textContent).toBe('دوشنبه');
    const first = $(el, 'tbody .idp-day');
    expect(new Date(`${first.dataset.iso}T12:00`).getDay()).toBe(1);
  });

  it('round-trips week values', () => {
    const el = makePicker({ type: 'week', locale: 'en-US', 'first-day-of-week': 'wed', value: '2027-W01' });
    expect(el.value).toBe('2027-W01');
    // The Wednesday-start week containing the ISO week's Thursday (Jan 7).
    expect(el.getValue().start).toEqual({ year: 2027, month: 1, day: 6 });
  });
});

describe('midnight rollover on an inline calendar', () => {
  it('moves today and disable-past without a reopen', () => {
    at('2026-10-15T23:59:00');
    const el = makePicker({ inline: true, 'disable-past': true });
    expect(day(el, '2026-10-15').classList.contains('today')).toBe(true);
    expect(day(el, '2026-10-15').hasAttribute('aria-disabled')).toBe(false);

    vi.setSystemTime(new Date('2026-10-16T00:01:00'));
    day(el, '2026-10-15').click();
    expect(el.value).toBe('');
    expect(day(el, '2026-10-15').getAttribute('aria-disabled')).toBe('true');
    expect(day(el, '2026-10-16').classList.contains('today')).toBe(true);
  });

  it('re-validates a value that became past', () => {
    at('2026-10-15T23:59:00');
    const el = makePicker({ inline: true, 'disable-past': true, value: '2026-10-15' });
    const spy = vi.spyOn(el._internals, 'setValidity');
    vi.setSystemTime(new Date('2026-10-16T00:01:00'));
    $(el, '[data-action="next-month"]').click();
    expect(lastValidity(spy)[0]).toEqual({ rangeUnderflow: true });
  });
});

describe('Japanese eras', () => {
  it('shows Heisei for 2018 and keeps the era through navigation', () => {
    const el = makePicker({ inline: true, calendar: 'japanese', locale: 'en-US', value: '2018-05-01' });
    expect($(el, '#idp-title-0').textContent).toContain('Heisei');
    $(el, '[data-action="next-month"]').click();
    expect($(el, '#idp-title-0').textContent).toMatch(/June.*Heisei/);
    expect(day(el, '2018-06-15')).not.toBeNull();
  });

  it('selects across an era change from the month and year views', () => {
    const el = makePicker({ inline: true, type: 'month', calendar: 'japanese', locale: 'en-US', value: '2019-03-01' });
    $(el, '.idp-month-cell[data-iso="2019-07-01"]').click();
    expect(el.getValue().start).toBe('2019-07-01');
    const year = makePicker({ inline: true, type: 'year', calendar: 'japanese', locale: 'en-US', value: '2010-01-01' });
    $(year, '.idp-year-cell[data-year="2018"]').click();
    expect(year.getValue().start).toBe('2018-01-01');
    expect(year.displayValue).toContain('Heisei');
  });
});

describe('removed APIs', () => {
  it('no longer has the isDateDisabled alias', () => {
    const el = makePicker();
    expect('isDateDisabled' in el).toBe(false);
  });
});

describe('v0.4.1 fixes', () => {
  const navigations = (el) => {
    const events = [];
    el.addEventListener('intl-navigate', (e) => events.push(e.detail));
    return events;
  };

  it('numbers en-US weeks US-style without engine minimal-days data', () => {
    const el = makePicker({ inline: true, locale: 'en-US', value: '2026-01-15', 'show-week-numbers': true });
    // US weeks start on Sunday. The row Dec 28 – Jan 3 holds only 3 days of
    // 2026: week 1 in the US (minimal days 1), week 53 under the ISO rule.
    expect(day(el, '2025-12-28').closest('tr').querySelector('.idp-week-number').textContent).toBe('1');
    const de = makePicker({ inline: true, locale: 'de-DE', value: '2027-01-15', 'show-week-numbers': true });
    // Jan 1 2027 is a Friday: in Germany that week belongs to 2026 (week 53).
    expect(day(de, '2027-01-01').closest('tr').querySelector('.idp-week-number').textContent).toBe('53');
  });

  it('intl-navigate carries the Gregorian bounds of the visible months', () => {
    const el = makePicker({ inline: true, calendar: 'persian', locale: 'fa-IR', months: '2', value: '2026-03-21' });
    const events = navigations(el);
    $(el, '[data-action="next-month"]').click();
    expect(events).toEqual([{ year: 1405, month: 2, direction: 'forward', start: '2026-04-21', end: '2026-06-21' }]);
  });

  it('fires intl-navigate for keyboard and month-view navigation', () => {
    const el = makePicker({ inline: true, locale: 'en-US', value: '2026-03-30' });
    const events = navigations(el);
    day(el, '2026-03-30').focus();
    press(el, 'ArrowRight'); // Mar 31: same month
    expect(events).toHaveLength(0);
    press(el, 'ArrowRight'); // Apr 1
    press(el, 'PageUp'); // Mar 1
    expect(events.map(e => [e.start, e.direction])).toEqual([['2026-04-01', 'forward'], ['2026-03-01', 'backward']]);

    $(el, '[data-action="show-months"]').click();
    $(el, '.idp-month-cell[data-iso="2026-03-01"]').click(); // same month: no event
    expect(events).toHaveLength(2);
    $(el, '[data-action="show-months"]').click();
    $(el, '[data-action="show-years"]').click();
    $(el, '.idp-year-cell[data-year="2027"]').click();
    $(el, '.idp-month-cell[data-iso="2027-03-01"]').click(); // same month number, next year
    expect(events.at(-1)).toMatchObject({ year: 2027, month: 3, direction: 'forward', end: '2027-03-31' });
  });

  it('lets a kept, now-disabled multiple date be removed by clicking it', () => {
    const el = makePicker({ type: 'multiple', inline: true, value: '2026-05-01,2026-05-02', 'disabled-dates': '["2026-05-02"]' });
    expect(day(el, '2026-05-02').hasAttribute('aria-disabled')).toBe(false);
    expect(day(el, '2026-05-03').hasAttribute('aria-disabled')).toBe(false);
    day(el, '2026-05-02').click();
    expect(el.value).toBe('2026-05-01');
    expect(day(el, '2026-05-02').getAttribute('aria-disabled')).toBe('true');
    day(el, '2026-05-02').click();
    expect(el.value).toBe('2026-05-01');
  });

  it('labels a Japanese year that changes era with both eras', () => {
    const el = makePicker({ inline: true, type: 'year', calendar: 'japanese', locale: 'en-US', value: '2019-06-01' });
    const label = $(el, '.idp-year-cell[data-year="2019"]').textContent;
    expect(label).toContain('Heisei');
    expect(label).toContain('Reiwa');
    expect($(el, '.idp-year-cell[data-year="2018"]').textContent).not.toContain('Reiwa');
  });
});
