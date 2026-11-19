---
title: Practical recipes and troubleshooting
description: Build reporting and availability flows and diagnose common configuration problems.
---

## A Persian reporting month

Use a month picker when a report covers a calendar month rather than an arbitrary range. The following browser entry works with the accompanying markup:

```html
<label for="period">Reporting month</label>
<intl-datepicker id="period" type="month" name="period"
  calendar="persian" locale="fa-IR"
  value="2024-07-22[u-ca=persian]"></intl-datepicker>
<output id="period-bounds"></output>
```

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
const output = document.querySelector('#period-bounds');
function showPeriod(detail) {
  if (!detail || detail.type !== 'month' || !detail.calendar) {
    output.textContent = '';
    return;
  }
  const key = `${detail.calendar.year}-${detail.calendar.month}`;
  output.textContent = `${key}: ${detail.start} / ${detail.end}`;
}
showPeriod(picker.getValue());
picker.addEventListener('intl-change', ({ detail }) => showPeriod(detail));
```

The initial output is `1403-5: 2024-07-22 / 2024-08-21`. Use `start` and `end` as inclusive Gregorian date bounds for a date-column query. If your API uses an exclusive end, convert that boundary explicitly in your application's date layer. The submitted `period` value remains `2024-07-22[u-ca=persian]`. Clearing is handled without dereferencing a null calendar object.

## Refresh availability

For the [booking example](constraints.md#booking-example), the visible window is March–April 2026. The following code assumes your own endpoint returns a JSON array of booked Gregorian ISO nights for the requested window:

```js
import 'intl-datepicker';

const picker = document.querySelector('#stay');
const booked = new Set();
let request;
async function loadAvailability(start, end) {
  request?.abort();
  const current = new AbortController();
  request = current;
  try {
    const query = new URLSearchParams({ from: start, to: end });
    const response = await fetch(`/api/booked-nights?${query}`, {
      signal: current.signal,
    });
    if (!response.ok) throw new Error(`Availability: ${response.status}`);
    const dates = await response.json();
    if (request !== current) return;
    if (!Array.isArray(dates) || dates.some((d) => typeof d !== 'string')) {
      throw new Error('Expected an array of ISO date strings');
    }
    for (const iso of booked) {
      if (iso >= start && iso <= end) booked.delete(iso);
    }
    for (const iso of dates) booked.add(iso);
    picker.disabledDatesFilter = ({ iso }) => booked.has(iso);
  } catch (error) {
    if (error.name !== 'AbortError') console.error(error);
  }
}
picker.addEventListener('intl-navigate', ({ detail }) => {
  loadAvailability(detail.start, detail.end);
});
loadAvailability('2026-03-01', '2026-04-30');
```

For a response containing `2026-03-20`, that night becomes unavailable. Assigning the filter updates the view while retaining a pending start. This is an application endpoint contract, not an API supplied by the package. Validate the response's actual dates, show loading/error state, and prevent submission when required availability is unknown. Abort outstanding work when your view unmounts.

The example retains loaded windows and replaces dates within a refreshed window. A booking spanning other windows still needs availability for the whole stay. The server must recheck inventory; disabled calendar cells are not a reservation lock. The fixed `disabled-dates` from the booking example continues to apply alongside the filter.

## Leave spanning a weekend

Import the base module. Omit `exclude-disabled` when a request may include weekends but must begin and end on an available day:

```html
<intl-datepicker type="range" locale="en-US" name="leave"
  disabled-days-of-week="sat,sun"
  disabled-dates='["2026-03-17"]'
  value="2026-03-13/2026-03-18"></intl-datepicker>
```

The initial range is valid despite the weekend and March 17 inside it. The output is `2026-03-13/2026-03-18`. If every included day must be available, add `exclude-disabled="days"`; that same value stays visible but fails validity.

## Meeting times and UTC

Offer meeting slots every 15 minutes from 9:00, and send the server an instant:

```html
<intl-datepicker id="meeting" name="meeting" time minute-step="15"
  default-time="09:00" min="2026-03-16T09:00" locale="en-GB"></intl-datepicker>
```

```js
import 'intl-datepicker';

const picker = document.querySelector('#meeting');
picker.addEventListener('intl-change', () => {
  // '2026-03-16T09:30' read in the browser's time zone, then as UTC.
  const utc = picker.valueAsDate?.toISOString() ?? null;
  console.log(picker.value, utc);
});
```

Picking 16 March gives `2026-03-16T09:00`; choosing `30` in the minute menu gives `2026-03-16T09:30`. In Tehran (UTC+03:30) `utc` is `2026-03-16T06:00:00.000Z`. `valueAsDate` uses the runtime's time zone. For another zone, convert with Temporal instead: `Temporal.PlainDateTime.from(picker.value).toZonedDateTime('Asia/Tehran').toInstant().toString()`. The submitted form field stays the wall-clock `value`.

## Common configuration problems

| Symptom | Check |
| --- | --- |
| Persian locale but Gregorian calendar | Import `/calendars/persian` and set `calendar="persian"` |
| Persian month names but English buttons | Import `/labels/fa` before creating the element |
| Unknown calendar warning | Use the module mapping in [installation](installation.md); variants share modules |
| Bare import fails in an HTML file | Use a bundler, import map, or the documented ESM CDN example |
| A new value is ignored | Match the picker type; non-Gregorian month/year needs an ISO day, not a short native year/month |
| Wrong day after saving | Keep the date-only value; inspect timestamp conversion outside the picker |
| No FormData field | Check `name`, empty value, disabled/fieldset state, and ElementInternals support |
| No event after changing an attribute | Attribute changes are silent; use `.value`/`setValue()` for value change events |
| Typed full range fails | Typed input accepts one active-calendar day at a time |
| Styling internal classes has no effect | Use CSS variables, public parts, or `mapDays` inline styles |
| Calendar clipped without Popover | Avoid transformed/clipping ancestors or use `inline` |
| JavaScript property does nothing | Only declared public setters work; use attributes for other settings |

Malformed JSON attributes are ignored. Boolean attributes such as `required`, `disabled`, and `allow-input` are true when present, even with the text `"false"`. Do not rely on parsing to validate untrusted backend payloads: for example, ISO week 53 is not checked against the actual number of weeks in that year, and range parsing ignores extra slash-separated segments.

## Readonly and custom inputs

Current readonly handling is incomplete for inline calendars, external `for` triggers, and direct `open()` calls: selection controls can remain usable. Use a static formatted value when you need a read-only presentation. `disabled` changes interaction and native submission semantics, so it is not an equivalent replacement for a read-only submitted field.

External and slotted inputs require application-owned state and accessibility wiring. Prefer the built-in input unless you need a custom trigger. Initial external text synchronization and `allow-input` behavior are described in [forms](forms.md#custom-inputs).

## Verify in your application

Keep locale and dates explicit in automated checks. Test cleared values, invalid retained values, incomplete ranges, form reset, and switching calendars. Run native form and focus checks in a real browser; a DOM simulator does not reproduce every ElementInternals or popup behavior. Framework examples show integration patterns, not an exhaustive compatibility matrix.
