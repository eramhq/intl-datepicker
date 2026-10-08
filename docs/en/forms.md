---
title: Native forms and validation
description: Submit machine values with FormData, require complete selections, and reset to defaults.
---

## Submit a selected date

The element is form-associated. Put `name` on the picker to submit its machine `value`. A label targeting its `id` names the built-in input.

```html
<form id="booking-form">
  <label for="arrival">Arrival date</label>
  <intl-datepicker id="arrival" name="arrival" locale="en-GB"
    value="2026-03-15" min="2026-03-01" max="2026-03-31"
    required></intl-datepicker>
  <button type="submit">Read booking</button>
  <button type="reset">Reset</button>
</form>
<output id="booking-result"></output>
```

```js
import 'intl-datepicker';

const form = document.querySelector('#booking-form');
const output = document.querySelector('#booking-result');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  output.textContent = new FormData(form).get('arrival') ?? '';
});
```

Submitting the initial selection displays `2026-03-15`. No network request is made. A native interactive submit validates before the submit event; the explicit check also documents the requirement for application-driven reads. `new FormData(form)` itself never validates. Validate again when processing data on the server.

Empty values contribute no entry, not an empty-string entry. Disabled controls (including controls in a disabled fieldset) are omitted. Missing `name` also means there is no named field. These behaviors require browser support for form-associated custom elements; the library has no hidden-input fallback.

## Validation

Use `picker.checkValidity()` to check and `picker.reportValidity()` to ask the browser to show feedback. `validity`, `validationMessage`, `willValidate`, and `form` expose ElementInternals state.

Validation follows this order:

| Condition | Flag | Label key |
| --- | --- | --- |
| Invalid or unavailable typed input | `badInput` | `invalidDate` / `dateUnavailable` / range error label |
| Required empty value | `valueMissing` | `pleaseSelectDate` |
| Required range with no end | `valueMissing` | `rangeIncomplete` |
| Earlier than min / later than max | `rangeUnderflow` / `rangeOverflow` | `dateTooEarly` / `dateTooLate` |
| Disabled day or disallowed range | `customError` | `dateUnavailable` / `rangeUnavailable` |
| Too few / too many nights | `tooShort` / `tooLong` | `rangeTooShort` / `rangeTooLong` |

Programmatically assigned dates are retained even when invalid. Bound validation precedes availability, which precedes range length. Per-day validity rules do not test every day of week/month/year selections. `max-dates` is an assignment/interaction limit, not a validity flag.

A required incomplete range is still present in `FormData` as its start date. It is rejected by validation, not by data extraction. Without `required`, a pending start can pass validity; your application must decide whether partial ranges are acceptable. See [range rules](constraints.md#range-rules).

## Reset and disabled state

`form.reset()` restores the current `value` attribute, or empties the picker if there is none. Changes through `.value`, `setValue()`, and user selection do not replace that default. Changing the `value` attribute does replace it. Reset clears typed-input errors and does not emit `intl-change`.

`disabled` blocks opening and disables the built-in input. A disabled ancestor fieldset is handled by the native form callback. `readonly` makes the built-in text input read-only and blocks normal trigger opening; it is not a security or immutability guarantee for programmatic calls or custom inputs. In the current implementation, inline calendars and external triggers have readonly limitations. See [troubleshooting](recipes.md#readonly-and-custom-inputs).

## Custom inputs

The built-in input provides the most complete keyboard, naming, and error wiring. A slotted input can replace it:

```html
<intl-datepicker name="arrival" value="2026-03-15">
  <input slot="input" type="text" aria-label="Arrival date" readonly>
</intl-datepicker>
```

Do not give the slotted input the same form name: it displays localized text, while the host submits the ISO value. Supply its label and disabled/readonly state yourself. The component does not mirror all built-in ARIA attributes onto custom inputs. With `allow-input`, a slotted input can commit typed dates through the picker; remove its own `readonly` if typing is intended.

An existing input can open the picker using `for`:

```html
<label for="arrival-display">Arrival date</label>
<input id="arrival-display" type="text" readonly>
<intl-datepicker for="arrival-display" name="arrival"
  locale="en-GB" value="2026-03-15"></intl-datepicker>
```

Here `for` is the external input's ID; the picker's own built-in input is hidden. The external input displays localized text after selection updates. It is an opening/display binding, not a full two-way typing or accessibility adapter: `allow-input` does not attach the built-in parsing/keyboard handlers to it. Its existing text may be parsed when binding, but an initial host value is not reliably mirrored on first connection; initialize the display explicitly if needed:

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
document.querySelector('#arrival-display').value = picker.displayValue;
```

Keep `name` on the picker and implement any additional external-input behavior in the application. For the usual form use case, prefer the first example.
