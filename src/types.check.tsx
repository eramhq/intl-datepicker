// Compile-only checks for the published declarations: `npm run typecheck`.
// Never imported at runtime.
import { createRef } from 'react';
import IntlDatepicker, { type IntlDatepickerRef } from './react/index.js';
import type {
  IntlDatepickerElement,
  IntlDatepickerLabels,
  DisabledDatesFilterFn,
  MapDaysFn,
  SelectDetail,
} from './intl-datepicker.js';

// ── Element, properties and event map ──

const el: IntlDatepickerElement = document.createElement('intl-datepicker');
el.value = '2026-03-08/2026-03-12';
el.type = 'range';

el.addEventListener('intl-change', (e) => {
  const detail: SelectDetail = e.detail;
  if (detail.type === 'range') console.log(detail.start?.year, detail.end?.day);
  if (detail.type === 'month') console.log(detail.calendar?.month, detail.start);
});
el.addEventListener('intl-navigate', (e) => console.log(e.detail.year, e.detail.direction));
el.addEventListener('intl-open', (e) => e.preventDefault());

const filter: DisabledDatesFilterFn = ({ iso, dayOfWeek }) => iso === '2026-12-25' || dayOfWeek === 5;
el.disabledDatesFilter = filter;

const mapDays: MapDaysFn = (info) => {
  if (info.isCheckoutOnly) return { className: 'checkout', title: 'Check-out only' };
  if (info.isRangeBlocked) return { style: 'text-decoration: line-through' };
  return info.date.iso.endsWith('-01') ? { content: '•' } : null;
};
el.mapDays = mapDays;

const labels: IntlDatepickerLabels = {
  nights: { one: '{n} night', other: '{n} nights' },
  rangeTooShort: 'Choose at least {nights}',
  rangeIncomplete: 'Select an end date',
};
el.labels = labels;
el.labels = { nights: '{n} شب' };
// @ts-expect-error plural forms need `other`
el.labels = { nights: { one: '{n} night' } };

// @ts-expect-error the deprecated alias was removed in 0.4
el.isDateDisabled = filter;

const valid: boolean = el.checkValidity() && el.validity.valueMissing;
console.log(valid, el.getValue()?.value);

// ── React wrapper ──

const ref = createRef<IntlDatepickerRef>();

export const booking = (
  <IntlDatepicker
    ref={ref}
    type="range"
    minNights={2}
    maxNights="28"
    excludeDisabled="nights"
    firstDayOfWeek="mon"
    disablePast
    disabledDaysOfWeek="fri,sat"
    mapDays={mapDays}
    onChange={(detail) => console.log(detail.value, ref.current?.value)}
  />
);

export const leave = <IntlDatepicker type="range" excludeDisabled disableFuture firstDayOfWeek={1} />;

// @ts-expect-error not an exclude-disabled mode
export const badMode = <IntlDatepicker excludeDisabled="weeks" />;

// @ts-expect-error the deprecated alias was removed in 0.4
export const oldAlias = <IntlDatepicker isDateDisabled={filter} />;

// ── Raw custom element in JSX ──

export const raw = <intl-datepicker type="range" min-nights="2" exclude-disabled="nights" disable-past />;

// @ts-expect-error not a picker type
export const badType = <intl-datepicker type="time" />;
