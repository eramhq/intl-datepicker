---
title: Calendars, language, digits, and RTL
description: Configure the calendar independently from locale and translate the interface labels.
---

## Calendar and locale are separate

`calendar` chooses the calendar used for selection and arithmetic. It defaults to `gregory`, regardless of locale. `locale` chooses date names, display conventions, default digits, week conventions, and direction. Its default is the document's `lang`, then the browser language, with `en-US` as the environment fallback.

| Calendar identifier | Calendar system | Optional calendar module |
| --- | --- | --- |
| `gregory` | Gregorian | Included |
| `persian` | Persian / Solar Hijri | `persian` |
| `islamic`, `islamic-umalqura` | Umm al-Qura | `islamic` |
| `islamic-civil` | Civil Islamic | `islamic` |
| `islamic-tbla` | Tabular Islamic | `islamic` |
| `hebrew` | Hebrew | `hebrew` |
| `buddhist` | Buddhist | `buddhist` |
| `japanese` | Japanese eras | `japanese` |
| `indian` | Indian national | `indian` |
| `ethiopic`, `ethioaa` | Ethiopic / Amete Alem | `ethiopic` |
| `coptic` | Coptic | `coptic` |
| `roc` | Minguo / Taiwan | `roc` |

Use `intl-datepicker/calendars/<module>` from the last column. These are 14 accepted identifiers, including aliases and variants. The `islamic` alias uses Umm al-Qura for both arithmetic and formatting. Persian calculations follow the dependency's calendar implementation; the tests verify that Esfand 30, 1403 is `2025-03-20`.

## Persian calendar with Persian labels

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';
```

```html
<label for="persian-date">تاریخ</label>
<intl-datepicker id="persian-date" calendar="persian" locale="fa-IR"
  value="2024-03-20" allow-input></intl-datepicker>
```

The selected calendar date is `{ year: 1403, month: 1, day: 1 }`. The machine value is `2024-03-20`; the input normally displays `۱۴۰۳/۰۱/۰۱`. Exact localized punctuation and spacing depend on the browser's `Intl` data. This example imports both the calendar and interface translation: date-name localization alone does not translate buttons or validation messages.

## Digits and direction

Set `numerals="latn"` for Latin digits in a Persian interface, or another supported numbering-system identifier such as `arab`. This changes display, not the ASCII machine value.

The component detects RTL from `locale` and sets its own `dir="rtl"`; horizontal keyboard movement follows that direction. Setting an unrelated ancestor's `dir` does not change the calendar's locale or keyboard rules. Configure `locale` explicitly when direction matters.

`first-day-of-week` accepts `0`–`6` (Sunday is `0`) or `sun` through `sat`. Weekends come from locale week information with internal fallbacks. Use explicit `disabled-days-of-week` when business rules must not depend on runtime locale data. See [constraints](constraints.md).

## Locale labels

English is always available. Import `/labels/fa`, `/labels/ar`, or `/labels/he` for Persian, Arabic, or Hebrew. Resolution is English defaults, then registered language defaults, then your overrides. The language prefix is used (`fa-IR` uses `fa`). Other languages keep English interface labels until you supply overrides.

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.labels = {
  today: 'Current day',
  dateTooEarly: 'Choose {date} or later',
  nights: { one: '{n} night', other: '{n} nights' },
};
```

A `labels` attribute accepts the same object as JSON. Property overrides take precedence over attribute overrides per key. Assign a new object to update it; mutating the returned object is not an update API. `labels` reads the resolved strings. Empty override strings are ignored.

| Keys | Purpose and placeholders |
| --- | --- |
| `today`, `clear`, `clearDate` | Footer and input clear controls |
| `datePicker`, `rangePresets`, `calendarNavigation` | Accessible region names |
| `monthSelection`, `yearSelection` | Picker view names |
| `previousMonth`, `nextMonth`, `previousDecade`, `nextDecade` | Navigation; year pages contain 20 years despite the key name |
| `selectMonth`, `selectYear`, `weekNumber` | Header controls and week column |
| `selected`, `rangeStart`, `rangeEnd` | State appended to accessible day names |
| `rangeSelected` | Completed range announcement: `{start}`, `{end}` |
| `formatHint`, `invalidDate` | Typed input: `{format}`, `{example}` |
| `dateUnavailable`, `pleaseSelectDate` | Unavailable or required date |
| `dateTooEarly`, `dateTooLate` | Bound errors: `{date}` |
| `rangeTooShort`, `rangeTooLong` | Length errors: `{nights}` |
| `rangeUnavailable`, `rangeIncomplete` | Unavailable range or missing end |
| `minNightsHint`, `maxNightsHint` | Pending range guidance: `{nights}` |
| `nights` | String with `{n}`, or plural forms with a required `other` form |

Plural categories use `Intl.PluralRules`; `{n}` uses the selected numerals. See `IntlDatepickerLabels` and `PluralLabel` in the [type reference](values-and-events.md#typescript).

## Switch calendars while retaining the selected day

Use this browser module with the Persian example above:

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.setValue('2024-03-20');
picker.setAttribute('calendar', 'gregory');
picker.setAttribute('locale', 'en-GB');
console.log(picker.value); // 2024-03-20
picker.setAttribute('calendar', 'persian');
picker.setAttribute('locale', 'fa-IR');
console.log(picker.getValue().calendar); // { year: 1403, month: 1, day: 1 }
```

For `date`, the underlying day is retained. Calendar/locale attribute changes do not emit `intl-change`; read the value after the change if your application needs it. Month/year switching selects the new calendar period containing the previous period's first day, so its serialized value and bounds can change. A week can also change boundaries when its week convention changes.
