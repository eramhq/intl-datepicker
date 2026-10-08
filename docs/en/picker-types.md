---
title: Picker types and output formats
description: Choose among six selection modes and understand their serialized and structured values.
---

## Picker types

Import `intl-datepicker` for these Gregorian examples. Set `type` before setting a value; an absent or unknown type uses `date` (unknown types also warn).

| Type | Nonempty `value` example | Meaning |
| --- | --- | --- |
| `date` | `2026-03-15` | One Gregorian day |
| `range` | `2026-03-15/2026-03-20` | Ordered start and end; a pending start is `2026-03-15` |
| `week` | `2026-W11` | ISO week identifier; selection boundaries follow the configured week |
| `multiple` | `2026-03-15,2026-03-18` | Comma-separated Gregorian days |
| `month` | `2026-03` | Gregorian month |
| `year` | `2026` | Gregorian year |

No selection serializes as `''` for every type. Date/range/week/multiple output remains Gregorian/ISO regardless of the visible calendar. Non-Gregorian month/year output is described below.

## Date and range

```html
<intl-datepicker value="2026-03-15"></intl-datepicker>
<intl-datepicker type="range" value="2026-03-15/2026-03-20"></intl-datepicker>
```

A range's first click selects a start, its second click completes the range. Clicking an earlier end sorts the endpoints. A later selection begins a new range. If a same-day range is prohibited, clicking the pending start again clears it. Use `required` when a start without an end must fail validation. Range length is end minus start, measured in nights; it is five nights in this example. See [range rules](constraints.md#range-rules).

## Week

```html
<intl-datepicker type="week" locale="en-GB" first-day-of-week="mon"
  value="2026-W11" show-week-numbers></intl-datepicker>
```

Here `rangeStart` is `2026-03-09` and `rangeEnd` is `2026-03-15`. The value names the ISO week containing the selection's Thursday. Week boundaries follow `first-day-of-week`, or the locale if it is omitted. Read `rangeStart`/`rangeEnd` for Gregorian bounds; event `start`/`end` objects are in the active calendar. Changing week conventions can therefore change the represented date span.

A plain ISO day is also accepted and selects its containing locale week. Week values in `min`/`max` expand to that whole locale week; ISO day bounds remain day-precise. Visible week numbers use locale rules and are not necessarily the ISO number in `value`.

Week mode tests the day clicked for availability, then selects its entire week. It does not require every day of that week to be available. A week crossing a day-precise min/max can be selected and subsequently fail validity. For booking availability, use `range` with explicit [rules](constraints.md).

## Multiple dates

```html
<intl-datepicker type="multiple" max-dates="3" sort-dates
  value="2026-03-18,2026-03-15" date-separator=" | "></intl-datepicker>
```

The value becomes `2026-03-15,2026-03-18`; `date-separator` changes only the displayed text. Clicking toggles a day, and the popup remains open. An already selected day can be removed even if it later becomes disabled.

Programmatic lists deduplicate dates and discard invalid entries. With `max-dates`, the first N valid unique entries are kept, then sorting is applied. Reducing `max-dates` after selection does not immediately trim the current list. `selectedDates` contains `CalendarDate` objects in the active calendar; treat it as read-only.

## Month and year

```html
<intl-datepicker type="month" value="2026-03"></intl-datepicker>
<intl-datepicker type="year" value="2026"></intl-datepicker>
```

These open directly in the month or year view. A selected period is represented by its first day internally. `getValue()` additionally supplies the period's inclusive Gregorian `start` and `end` strings. Day-specific disabled rules do not disable whole months or years; use period bounds and application validation.

For non-Gregorian calendars, first import the calendar module:

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';
```

```html
<intl-datepicker type="month" calendar="persian" locale="fa-IR"
  value="2024-07-22[u-ca=persian]"></intl-datepicker>
<intl-datepicker type="year" calendar="persian" locale="fa-IR"
  value="2024-03-20[u-ca=persian]"></intl-datepicker>
```

The first selects Mordad 1403, with bounds `2024-07-22` through `2024-08-21`. The second selects year 1403, with bounds `2024-03-20` through `2025-03-20`. These strings combine the period's first Gregorian day with `[u-ca=...]`; short `1403-05` or `1403` values are not accepted for Persian month/year pickers.

Any plain ISO day can select its containing period: setting the Persian month picker to `2024-08-10` produces `2024-07-22[u-ca=persian]`. This snapping also applies to month/year `min` and `max`. The annotation does not switch the active calendar; `calendar` determines interpretation. The `islamic` alias serializes its annotation as `islamic-umalqura`.

Japanese year navigation uses Gregorian years labelled with their eras, including both eras for a transition year. Structured event objects contain numeric year/month/day fields without an era field; use ISO values and bounds when persisting era-sensitive dates.
