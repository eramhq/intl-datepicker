---
title: نصب و ورودی‌های بسته
description: عنصر سفارشی و فقط تقویم‌ها، ترجمه‌ها یا واسط React مورد نیاز را بارگذاری کنید.
---

## نصب در برنامه

```sh
npm install intl-datepicker
```

```js
import 'intl-datepicker';
```

این import عنصر `intl-datepicker` را در مرورگر ثبت می‌کند. آن را در ورودی سمت کاربر و پیش از استفاده از API عنصر قرار دهید. مرورگر در یک فایل HTML معمولی نمی‌تواند نام بسته را مستقیم پیدا کند؛ این نوع import به ابزار ساخت یا import map نیاز دارد. بسته شامل ماژول‌های ES و تعریف نوع‌های TypeScript است.

سبک‌ها در ریشه سایه عنصر قرار می‌گیرند. مسیر عمومی جداگانه‌ای برای وارد کردن CSS وجود ندارد. `@internationalized/date` وابستگی بسته است و React فقط برای استفاده از کامپوننت واسط لازم است.

## ورودی‌های موجود

| مسیر import | چیزی که ثبت یا فراهم می‌کند |
| --- | --- |
| `intl-datepicker` | عنصر، تقویم میلادی و متن‌های انگلیسی |
| `intl-datepicker/full` | عنصر، همه تقویم‌ها و متن‌های انگلیسی، فارسی، عربی و عبری |
| `intl-datepicker/calendars/persian` | `persian` |
| `intl-datepicker/calendars/islamic` | `islamic`، `islamic-umalqura`، `islamic-civil`، `islamic-tbla` |
| `intl-datepicker/calendars/hebrew` | `hebrew` |
| `intl-datepicker/calendars/buddhist` | `buddhist` |
| `intl-datepicker/calendars/japanese` | `japanese` |
| `intl-datepicker/calendars/indian` | `indian` |
| `intl-datepicker/calendars/ethiopic` | `ethiopic` و `ethioaa` |
| `intl-datepicker/calendars/coptic` | `coptic` |
| `intl-datepicker/calendars/roc` | `roc` |
| `intl-datepicker/labels/fa` | متن‌های فارسی رابط |
| `intl-datepicker/labels/ar` | متن‌های عربی رابط |
| `intl-datepicker/labels/he` | متن‌های عبری رابط |
| `intl-datepicker/react` | کامپوننت واسط React که عنصر پایه را هم وارد می‌کند |

ماژول‌های تقویم و ترجمه مقدار خروجی ندارند؛ هدف import آن‌ها ثبت قابلیت مربوط است. مسیرهای `/calendars/all` و `/labels/all` عمومی نیستند. اگر همه بخش‌ها را می‌خواهید، از `/full` استفاده کنید.

## بارگذاری تقویم و متن‌های فارسی

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';
```

```html
<intl-datepicker calendar="persian" locale="fa-IR"
  value="2024-03-20"></intl-datepicker>
```

این نمونه روز اول سال ۱۴۰۳ را انتخاب می‌کند، اما `value` همچنان `2024-03-20` است. اگر HTML از قبل در صفحه است، مانند نمونه بالا ماژول‌های تقویم و ترجمه را پیش از import عنصر اصلی وارد کنید. وارد کردن ترجمه پس از ساخت عنصر، نمونه‌های موجود را خودکار به‌روز نمی‌کند. اگر تقویم ثبت نشده باشد، کتابخانه هشدار می‌دهد و از تقویم میلادی استفاده می‌کند.

## استفاده بدون ابزار ساخت

در فایل HTML مستقل، می‌توانید از CDN سازگار با ماژول‌های ES استفاده کنید تا وابستگی‌های بسته را پیدا کند:

```html
<script type="module">
  import 'https://esm.sh/intl-datepicker@0.4.2/calendars/persian';
  import 'https://esm.sh/intl-datepicker@0.4.2/labels/fa';
  import 'https://esm.sh/intl-datepicker@0.4.2';
</script>
<intl-datepicker calendar="persian" locale="fa-IR"
  value="2024-03-20"></intl-datepicker>
```

نسخه ثابت‌شده باید APIهای مورد استفاده شما را داشته باشد. این روش به شبکه و سرویس CDN وابسته است؛ خروجی ساخت مخزن، اسکریپت معمولی و مستقل از وابستگی‌ها نیست. برای بارگذاری همه بخش‌ها، importها را با `https://esm.sh/intl-datepicker@0.4.2/full` جایگزین کنید.

## نیازمندی‌های مرورگر و سرور

کامپوننت تعاملی به عنصرهای سفارشی، Shadow DOM، ماژول‌های JavaScript و پشتیبانی `Intl` از تقویم انتخابی نیاز دارد. ارسال بومی فرم و اعتبارسنجی به پشتیبانی از عنصر سفارشی متصل به فرم و `ElementInternals` وابسته‌اند. در نبود این قابلیت‌ها، کتابخانه ورودی مخفی جایگزین ایجاد نمی‌کند.

هدف ساخت ES2022 است. پنجره تقویم در صورت دسترسی از Popover API استفاده می‌کند و در غیر این صورت با موقعیت ثابت نمایش داده می‌شود. در حالت دوم، والدهای دارای تبدیل CSS یا برش محتوا ممکن است روی جای‌گیری اثر بگذارند. برای مرورگرهای فاقد stylesheetهای قابل استفاده مجدد نیز عنصر style جایگزین می‌شود. این راهکارها به معنی تضمین پشتیبانی از یک نسخه قدیمی مشخص نیستند.

مخزن آزمون مرورگری برای Chromium، Firefox و WebKit دارد. مرورگرها و ابزارهای کمکی مورد نیاز برنامه خود را بررسی کنید. تفاوت import امن در سرور و رندر سمت کاربر در [راهنمای چارچوب‌ها و SSR](frameworks.md#وارد-کردن-در-سرور-و-رندر-در-مرورگر) توضیح داده شده است.
