---
title: Bilingual documentation review
description: Validation evidence, existing implementation issues, and website link migration for the documentation update.
---

This note records the documentation review before release preparation on 2026-10-08. It is a repository review note, not an imported guide. It is intentionally outside `docs/navigation.json`.

## Scope

Created `docs/navigation.json` and 11 guides in each of `docs/en/` and `docs/fa/`:

| Slug | Content |
| --- | --- |
| `overview` | First example and reading paths |
| `installation` | Package exports, opt-in modules, CDN, browser capabilities |
| `localization` | Calendar/locale separation, digits, RTL, every label key, calendar switching |
| `picker-types` | All six types, output formats, non-Gregorian period annotations |
| `constraints` | Bounds, disabled dates, booking nights, presets |
| `values-and-events` | Date-only storage, time zones, public API, event timing, TypeScript |
| `forms` | FormData, required validation, reset, external and slotted inputs |
| `frameworks` | React, Vue 3, Svelte legacy syntax, Angular, SSR limits |
| `styling` | All public CSS variables and shadow parts, layout, mapDays |
| `accessibility` | Naming, keyboard behavior, typed input, customization checks |
| `recipes` | Reporting month, availability refresh, leave, troubleshooting |

README now provides a quick start and links into the guides, while retaining existing heading anchors, including the eight recipe headings. No assets were needed. All 11 Persian counterparts are authored translations; there are no English fallback pages.

The initial library working tree was clean. The documentation pass left runtime code, declarations, package metadata, dependency locks, version, and tests unchanged, and performed no commit, push, or release. The subsequent authorized v0.4.2 release preparation updates version metadata, the demo version badge, pinned CDN examples, and the changelog; runtime code and declarations remain unchanged.

## Validation

- `npm test`: 321 tests passed in 13 files.
- `npm run typecheck`: passed.
- `npm run build`: passed, including Custom Elements Manifest generation. Generated build output is ignored and not part of the documentation diff.
- `npm run test:browser`: 54 tests passed, 18 each in Chromium, Firefox, and WebKit.
- Website `collectDocs()` accepted navigation schema version 1, all unique slugs, localized metadata, entry, and full English/Persian coverage.
- Relative links and heading fragments were checked with the website's actual Markdown renderer; no missing files or anchors. All guide pages are listed. No raw HTML outside code spans/fences, missing assets, or Persian editorial vowel/ezafe marks were found.
- All 34 JavaScript fences passed Node syntax checks. Four extracted React/TypeScript examples passed the repository's TypeScript compiler with its existing declarations.
- Executed English/Persian overview, calendar-switching, FormData, and reporting-month examples against the built package in fresh Chromium pages. Verified documented Gregorian/Persian values, clearing guards, period boundaries, Monday week boundaries, sorted multiple values, and booking validity for checkout-only, unavailable, and too-short stays.
- Framework event/property patterns were checked against the wrapper/source and official Vue, Svelte, Angular, and React documentation linked in the guides. Full Vue/Svelte/Angular application builds and CDN delivery were not run; no broad version-compatibility guarantee is claimed.
- Website `npm run docs:test`: all 6 tests passed.
- Local website preview: all 22 guide routes returned HTTP 200 with local source paths. Checked rendered fragment links and Persian desktop/mobile screenshots; the 390px viewport had no page-level horizontal overflow. Preview visibly marked documentation as unpublished.
- `git diff --check`: passed.

## Local preview procedure and website limitation

Read `site/docs-publishing.md` and the Persian writing guidelines before authoring. The documented command was exercised:

```sh
npm run docs:local -- /Users/navidkashani/Documents/cc-projects/intl-datepicker
```

The current website CLI hardcodes the default repository as `abzar-php`, even for another source path. Its existing exported function accepts the correct project ID. Without changing website code, the actual Intl Datepicker preview was prepared from `site/` using:

```sh
node --input-type=module -e "import {prepareLocalDocs} from './scripts/local-docs.mjs'; prepareLocalDocs('/Users/navidkashani/Documents/cc-projects/intl-datepicker', 'intl-datepicker');"
ERAM_LOCAL_DOCS=1 node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port 4327 --ignore-lock
```

Review routes are `/en/docs/intl-datepicker/overview/` and `/fa/docs/intl-datepicker/overview/`. The temporary server was stopped after validation and the pre-existing ignored `.local-docs/` snapshot restored. No `docs:sync` was run. Checksums for the 248 existing public snapshot/manifest/lock files were compared before and after preview, and the website's existing uncommitted work was preserved.

Before making the documented generic preview command the recommended workflow for every project, the website should accept or derive its repository ID. This documentation task did not change that checkout.

## Existing library issues and integration hazards

These are reported separately for triage; runtime behavior was deliberately left unchanged.

