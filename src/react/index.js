// The built file gets a 'use client' banner (added in vite.config.js after
// minification) so Next.js App Router treats it as a Client Component.
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Ensure the web component is registered
import '../intl-datepicker.js';

const BOOLEAN_ATTRS = [
  'inline', 'disabled', 'readonly', 'required', 'show-alternate',
  'disable-weekends', 'sort-dates', 'no-animation',
  'show-week-numbers', 'hide-outside-days', 'allow-input',
  'fixed-weeks',
];

const STRING_ATTRS = [
  'calendar', 'locale', 'numerals', 'value', 'type', 'min', 'max',
  'for', 'placeholder', 'name',
  'disabled-dates', 'date-separator', 'max-dates',
  'months', 'date-format', 'caption-layout',
];

// Camel-cased lookup of every attribute name we manage so we can route
// unknown props to the underlying element via JSX.
const ATTR_NAMES = new Set([...BOOLEAN_ATTRS, ...STRING_ATTRS, 'presets', 'labels']);
const CAMEL_TO_ATTR = new Map();
for (const attr of ATTR_NAMES) {
  CAMEL_TO_ATTR.set(toCamel(attr), attr);
}

// Event handler props that we wire up imperatively.
const EVENT_HANDLER_PROPS = new Set([
  'onSelect', 'onChange', 'onNavigate', 'onOpen', 'onClose',
]);

// JS-only properties that must be assigned via the property setter, never
// via setAttribute (functions, arrays, plain objects).
const PROPERTY_KEYS = new Set([
  'mapDays', 'disabledDatesFilter', 'isDateDisabled',
]);

// Props accepted in two forms: a JS value (object/array → property setter)
// or a string (JSON → attribute). Mapped to a predicate that recognizes
// the JS form.
const DUAL_PROPS = {
  presets: Array.isArray,
  labels: (v) => v && typeof v === 'object' && !Array.isArray(v),
};

function toCamel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

const IntlDatepicker = forwardRef(function IntlDatepicker(props, ref) {
  const elRef = useRef(null);
  // Last values assigned to JS-only properties. Getters can't be compared
  // (labels returns the resolved set), and re-assigning re-renders the panel.
  const assignedRef = useRef({});

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

  // Bucket each prop into one of: HTML attribute, JS-only property, or
  // standard DOM prop forwarded through createElement (className, style, id,
  // aria-*, data-*, children). Attributes go straight into createElement so
  // the element connects with the right calendar/locale/type on first paint.
  // React 18 sets them as attributes; React 19 assigns the ones the element
  // exposes as properties (value, type, name, numerals), which it handles.
  const elementProps = { ref: elRef };
  const propPairs = {};
  const { children } = props;

  for (const key of Object.keys(props)) {
    if (key === 'children' || key === 'ref') continue;
    if (EVENT_HANDLER_PROPS.has(key)) continue;

    const val = props[key];

    if (PROPERTY_KEYS.has(key)) {
      propPairs[key] = val ?? null;
      continue;
    }

    if (key in DUAL_PROPS) {
      // JSON strings are plain attributes; objects/arrays need the setter.
      if (DUAL_PROPS[key](val)) propPairs[key] = val;
      else if (typeof val === 'string' && val.length > 0) elementProps[key] = val;
      else if (val == null) propPairs[key] = null;
      continue;
    }

    const attrName = CAMEL_TO_ATTR.get(key);
    if (attrName) {
      if (BOOLEAN_ATTRS.includes(attrName)) {
        // Never pass `false`: React 18 would write the string "false".
        if (val) elementProps[attrName] = '';
      } else if (val !== undefined && val !== null && val !== false) {
        elementProps[attrName] = String(val);
      }
      continue;
    }

    elementProps[key] = val;
  }

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const assigned = assignedRef.current;
    for (const [name, value] of Object.entries(propPairs)) {
      if (name in assigned && assigned[name] === value) continue;
      assigned[name] = value;
      el[name] = value;
    }
  });

  return createElement('intl-datepicker', elementProps, children);
});

IntlDatepicker.displayName = 'IntlDatepicker';

export default IntlDatepicker;
export { IntlDatepicker };
