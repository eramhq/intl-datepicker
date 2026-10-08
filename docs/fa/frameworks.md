---
title: اتصال به چارچوب‌ها و SSR
description: انتخابگر را به React، Vue، Svelte یا Angular وصل کنید و محدودیت رندر سمت سرور را بشناسید.
---

## ری‌اکت

بسته در `intl-datepicker/react` یک کامپوننت واسط دارد که عنصر پایه را وارد می‌کند. ماژول تقویم و ترجمه را خودتان اضافه کنید. این نمونه، روز میلادی ISO را در state نگه می‌دارد و تقویم شمسی را نشان می‌دهد:

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
      <label htmlFor="booking-date">تاریخ رزرو</label>
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
      <button type="button" onClick={() => picker.current?.clear()}>پاک کردن</button>
    </>
  );
}
```

خروجی اولیه `2024-03-20` است و پاک کردن، `''` می‌دهد. `onChange`، `onSelect` و `onNavigate` مستقیم detail را دریافت می‌کنند، نه رویداد DOM. `onOpen` و `onClose` رویداد DOM قابل لغو را دریافت می‌کنند و برگرداندن `false` مانع عمل می‌شود.

از propهای camelCase مانند `minNights`، `excludeDisabled`، `disabledDates`، `firstDayOfWeek` و `allowInput` استفاده کنید. `disabledDates` رشته JSON است. `presets` و `labels` رشته JSON یا آرایه و شیء می‌پذیرند. تابع‌های `mapDays` و `disabledDatesFilter` به property عنصر اختصاص می‌یابند. تا جای ممکن، شیءها و تابع‌های بدون تغییر را دوباره استفاده کنید تا پنل بی‌دلیل بازسازی نشود. propهای عادی مانند `className`، `style`، `aria-*` و `data-*` به عنصر منتقل می‌شوند.

ref شامل `element`، `value`، `displayValue`، `calendarValue`، `selectedDates`، `getValue`، `setValue`، `clear`، `open`، `close` و `goToMonth` است. برای API بومی فرم و اعتبارسنجی، از `ref.current?.element` استفاده کنید. وابستگی همتای بسته React `>=17` را اعلام می‌کند؛ آزمون‌های مخزن با نسخه نصب‌شده اجرا می‌شوند، نه با همه نسخه‌های این محدوده.

## ویو ۳

در پروژه Vite با فایل‌های SFC، کامپایلر را برای شناخت عنصر سفارشی تنظیم کنید. طبق [راهنمای عنصرهای سفارشی Vue](https://vuejs.org/guide/extras/web-components.html)، این تنظیم در افزونه Vue قرار می‌گیرد.

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
  <label for="vue-date">تاریخ رزرو</label>
  <intl-datepicker id="vue-date" calendar="persian" locale="fa-IR"
    :value="date" @intl-change="date = $event.detail.value">
  </intl-datepicker>
  <output>{{ date }}</output>
</template>
```

خروجی با `2024-03-20` شروع می‌شود. از `intl-change` و `.detail.value` استفاده کنید؛ عنصر قرارداد رویداد `v-model` ویو را پیاده نمی‌کند. در صورت نیاز، تابع‌های JavaScript را از طریق ref عنصر به propertyهای آن بدهید.

## اسولت

این نمونه از نحو قدیمی کامپوننت، از جمله `on:intl-change`، استفاده می‌کند که در حالت legacy اسولت پشتیبانی می‌شود. برای سازگار کردن با حالت دیگر، [مستندات دستور رویداد Svelte](https://svelte.dev/docs/svelte/legacy-on) را ببینید.

```svelte
<script>
  import 'intl-datepicker/calendars/persian';
  import 'intl-datepicker/labels/fa';
  import 'intl-datepicker';
  let date = '2024-03-20';
</script>

<label for="svelte-date">تاریخ رزرو</label>
<intl-datepicker id="svelte-date" calendar="persian" locale="fa-IR"
  value={date} on:intl-change={(event) => (date = event.detail.value)}>
</intl-datepicker>
<output>{date}</output>
```

خروجی اولیه `2024-03-20` است. برای اتصال مستقیم، مرجع عنصر را نگه دارید، هنگام mount با `addEventListener('intl-change', handler)` گوش دهید و هنگام unmount شنونده را حذف کنید. بسته، واسط اختصاصی Svelte ندارد.

## انگولار

با [CUSTOM_ELEMENTS_SCHEMA](https://angular.dev/api/core/CUSTOM_ELEMENTS_SCHEMA)، استفاده از عنصر را در کامپوننت مستقل مجاز کنید:

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
    <label for="angular-date">تاریخ رزرو</label>
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

خروجی اولیه `2024-03-20` است. این نمونه property عنصر و رویداد DOM را به هم وصل می‌کند. بسته، ControlValueAccessor انگولار یا اتصال خودکار `ngModel` و کنترل فرم واکنشی ندارد. از فرم بومی استفاده کنید یا برای آن APIها واسط بسازید. برای attribute بولی بدون setter، حضور attribute را صریح تنظیم کنید؛ مثلا `[attr.disabled]="locked ? '' : null"`.

## وارد کردن در سرور و رندر در مرورگر

ورودی اصلی، ورودی کامل و ماژول‌های ثبت را می‌توان در Node بدون DOM وارد کرد. شرط‌های محیطی، ثبت عنصر را در سرور رد می‌کنند و سبک‌ها هنگام نیاز ساخته می‌شوند. این یعنی import امن است؛ کتابخانه تقویم قابل استفاده یا محتوای ریشه سایه را در سرور رندر نمی‌کند. کلاس عنصر را در Node نمونه‌سازی نکنید.

فایل ساخته‌شده واسط React با `'use client'` شروع می‌شود. در Next.js App Router، state، پردازشگرها و import اختیاری تقویم و ترجمه را مانند نمونه بالا در یک کامپوننت سمت کاربر نگه دارید. کامپوننت سرور می‌تواند این مرز سمت کاربر را رندر کند. طبق [مستندات effect در React](https://react.dev/reference/react/useEffect)، effectها در سمت کاربر اجرا می‌شوند.

مطمئن شوید بسته در خروجی مرورگر هم اجرا می‌شود. import در سرور به‌تنهایی چیزی در مرورگر کاربر ثبت نمی‌کند. متدهای DOM را پس از mount یا اتصال عنصر فراخوانی کنید و دسترسی به `document` را در ماژول مشترک به محیط مرورگر محدود کنید. API مستندی برای declarative shadow DOM یا hydration تقویم وجود ندارد. اتصال را در چارچوب SSR واقعی خود بررسی کنید؛ مخزن importهای Node و واسط React را می‌آزماید، نه برنامه کامل SSR در Vue، Svelte یا Angular.
