---
title: Framework integrations and SSR
description: Connect the picker to React, Vue, Svelte, or Angular and understand client-only rendering.
---

## React

The package supplies a wrapper at `intl-datepicker/react`. It imports the base element; add calendar and label imports yourself. This controlled example keeps a Gregorian ISO day in React state while showing the Persian calendar:

```tsx
'use client';

import { useRef, useState } from 'react';
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import IntlDatepicker, { type IntlDatepickerRef } from 'intl-datepicker/react';

export default function BookingDate() {
  const picker = useRef<IntlDatepickerRef>(null);
  const [value, setValue] = useState('2024-03-20');
  return (
    <>
      <label htmlFor="booking-date">Booking date</label>
      <IntlDatepicker
        ref={picker}
        id="booking-date"
        name="bookingDate"
        calendar="persian"
        locale="fa-IR"
        value={value}
        onChange={(detail) => setValue(detail.value)}
      />
      <output>{value}</output>
      <button type="button" onClick={() => picker.current?.clear()}>Clear</button>
    </>
  );
}
```

Initial output is `2024-03-20`. Clearing produces `''`. `onChange`, `onSelect`, and `onNavigate` receive the event detail directly, not a DOM event. `onOpen` and `onClose` receive the cancelable DOM event; returning `false` prevents the action.

Use camelCase props such as `minNights`, `excludeDisabled`, `disabledDates`, `firstDayOfWeek`, and `allowInput`. `disabledDates` is a JSON string. `presets` and `labels` accept either JSON strings or arrays/objects. Function props `mapDays` and `disabledDatesFilter` are assigned as element properties. Reuse unchanged object/function values when possible to avoid unnecessary panel rebuilding. Standard props such as `className`, `style`, `aria-*`, and `data-*` pass through.

The ref exposes `element`, `value`, `displayValue`, `calendarValue`, `selectedDates`, `getValue`, `setValue`, `clear`, `open`, `close`, and `goToMonth`. Use `ref.current?.element` for native validity and form APIs. The peer dependency declares React `>=17`; the repository's wrapper tests use the installed React version, not a matrix of every supported version.

## Vue 3

With Vite and Vue SFCs, configure the compiler to recognize the custom element. This setting belongs in the Vue plugin, as described in [Vue's custom-element guide](https://vuejs.org/guide/extras/web-components.html).

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'intl-datepicker',
      },
    },
  })],
});
```

```vue
<script setup>
import { ref } from 'vue';
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';
const date = ref('2024-03-20');
</script>

<template>
  <label for="vue-date">Booking date</label>
  <intl-datepicker id="vue-date" calendar="persian" locale="fa-IR"
    :value="date" @intl-change="date = $event.detail.value">
  </intl-datepicker>
  <output>{{ date }}</output>
</template>
```

The output begins with `2024-03-20`. Use `intl-change` and `.detail.value`, rather than assuming the element implements Vue's `v-model` event contract. Set JavaScript callback properties through an element ref when needed.

## Svelte

This example uses legacy component syntax, including `on:intl-change`, supported in Svelte's legacy mode. See the [Svelte event directive documentation](https://svelte.dev/docs/svelte/legacy-on) when adapting to another mode.

```svelte
<script>
  import 'intl-datepicker/calendars/persian';
  import 'intl-datepicker/labels/fa';
  import 'intl-datepicker';
  let date = '2024-03-20';
</script>

<label for="svelte-date">Booking date</label>
<intl-datepicker id="svelte-date" calendar="persian" locale="fa-IR"
  value={date} on:intl-change={(event) => (date = event.detail.value)}>
</intl-datepicker>
<output>{date}</output>
```

Initial output is `2024-03-20`. For an imperative integration, keep an element reference, listen with `addEventListener('intl-change', handler)` on mount, and remove the listener on unmount. There is no package-specific Svelte wrapper.

## Angular

Allow the element in a standalone component with [CUSTOM_ELEMENTS_SCHEMA](https://angular.dev/api/core/CUSTOM_ELEMENTS_SCHEMA):

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';

@Component({
  selector: 'app-booking-date',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <label for="angular-date">Booking date</label>
    <intl-datepicker id="angular-date" calendar="persian" locale="fa-IR"
      [value]="date" (intl-change)="date = $any($event).detail.value">
    </intl-datepicker>
    <output>{{ date }}</output>
  `,
})
export class BookingDateComponent {
  date = '2024-03-20';
}
```

Initial output is `2024-03-20`. This connects the element property and DOM event. The package does not provide an Angular ControlValueAccessor or automatic `ngModel`/reactive-form-control integration. Use native forms or implement an adapter for those APIs. For boolean attributes without property setters, bind presence explicitly, for example `[attr.disabled]="locked ? '' : null"`.

## Server imports and client rendering

The base, full, and registration modules can be imported in Node without a DOM. Import guards skip custom-element registration on the server and styles are created lazily. This is import safety: the library does not render a working calendar or shadow-root markup on the server. Do not instantiate the element class in Node.

The built React wrapper begins with `'use client'`. In Next.js App Router, keep state, handlers, and optional calendar/label imports together in a client component such as the example above. Server components can render that client boundary. React effects run on the client, as described in [React's effect documentation](https://react.dev/reference/react/useEffect).

Ensure the package also runs in the browser bundle. Server imports alone do not register anything in the user's browser. Call DOM methods after mount/connection and guard access to `document` in shared modules. There is no documented declarative-shadow-DOM or calendar hydration API. Test integration in your actual SSR framework; the repository checks Node imports and the React wrapper, not full Vue/Svelte/Angular SSR applications.
