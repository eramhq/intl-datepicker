---
title: تقویم، زبان، رقم‌ها و راست‌به‌چپ
description: تقویم را مستقل از زبان تنظیم کنید و متن‌های رابط را به زبان دلخواه درآورید.
---

## تقویم و زبان دو تنظیم جدا هستند

`calendar` تقویم انتخاب و محاسبه تاریخ را مشخص می‌کند. مقدار پیش‌فرض آن، مستقل از زبان، `gregory` است. `locale` نام روز و ماه، شیوه نمایش، رقم‌های پیش‌فرض، قواعد هفته و جهت رابط را تعیین می‌کند. اگر آن را مشخص نکنید، ابتدا `lang` سند و سپس زبان مرورگر استفاده می‌شود؛ مقدار جایگزین محیط نیز `en-US` است.

| شناسه تقویم | نوع تقویم | ماژول اختیاری |
| --- | --- | --- |
| `gregory` | میلادی | همراه ورودی اصلی |
| `persian` | هجری شمسی | `persian` |
| `islamic`، `islamic-umalqura` | ام‌القری | `islamic` |
| `islamic-civil` | هجری قمری مدنی | `islamic` |
| `islamic-tbla` | هجری قمری جدولی | `islamic` |
| `hebrew` | عبری | `hebrew` |
| `buddhist` | بودایی | `buddhist` |
| `japanese` | دوره‌های ژاپنی | `japanese` |
| `indian` | ملی هند | `indian` |
| `ethiopic`، `ethioaa` | اتیوپی و Amete Alem | `ethiopic` |
| `coptic` | قبطی | `coptic` |
| `roc` | مینگو، تایوان | `roc` |

مسیر import به شکل `intl-datepicker/calendars/<module>` است. جدول شامل ۱۴ شناسه پذیرفته‌شده است که نام‌های جایگزین و گونه‌های یک تقویم را هم در بر می‌گیرد. `islamic` هم در محاسبه و هم در نمایش به ام‌القری اشاره می‌کند. محاسبات شمسی از پیاده‌سازی وابستگی استفاده می‌کنند؛ آزمون‌ها تایید می‌کنند که ۳۰ اسفند ۱۴۰۳ برابر `2025-03-20` است.

## تقویم شمسی با متن‌های فارسی

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';
```

```html
<label for="persian-date">تاریخ</label>
<intl-datepicker id="persian-date" calendar="persian" locale="fa-IR"
  value="2024-03-20" allow-input></intl-datepicker>
