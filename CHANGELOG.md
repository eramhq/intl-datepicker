# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-10-01

Follow-ups to 0.4.0. The main bundle grows by about 270 B gzip (CLDR week
data and navigation bounds); the CI size budget is re-based on this release.

### Added

- `intl-navigate` detail has `start` and `end`: the Gregorian ISO bounds of
  all visible months, so a Persian, Hijri or other calendar page can query an
  API for exactly what's on screen.

### Fixed

- **Week numbers follow the locale in current browsers.** Engines no
  longer report `minimalDays`, and the picker then assumed the ISO rule
  everywhere, so `en-US` and most non-European locales showed ISO week
  numbers. It now falls back to CLDR's data by region (4 in most of Europe,
  1 elsewhere).
- `intl-navigate` now also fires for keyboard navigation (arrows, Page Up/Down,
  Home/End across a month edge), for picks in the month and year views, and for
  Today; the dropdowns report the real direction instead of always `forward`.
- In `type="multiple"`, a kept date that is disabled can be removed by clicking
  it; it used to be stuck until Clear.
- The Japanese year view labels an era-change year with both eras
  ("31 Heisei – 1 Reiwa") instead of only the one on January 1st.

## [0.4.0] - 2026-10-01

Selection rules: range rules, richer disabling and a first day of week.

### Breaking

- **The deprecated `isDateDisabled` property alias is removed** (element,
  type declarations and the React wrapper). Use `disabledDatesFilter`.

### Changed (behavioural)

- **Programmatic values are kept.** A value set through the `value`
  attribute, `.value` or `setValue()` used to be dropped silently when it fell
  on a disabled day. Like a native `<input>`, any parseable value is now kept
  and displayed, and validity reports the problem: `rangeUnderflow` /
  `rangeOverflow` for `min`/`max`, `customError` ("This date is not available")
  for disabled days, `tooShort` / `tooLong` / `customError` for range rules.
  `type="multiple"` keeps all of its dates. Users still can't pick invalid
  dates. This matters with the new `disable-past`: editing a record with a
  past date shows it instead of wiping it.
