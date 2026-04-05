import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Ensure the web component is registered
import '../intl-datepicker.js';

const BOOLEAN_ATTRS = [
  'inline', 'disabled', 'readonly', 'required', 'show-alternate',
  'disable-weekends', 'sort-dates', 'no-animation',
  'show-week-numbers', 'hide-outside-days', 'allow-input',
];
const STRING_ATTRS = [
  'calendar', 'locale', 'value', 'type', 'min', 'max',
  'for', 'placeholder', 'name',
  'disabled-dates', 'date-separator', 'max-dates',
  'months', 'presets',
];

const toCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const IntlDatepicker = forwardRef(function IntlDatepicker(props, ref) {
  const elRef = useRef(null);

  useImperativeHandle(ref, () => ({
    get element() { return elRef.current; },
    getValue: () => elRef.current?.getValue(),
    setValue: (v) => elRef.current?.setValue(v),
    clear: () => elRef.current?.clear(),
    open: () => elRef.current?.open(),
    close: () => elRef.current?.close(),
    goToMonth: (y, m) => elRef.current?.goToMonth(y, m),
    get value() { return elRef.current?.value; },
    get displayValue() { return elRef.current?.displayValue; },
    get calendarValue() { return elRef.current?.calendarValue; },
    get selectedDates() { return elRef.current?.selectedDates; },
  }));

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const handlers = {};

    if (props.onSelect) {
      handlers['intl-select'] = (e) => props.onSelect(e.detail);
      el.addEventListener('intl-select', handlers['intl-select']);
    }
    if (props.onChange) {
      handlers['intl-change'] = (e) => props.onChange(e.detail);
      el.addEventListener('intl-change', handlers['intl-change']);
    }
    if (props.onNavigate) {
      handlers['intl-navigate'] = (e) => props.onNavigate(e.detail);
      el.addEventListener('intl-navigate', handlers['intl-navigate']);
    }
    if (props.onOpen) {
      handlers['intl-open'] = (e) => {
        const result = props.onOpen(e);
        if (result === false) e.preventDefault();
      };
      el.addEventListener('intl-open', handlers['intl-open']);
    }
    if (props.onClose) {
      handlers['intl-close'] = (e) => {
        const result = props.onClose(e);
        if (result === false) e.preventDefault();
      };
      el.addEventListener('intl-close', handlers['intl-close']);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        el.removeEventListener(event, handler);
      }
    };
  }, [props.onSelect, props.onChange, props.onNavigate, props.onOpen, props.onClose]);

  const attrs = {};
  for (const attr of STRING_ATTRS) {
    const camel = toCamel(attr);
    if (props[camel] !== undefined && props[camel] !== null) {
      attrs[attr] = String(props[camel]);
    }
  }
  for (const attr of BOOLEAN_ATTRS) {
    const camel = toCamel(attr);
    if (props[camel]) {
      attrs[attr] = '';
    }
  }

  // React doesn't handle custom element attributes well with JSX,
  // so we use a ref-based approach
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    for (const [key, val] of Object.entries(attrs)) {
      el.setAttribute(key, val);
    }

    // Remove attrs no longer present
    for (const attr of [...STRING_ATTRS, ...BOOLEAN_ATTRS]) {
      const camel = toCamel(attr);
      if (props[camel] === undefined || props[camel] === null || props[camel] === false) {
        el.removeAttribute(attr);
      }
    }
  });

  return createElement('intl-datepicker', { ref: elRef });
});

IntlDatepicker.displayName = 'IntlDatepicker';

export default IntlDatepicker;
export { IntlDatepicker };
