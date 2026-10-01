// Real-browser tests (Chromium, Firefox, WebKit) for behaviour jsdom can't
// model: layout and the top layer, focus movement, form association and
// accessible names. Run with `npm run test:browser`.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { page, userEvent } from '@vitest/browser/context';

beforeAll(async () => {
  await import('./intl-datepicker.js');
});

afterEach(() => {
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
});

function mount(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

async function openPicker(el) {
  el.open();
  await nextFrame();
  return $(el, '.idp-calendar');
}

describe('popup layer and positioning', () => {
  it('renders the panel in the top layer below the input', async () => {
    // Away from the 8px viewport padding the positioner clamps to.
    const host = mount('<intl-datepicker value="2024-06-15" no-animation style="margin:20px"></intl-datepicker>');
    const el = host.firstElementChild;
    const cal = await openPicker(el);
    expect(cal.matches(':popover-open')).toBe(true);
    const input = $(el, '.idp-input-wrapper').getBoundingClientRect();
    const panel = cal.getBoundingClientRect();
    expect(Math.abs(panel.top - (input.bottom + 4))).toBeLessThan(2);
    expect(Math.abs(panel.left - input.left)).toBeLessThan(2);
  });

  it('flips above the input when there is no room below', async () => {
    const host = mount('<intl-datepicker value="2024-06-15" no-animation></intl-datepicker>');
    host.style.cssText = `position:absolute;top:${window.innerHeight - 60}px;left:20px`;
    const el = host.firstElementChild;
    const cal = await openPicker(el);
    expect(cal.dataset.placement).toBe('top');
    const input = $(el, '.idp-input-wrapper').getBoundingClientRect();
    expect(cal.getBoundingClientRect().bottom).toBeLessThanOrEqual(input.top);
  });

  it('positions correctly inside a transformed ancestor', async () => {
    const host = mount('<div style="transform:translate(40px, 30px);filter:blur(0)"><intl-datepicker value="2024-06-15" no-animation></intl-datepicker></div>');
    const el = host.querySelector('intl-datepicker');
    const cal = await openPicker(el);
    const input = $(el, '.idp-input-wrapper').getBoundingClientRect();
    const panel = cal.getBoundingClientRect();
    expect(Math.abs(panel.top - (input.bottom + 4))).toBeLessThan(2);
    expect(Math.abs(panel.left - input.left)).toBeLessThan(2);
  });

  it('shows above a modal <dialog> and is not clipped by it', async () => {
    const host = mount(`<dialog style="overflow:hidden;max-height:120px">
      <intl-datepicker value="2024-06-15" no-animation></intl-datepicker></dialog>`);
    host.querySelector('dialog').showModal();
    const el = host.querySelector('intl-datepicker');
    const cal = await openPicker(el);
    const day = $(el, '.idp-day[data-day="20"]');
    const r = day.getBoundingClientRect();
    // The day must be the topmost element where it is drawn.
    const hit = el.shadowRoot.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    expect(hit).toBe(day);
    expect(cal.matches(':popover-open')).toBe(true);
  });
});

it('does not cover the allow-input hint and error', async () => {
  const host = mount('<intl-datepicker allow-input no-animation style="margin:20px"></intl-datepicker>');
  const el = host.firstElementChild;
  const input = $(el, '.idp-input');
  input.value = 'nonsense';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  const cal = await openPicker(el);
  await nextFrame();
  expect(cal.getBoundingClientRect().top).toBeGreaterThanOrEqual($(el, '.idp-error').getBoundingClientRect().bottom);
});

describe('focus', () => {
  it('moves focus into the grid and returns it to the input on Escape', async () => {
    const host = mount('<intl-datepicker value="2024-06-15" no-animation></intl-datepicker>');
    const el = host.firstElementChild;
    await userEvent.click($(el, '.idp-input'));
    await nextFrame();
    expect(el.shadowRoot.activeElement?.dataset.day).toBe('15');

    await userEvent.keyboard('{ArrowRight}');
    expect(el.shadowRoot.activeElement?.dataset.day).toBe('16');

    await userEvent.keyboard('{Escape}');
    expect(el.shadowRoot.activeElement).toBe($(el, '.idp-input'));
    expect($(el, '.idp-calendar').hidden).toBe(true);
  });

  it('opens with ArrowDown from the input', async () => {
    const host = mount('<intl-datepicker value="2024-06-15" allow-input no-animation></intl-datepicker>');
    const el = host.firstElementChild;
    $(el, '.idp-input').focus();
    await userEvent.keyboard('{ArrowDown}');
    await nextFrame();
    expect($(el, '.idp-calendar').hidden).toBe(false);
    expect(el.shadowRoot.activeElement?.dataset.day).toBe('15');
  });

  it('keeps arrow keys right-to-left in an RTL Persian calendar', async () => {
    const host = mount('<intl-datepicker calendar="persian" locale="fa-IR" value="2024-06-15" inline></intl-datepicker>');
    const el = host.firstElementChild;
    $(el, '.idp-day[tabindex="0"]').focus();
    const start = Number(el.shadowRoot.activeElement.dataset.day);
    await userEvent.keyboard('{ArrowLeft}');
    expect(Number(el.shadowRoot.activeElement.dataset.day)).toBe(start + 1);
    await userEvent.keyboard('{ArrowRight}');
    expect(Number(el.shadowRoot.activeElement.dataset.day)).toBe(start);
  });

  it('keeps focus on the focused day while hovering a range', async () => {
    const host = mount('<intl-datepicker type="range" value="2024-06-10" inline></intl-datepicker>');
    const el = host.firstElementChild;
    const focused = $(el, '.idp-day[data-day="10"][data-month="6"]');
    focused.focus();
    await userEvent.hover($(el, '.idp-day[data-day="14"][data-month="6"]'));
    expect(el.shadowRoot.activeElement).toBe(focused);
    expect($(el, '.idp-day[data-day="12"][data-month="6"]').classList.contains('in-range')).toBe(true);
  });
});

describe('form association', () => {
  it('submits, validates, resets and respects <fieldset disabled>', async () => {
    const host = mount(`<form><fieldset>
      <intl-datepicker name="d" value="2024-06-15"></intl-datepicker>
      <intl-datepicker name="req" required></intl-datepicker>
      <intl-datepicker name="m" type="month" calendar="persian" value="2024-07-22[u-ca=persian]"></intl-datepicker>
    </fieldset></form>`);
    const form = host.querySelector('form');
    const [d, req] = host.querySelectorAll('intl-datepicker');

    let data = new FormData(form);
    expect(data.get('d')).toBe('2024-06-15');
    expect(data.get('m')).toBe('2024-07-22[u-ca=persian]');
    expect(data.has('req')).toBe(false);
    expect(form.checkValidity()).toBe(false);
    expect(req.validity.valueMissing).toBe(true);
    expect(req.validationMessage).toBe('Please select a date');

    req.setValue('2024-01-02');
    expect(form.checkValidity()).toBe(true);

    d.setValue('2024-12-25');
    form.reset();
    expect(d.value).toBe('2024-06-15');

    host.querySelector('fieldset').disabled = true;
    expect(d.matches(':disabled')).toBe(true);
    expect($(d, '.idp-input').disabled).toBe(true);
    data = new FormData(form);
    expect(data.has('d')).toBe(false);
  });

  it('reports min violations with a localized message', async () => {
    const host = mount('<intl-datepicker locale="en-US" value="2024-06-15"></intl-datepicker>');
    const el = host.firstElementChild;
    el.setValue('2024-06-01');
    el.setAttribute('min', '2024-06-10');
    expect(el.validity.rangeUnderflow).toBe(true);
    expect(el.validationMessage).toBe('Date must be 06/10/2024 or later');
  });
});

describe('accessible names and semantics', () => {
  it('a <label for> names the inner combobox', async () => {
    mount('<label for="dob">Birth date</label><intl-datepicker id="dob"></intl-datepicker>');
    await nextFrame();
    await expect.element(page.getByRole('combobox', { name: 'Birth date' })).toBeInTheDocument();
  });

  it('exposes a named grid with column headers', async () => {
    mount('<intl-datepicker value="2024-06-15" inline locale="en-US"></intl-datepicker>');
    await expect.element(page.getByRole('grid', { name: 'June 2024' })).toBeInTheDocument();
    await expect.element(page.getByRole('columnheader', { name: 'Monday' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Saturday, June 15, 2024, selected' })).toBeInTheDocument();
  });

  it('announces month changes in the live region', async () => {
    const host = mount('<intl-datepicker value="2024-06-15" inline locale="en-US"></intl-datepicker>');
    const el = host.firstElementChild;
    await userEvent.click($(el, '[data-action="next-month"]'));
    expect($(el, '[aria-live]').textContent).toBe('July 2024');
  });
});

describe('range rules', () => {
  // Booked nights Mar 12–13 2026; check-out on the 12th is allowed.
  const hotel = (attrs = 'inline') => mount(`<intl-datepicker type="range" locale="en-US" ${attrs} no-animation
    value="2026-03-08" min-nights="2" max-nights="28" exclude-disabled="nights"
    disabled-dates='["2026-03-12/2026-03-13"]'></intl-datepicker>`).firstElementChild;
  const day = (el, iso) => $(el, `.idp-day[data-iso="${iso}"]`);
  const inRange = (el) => Array.from(el.shadowRoot.querySelectorAll('.idp-day.in-range'), b => b.dataset.iso);

  it('the hover preview reaches the check-out day but not past it', async () => {
    const el = hotel();
    await userEvent.hover(day(el, '2026-03-12'));
    expect(day(el, '2026-03-12').classList.contains('checkout-only')).toBe(true);
    expect(inRange(el)).toEqual(['2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12']);

    await userEvent.hover(day(el, '2026-03-14'));
    expect(inRange(el)).toEqual([]);
    expect(day(el, '2026-03-14').getAttribute('aria-disabled')).toBe('true');
  });

  it('Enter on a blocked day announces why and selects nothing', async () => {
    const el = hotel();
    day(el, '2026-03-08').focus();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(el.shadowRoot.activeElement.dataset.iso).toBe('2026-03-09');
    expect($(el, '[aria-live]').textContent).toBe('Choose at least 2 nights');
    expect(el.value).toBe('2026-03-08');
    expect($(el, '[part="range-hint"]').textContent).toBe('Minimum stay: 2 nights · Maximum: 28 nights');
  });

  it('a valid end completes the range and closes the popup', async () => {
    const el = hotel('');
    const cal = await openPicker(el);
    expect(el.shadowRoot.activeElement.dataset.iso).toBe('2026-03-08');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{Enter}');
    expect(el.value).toBe('2026-03-08/2026-03-12');
    await new Promise(r => setTimeout(r, 250));
    expect(cal.matches(':popover-open')).toBe(false);
  });

  it('a required half range submits nothing valid', async () => {
    const host = mount(`<form><intl-datepicker name="stay" type="range" required value="2026-03-08"></intl-datepicker></form>`);
    const form = host.querySelector('form');
    const el = form.firstElementChild;
    expect(new FormData(form).get('stay')).toBe('2026-03-08');
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Select an end date');

    el.value = '2026-03-08/2026-03-10';
    expect(el.checkValidity()).toBe(true);
  });
});
