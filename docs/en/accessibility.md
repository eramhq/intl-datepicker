---
title: Keyboard navigation and accessibility
description: Name the input, understand keyboard behavior, and preserve accessible interaction when customizing.
---

## Label the picker

Import the base module and provide a visible label:

```html
<label for="birth-date">Birth date</label>
<intl-datepicker id="birth-date" name="birthDate" locale="en-GB"
  allow-input caption-layout="dropdown"
  min="1900-01-01" max="2026-03-15" value="1990-06-17"
  required></intl-datepicker>
```

This gives the built-in combobox an accessible name. The host's `aria-label` can also supply a name and takes precedence over associated label text. `placeholder` is a hint, not a substitute for a label. Custom inputs need [their own naming and state](forms.md#custom-inputs).

The popup has dialog semantics and the inline panel has group semantics. Each day grid is a table with a month heading and full weekday names for assistive technology. Selected days use cell selection semantics; today uses `aria-current="date"`. A persistent polite live region announces selections, month navigation, and some refused selections. These mechanisms are implemented behavior, not a claim of certification for every screen-reader/browser pairing.

## Keyboard navigation

| Key | Location | Behavior |
| --- | --- | --- |
| Down / Alt+Down | Built-in input | Open and focus the current cell |
| Enter | Typing input with `allow-input` | Parse and select the entered date |
| Left / Right | Day grid | Previous / next day, reversed in RTL |
| Up / Down | Day grid | Move seven days backward / forward |
| Home / End | Day grid | Start / end of the configured week |
| PageUp / PageDown | Day grid | Previous / next month |
| Shift+PageUp / Shift+PageDown | Day grid | Previous / next year |
| Enter / Space | Day, month, year cell | Select if allowed |
| Arrow keys | Month/year view | Move among cells; three columns for months, four for years |
| Escape | Popup | Close, including from a month/year view |
| Tab / Shift+Tab | Popup | Cycle focus within popup controls |

Day-grid movement clamps focus to min/max. Disabled days may remain focusable so pressing Enter can announce why they are unavailable. Hover does not commit a range or change the selected-state announcement. Inline panels do not trap Tab and do not close with Escape. In an inline date picker, Escape from a month/year cell returns to the day view. In a popup, the document Escape handler also closes the panel.

When a popup closes, focus returns to the trigger if it is still within the picker. If focus has already moved elsewhere, the component does not pull it back. An application that cancels `intl-close` must provide another usable dismissal path.

## Typing dates

`allow-input` enables typing in the built-in or slotted input. Text is committed on Enter or on blur out of the component. A format hint is shown; invalid text stays visible with an error until corrected or cleared, and contributes `badInput` validity.

Input segments are interpreted in the active calendar. In a Persian picker, `۱۴۰۳/۰۱/۰۱` means the first day of year 1403 and selects ISO `2024-03-20`. This differs from programmatic `value`, which uses Gregorian ISO days.

`date-format` accepts `auto`, `YMD`, `DMY`, or `MDY`. Auto uses locale order; a segment with at least three digits also helps detect the year. Separators include slash, dot, hyphen, and whitespace. Eight-digit compact input and several native digit sets are accepted; all-two-digit dates are rejected as ambiguous.

Typing parses a single day, then applies that selection to the current mode. It does not parse a complete `start/end` range, comma-separated list, or ISO week identifier. In range mode, enter endpoints separately; for month/year, use the picker or enter a full day in the intended period. Parsing is numeric, not a natural-language or complete Japanese-era parser.

## Customization checks

Preserve visible focus outlines, readable selected/disabled states, and useful labels. The stylesheet includes forced-colors and reduced-motion rules. Day targets have a 24px floor even if `--idp-day-size` is smaller; choose a size suitable for your users.

Test keyboard flow after changing `mapDays`, hiding outside days, replacing the input, or integrating with a modal. Custom content should complement the accessible date name. A tooltip alone should not carry essential booking information. For public styling hooks, see [styling](styling.md).
