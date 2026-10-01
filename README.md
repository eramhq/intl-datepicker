# intl-datepicker

[![npm version](https://img.shields.io/npm/v/intl-datepicker.svg)](https://www.npmjs.com/package/intl-datepicker)
[![CI](https://github.com/eramhq/intl-datepicker/actions/workflows/test.yml/badge.svg)](https://github.com/eramhq/intl-datepicker/actions/workflows/test.yml)
[![license](https://img.shields.io/npm/l/intl-datepicker.svg)](LICENSE)

**[Live demo →](https://eramhq.github.io/intl-datepicker/)**  ·  [npm package](https://www.npmjs.com/package/intl-datepicker)

> **Status: pre-1.0 — usable and tested.** Per semver, breaking API changes
> remain possible on minor bumps until 1.0; each one is listed in the
> [CHANGELOG](CHANGELOG.md). If you spot a rough edge, please file an issue.

A framework-agnostic, multi-calendar datepicker Web Component powered by `Intl.DateTimeFormat`.

- **No time-zone bugs** — values are plain ISO dates (`"2026-03-15"`) with no time or zone, so a date never shifts by a day between browser, server and database. [Details](#values--time-zones)
- **14 calendar systems** — Gregorian, Persian, Islamic (3 variants), Hebrew, Buddhist, Japanese, Indian, Ethiopic, Coptic, ROC, and more
- **Locale-aware** — month/day names, digits, first day of the week, weekend days and RTL all come from `Intl`; typed input accepts native digits (۱۴۰۳/۰۵/۱۲)
- **Built-in label translations** for English (default), with opt-in entry points for Persian, Arabic, and Hebrew. Other locales fall back to English; supply your own via the `labels` API
- **Multiple picker types** — date, range, week, multiple, month, year
- **Zero-framework lock-in** — works with vanilla HTML, React, Vue, Svelte, Angular
- **SSR-safe** — importable in Node/Next.js without crashing; rendering is still client-only
- **Form-associated** — participates in `<form>` submission, validation, reset and `<fieldset disabled>`
- **Accessible** — WAI-ARIA grid with labelled column headers, live-region announcements, full keyboard support, `<label for>` support, forced-colors and reduced-motion support
- **Never clipped** — the popup opens in the browser's top layer, above `overflow: hidden`, transforms, z-index stacks and modal `<dialog>`s

## Install

```bash
npm install intl-datepicker
```

## Quick Start

```html
<script type="module">
  import 'intl-datepicker';
</script>

<intl-datepicker></intl-datepicker>
```

### Without a bundler (CDN)

```html
<script type="module" src="https://esm.sh/intl-datepicker@0.3/full"></script>

<intl-datepicker calendar="persian" locale="fa-IR"></intl-datepicker>
```

`/full` registers every calendar and label set in one module, which is the
simplest choice from a CDN.

### Non-Gregorian Calendars

Non-Gregorian calendars must be explicitly imported (they are tree-shakeable):

```js
import 'intl-datepicker';
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa'; // Persian UI strings (optional)
```

```html
<intl-datepicker calendar="persian" locale="fa-IR"></intl-datepicker>
```

Or import all 14 calendars at once:

```js
import 'intl-datepicker/full'; // includes all calendar systems and label sets
```

### Locale Labels

English labels ship with the main bundle. Persian, Arabic, and Hebrew label
sets are tree-shakeable — import the ones you need:

```js
import 'intl-datepicker';
import 'intl-datepicker/labels/fa';
```

```html
<intl-datepicker locale="fa-IR"></intl-datepicker>
```

For any locale without a built-in set (or to override individual strings),
pass a `labels` object via the attribute or property API:

```html
<intl-datepicker labels='{"today": "Now", "dateTooEarly": "Pick {date} or later"}'></intl-datepicker>
```

See `IntlDatepickerLabels` in the type declarations for every key. Keys with
placeholders: `rangeSelected` (`{start}`, `{end}`), `formatHint` and
`invalidDate` (`{format}`, `{example}`), `dateTooEarly`/`dateTooLate` (`{date}`),
`rangeTooShort`/`rangeTooLong`/`minNightsHint`/`maxNightsHint` (`{nights}`).

`nights` is a plural label: a string, or forms keyed by
[`Intl.PluralRules`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules)
category. `{n}` is printed in the picker's numerals:

```js
picker.labels = { nights: { one: '{n} nuit', other: '{n} nuits' } };
// Arabic ships zero/one/two/few/many/other: "ليلة واحدة", "ليلتان", "٣ ليالٍ"
```

## Values & time zones

The picker never deals in time zones. Every value is a calendar date with no
time attached, written in ISO 8601 (Gregorian), whatever calendar the user sees:

| `type` | Value | Example |
|---|---|---|
| `date` | `YYYY-MM-DD` | `2026-03-15` |
| `range` | `start/end` | `2026-03-15/2026-03-20` |
| `week` | ISO week | `2026-W11` |
| `multiple` | comma-separated dates | `2026-03-15,2026-03-18` |
| `month` | Gregorian: `YYYY-MM` · other calendars: see below | `2026-03` |
| `year` | Gregorian: `YYYY` · other calendars: see below | `2026` |

**What to store on the server:** the value string as-is, in a `DATE` column
(or `daterange` for ranges). Don't convert it to a `Date`/timestamp — that
is what introduces the off-by-one-day bugs. `valueAsDate` exists for
convenience and returns local midnight.

**"Today"** (`disable-past`, `disable-future`, the Today button, relative
presets) is the date in the browser's time zone, and it moves at local
midnight even on a calendar that stays open. A business cutoff in another time
zone ("bookings close at 18:00 New York time") should come from the server as
`min`.

### Programmatic values are kept

Like a native `<input>`, any value that parses is kept and displayed, even on
a disabled day, outside `min`/`max` or breaking the range rules. Editing an old
record with `disable-past` shows its past date instead of wiping it. The
problem is reported through validity, in this order:

| Problem | `validity` flag | Message label |
|---|---|---|
| Unreadable typed input | `badInput` | `invalidDate` / `dateUnavailable` |
| `required` and empty | `valueMissing` | `pleaseSelectDate` |
| `required` range with only a start | `valueMissing` | `rangeIncomplete` |
| Before `min` / after `max` | `rangeUnderflow` / `rangeOverflow` | `dateTooEarly` / `dateTooLate` |
| On a disabled day (or a range across one, see below) | `customError` | `dateUnavailable` / `rangeUnavailable` |
| Range shorter than `min-nights` / longer than `max-nights` | `tooShort` / `tooLong` | `rangeTooShort` / `rangeTooLong` |

Only user interaction is restricted: people can't pick an invalid date or
range.

### Month and year values in non-Gregorian calendars

A Persian, Hijri or Hebrew month doesn't line up with a Gregorian month, so
`"2024-07"` can't name one. Month and year values follow the JavaScript
standard [`Temporal.PlainYearMonth`](https://tc39.es/proposal-temporal/docs/plainyearmonth.html)
format instead: the ISO date of the period's first day plus a calendar tag.

```html
<intl-datepicker type="month" calendar="persian" value="2024-07-22[u-ca=persian]"></intl-datepicker>
```

- The first 10 characters are a normal ISO date, so any backend can parse them.
- `Temporal.PlainYearMonth.from(value)` gives you Mordad 1403 directly.
- `type="year"` uses the first day of the year: `"2024-03-20[u-ca=persian]"` is 1403.
- `value`, `min`, `max` and `setValue()` also accept any plain ISO date and
  snap to the month (or year) containing it: `setValue('2024-08-10')` selects Mordad 1403.
- The short `YYYY-MM` / `YYYY` forms are only accepted for `calendar="gregory"`.

The `intl-change` detail (and `getValue()`) gives you all three shapes you
are likely to need:

```js
{
  type: 'month',
  value: '2024-07-22[u-ca=persian]',
  calendar: { year: 1403, month: 5 },   // native numbers, e.g. a payroll key
  start: '2024-07-22',                   // Gregorian bounds, for range queries
  end: '2024-08-21',
  formatted: 'مرداد ۱۴۰۳',
}
```

## Picker Types

### Single Date (default)

```html
<intl-datepicker value="2026-03-15"></intl-datepicker>
```

### Date Range

```html
<intl-datepicker type="range" min="2026-01-01" max="2026-12-31"></intl-datepicker>
```

### Week Picker

```html
<intl-datepicker type="week"></intl-datepicker>
```

The value is the ISO week (Monday-based). The selection itself follows the
locale's week, or `first-day-of-week`, so `start`/`end` in the event detail are
authoritative. The ISO value names the ISO week containing the selection's
Thursday, which is what makes it round-trip for every first day: a week that
starts on Wednesday, Dec 30 is `"…-W53"` or `"…-W01"` depending on where that
Thursday falls. An ISO week in `min`/`max` covers its whole locale week.

### Multiple Dates

```html
<intl-datepicker type="multiple" max-dates="5" sort-dates></intl-datepicker>
```

### Month Picker

```html
<intl-datepicker type="month"></intl-datepicker>
```

### Year Picker

```html
<intl-datepicker type="year"></intl-datepicker>
```

## Range Rules

For `type="range"`, length is counted in **nights**: end − start.

```html
<!-- Hotel: 2–28 nights, check-out may be on someone else's check-in day -->
<intl-datepicker type="range" min-nights="2" max-nights="28" exclude-disabled="nights"
  disabled-dates='["2026-10-20/2026-10-22"]' disable-past></intl-datepicker>
```

| Attribute | Meaning |
|---|---|
| `min-nights` | Shortest range. Unset or `0` allows start = end (one day); `1` forbids it |
| `max-nights` | Longest range |
| `exclude-disabled` (bare, or `"days"`) | No disabled day anywhere in `[start, end]` |
| `exclude-disabled="nights"` | No disabled day in `[start, end − 1]`: the **end may be the first disabled day** |

Without `exclude-disabled`, a range may span disabled days (weekends, holidays
in a leave request); only its start and end must be selectable.

| Booked nights 12–13 | days | nights |
|---|---|---|
| 10 → 11 | ✓ | ✓ |
| 10 → 12 (check out the morning someone checks in) | ✗ | ✓ |
| 10 → 14 | ✗ | ✗ |
| 12 → 14 (check in on a booked night) | ✗ | ✗ |

After the first click:

- Days that can't end a valid range get `aria-disabled` and are skipped by the
  hover preview, which therefore stops at the first booked night. In
  `"nights"` mode the first disabled day after the start stays selectable as
  a check-out day.
- The start itself is never blocked: clicking it again (or Enter) clears it
  when a one-day range isn't allowed.
- The footer shows the limits (`part="range-hint"`, e.g. "Minimum stay:
  2 nights · Maximum: 28 nights"), and the same text is announced.
- Enter on a blocked day selects nothing and announces why ("Choose at least
  2 nights").
- Ranges are evaluated in sorted order, so clicking before the start swaps them.
- `mapDays` receives `isRangeBlocked` and `isCheckoutOnly` for styling, e.g.
  a strike-through on booked days.

Presets that resolve to a range breaking these rules are disabled, never
shortened to fit. Days force-disabled by `mapDays` don't count for
`exclude-disabled`; use `disabled-dates` or `disabledDatesFilter` for
availability. "Check-in only" days aren't supported.

## Attributes

| Attribute | Type | Description |
|---|---|---|
| `calendar` | `string` | Calendar system (see table below). Default: `"gregory"` |
| `locale` | `string` | BCP 47 locale tag. Default: `<html lang>`, then the browser language |
| `numerals` | `string` | Numbering system override, e.g. `latn` for 0–9 in `fa-IR`, `arab` for Arabic-Indic |
| `value` | `string` | Initial value (see [Values & time zones](#values--time-zones)) |
| `type` | `string` | Picker type: `date`, `range`, `week`, `multiple`, `month`, `year` |
| `min` | `string` | Earliest selectable value, same format as `value` |
| `max` | `string` | Latest selectable value, same format as `value` |
| `for` | `string` | ID of an external `<input>` to bind to |
| `placeholder` | `string` | Input placeholder text |
| `name` | `string` | Form field name |
| `inline` | `boolean` | Always-visible calendar (no popup) |
| `disabled` | `boolean` | Disable the picker |
| `readonly` | `boolean` | Read-only input |
| `required` | `boolean` | Mark as required for form validation |
| `show-alternate` | `boolean` | Show the Gregorian equivalent below the calendar |
| `disabled-dates` | `string` | JSON array of ISO dates and inclusive ranges to disable, e.g. `'["2026-01-01","2026-12-20/2027-01-05"]'` |
| `disable-weekends` | `boolean` | Disable the locale's weekend days (Sat–Sun in `en-US`, Fri in `fa-IR`, Fri–Sat in `ar-SA`) |
| `disabled-days-of-week` | `string` | Weekdays to disable: `"5,6"` (0 = Sunday) or `"fri,sat"`. Combines with `disable-weekends` |
| `disable-past` | `boolean` | Disable days before today; for `week`/`month`/`year`, periods before the current one |
| `disable-future` | `boolean` | Disable days after today; for `week`/`month`/`year`, periods after the current one |
| `first-day-of-week` | `string` | `0`–`6` (0 = Sunday) or `sun`…`sat`. Default: the locale's |
| `min-nights` | `number` | Range: minimum nights (see [Range Rules](#range-rules)) |
| `max-nights` | `number` | Range: maximum nights |
| `exclude-disabled` | `string` | Range: no disabled days inside; `"nights"` allows check-out on one |
| `date-separator` | `string` | Separator for multiple date display. Default: `", "` |
| `max-dates` | `number` | Max dates selectable in `multiple` mode |
| `sort-dates` | `boolean` | Auto-sort selected dates in `multiple` mode |
| `months` | `number` | Number of side-by-side month panels (1–3) |
| `presets` | `string` | JSON array of range presets (see below) |
| `no-animation` | `boolean` | Disable open/close animations |
| `show-week-numbers` | `boolean` | Show week numbers using the locale's week rules: first day, and how many days of January week 1 needs (CLDR: 4 in most of Europe, 1 elsewhere) |
| `hide-outside-days` | `boolean` | Hide days from adjacent months |
| `fixed-weeks` | `boolean` | Always render six weeks so the height never changes |
| `caption-layout` | `string` | Header layout: `button` (default), `dropdown`, `dropdown-months`, `dropdown-years` |
| `allow-input` | `boolean` | Allow typing dates into the input (shows a format hint and inline errors) |
| `date-format` | `string` | Segment order for typed input: `auto` (default, from the locale), `YMD`, `DMY`, `MDY` |
| `labels` | `string` | JSON object overriding UI strings (see [Locale Labels](#locale-labels)) |

## Supported Calendars

| `calendar` value | System |
|---|---|
| `gregory` | Gregorian (default) |
| `persian` | Persian (Solar Hijri / Jalali) |
| `islamic` | Islamic (Umm al-Qura) |
| `islamic-umalqura` | Islamic (Umm al-Qura) |
| `islamic-civil` | Islamic (Civil/Tabular) |
| `islamic-tbla` | Islamic (Tabular) |
| `hebrew` | Hebrew |
| `buddhist` | Buddhist |
| `japanese` | Japanese |
| `indian` | Indian National |
| `ethiopic` | Ethiopic |
| `ethioaa` | Ethiopic (Amete Alem) |
| `coptic` | Coptic |
| `roc` | ROC (Minguo/Taiwan) |

Persian leap years follow the astronomical calendar used in Iran (1403 is a
leap year; Esfand 30, 1403 = 2025-03-20), not the 33-year arithmetic rule.

## Events

| Event | `detail` | Description |
|---|---|---|
| `intl-select` | `SelectDetail` | Fired when the user picks a date (click, keyboard, Today, preset, typed input) |
| `intl-change` | `SelectDetail` | Fired whenever the value changes, including `setValue()`/`clear()`. Setting the same value again does not fire |
| `intl-navigate` | `{ year, month, direction, start, end }` | Fired when the user changes the visible month: buttons, dropdowns, the month/year views, keyboard, or Today. `year`/`month` are the first visible month in the active calendar; `start`/`end` are the Gregorian ISO bounds of all visible months |
| `intl-open` | — | Cancelable. Fired before popup opens |
| `intl-close` | — | Cancelable. Fired before popup closes |

### SelectDetail Shape

The `detail` shape depends on the picker type. `{ year, month, day }` objects
are in the active calendar; `value`, and `start`/`end` for month/year, are ISO.

```ts
// type="date"
{ type, value, calendar: { year, month, day }, formatted }

// type="month" | "year"
{ type, value, calendar: { year, month } | { year }, start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', formatted }

// type="range" | "week"
{ type, value, start: { year, month, day }, end: { year, month, day }, formatted }

// type="multiple"
{ type, value, dates: [{ year, month, day }, ...], formatted }
```

## JavaScript API

```js
const picker = document.querySelector('intl-datepicker');

// Properties
picker.value;           // value string (see "Values & time zones")
picker.type;            // 'date' | 'range' | … (reflects the attribute)
picker.valueAsDate;     // native Date (local midnight) or null
picker.displayValue;    // formatted display string
picker.calendarValue;   // CalendarDate object
picker.rangeStart;      // ISO string or null (range/week)
picker.rangeEnd;        // ISO string or null (range/week)
picker.selectedDates;   // CalendarDate[] (multiple)

// Methods
picker.getValue();              // full SelectDetail or null
picker.setValue('2026-04-05');  // set value programmatically
picker.clear();                 // clear selection
picker.open();                  // open popup
picker.close();                 // close popup
picker.goToMonth(2026, 6);      // navigate to a specific month (active calendar)

// Callbacks (set via JS only)
picker.mapDays = ({ date, isToday, isDisabled }) => {
  if (date.dayOfWeek === 5) return { className: 'friday', content: '🎉' };
};

picker.disabledDatesFilter = ({ year, month, day, dayOfWeek, iso }) => {
  return day === 13; // disable all 13ths
};
```

The filter and `mapDays` get the day in the active calendar (`year`, `month`,
`day`), its Gregorian `iso` date (`"2026-03-21"`) for matching backend data,
and `dayOfWeek` from 0 (Sunday) to 6, whatever `first-day-of-week` is.

`presets` and `labels` accept either an array/object or the same JSON string
as the attribute.

## Range Presets

```html
<intl-datepicker
  type="range"
  presets='[
    {"label": "Last 7 days", "value": "-6d/today"},
    {"label": "This month", "value": "monthStart/monthEnd"},
    {"label": "Last month", "value": "prevMonthStart/prevMonthEnd"},
    {"label": "This year", "value": "yearStart/today"}
  ]'
></intl-datepicker>
```

Preset `value` is `start/end`, each one of:
- `today`
- `-Nd` / `+Nd` — N days before/after today
- `monthStart` / `monthEnd` — this month
- `prevMonthStart` / `prevMonthEnd` — last month
- `yearStart` / `yearEnd` — this year
- an ISO date, e.g. `2026-01-01`

Months and years are computed **in the active calendar**: with
`calendar="persian"`, "This month" is the current Persian month.
Results are clamped to `min`/`max` (so "This month" with `disable-future` ends
today). A preset that still breaks the [range rules](#range-rules), such as
"Last 90 days" with `max-nights="30"`, is disabled.

Presets can also be set via JavaScript:

```js
picker.presets = [
  { label: 'This week', value: '-6d/today' },
  { label: 'This month', value: 'monthStart/monthEnd' },
];
```

## Custom Day Rendering (mapDays)

```js
picker.mapDays = (info) => {
  // info: { date, isToday, isSelected, isDisabled, isInRange,
  //         isRangeStart, isRangeEnd, isRangeBlocked, isCheckoutOnly,
  //         isCurrentMonth }
  // date: { year, month, day, dayOfWeek, iso }  (active calendar + ISO)

  return {
    className: 'my-class',     // extra CSS class
    style: 'color: red',       // inline style
    content: '<span>!</span>', // HTML appended inside the cell (trusted HTML only)
    disabled: true,            // force-disable this day
    hidden: true,              // hide this cell
    title: 'Tooltip text',     // title attribute
  };
};
```

## Recipes

### Hotel or rental booking

```html
<intl-datepicker type="range" name="stay" months="2" required disable-past
  min-nights="1" max-nights="28" exclude-disabled="nights"
  disabled-dates='["2026-10-20/2026-10-22","2026-11-03"]'></intl-datepicker>
```

`disabled-dates` lists **booked nights**. Check-in can't be on one; check-out
can be on the first one, since that guest leaves in the morning. Once a
check-in is picked, days past the next booked night are blocked and the
minimum and maximum stay are shown. A value with only a check-in fails
`required` ("Select an end date").

Store `start` and `end` from the value (`"2026-10-03/2026-10-07"`) as two
`DATE` columns. Nights = days between them; no time zone math involved.

### Availability from an API

Load the visible months' availability as the user navigates.
`intl-navigate` gives the visible window as Gregorian `start`/`end`, and the
filter gets each day's Gregorian `iso`, so a Persian or Hijri page queries
and matches the same backend data. A pending check-in survives the update:

```js
const picker = document.querySelector('intl-datepicker');
const booked = new Set();

async function loadAvailability(start, end) {
  const res = await fetch(`/api/booked-nights?from=${start}&to=${end}`); // ["2026-10-20", …]
  for (const iso of await res.json()) booked.add(iso);
  // Assigning the filter re-renders with the new data.
  picker.disabledDatesFilter = ({ iso }) => booked.has(iso);
}

picker.addEventListener('intl-navigate', ({ detail }) => loadAvailability(detail.start, detail.end));
loadAvailability('2026-10-01', '2026-11-30'); // the initially visible months
```

Or set ranges directly: `picker.setAttribute('disabled-dates', JSON.stringify(['2026-10-20/2026-10-22']))`.

### Leave or vacation request

```html
<intl-datepicker type="range" name="leave" disable-weekends
  disabled-dates='["2026-12-24/2026-12-26","2027-01-01"]'></intl-datepicker>
```

No `exclude-disabled`: the request may span weekends and holidays, but can't
start or end on one.

### Clinic appointment

```html
<intl-datepicker name="visit" disable-past disabled-days-of-week="fri"
  disabled-dates='["2026-12-20/2027-01-05"]'></intl-datepicker>
```

### Payroll month (Persian, Hijri, …)

```html
<intl-datepicker type="month" calendar="persian" locale="fa-IR" name="period"></intl-datepicker>
```

```js
picker.addEventListener('intl-change', ({ detail }) => {
  const key = `${detail.calendar.year}-${detail.calendar.month}`; // "1403-5"
  fetch(`/payroll?from=${detail.start}&to=${detail.end}`);         // Gregorian bounds
});
```

### Reports with presets

```html
<intl-datepicker type="range" max-nights="365" disable-future
  presets='[{"label":"Last 30 days","value":"-29d/today"},{"label":"This year","value":"yearStart/today"}]'>
</intl-datepicker>
```

```html
<intl-datepicker type="range" calendar="persian" locale="fa-IR" max="2026-12-31"
  presets='[{"label":"این ماه","value":"monthStart/today"},{"label":"ماه قبل","value":"prevMonthStart/prevMonthEnd"}]'>
</intl-datepicker>
```

### Birth date

Scrolling back decades in a calendar is slow. Let people type, and give them
year and month dropdowns:

```html
<label for="dob">Date of birth</label>
<intl-datepicker id="dob" name="dob" allow-input caption-layout="dropdown"
  min="1900-01-01" disable-future required></intl-datepicker>
```

For a card expiry, `<intl-datepicker type="month" disable-past>` keeps the
current month valid.

`allow-input` shows the expected format under the field (e.g. `Format: MM/DD/YYYY`),
accepts native digits and compact entry (`06171990`), and shows a persistent
error for anything it can't read.

### Hebrew and Gregorian on the same form

```html
<intl-datepicker calendar="hebrew" locale="he-IL" show-alternate></intl-datepicker>
```

The user picks in the Hebrew calendar and sees the Gregorian date underneath;
the submitted value is still ISO.

## CSS Custom Properties

Style the component from the outside:

```css
intl-datepicker {
  --idp-primary: #2563eb;
  --idp-bg: #ffffff;
  --idp-text: #1f2937;
  --idp-border: #d1d5db;
  --idp-hover: #f3f4f6;
  --idp-selected-bg: var(--idp-primary);
  --idp-selected-text: #ffffff;
  --idp-today-border: var(--idp-primary);
  --idp-disabled: #9ca3af;
  --idp-error: #dc2626;
  --idp-radius: 8px;
  --idp-day-size: 40px;           /* never rendered below 24px */
  --idp-font-size: 14px;
  --idp-font-family: system-ui, -apple-system, sans-serif;
  --idp-range-bg: #dbeafe;
  --idp-range-text: var(--idp-text);
  --idp-muted: #6b7280;
  --idp-z-index: 1000;            /* only used without Popover API support */
  --idp-input-min-width: 200px;
  --idp-calendar-min-width: 300px;
}
```

## CSS Shadow Parts

Use `::part()` for deeper styling:

```css
intl-datepicker::part(input) { border-radius: 12px; }
intl-datepicker::part(calendar) { box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
intl-datepicker::part(day) { border-radius: 50%; }
intl-datepicker::part(header) { background: #f0f0f0; }
```

| Part | Element |
|---|---|
| `input-wrapper` | Input container |
| `input` | The `<input>` element |
| `hint` | Format hint under the input (`allow-input`) |
| `error` | Error message for unreadable typed input |
| `calendar` | Calendar panel |
| `header` | Month/year header bar |
| `header-title` | Header title area |
| `nav-prev` | Previous navigation button |
| `nav-next` | Next navigation button |
| `month-dropdown` | Month `<select>` (`caption-layout`) |
| `year-dropdown` | Year `<select>` (`caption-layout`) |
| `weekday` | Weekday column header |
| `day` | Day cell button |
| `month-cell` | Month cell (month picker view) |
| `year-cell` | Year cell (year picker view) |
| `footer` | Footer bar with Today/Clear |
| `today-btn` | "Today" button |
| `clear-btn` | "Clear" button |
| `alternate` | Gregorian alternate display |
| `presets` | Presets sidebar |
| `range-hint` | Minimum/maximum nights while a range start is pending |

A [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest)
ships at `dist/custom-elements.json` (linked from `package.json`), so editors
and Storybook pick up attributes, events, parts and CSS properties.

## External Input Binding

Bind the picker to any existing input:

```html
<input type="text" id="my-input" placeholder="Pick a date">
<intl-datepicker for="my-input" calendar="persian" locale="fa-IR"></intl-datepicker>
```

## Form Integration

```html
<form>
  <label for="birthday">Birthday</label>
  <intl-datepicker id="birthday" name="birthday" required min="1950-01-01" max="2010-12-31"></intl-datepicker>
  <button type="submit">Submit</button>
</form>
```

The component participates in native form submission, validation (`required`,
`min`/`max`, disabled days, range rules, unreadable typed input),
`form.reset()`, and `<fieldset disabled>`. See
[Programmatic values are kept](#programmatic-values-are-kept) for the validity
flags. Validation messages come from the `labels` and are localized for fa, ar
and he.

## Accessibility

- Each month is a `<table role="grid">` named by its month heading, with
  `<th scope="col">` weekday headers that carry the full day name.
- Today has `aria-current="date"`; selected days and range ends say so in their name.
- Month changes from the navigation buttons and every selection are announced
  through one polite live region.
- A `<label for>` or `aria-label` on `<intl-datepicker>` names the inner input.
- Navigation buttons at `min`/`max` stay focusable with `aria-disabled`, and
  so do disabled days: Enter on one announces why it can't be picked.
- While a range start is pending, its length limits are announced with it.
- Focus returns to the input when the popup closes.
- Selected, today and focus states stay visible in Windows high-contrast
  (`forced-colors`), and animations respect `prefers-reduced-motion`.

## Keyboard Navigation

| Key | Where | Action |
|---|---|---|
| `↓` / `Alt+↓` | Input | Open the calendar and focus the selected (or today's) date |
| `Enter` | Input (`allow-input`) | Read the typed date |
| `←` `→` | Days | Previous / next day (mirrored in RTL locales) |
| `↑` `↓` | Days | Same day in the previous / next week |
| `Home` / `End` | Days | First / last day of the week (`first-day-of-week`, else the locale's) |
| `PageUp` / `PageDown` | Days | Previous / next month |
| `Shift+PageUp` / `Shift+PageDown` | Days | Previous / next year |
| `Enter` / `Space` | Days, months, years | Select |
| Arrow keys | Month / year view | Move between cells |
| `Escape` | Anywhere in the popup | Close (month/year view: back to days) and return focus to the input |
| `Tab` | Popup | Cycle through the controls inside the popup |

Keyboard focus never moves outside `min`/`max`.

## Frameworks

### React

```jsx
import IntlDatepicker from 'intl-datepicker/react';

function App() {
  const ref = useRef(null);
  const [value, setValue] = useState('2026-03-15');

  return (
    <IntlDatepicker
      ref={ref}
      calendar="persian"
      locale="fa-IR"
      value={value}
      onChange={(detail) => setValue(detail.value)}
      onSelect={(detail) => console.log(detail)}
      onNavigate={(detail) => console.log(detail)}
      onOpen={(e) => { /* return false to prevent */ }}
      onClose={(e) => { /* return false to prevent */ }}
    />
  );
}
```

Works with React 17–19. Attributes are passed at render time, so the first
paint already uses the right calendar and locale. The built file starts with
`'use client'`, so it can be imported from Next.js App Router server components.

#### Ref API

```js
ref.current.element;        // underlying HTMLElement
ref.current.value;          // value string
ref.current.displayValue;   // formatted string
ref.current.calendarValue;  // CalendarDate
ref.current.selectedDates;  // CalendarDate[]
ref.current.getValue();     // SelectDetail
ref.current.setValue('2026-04-05');
ref.current.clear();
ref.current.open();
ref.current.close();
ref.current.goToMonth(2026, 6);
```

### Vue 3

Tell Vue the tag is a custom element (in `vite.config.js`:
`vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'intl-datepicker' } } })`), then:

```vue
<script setup>
import 'intl-datepicker/full';
import { ref } from 'vue';
const date = ref('');
</script>

<template>
  <intl-datepicker calendar="persian" locale="fa-IR"
    :value="date" @intl-change="date = $event.detail.value" />
</template>
```

### Svelte

```svelte
<script>
  import 'intl-datepicker/full';
  let date = '';
</script>

<intl-datepicker calendar="hebrew" locale="he-IL"
  value={date} on:intl-change={(e) => (date = e.detail.value)} />
```

### Angular

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'intl-datepicker/full';

@Component({
  selector: 'app-date',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<intl-datepicker calendar="islamic" locale="ar-SA"
    [value]="date" (intl-change)="date = $any($event).detail.value"></intl-datepicker>`,
})
export class DateComponent { date = ''; }
```

## TypeScript

Type declarations are included. Imports:

```ts
import 'intl-datepicker';
import type {
  IntlDatepickerElement,
  SelectDetail,
  MonthDetail,
  NavigateDetail,
  DatepickerType,
  MapDaysFn,
  RangePreset,
  DisabledDatesFilterFn,
  DayInfo,
  IntlDatepickerLabels,
  PluralLabel,
} from 'intl-datepicker';

// React
import IntlDatepicker from 'intl-datepicker/react';
import type { IntlDatepickerProps, IntlDatepickerRef } from 'intl-datepicker/react';
```

## Browser Support

Any browser supporting Web Components, form-associated custom elements and
`Intl.DateTimeFormat` calendars:
- Chrome/Edge 77+
- Firefox 98+
- Safari 16.4+

The top-layer popup uses the Popover API (Chrome 114, Firefox 125, Safari 17);
older browsers fall back to a fixed-position popup.

## License

MIT
