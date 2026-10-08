# intl-datepicker

[![npm version](https://img.shields.io/npm/v/intl-datepicker.svg)](https://www.npmjs.com/package/intl-datepicker)
[![CI](https://github.com/eramhq/intl-datepicker/actions/workflows/test.yml/badge.svg)](https://github.com/eramhq/intl-datepicker/actions/workflows/test.yml)
[![license](https://img.shields.io/npm/l/intl-datepicker.svg)](LICENSE)

A multi-calendar datepicker Web Component using `Intl.DateTimeFormat` for display and `@internationalized/date` for calendar arithmetic. Select a date, range, week, multiple dates, month, or year. The package includes a React wrapper and works as a custom element in other frameworks.

**[English documentation](docs/en/overview.md) · [راهنمای فارسی](docs/fa/overview.md) · [Live demo](https://eramhq.github.io/intl-datepicker/) · [npm](https://www.npmjs.com/package/intl-datepicker)**

The API is pre-1.0; minor releases may include breaking changes. Read the [changelog](CHANGELOG.md) when upgrading.

## Install

```sh
npm install intl-datepicker
```

## Quick Start

In an application with an ES module bundler, import the element in the browser entry:

```js
import 'intl-datepicker';
```

```html
<label for="appointment">Appointment date</label>
<intl-datepicker id="appointment" name="appointment"
  locale="en-US" value="2026-03-15"></intl-datepicker>
```

After the element is on the page:

```js
const picker = document.querySelector('intl-datepicker');
console.log(picker.value); // 2026-03-15
picker.addEventListener('intl-change', ({ detail }) => {
  console.log(detail.value);
});
```

Styles are included. The base entry registers Gregorian selection and English labels. Calendar and locale are independent; optional modules register additional calendars and translations.

### Without a bundler (CDN)

See the pinned [ES module CDN example](docs/en/installation.md#without-a-bundler).

### Non-Gregorian Calendars

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';
```

```html
<intl-datepicker calendar="persian" locale="fa-IR"
  value="2024-03-20"></intl-datepicker>
```

The selected day is 1 Farvardin 1403; `value` remains `2024-03-20`. Use `intl-datepicker/full` only when you want all calendar and label modules.

### Locale Labels

[Translate buttons, errors, and accessible names](docs/en/localization.md#locale-labels). English is included; Persian, Arabic, and Hebrew are optional imports. Other languages can supply a `labels` object.

## Values & time zones

Values represent dates or periods, not timestamps. Day values are Gregorian ISO strings. Non-Gregorian month/year values include calendar annotations. [Storage, time zones, and valueAsDate](docs/en/values-and-events.md#values-and-time-zones).

### Programmatic values are kept

Parseable values can remain selected while violating bounds or availability. Native validity reports these problems. [Assignment semantics](docs/en/values-and-events.md#assigning-and-reading-a-value) and [validation flags](docs/en/forms.md#validation).

### Month and year values in non-Gregorian calendars

[Annotated period values and Gregorian bounds](docs/en/picker-types.md#month-and-year).

## Picker Types

[All six picker types and actual output formats](docs/en/picker-types.md#picker-types).

### Single Date (default)

[Date selection](docs/en/picker-types.md#date-and-range).

### Date Range

[Range selection](docs/en/picker-types.md#date-and-range).

### Week Picker

[ISO week values and locale week boundaries](docs/en/picker-types.md#week).

### Multiple Dates

[Multiple selection, sorting, and limits](docs/en/picker-types.md#multiple-dates).

### Month Picker

[Month values](docs/en/picker-types.md#month-and-year).

### Year Picker

[Year values](docs/en/picker-types.md#month-and-year).

## Range Rules

[Stay lengths, unavailable nights, and checkout rules](docs/en/constraints.md#range-rules), with a deterministic [booking example](docs/en/constraints.md#booking-example).

## Attributes

Attributes are documented by task: [calendar, locale, numerals, and labels](docs/en/localization.md), [type and selection options](docs/en/picker-types.md), [bounds and range rules](docs/en/constraints.md), [name, required, disabled, readonly, and for](docs/en/forms.md), [layout and appearance](docs/en/styling.md#layout-options), and [allow-input, date-format, and keyboard behavior](docs/en/accessibility.md).

## Supported Calendars

[Identifiers and module mapping](docs/en/localization.md#calendar-and-locale-are-separate).

## Events

[Event timing, cancellation, and payloads](docs/en/values-and-events.md#events).

### SelectDetail Shape

[Structured event details](docs/en/values-and-events.md#structured-event-details).

## JavaScript API

[Public properties and methods](docs/en/values-and-events.md#public-properties-and-methods).

## Range Presets

[Fixed and relative presets](docs/en/constraints.md#presets).

## Custom Day Rendering (mapDays)

[Decorating days and trusted content](docs/en/styling.md#decorate-days-with-mapdays).

## Recipes

[Reporting periods, API availability, leave requests, and troubleshooting](docs/en/recipes.md). Also see [calendar switching](docs/en/localization.md#switch-calendars-while-retaining-the-selected-day) and [booking ranges](docs/en/constraints.md#booking-example).

### Hotel or rental booking

[Booking range with unavailable nights](docs/en/constraints.md#booking-example).

### Availability from an API

[Refresh availability when the visible window changes](docs/en/recipes.md#refresh-availability).

### Leave or vacation request

[Leave spanning unavailable interior days](docs/en/recipes.md#leave-spanning-a-weekend).

### Clinic appointment

[Bounds, explicit weekdays, and availability filters](docs/en/constraints.md#bounds-and-unavailable-dates).

### Payroll month (Persian, Hijri, …)

[Persian reporting month and inclusive Gregorian bounds](docs/en/recipes.md#a-persian-reporting-month).

### Reports with presets

[Fixed and relative reporting presets](docs/en/constraints.md#presets).

### Birth date

[Typed input and month/year dropdowns](docs/en/accessibility.md#label-the-picker).

### Hebrew and Gregorian on the same form

Import `intl-datepicker/calendars/hebrew` and `intl-datepicker/labels/he` before the base entry, then set `calendar="hebrew" locale="he-IL" show-alternate`. The submitted day remains Gregorian ISO. [Calendar imports](docs/en/installation.md#entry-points) and [alternate display](docs/en/styling.md#layout-options).

## CSS Custom Properties

[Theme variables and defaults](docs/en/styling.md#css-variables).

## CSS Shadow Parts

[Public shadow parts](docs/en/styling.md#public-shadow-parts). The package also ships `dist/custom-elements.json` for tooling.

## External Input Binding

[Slotted and external inputs, with their limitations](docs/en/forms.md#custom-inputs).

## Form Integration

[FormData, required validation, disabled fields, and reset](docs/en/forms.md).

## Accessibility

[Naming, semantics, and customization checks](docs/en/accessibility.md).

## Keyboard Navigation

[Keyboard reference](docs/en/accessibility.md#keyboard-navigation).

## Frameworks

### React

[React wrapper and ref API](docs/en/frameworks.md#react).

#### Ref API

[Wrapper methods and element access](docs/en/frameworks.md#react).

### Vue 3

[Vue configuration and events](docs/en/frameworks.md#vue-3).

### Svelte

[Svelte custom-element example](docs/en/frameworks.md#svelte).

### Angular

[Angular schema and property/event binding](docs/en/frameworks.md#angular).

## TypeScript

[Types, event narrowing, and declaration limitations](docs/en/values-and-events.md#typescript).

## Browser Support

[Required capabilities and fallbacks](docs/en/installation.md#browser-and-server-requirements). Server imports are guarded; [interactive rendering remains client-only](docs/en/frameworks.md#server-imports-and-client-rendering).

## License

[MIT](LICENSE).
