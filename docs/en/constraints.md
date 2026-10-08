---
title: Constraints, range rules, and presets
description: Restrict selectable dates, model unavailable nights, and offer predefined ranges.
---

## Bounds and unavailable dates

| Setting | Behavior |
| --- | --- |
| `min`, `max` | Inclusive bounds; use ISO days for date/range/multiple, ISO weeks or days for week, period values or ISO days for month/year |
| `disabled-dates` | JSON array of ISO days or inclusive ISO ranges |
| `disable-weekends` | Uses the locale's weekend days |
| `disabled-days-of-week` | Comma-separated `0`–`6` or `sun`–`sat`; combines with weekends |
| `disabledDatesFilter` | JavaScript callback returning `true` to disable a day |
| `disable-past`, `disable-future` | Narrow bounds relative to browser-local today; keep the current week/month/year for period types |

Do not pass `start/end` or comma-separated lists as `min`/`max` for range/multiple: their bounds are single ISO days. Invalid bounds are ignored. Keep `min <= max`; there is no useful empty-window UI contract for contradictory bounds.

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.setAttribute('min', '2026-03-01');
picker.setAttribute('max', '2026-03-31');
picker.setAttribute('disabled-dates', JSON.stringify([
  '2026-03-12/2026-03-13',
  '2026-03-25',
]));
picker.disabledDatesFilter = ({ iso, dayOfWeek }) =>
  iso === '2026-03-20' || dayOfWeek === 0;
```

With a date picker, March 20 and Sundays cannot be picked, in addition to the explicit unavailable dates and bounds. The filter receives `{ year, month, day, dayOfWeek, iso }`: numeric fields use the active calendar; `iso` is Gregorian; Sunday is always weekday `0`. Assigning a new filter refreshes the view and validity. A thrown filter error is caught and does not disable the day, so handle failures in your availability-loading code.

Invalid `disabled-dates` entries are ignored; reversed intervals are reordered. Day rules apply to date/multiple/range. Month/year select whole periods, and week has [limited per-day checking](picker-types.md#week).

## Range rules

For `type="range"`, nights are the calendar-day difference `end - start`.

| Setting | Rule |
| --- | --- |
| `min-nights` | Minimum nights; absent or `0` allows the same start and end |
| `max-nights` | Maximum nights; absent means no length limit |
| `exclude-disabled` or `exclude-disabled="days"` | Every day in the inclusive range must be available |
| `exclude-disabled="nights"` | Every night in `[start, end)` must be available; the end may be the first disabled day |
| No `exclude-disabled` | Only the endpoints must be available; interior disabled days are allowed |

The checkout exception never permits an end outside `min`/`max`. A disabled start remains forbidden. Ranges are evaluated in chronological order even when selected backwards. `min-nights="1"` disallows a same-day range. In HTML, `exclude-disabled="false"` still enables days mode: remove the attribute to disable it.

## Booking example

This fixed booking window stays reproducible even after the example dates pass. Import only the base module, then use:

```html
<intl-datepicker id="stay" type="range" name="stay" locale="en-GB"
  months="2" required min="2026-03-01" max="2026-04-30"
  min-nights="2" max-nights="14" exclude-disabled="nights"
  disabled-dates='["2026-03-12/2026-03-13","2026-03-25"]'
  value="2026-03-08/2026-03-12"></intl-datepicker>
```

The initial value `2026-03-08/2026-03-12` is valid: four nights, with checkout on the first unavailable night. A stay through March 14 is invalid because it includes booked nights. A March 8–9 stay is too short. After choosing a start, blocked endpoints receive `aria-disabled`, a stay-length hint appears, and keyboard selection of a blocked endpoint announces the reason.

Use [forms](forms.md) to require a complete range. The component does not reserve inventory or handle concurrent bookings; recheck availability when processing the reservation. It does not support a separate check-in-only rule.

`mapDays` can decorate checkout-only and blocked days using `isCheckoutOnly` and `isRangeBlocked`, but its `disabled` result does not participate in range scanning or form validity. Put availability rules in `disabled-dates` or `disabledDatesFilter`.

## Presets

Presets appear only in range mode. They accept an array through the property or a JSON array through the attribute.

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.type = 'range';
picker.presets = [
  { label: 'March reporting window', value: '2026-03-01/2026-03-07' },
  { label: 'Last seven days', value: '-6d/today' },
  { label: 'Previous calendar month', value: 'prevMonthStart/prevMonthEnd' },
];
```

On an unconstrained picker, the first preset produces `2026-03-01/2026-03-07`. The other presets intentionally depend on today. Each endpoint can be:

- A valid Gregorian ISO day or `today`.
- `-Nd` or `+Nd` for a signed day offset from today.
- `monthStart` / `monthEnd` (also `startOfMonth` / `endOfMonth`).
- `prevMonthStart` / `prevMonthEnd`.
- `yearStart` / `yearEnd` (also `startOfYear` / `endOfYear`).

Months and years are calculated in the active calendar. Endpoints are first clamped to effective min/max, then range rules are checked. A preset failing the rules is disabled; it is not shortened to satisfy `max-nights` or availability. Use valid fixed ISO dates in preset definitions; this resolver is not a strict input validator.

## Programmatic values and validity

A parseable programmatic value outside bounds, on an unavailable date, or breaking range rules is retained. This lets an old reservation remain visible while the user corrects it. `checkValidity()` exposes the problem; it does not clear the value. Multiple-date values are a separate case: `max-dates` truncates newly assigned lists. See [values and events](values-and-events.md) and the [validity table](forms.md#validation).
