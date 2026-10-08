---
title: Intl Datepicker overview
description: Add a date picker, understand its value model, and find the guide for your application.
---

Intl Datepicker is the `intl-datepicker` custom element. It provides date, range, week, multiple-date, month, and year selection. Calendar arithmetic uses `@internationalized/date`; localized display uses the browser's `Intl` APIs.

The base import registers Gregorian selection and English interface labels. Other calendars and label sets are optional imports. The package includes a React wrapper; other frameworks use the custom element directly.

## First working example

Install the package in a browser application with an ES module bundler:

```sh
npm install intl-datepicker
```

Put this markup in your page and the JavaScript in its browser entry module:

```html
<label for="appointment">Appointment date</label>
<intl-datepicker id="appointment" name="appointment"
  locale="en-US" value="2026-03-15"></intl-datepicker>
<output id="selected-date"></output>
```

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
const output = document.querySelector('#selected-date');
output.textContent = picker.value;
picker.addEventListener('intl-change', ({ detail }) => {
  output.textContent = detail.value;
});
```

Run the module after the markup exists, for example through a module script in your application. The initial output is `2026-03-15`. Picking another day updates it; clearing produces an empty string. Initial markup does not emit a change event, so the example reads the initial value explicitly. Styles are included in the component; no separate stylesheet import is needed.

## Choose the next guide

- [Installation](installation.md): entry points, optional imports, and browser requirements.
- [Calendars and localization](localization.md): Persian labels, digits, RTL, and changing calendars.
- [Picker types](picker-types.md): all six value formats and period semantics.
- [Constraints and presets](constraints.md): booking rules and unavailable dates.
- [Values, events, and TypeScript](values-and-events.md): storage, events, and public methods.
- [Native forms](forms.md): `FormData`, validation, and reset.
- [Frameworks and SSR](frameworks.md): React, Vue, Svelte, and Angular.
- [Styling](styling.md) and [accessibility](accessibility.md): theme tokens, shadow parts, and keyboard interaction.
- [Recipes and troubleshooting](recipes.md): reporting periods, availability updates, and common problems.

## Before integrating

Choose the calendar explicitly. `locale="fa-IR"` changes language and presentation; it does not select the Persian calendar. For that, import the Persian calendar and set `calendar="persian"`.

Store the machine value, not the displayed text. Day values use Gregorian date-only strings even in a Persian calendar. Non-Gregorian month/year values identify whole periods with an annotated ISO date. [Value and time-zone details](values-and-events.md#values-and-time-zones) explain this distinction.

Validate submitted data in your application. User selection respects restrictions, but a parseable value assigned by code can remain selected while failing native form validation. Also, constructing `FormData` does not run validation.

The API is pre-1.0. Consult the [changelog](../../CHANGELOG.md) when upgrading. The repository's [demo](https://eramhq.github.io/intl-datepicker/) demonstrates the component; use these guides for the documented contracts and limitations.
