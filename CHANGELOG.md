# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
