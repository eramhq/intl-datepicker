# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
