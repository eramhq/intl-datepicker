# intl-datepicker

A framework-agnostic, multi-calendar datepicker Web Component powered by `Intl.DateTimeFormat`.

- **14 calendar systems** — Gregorian, Persian, Islamic (3 variants), Hebrew, Buddhist, Japanese, Indian, Ethiopic, Coptic, ROC, and more
- **Full i18n** — locale-aware month/day names, number formatting, and RTL support
- **Multiple picker types** — date, range, week, multiple, month, year
- **Zero-framework lock-in** — works with vanilla HTML, React, Vue, Svelte, or any framework
- **Form-associated** — participates in `<form>` submission, validation, and reset
- **Accessible** — full keyboard navigation, ARIA roles, and `prefers-reduced-motion` support

## Install

```bash
npm install intl-datepicker
```

## Quick Start

```html
<script type="module">
  import 'intl-datepicker';
</script>

<intl-datepicker calendar="persian" locale="fa-IR"></intl-datepicker>
```

## Picker Types

### Single Date (default)

```html
<intl-datepicker value="2026-03-15"></intl-datepicker>
```

### Date Range

```html
<intl-datepicker type="range" min="2026-01-01" max="2026-12-31"></intl-datepicker>
```

Value format: `YYYY-MM-DD/YYYY-MM-DD`

### Week Picker

```html
<intl-datepicker type="week"></intl-datepicker>
```

Value format: `YYYY-Www` (e.g. `2026-W14`)

### Multiple Dates

```html
<intl-datepicker type="multiple" max-dates="5" sort-dates></intl-datepicker>
```

Value format: comma-separated ISO dates

### Month Picker

```html
<intl-datepicker type="month"></intl-datepicker>
```

Value format: `YYYY-MM`

### Year Picker

```html
<intl-datepicker type="year"></intl-datepicker>
```

Value format: `YYYY`

## Attributes

| Attribute | Type | Description |
|---|---|---|
| `calendar` | `string` | Calendar system (see table below). Default: `"gregory"` |
| `locale` | `string` | BCP 47 locale tag. Default: browser locale |
| `value` | `string` | Initial value in ISO format |
| `type` | `string` | Picker type: `date`, `range`, `week`, `multiple`, `month`, `year` |
| `min` | `string` | Minimum selectable date (ISO) |
| `max` | `string` | Maximum selectable date (ISO) |
| `for` | `string` | ID of an external `<input>` to bind to |
| `placeholder` | `string` | Input placeholder text |
| `name` | `string` | Form field name |
| `inline` | `boolean` | Always-visible calendar (no popup) |
| `disabled` | `boolean` | Disable the picker |
| `readonly` | `boolean` | Read-only input |
| `required` | `boolean` | Mark as required for form validation |
| `show-alternate` | `boolean` | Show Gregorian equivalent below the calendar |
| `disabled-dates` | `string` | JSON array of ISO dates to disable, e.g. `'["2026-01-01","2026-12-25"]'` |
| `disable-weekends` | `boolean` | Disable Saturday and Sunday |
| `date-separator` | `string` | Separator for multiple date display. Default: `", "` |
| `max-dates` | `number` | Max dates selectable in `multiple` mode |
| `sort-dates` | `boolean` | Auto-sort selected dates in `multiple` mode |
| `months` | `number` | Number of side-by-side month panels (1–3) |
| `presets` | `string` | JSON array of range presets (see below) |
| `no-animation` | `boolean` | Disable open/close animations |
| `show-week-numbers` | `boolean` | Show ISO week numbers |
| `hide-outside-days` | `boolean` | Hide days from adjacent months |
| `allow-input` | `boolean` | Allow typing dates directly into the input |

## Supported Calendars