- **A `required` range with only a start is invalid** (`valueMissing`, "Select
  an end date"). It used to pass.
- **An ISO week in `min`/`max` covers its whole locale week.** For Sunday- or
  Saturday-start locales the min week's first days used to be disabled, and
  picking that week failed its own `rangeUnderflow`.
- Updating an attribute that re-derives state (`min`, `disabled-dates`, …)
  keeps the visible month and view, so an availability update no longer jumps
  the calendar back to the selection.

### Added

- **Range rules** for `type="range"`, counted in nights (end − start):
  `min-nights`, `max-nights` and `exclude-disabled` (bare/`"days"`: no
  disabled day in the range; `"nights"`: the end may be the first disabled
  day, for hotel check-out).
  - After the first click, days that can't end a valid range are
    `aria-disabled` (class `range-blocked`), so the hover preview stops at
    the first booked night; the check-out day stays selectable (class
    `checkout-only`). Re-picking the start clears it.
  - The limits are shown (`part="range-hint"`) and announced, and Enter on a
    blocked day announces the reason ("Choose at least 2 nights").
  - Presets that break the rules are disabled instead of applied.
  - `mapDays` gets `isRangeBlocked` and `isCheckoutOnly`.
- **`disabled-dates` accepts inclusive ranges**: `"2026-12-20/2027-01-05"`.
  Lookups are a binary search over merged intervals.
- **`disabled-days-of-week`**: `"5,6"` or `"fri,sat"`, combined with
  `disable-weekends`.
- **`disable-past` / `disable-future`**, by type: today for dates and ranges,
  the current week, month or year for those pickers (the current month stays
  valid for card expiry). They narrow `min`/`max`, so navigation, keyboard
  clamping and validation messages follow. "Today" moves at midnight even on
  an inline calendar that stays open.
- **`first-day-of-week`**: `0`–`6` (0 = Sunday) or `sun`…`sat`. The weekday
  header, grid, Home/End, week picker and week numbers all use it.
- `disabledDatesFilter` and `mapDays` get the day's Gregorian `iso` date, so
  Persian, Hijri and other pages can match backend availability directly.
- Plural-aware labels: `nights` takes plural forms keyed by
  `Intl.PluralRules` category (Arabic ships zero/one/two/few/many/other), with
  native digits. New labels `rangeTooShort`, `rangeTooLong`,
  `rangeUnavailable`, `rangeIncomplete`, `minNightsHint`, `maxNightsHint`,
  `nights`, translated for fa, ar and he.
- React: `minNights`, `maxNights`, `excludeDisabled` (`true` or a mode),
  `firstDayOfWeek`, `disabledDaysOfWeek`, `disablePast`, `disableFuture`.
- Types: `DayInfo`, `PluralLabel`, `DayOfWeekName`, `ExcludeDisabledMode`.
- CI type-checks the declarations (`npm run typecheck`) and enforces a size
  budget for the main bundle (`npm run size`).

### Fixed

- **Japanese calendar eras.** Views built from a bare year defaulted to the
  current era, so 2018 showed as Reiwa 30 instead of Heisei 30. The visible
  month now keeps its era, and the year view lists Gregorian years labelled in
  their era; month and year cells carry their ISO date.
- **Week values round-trip for every first day of week.** Parsing `YYYY-Www`
  through its Monday landed a week early for Tuesday–Thursday starts; it now
  goes through the ISO week's Thursday.
- The weekday header used its own first-day table while the grid used the
  date library's; both now use the same resolved first day.
- Week numbers for Japanese dates before the current era were computed
  against the wrong year.
- Week numbers were off by one for locales whose week 1 needs fewer (or more)
  than 4 days in the new year, such as `en-US` (1 day) in engines that report
  it. Only ISO-style locales were numbered correctly.
- React types: `IntlDatepickerProps` declared `onChange`/`onSelect`
  incompatibly with the `HTMLAttributes` it extends, and the raw
  `<intl-datepicker>` JSX element wasn't typed for React 19 (`React.JSX`).

## [0.3.0] - 2026-10-01

Correctness, accessibility and quality release.

### Breaking

- **Month and year values in non-Gregorian calendars now follow
  `Temporal.PlainYearMonth`.** `type="month"` with `calendar="persian"` used to
  emit the native year/month as `"1403-05"`, which no ISO parser reads
  correctly. It now emits the ISO date of the month's first day plus a
  calendar tag: `"2024-07-22[u-ca=persian]"`. `type="year"` emits the year's
  first day the same way. Gregorian is unchanged (`"2024-07"`, `"2024"`).
  - `value`, `min`, `max` and `setValue()` accept that format or any plain ISO
    date, which snaps to the month/year containing it.
  - The short `YYYY-MM` / `YYYY` forms are only accepted for `calendar="gregory"`.
    A stored `"1403-05"` is now ignored with a console warning. To migrate,
    convert it once (e.g. pass the Gregorian date of 1 Mordad 1403, `"2024-07-22"`).
  - Event detail and `getValue()` for month/year add `start` and `end`
    (Gregorian ISO bounds of the period). `calendar` keeps the native numbers.
- **`type` and `name` properties reflect their attributes.** `el.type` used to
  return the tag name; it now returns the picker type (`"date"`, `"range"`, …),
  like `<input>.type`, and both are settable. Needed for React 19, which
  assigns props as properties.
- **`intl-change` no longer fires when `value`/`setValue()` sets the value it
  already has** (also for `clear()` on an empty picker), matching native inputs.
- **Day grid markup is now a `<table role="grid">`** with `<th>` weekday headers
  and `<tr>` rows instead of `<div>`s. `::part(day)` and `::part(weekday)` are
  unchanged; selectors that reached into the shadow DOM's `.idp-days` grid are not.
- **Month and year pickers use `role="group"` and `aria-current`** instead of
  a `role="grid"` without rows.

### Fixed

- Clicking (or pressing Enter on) a disabled day fired `intl-select`/`intl-change`
  and closed the popup. Days force-disabled by `mapDays` are covered too.
- `placeholder`, `show-alternate` and `required` changes after mount were
  ignored. React placeholders never showed because the wrapper set them after mount.
- Toggling `inline` didn't open or close the panel.
- Moving the element in the DOM duplicated its listeners (one click opened and
  closed the popup) and wiped a value set from JS.
- Range presets set from JS disappeared on month navigation.
- `type="multiple"` with a single date stored it as a single-date selection.
- `setValue()` in multiple mode ignored `max-dates` and `sort-dates`.
- Changing `calendar`, `locale`, `min`, … discarded a value set from JS.
- Inline `type="month"`/`"year"` pickers showed the day grid.
- `min`/`max` validation messages were English-only; they now use the
  `dateTooEarly`/`dateTooLate` labels (translated for fa, ar, he).
- `mapDays` `style` and `className` weren't escaped.
- `<fieldset disabled>` didn't disable the picker (`formDisabledCallback`).
- Focus wasn't returned to the input after closing with Escape in real browsers
  (`host.focus()` is a no-op while focus is inside the shadow root).
- Keyboard navigation dropped focus to `<body>` for a frame on every re-render.
- Range/week hover re-rendered the whole grid and lost keyboard focus.
- `setValidity` was given a `null` anchor in `for` mode, which throws in browsers.
- The built-in CSS was not actually minified in v0.2.0 builds; it is now.

### Added

- **Top-layer popup.** The calendar opens with `popover="manual"` where
  supported, so transformed ancestors, `overflow: hidden`, z-index stacks and
  modal `<dialog>`s no longer clip or misplace it. Falls back to the previous
  fixed positioning.
- **Accessibility.**
  - Each month is a `<table role="grid">` named by its heading, with weekday
    `<th scope="col" abbr>` headers.
  - One persistent live region announces month changes from the navigation
    buttons, selections and completed ranges.
  - Today gets `aria-current="date"`; selected days and range ends say so in
    their names.
  - `↓` / `Alt+↓` in the input opens the calendar.
  - Keyboard focus stays within `min`/`max`, and prev/next buttons at the
    limit use `aria-disabled` instead of acting.
  - A `<label for>` or `aria-label` on the element names the inner input.
  - The day size never drops below the 24px minimum target, and the clear
    button is at least 24×24.
  - `forced-colors` outlines for selected, range, today and focus states.
- **Typed input (`allow-input`).** A visible format hint (`Format: MM/DD/YYYY`)
  linked with `aria-describedby`, `inputmode="numeric"`, compact entry without
  separators (`06172024`), a persistent error (`aria-invalid` + message)
  instead of a 1.5 s flash, `badInput` form validity, `Enter` to commit, and
  clearing the text clears the value.
- New labels: `selected`, `rangeStart`, `rangeEnd`, `rangeSelected`,
  `formatHint`, `invalidDate`, `dateUnavailable`, `dateTooEarly`, `dateTooLate`.
- `presets` and `labels` properties accept JSON strings as well as objects.
- CSS custom property `--idp-error`; parts `hint` and `error`.
- **Custom Elements Manifest** at `dist/custom-elements.json`, linked from
  `package.json` `"customElements"`.
- React: the built `intl-datepicker/react` starts with `'use client'` (Next.js
  App Router), and attributes are passed at render time so the first paint uses
  the right calendar and locale. Tested with React 19.
- Real-browser test suite (Vitest browser mode + Playwright on Chromium,
  Firefox and WebKit) and a CI job for it; `npm run test:browser`.

### Changed

- `Intl` formatters are built once per locale/calendar instead of on every
  render and cell.
- The panel is no longer rebuilt from scratch on every render; the input,
  live region and panel element persist.
- README: values & time zones, framework snippets (CDN, Vue, Svelte, Angular),
  scenario recipes, full keyboard table, all attributes.

## [0.2.0] - 2026-04-25

Package size reduction. Main bundle drops from 107 KB to ~59 KB raw (28.4 KB
to 16.0 KB gzipped); npm tarball drops from 39.9 KB to ~28 KB gzipped.

### Changed

- **Replaced `@floating-ui/dom` with a built-in positioner.** Same UX —
  flipping above when there's no room below, viewport-edge clamping, RTL
  alignment, scroll/resize/visualViewport tracking via `ResizeObserver` and
  capture-phase scroll. `@floating-ui/dom` is removed as a runtime dependency.
- **Built-in CSS is now minified at build time** (was shipping nearly verbatim
  in the JS bundle). Selectors for shared button resets, hover, and focus rules
  are grouped; open/close keyframes collapsed to one with `animation-direction:
  reverse`; an `[data-placement="top"]` mirror animation slides downward when
  the popup is flipped above the trigger.
- **Private fields and methods are now mangled by terser** at build time.
  No effect on the public API.

### Added

- **Opt-in label entry points** — `intl-datepicker/labels/fa`,
  `intl-datepicker/labels/ar`, `intl-datepicker/labels/he`. Mirrors the
  calendar plugin pattern. `intl-datepicker/full` registers all of them.
- `:focus-visible` outlines on every interactive element (previously only
  on a few). Keyboard users now get a visible focus ring throughout the calendar.
- CSS variables `--idp-z-index`, `--idp-input-min-width`,
  `--idp-calendar-min-width` for opinionated values that were hard-coded.
- 8 jsdom positioning tests.

### Fixed

- `.idp-day.outside.selected` / `.outside.in-range` / `.outside.today` no
  longer render at the faded `.outside` opacity.
- Popup no longer flashes at the viewport origin between `position: fixed`
  taking effect and the first JavaScript-driven placement.
- `maxHeight` constraint on the calendar now scrolls overflow content
  instead of clipping it (added `overflow-y: auto`).

### Breaking changes

- **Non-English built-in labels are now opt-in.** If you were relying on
  `fa-IR`, `ar-*`, or `he-IL` showing translated labels automatically, add
  the matching import:
  ```js
  import 'intl-datepicker';
  import 'intl-datepicker/labels/fa';
  ```
  Or use `intl-datepicker/full` to bundle every calendar and label set.
- The exports `LABELS_FA`, `LABELS_AR`, `LABELS_HE` have moved off the
  deep path `intl-datepicker/core/labels` and onto each language's entry
  point: `import { LABELS_FA } from 'intl-datepicker/labels/fa'`.
- `CHANGELOG.md` is no longer included in the published tarball; refer to
  GitHub Releases or this file in the repository.

[0.4.1]: https://github.com/eramhq/intl-datepicker/releases/tag/v0.4.1
[0.4.0]: https://github.com/eramhq/intl-datepicker/releases/tag/v0.4.0
[0.3.0]: https://github.com/eramhq/intl-datepicker/releases/tag/v0.3.0
[0.2.0]: https://github.com/eramhq/intl-datepicker/releases/tag/v0.2.0

## [0.1.0] - 2026-04-23

Initial public release.

### Added

- **14 calendar systems** — Gregorian, Persian (Jalali), Islamic (standard, civil, umalqura), Hebrew, Buddhist, Japanese, Indian, Ethiopic, Coptic, ROC, and more — powered by `Intl.DateTimeFormat` and `@internationalized/date`.
- **Pluggable calendar registry** — non-Gregorian calendars are tree-shakeable via per-calendar entry points (e.g. `intl-datepicker/calendars/persian`) or bundled via `intl-datepicker/full`.
- **6 picker types** — `date`, `range`, `week`, `multiple`, `month`, `year`.
- **Locale-aware formatting** — month/day names, numeral systems, and RTL layout driven by `Intl`; calendar-native week numbers via locale `minimalDays`.
- **SSR-safe core** — importable in Node/Next.js without crashing; rendering stays client-only.
- **Form-associated Web Component** — participates in `<form>` submission, validation, and reset; exposes `valueAsDate` and type-aware parsing.
- **React wrapper** — `intl-datepicker/react` entry point with TypeScript JSX types.
- **Accessibility** — full keyboard navigation, ARIA roles, and `prefers-reduced-motion` support.
- **Built-in label translations** for English, Persian, Arabic, and Hebrew, with a `labels` API for custom locales.
- **Configurable attributes** — `numerals`, `caption-layout`, `fixed-weeks`, among others.
- Popup positioning via Floating UI.
- MIT license, comprehensive README, TypeScript declarations.

[0.1.0]: https://github.com/eramhq/intl-datepicker/releases/tag/v0.1.0
