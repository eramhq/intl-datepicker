---
title: Styling and custom day content
description: Theme the component with CSS variables and shadow parts, and decorate individual days.
---

## CSS variables

The stylesheet ships inside the shadow root. Set public variables on the host:

```css
intl-datepicker {
  --idp-primary: #075985;
  --idp-selected-bg: #075985;
  --idp-selected-text: #ffffff;
  --idp-radius: 12px;
  --idp-day-size: 44px;
  --idp-font-family: inherit;
}
```

| Variable | Default |
| --- | --- |
| `--idp-primary` | `#2563eb` |
| `--idp-bg` | `#ffffff` |
| `--idp-text` | `#1f2937` |
| `--idp-border` | `#d1d5db` |
| `--idp-hover` | `#f3f4f6` |
| `--idp-selected-bg` | `var(--idp-primary)` |
| `--idp-selected-text` | `#ffffff` |
| `--idp-today-border` | `var(--idp-primary)` |
| `--idp-disabled` | `#9ca3af` |
| `--idp-range-bg` | `#dbeafe` |
| `--idp-range-text` | `var(--idp-text)` |
| `--idp-muted` | `#6b7280` |
| `--idp-error` | `#dc2626` |
| `--idp-radius` | `8px` |
| `--idp-day-size` | `40px`, with a 24px minimum for day targets |
| `--idp-font-size` | `14px` |
| `--idp-font-family` | `system-ui, -apple-system, sans-serif` |
| `--idp-z-index` | `1000`, for the fallback popup |
| `--idp-input-min-width` | `200px` |
| `--idp-calendar-min-width` | `300px` |

The built-in dark media query changes background, text, border, hover, range background, and muted colors. If your application has its own theme switch, set those variables together for each theme. Forced-colors and reduced-motion styles are included; preserve focus outlines and readable contrast in overrides.

## Public shadow parts

```css
intl-datepicker::part(calendar) {
  box-shadow: 0 8px 24px rgb(0 0 0 / 15%);
}
intl-datepicker::part(day) { border-radius: 50%; }
intl-datepicker::part(input-wrapper) { border-width: 2px; }
```

| Part | Element |
| --- | --- |
| `input-wrapper`, `input` | Input container and built-in input |
| `hint`, `error` | Typed-input format hint and error |
| `calendar` | Calendar panel |
| `header`, `header-title` | Navigation header and title area |
| `nav-prev`, `nav-next` | Navigation buttons |
| `month-dropdown`, `year-dropdown` | Caption dropdowns |
| `weekday`, `day` | Weekday heading and day button |
| `month-cell`, `year-cell` | Month/year view buttons |
| `footer`, `today-btn`, `clear-btn` | Footer and its buttons |
| `alternate` | Gregorian equivalent line |
| `presets` | Range preset container |
| `range-hint` | Pending range's length guidance |

`clear-btn` targets the footer clear button, not the small input clear button. Parts do not expose arbitrary internal descendants or state classes. Global `.idp-day` rules cannot cross the shadow boundary. Internal classes are implementation details, not a styling contract.

## Layout options

- `inline` keeps the calendar on the page instead of opening a popup; the input remains part of the component.
- `months="1"` through `"3"` controls visible day-grid panels. Values are clamped to that range.
- `fixed-weeks` renders six rows; `hide-outside-days` hides adjacent-month cells.
- `show-week-numbers` adds the locale's week numbers.
- `caption-layout` is `button` by default, or `dropdown`, `dropdown-months`, `dropdown-years`. Dropdown captions apply to the single-panel day view; multiple panels use static month titles.
- `show-alternate` displays a Gregorian equivalent when there is a single selected date (including month/year's selected day). It does not provide a range/week/multiple alternate summary.
- `no-animation` disables popup animations; reduced-motion preferences are also respected.

Popover puts the popup in the browser's top layer. `--idp-z-index` only helps the fixed-position fallback; it cannot repair clipping or transformed containing blocks there. Use an unclipped container or `inline` if necessary.

## Decorate days with mapDays

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.setValue('2026-03-15');
picker.mapDays = ({ date, isCheckoutOnly, isRangeBlocked }) => {
  if (isCheckoutOnly) return { title: 'Check-out only' };
  if (isRangeBlocked) return { style: 'text-decoration: line-through' };
  if (date.iso === '2026-03-20') {
    return { content: ' •', title: 'Special rate', style: 'font-weight: 700' };
  }
  return null;
};
```

This marks March 20 without changing the selected value. `date` includes active-calendar year/month/day, Gregorian `iso`, and Sunday-based `dayOfWeek`. Other input flags are `isToday`, `isSelected`, `isDisabled`, `isInRange`, `isRangeStart`, `isRangeEnd`, and `isCurrentMonth`. `isDisabled` describes ordinary day rules; `isRangeBlocked` describes an invalid pending range endpoint.

Return `className`, inline `style`, appended `content`, `title`, `disabled`, or `hidden`. `content` is inserted as HTML, so use trusted application content only; never insert unsanitized API/user text. A custom class is inside the shadow root and cannot be styled by an ordinary external class selector. Use the returned `style` for per-day decoration.

`disabled: true` blocks that rendered cell but does not add a business availability rule. `hidden: true` removes the cell content. Neither substitutes for [availability constraints](constraints.md). Keep callbacks synchronous and assign a new callback when external decoration data changes.