| `calendar` value | System |
|---|---|
| `gregory` | Gregorian (default) |
| `persian` | Persian (Jalali) |
| `islamic` | Islamic (Umm al-Qura) |
| `islamic-umalqura` | Islamic (Umm al-Qura) |
| `islamic-civil` | Islamic (Civil/Tabular) |
| `islamic-tbla` | Islamic (Tabular) |
| `hebrew` | Hebrew |
| `buddhist` | Buddhist |
| `japanese` | Japanese |
| `indian` | Indian National |
| `ethiopic` | Ethiopic |
| `ethioaa` | Ethiopic (Amete Alem) |
| `coptic` | Coptic |
| `roc` | ROC (Minguo/Taiwan) |

## Events

| Event | `detail` | Description |
|---|---|---|
| `intl-select` | `SelectDetail` | Fired when a date is clicked |
| `intl-change` | `SelectDetail` | Fired on any value change (select, clear, programmatic) |
| `intl-navigate` | `{ year, month, direction }` | Fired when the user navigates months |
| `intl-open` | — | Cancelable. Fired before popup opens |
| `intl-close` | — | Cancelable. Fired before popup closes |

### SelectDetail Shape

The `detail` shape depends on the picker type:

```ts
// type="date" | "month" | "year"
{ type, value, calendar: { year, month, day }, formatted }

// type="range" | "week"
{ type, value, start: { year, month, day }, end: { year, month, day }, formatted }

// type="multiple"
{ type, value, dates: [{ year, month, day }, ...], formatted }
```

## JavaScript API

```js
const picker = document.querySelector('intl-datepicker');

// Properties
picker.value;           // ISO string
picker.valueAsDate;     // native Date or null
picker.displayValue;    // formatted display string
picker.calendarValue;   // CalendarDate object
picker.rangeStart;      // ISO string or null (range/week)
picker.rangeEnd;        // ISO string or null (range/week)
picker.selectedDates;   // CalendarDate[] (multiple)

// Methods
picker.getValue();              // full SelectDetail or null
picker.setValue('2026-04-05');   // set value programmatically
picker.clear();                 // clear selection
picker.open();                  // open popup
picker.close();                 // close popup
picker.goToMonth(2026, 6);      // navigate to a specific month

// Callbacks (set via JS only)
picker.mapDays = ({ date, isToday, isDisabled }) => {
  if (date.dayOfWeek === 5) return { className: 'friday', content: '🎉' };
};

picker.disabledDatesFilter = ({ year, month, day }) => {
  return day === 13; // disable all 13ths
};

// Alias for disabledDatesFilter
picker.isDateDisabled = (date) => date.day === 13;
```

## Range Presets

```html
<intl-datepicker
  type="range"
  presets='[
    {"label": "Last 7 days", "value": "-6d/today"},
    {"label": "This month", "value": "monthStart/monthEnd"},
    {"label": "Last 30 days", "value": "-29d/today"}
  ]'
></intl-datepicker>
```

Preset `value` uses relative date expressions separated by `/`:
- `today` — today's date
- `-Nd` — N days ago
- `+Nd` — N days from now
- `monthStart` / `monthEnd` — start/end of current month

Presets can also be set via JavaScript:

```js
picker.presets = [
  { label: 'This week', value: '-6d/today' },
  { label: 'This month', value: 'monthStart/monthEnd' },
];
```

## Custom Day Rendering (mapDays)

```js
picker.mapDays = (info) => {
  // info: { date, isToday, isSelected, isDisabled, isInRange,
  //         isRangeStart, isRangeEnd, isCurrentMonth }
  // date: { year, month, day, dayOfWeek }

  return {
    className: 'my-class',  // extra CSS class
    style: 'color: red',    // inline style
    content: '<span>!</span>', // HTML appended inside cell
    disabled: true,          // force-disable this day
    hidden: true,            // hide this cell
    title: 'Tooltip text',  // title attribute
  };
};
```

## CSS Custom Properties

Style the component from the outside:

