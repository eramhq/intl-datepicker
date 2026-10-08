---
title: Installation and package entry points
description: Load the custom element and only the calendars, labels, or React wrapper you need.
---

## Install in an application

```sh
npm install intl-datepicker
```

```js
import 'intl-datepicker';
```

This side-effect import registers `intl-datepicker` in browsers. Include it in your client entry before using the element API. Bare package imports need a bundler or an import map; a browser cannot resolve them in an ordinary HTML file by itself. The package exports ES modules and includes TypeScript declarations.

The stylesheet is embedded in the shadow root. There is no public CSS subpath to import. `@internationalized/date` is a package dependency; React is an optional peer needed only for the wrapper.

## Entry points

| Import | Registers or provides |
| --- | --- |
| `intl-datepicker` | Element, Gregorian calendar, English labels |
| `intl-datepicker/full` | Element, all registered calendars, English/Persian/Arabic/Hebrew labels |
| `intl-datepicker/calendars/persian` | `persian` |
| `intl-datepicker/calendars/islamic` | `islamic`, `islamic-umalqura`, `islamic-civil`, `islamic-tbla` |
| `intl-datepicker/calendars/hebrew` | `hebrew` |
| `intl-datepicker/calendars/buddhist` | `buddhist` |
| `intl-datepicker/calendars/japanese` | `japanese` |
| `intl-datepicker/calendars/indian` | `indian` |
| `intl-datepicker/calendars/ethiopic` | `ethiopic`, `ethioaa` |
| `intl-datepicker/calendars/coptic` | `coptic` |
| `intl-datepicker/calendars/roc` | `roc` |
| `intl-datepicker/labels/fa` | Persian interface labels |
| `intl-datepicker/labels/ar` | Arabic interface labels |
| `intl-datepicker/labels/he` | Hebrew interface labels |
| `intl-datepicker/react` | React wrapper, which also imports the base element |

Calendar and label entry points export no values; import them for registration. There are no public `/calendars/all` or `/labels/all` subpaths. Use `/full` when you deliberately want everything.

## Load Persian only

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';
```

```html
<intl-datepicker calendar="persian" locale="fa-IR"
  value="2024-03-20"></intl-datepicker>
```

This selects the first day of Persian year 1403, while `value` remains `2024-03-20`. Import calendar and label modules before the base element import when markup already exists, as above; importing a label set later does not automatically refresh existing instances. An unregistered calendar warns and falls back to Gregorian.

## Without a bundler

For a standalone HTML file, an ESM CDN can resolve the package dependencies:

```html
<script type="module">
  import 'https://esm.sh/intl-datepicker@0.4.2/calendars/persian';
  import 'https://esm.sh/intl-datepicker@0.4.2/labels/fa';
  import 'https://esm.sh/intl-datepicker@0.4.2';
</script>
<intl-datepicker calendar="persian" locale="fa-IR"
  value="2024-03-20"></intl-datepicker>
```

The pinned version must contain the APIs you use. CDN delivery needs network access and depends on that service; the repository build is not a self-contained classic script. For `/full`, replace those imports with `https://esm.sh/intl-datepicker@0.4.2/full`.

## Browser and server requirements

The interactive component needs custom elements, Shadow DOM, JavaScript modules, and `Intl` support for the chosen calendar. Native submission and validity depend on form-associated custom elements and `ElementInternals`; no hidden-input fallback is provided when these are unavailable.

The build targets ES2022. The popup uses the Popover API when available and otherwise uses fixed positioning. Without Popover, transformed ancestors and clipping containers can affect placement. Adopted stylesheets have a style-element fallback. These fallbacks are not a tested minimum-browser-version guarantee.

The repository has browser tests for Chromium, Firefox, and WebKit. Check the browsers and assistive technologies required by your application. See [frameworks and SSR](frameworks.md#server-imports-and-client-rendering) for the difference between safe server imports and client rendering.