### Readonly does not cover every interaction path

With an inline picker, `readonly` and initial value `2026-03-15`, clicking March 16 changes the value to `2026-03-16`. External `for` handlers and public `open()` also omit the normal trigger's readonly guard. See [action handling](src/intl-datepicker.js#L1389), [open](src/intl-datepicker.js#L457), and [external binding](src/intl-datepicker.js#L1855). The guides describe the limitation and suggest static text for a reliably read-only display.

### External input starts blank with an initial host value

Mount an empty input with ID `ext`, then a picker with `for="ext" value="2026-03-15"`. The picker has a value, but the external input remains empty until a later update. `_setupExternalInput()` does not synchronize this initial host selection. The form guide includes explicit initial synchronization. Subsequent external typing is not wired as the built-in typing path is; this is documented as an integration limitation.

### Runtime exports and declarations disagree

[src/intl-datepicker.d.ts](src/intl-datepicker.d.ts#L226) declares a runtime class named `IntlDatepickerElement`; the JavaScript exports `IntlDatepicker` and `register` instead. Those actual exports are absent from the declarations. The docs use side-effect registration and `import type` to avoid inventing a constructor API. Runtime JSON-string setters for `labels` and `presets` are also narrower in the element declaration; object/array examples typecheck.

### Parser edge cases need triage

- `type="week" value="2025-W53"` normalizes to `2026-W01`, even though 2025 has no ISO week 53. [Week parsing](src/core/state.js#L492) checks the numeric range 1–53 but not the actual week count for the year.
- `type="range" value="2026-03-01/2026-03-02/extra"` becomes `2026-03-01/2026-03-02`; [range parsing](src/core/state.js#L562) ignores extra segments.
- Fixed dates in presets are built with a clamping calendar constructor, so preset configuration is not a strict date-validation boundary. The guides require valid dates and application validation.

### Optional import order matters for existing markup

If Persian markup already exists, importing the base element before the Persian registration can upgrade it as Gregorian; importing the calendar afterward does not refresh it. Reproduced with initial `2024-03-20`, which then had Gregorian calendar fields `{year: 2024, month: 3, day: 20}`. Documentation examples import optional calendar/label modules before the base registration, and fresh-page checks confirm the correct Persian fields. React examples keep optional imports in the client component alongside the wrapper.

### Escape from month/year views also closes the popup

The previous README described Escape as returning to the day view first. In a popup, the event also reaches the document Escape listener and closes the panel in the same interaction. Reproduced with a date picker opened to the month grid. The keyboard guides now describe actual popup behavior and distinguish the inline view.

### Event and period limits are documented, not silently changed

User reselection/preset activation can emit change with an unchanged value, while repeated programmatic assignments are silent. Week interaction checks the clicked day rather than every day in the week and may produce a range crossing a day-precise bound that subsequently fails validity. Month/year selection ignores day-level disabled rules. These behaviors are explicitly described; no event, parser, or validation implementation was changed.

## Product-page link migration

Targets below are `page-slug#actual-heading-id`, verified with Eram's Markdown renderer. Prefix with the desired `/en/docs/intl-datepicker/` or `/fa/docs/intl-datepicker/` route when integrating; in website routes, keep the slash before `#` after the page slug.

| Old overview anchor | English target | Persian target |
| --- | --- | --- |
| `range-rules` | `constraints#range-rules` | `constraints#قواعد-بازه` |
| `picker-types` | `picker-types#picker-types` | `picker-types#انواع-انتخابگر` |
| `keyboard-navigation` | `accessibility#keyboard-navigation` | `accessibility#کار-با-صفحهکلید` |
| `locale-labels` | `localization#locale-labels` | `localization#متنهای-رابط` |
| `react` | `frameworks#react` | `frameworks#ریاکت` |
| `vue-3` | `frameworks#vue-3` | `frameworks#ویو-۳` |
| `svelte` | `frameworks#svelte` | `frameworks#اسولت` |
| `angular` | `frameworks#angular` | `frameworks#انگولار` |
| `values--time-zones` | `values-and-events#values-and-time-zones` | `values-and-events#مقدارها-و-منطقه-زمانی` |

## Release and website integration

The existing issues above remain separate follow-up work; this documentation release does not fix runtime behavior. No missing translations remain. Update product-page links using the mapping during website integration, and resolve the local-preview CLI project-ID limitation if using that command for future reviews.

The user subsequently authorized committing this documentation and publishing v0.4.2. The public website can import the docs once that GitHub release is published. The website imports release repository contents, so the npm package's `files: ["dist"]` setting does not prevent this docs workflow. This review note records pre-release validation, not confirmation of release publication. Public website snapshot refresh remains a separate integration action and was not performed in this repository.