```css
intl-datepicker {
  --idp-primary: #2563eb;
  --idp-bg: #ffffff;
  --idp-text: #1f2937;
  --idp-border: #d1d5db;
  --idp-hover: #f3f4f6;
  --idp-selected-bg: var(--idp-primary);
  --idp-selected-text: #ffffff;
  --idp-today-border: var(--idp-primary);
  --idp-disabled: #9ca3af;
  --idp-radius: 8px;
  --idp-day-size: 40px;
  --idp-font-size: 14px;
  --idp-font-family: system-ui, -apple-system, sans-serif;
  --idp-range-bg: #dbeafe;
  --idp-range-text: var(--idp-text);
  --idp-muted: #6b7280;
}
```

## CSS Shadow Parts

Use `::part()` for deeper styling:

```css
intl-datepicker::part(input) { border-radius: 12px; }
intl-datepicker::part(calendar) { box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
intl-datepicker::part(day) { border-radius: 50%; }
intl-datepicker::part(header) { background: #f0f0f0; }
```

| Part | Element |
|---|---|
| `input-wrapper` | Input container |
| `input` | The `<input>` element |
| `calendar` | Calendar popup panel |
| `header` | Month/year header bar |
| `header-title` | Header title area |
| `nav-prev` | Previous navigation button |
| `nav-next` | Next navigation button |
| `weekday` | Weekday column header |
| `day` | Day cell button |
| `month-cell` | Month cell (month picker view) |
| `year-cell` | Year cell (year picker view) |
| `footer` | Footer bar with Today/Clear |
| `today-btn` | "Today" button |
| `clear-btn` | "Clear" button |
| `alternate` | Gregorian alternate display |
| `presets` | Presets sidebar |

## External Input Binding

Bind the picker to any existing input:

```html
<input type="text" id="my-input" placeholder="Pick a date">
<intl-datepicker for="my-input" calendar="persian" locale="fa-IR"></intl-datepicker>
```

## Form Integration

```html
<form>
  <intl-datepicker name="birthday" required min="1950-01-01" max="2010-12-31"></intl-datepicker>
  <button type="submit">Submit</button>
</form>
```

The component participates in native form submission, validation (`required`, `min`/`max` range checks), and `form.reset()`.

## Keyboard Navigation

| Key | Action |
|---|---|
| `Arrow keys` | Move focus between days |
| `Enter` | Select focused date |
| `Escape` | Close the popup |

## React Wrapper

```jsx
import IntlDatepicker from 'intl-datepicker/react';

function App() {
  const ref = useRef(null);

  return (
    <IntlDatepicker
      ref={ref}
      calendar="persian"
      locale="fa-IR"
      type="range"
      inline
      onSelect={(detail) => console.log(detail)}
      onChange={(detail) => console.log(detail)}
      onNavigate={(detail) => console.log(detail)}
      onOpen={(e) => { /* return false to prevent */ }}
      onClose={(e) => { /* return false to prevent */ }}
    />
  );
}
```

### Ref API

```js
ref.current.element;        // underlying HTMLElement
ref.current.value;          // ISO string
ref.current.displayValue;   // formatted string
ref.current.calendarValue;  // CalendarDate
ref.current.selectedDates;  // CalendarDate[]
ref.current.getValue();     // SelectDetail
ref.current.setValue('2026-04-05');
ref.current.clear();
ref.current.open();
ref.current.close();
ref.current.goToMonth(2026, 6);
```

## TypeScript

Type declarations are included. Imports:

```ts
import 'intl-datepicker';
import type {
  IntlDatepickerElement,
  SelectDetail,
  NavigateDetail,
  DatepickerType,
  MapDaysFn,
  RangePreset,
  DisabledDatesFilterFn,
} from 'intl-datepicker';

// React
import IntlDatepicker from 'intl-datepicker/react';
import type { IntlDatepickerProps, IntlDatepickerRef } from 'intl-datepicker/react';
```

## Browser Support

Any browser supporting Web Components, `Intl.DateTimeFormat`, and `adoptedStyleSheets`:
- Chrome/Edge 73+
- Firefox 101+
- Safari 16.4+

## License

MIT