```

تاریخ انتخاب‌شده در تقویم فعال `{ year: 1403, month: 1, day: 1 }` است. مقدار قابل پردازش `2024-03-20` باقی می‌ماند و ورودی معمولا `۱۴۰۳/۰۱/۰۱` را نشان می‌دهد. جزئیات نشانه‌گذاری و فاصله‌ها به داده‌های `Intl` مرورگر وابسته‌اند. این نمونه هم ماژول تقویم و هم ترجمه رابط را وارد می‌کند؛ محلی شدن نام ماه‌ها به‌تنهایی متن دکمه‌ها و پیام‌های اعتبارسنجی را ترجمه نمی‌کند.

## رقم‌ها و جهت رابط

برای نمایش رقم‌های لاتین در رابط فارسی، `numerals="latn"` بگذارید. شناسه‌های پشتیبانی‌شده دیگر، مانند `arab`، هم قابل استفاده‌اند. این تنظیم فقط نمایش را تغییر می‌دهد؛ مقدار قابل پردازش همچنان رقم‌های ASCII دارد.

کامپوننت راست‌به‌چپ بودن را از `locale` تشخیص می‌دهد و روی خودش `dir="rtl"` می‌گذارد. حرکت افقی با صفحه‌کلید هم از همین جهت پیروی می‌کند. `dir` روی یک والد، زبان یا قواعد صفحه‌کلید کامپوننت را تغییر نمی‌دهد. اگر جهت اهمیت دارد، `locale` را مشخص کنید.

`first-day-of-week` عدد `0` تا `6` یا نام `sun` تا `sat` را می‌پذیرد؛ یکشنبه `0` است. روزهای آخر هفته از اطلاعات محلی و در نبود آن‌ها از مقادیر جایگزین داخلی به دست می‌آیند. اگر قواعد کسب‌وکار نباید به داده‌های مرورگر وابسته باشند، `disabled-days-of-week` را صریح تنظیم کنید. [راهنمای محدودیت‌ها](constraints.md) را ببینید.

## متن‌های رابط

انگلیسی همیشه در دسترس است. برای فارسی، عربی یا عبری، به‌ترتیب `/labels/fa`، `/labels/ar` یا `/labels/he` را وارد کنید. ابتدا متن‌های انگلیسی، سپس ترجمه ثبت‌شده زبان و در پایان تغییرهای شما اعمال می‌شوند. تشخیص زبان با پیشوند انجام می‌شود؛ مثلا `fa-IR` از `fa` استفاده می‌کند. زبان‌های دیگر تا زمانی که متن جایگزین ندهید، رابط انگلیسی دارند.

```js
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.labels = {
  today: 'امروز',
  dateTooEarly: 'این تاریخ یا بعد از آن را انتخاب کنید: {date}',
  nights: '{n} شب',
};
```

ویژگی HTML به نام `labels` همین شیء را به شکل JSON می‌پذیرد. تنظیم property برای هر کلید بر تنظیم attribute اولویت دارد. برای به‌روزرسانی، شیء تازه‌ای اختصاص دهید؛ تغییر مستقیم شیء خوانده‌شده، روش به‌روزرسانی رابط نیست. خواندن `labels` متن‌های نهایی را برمی‌گرداند. رشته خالی در تنظیم‌های شما نادیده گرفته می‌شود.

| کلیدها | کاربرد و جای‌نگهدارها |
| --- | --- |
| `today`، `clear`، `clearDate` | دکمه‌های پایین تقویم و پاک کردن ورودی |
| `datePicker`، `rangePresets`، `calendarNavigation` | نام ناحیه‌ها برای ابزارهای کمکی |
| `monthSelection`، `yearSelection` | نام نمای ماه و سال |
| `previousMonth`، `nextMonth`، `previousDecade`، `nextDecade` | جابه‌جایی؛ با وجود نام کلید، هر صفحه سال شامل ۲۰ سال است |
| `selectMonth`، `selectYear`، `weekNumber` | کنترل‌های سربرگ و ستون شماره هفته |
| `selected`، `rangeStart`، `rangeEnd` | وضعیت افزوده‌شده به نام دسترس‌پذیر روز |
| `rangeSelected` | اعلام بازه کامل با `{start}` و `{end}` |
| `formatHint`، `invalidDate` | راهنمای تایپ با `{format}` و `{example}` |
| `dateUnavailable`، `pleaseSelectDate` | تاریخ غیرقابل انتخاب یا الزامی |
| `dateTooEarly`، `dateTooLate` | خطای حد تاریخ با `{date}` |
| `rangeTooShort`، `rangeTooLong` | خطای طول بازه با `{nights}` |
| `rangeUnavailable`، `rangeIncomplete` | بازه غیرمجاز یا پایان انتخاب‌نشده |
| `minNightsHint`، `maxNightsHint` | راهنمای بازه در حال انتخاب با `{nights}` |
| `nights` | رشته شامل `{n}` یا شکل‌های جمع با کلید الزامی `other` |

شکل جمع با `Intl.PluralRules` انتخاب می‌شود و `{n}` از تنظیم رقم‌ها پیروی می‌کند. نوع‌های `IntlDatepickerLabels` و `PluralLabel` در [راهنمای نوع‌ها](values-and-events.md#تایپاسکریپت) معرفی شده‌اند.

## تغییر تقویم با حفظ روز انتخاب‌شده

این ماژول مرورگر را همراه HTML نمونه فارسی بالا اجرا کنید:

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.setValue('2024-03-20');
picker.setAttribute('calendar', 'gregory');
picker.setAttribute('locale', 'en-GB');
console.log(picker.value); // 2024-03-20
picker.setAttribute('calendar', 'persian');
picker.setAttribute('locale', 'fa-IR');
console.log(picker.getValue().calendar); // { year: 1403, month: 1, day: 1 }
```

در نوع `date` همان روز حفظ می‌شود. تغییر attribute تقویم یا زبان، `intl-change` نمی‌فرستد؛ اگر برنامه به مقدار تازه نیاز دارد، پس از تغییر آن را بخوانید. در نوع ماه یا سال، دوره‌ای از تقویم جدید انتخاب می‌شود که روز اول دوره قبلی را در بر می‌گیرد؛ بنابراین مقدار و مرزهای دوره ممکن است تغییر کنند. مرز هفته هم با تغییر قواعد شروع هفته می‌تواند جابه‌جا شود.
