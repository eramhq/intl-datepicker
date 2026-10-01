// React 19 assigns props as element properties when `key in element`
// (value, type, name, numerals, labels, presets) and as attributes otherwise.
// These tests pin down that the wrapper still produces a correct first paint.
import { describe, it, expect, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import IntlDatepicker from './index.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;

function render(props) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(createElement(IntlDatepicker, props)));
  return container.querySelector('intl-datepicker');
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('React wrapper', () => {
  it('connects with calendar, locale, type and value already applied', () => {
    const el = render({
      calendar: 'persian', locale: 'fa-IR', type: 'range',
      value: '2024-06-10/2024-06-12', placeholder: 'تاریخ', name: 'stay',
    });
    expect(el.getAttribute('calendar')).toBe('persian');
    expect(el.getAttribute('type')).toBe('range');
    expect(el.getAttribute('name')).toBe('stay');
    expect(el.value).toBe('2024-06-10/2024-06-12');
    expect(el.shadowRoot.querySelector('.idp-input').placeholder).toBe('تاریخ');
    expect(el.displayValue).toMatch(/۱۴۰۳/);
  });

  it('passes booleans as presence and removes them when false', () => {
    const el = render({ inline: true, showWeekNumbers: true, disabled: false });
    expect(el.hasAttribute('inline')).toBe(true);
    expect(el.hasAttribute('show-week-numbers')).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(false);
    act(() => root.render(createElement(IntlDatepicker, { inline: false })));
    expect(el.hasAttribute('inline')).toBe(false);
  });

  it('maps the v0.4 rule props to attributes', () => {
    const el = render({
      type: 'range', minNights: 2, maxNights: '28', excludeDisabled: 'nights',
      firstDayOfWeek: 'mon', disabledDaysOfWeek: 'fri', disablePast: true, disableFuture: false,
    });
    expect(el.getAttribute('min-nights')).toBe('2');
    expect(el.getAttribute('max-nights')).toBe('28');
    expect(el.getAttribute('exclude-disabled')).toBe('nights');
    expect(el.getAttribute('first-day-of-week')).toBe('mon');
    expect(el.getAttribute('disabled-days-of-week')).toBe('fri');
    expect(el.hasAttribute('disable-past')).toBe(true);
    expect(el.hasAttribute('disable-future')).toBe(false);
    act(() => root.render(createElement(IntlDatepicker, { type: 'range', excludeDisabled: true })));
    expect(el.getAttribute('exclude-disabled')).toBe('');
    act(() => root.render(createElement(IntlDatepicker, { type: 'range', excludeDisabled: false })));
    expect(el.hasAttribute('exclude-disabled')).toBe(false);
  });

  it('accepts labels and presets as objects or JSON strings', () => {
    const el = render({
      type: 'range', inline: true,
      labels: '{"today":"Now"}',
      presets: [{ label: 'Week', value: '-7d/today' }],
    });
    expect(el.shadowRoot.querySelector('[data-action="today"]').textContent).toBe('Now');
    expect(el.shadowRoot.querySelector('.idp-preset-btn').textContent).toBe('Week');
  });

  it('calls onChange once per user change in controlled usage', () => {
    const calls = [];
    let el;
    const onChange = (d) => {
      calls.push(d.value);
      act(() => root.render(createElement(IntlDatepicker, { inline: true, value: d.value, onChange })));
    };
    el = render({ inline: true, value: '2024-06-10', onChange });
    el.shadowRoot.querySelector('.idp-day[data-month="6"][data-day="12"]').click();
    expect(calls).toEqual(['2024-06-12']);
    expect(el.value).toBe('2024-06-12');
  });
});

describe('React wrapper re-renders', () => {
  it('does not re-assign an unchanged labels object on re-render', () => {
    const labels = { today: 'Now' };
    const el = render({ inline: true, labels });
    const panel = el.shadowRoot.querySelector('.idp-calendar-main');
    const nav = el.shadowRoot.querySelector('[data-action="next-month"]');
    act(() => root.render(createElement(IntlDatepicker, { inline: true, labels, className: 'x' })));
    expect(el.shadowRoot.querySelector('[data-action="next-month"]')).toBe(nav);
    expect(el.shadowRoot.querySelector('.idp-calendar-main')).toBe(panel);
  });
});
