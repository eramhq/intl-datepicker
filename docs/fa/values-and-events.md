---
title: مقدارها، رویدادها و API عمومی
description: تاریخ بدون ساعت را ذخیره کنید و از رویدادها، متدها و نوع‌های TypeScript استفاده کنید.
---

## مقدارها و منطقه زمانی

`value` رشته‌ای است که یک تاریخ یا دوره را نشان می‌دهد، نه یک لحظه دقیق روی خط زمان. برای یک روز، `2026-03-15` به همان روز میلادی اشاره دارد، مستقل از تقویم نمایشی. در مدل داده هم آن را به شکل تاریخ بدون ساعت نگه دارید. در صورت نیاز، دو سر بازه را در دو فیلد تاریخ ذخیره کنید. هفته، چند روز و دوره دارای پسوند تقویم به ساختار متناسب با خود نیاز دارند و همگی در یک ستون SQL DATE جا نمی‌گیرند.

صرفا برای ذخیره‌سازی، تاریخ بدون ساعت را به timestamp تبدیل نکنید. اگر برنامه به یک لحظه دقیق نیاز دارد، باید ساعت و منطقه زمانی را مشخص کند. انتخابگر تنظیمی برای ساعت روز یا منطقه زمانی ندارد.

`valueAsDate` برای راحتی، یک `Date` بومی در نیمه‌شب محلی می‌دهد. برای انتخاب خالی، بازه و چند روز، null است. برای ماه و سال، روز اول دوره را می‌دهد. برای هفته، دوشنبه هفته ISO را می‌دهد که ممکن است با شروع هفته محلی متفاوت باشد. برای مرزهای هفته از `rangeStart` و `rangeEnd` استفاده کنید.

«امروز» از منطقه زمانی تشخیص‌داده‌شده محیط استفاده می‌کند که در سطح ماژول نگه داشته می‌شود. دکمه امروز، بازه‌های نسبی و `disable-past` و `disable-future` به همین منطقه وابسته‌اند. امروز هنگام رندر و تعامل به‌روز می‌شود؛ زمان‌سنجی برای لحظه نیمه‌شب وجود ندارد. برای مهلت کسب‌وکار در منطقه زمانی دیگر، روزهای مجاز را در برنامه محاسبه کنید و حدهای صریح بدهید.

مقدار ماه و سال غیرمیلادی از روز اول میلادی دوره و پسوند `[u-ca=...]` ساخته می‌شود. پسوند، `calendar` را عوض نمی‌کند؛ تقویم متناظر را جداگانه تنظیم کنید. [قالب دوره‌ها](picker-types.md#ماه-و-سال) را ببینید. متن نمایشی با `Intl` ساخته می‌شود و نشانه‌گذاری یا فاصله آن ممکن است بین محیط‌ها متفاوت باشد؛ آن را به‌عنوان قالب ذخیره‌سازی تجزیه نکنید.

## تنظیم و خواندن مقدار

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.value = '2026-03-15';
console.log(picker.getValue().calendar); // { year: 2026, month: 3, day: 15 }
picker.setValue('2026-03-20');
console.log(picker.value); // 2026-03-20
picker.clear();
console.log(picker.value, picker.getValue()); // '', null
```

این نمونه برای انتخابگر پیش‌فرض روز میلادی است. اختصاص `.value` و فراخوانی `setValue()` از یک تجزیه‌کننده استفاده می‌کنند. مقدار معتبر به [قالب نوع انتخابگر](picker-types.md) تبدیل می‌شود. اختصاص مقدار نامعتبر هشدار می‌دهد و انتخاب قبلی را حفظ می‌کند؛ مقدار اولیه نامعتبر، انتخاب را خالی می‌گذارد. `''` انتخاب را پاک می‌کند. در فهرست چند روز، ممکن است فقط عضوهای نامعتبر حذف شوند، نه کل فهرست.

attribute به نام `value` مقدار را بدون رویداد تنظیم می‌کند و پیش‌فرض بازنشانی هم هست. تغییر property یا متد، این attribute را عوض نمی‌کند. برای تنظیم‌هایی که setter عمومی ندارند، از `setAttribute()` و `removeAttribute()` استفاده کنید؛ مثلا `picker.calendar = 'persian'` پشتیبانی نمی‌شود. ویژگی بولی HTML با حضورش فعال است؛ به‌جای `disabled="false"` آن را حذف کنید.

## رویدادها

با `addEventListener()` روی عنصر گوش دهید. همه رویدادها به والدها می‌رسند و از مرز Shadow DOM عبور می‌کنند.

| رویداد | داده و زمان ارسال |
| --- | --- |
| `intl-select` | `SelectDetail` پس از انتخاب پذیرفته‌شده کاربر؛ شامل شروع بازه، تایپ، امروز و بازه آماده |
| `intl-change` | `SelectDetail` پس از انتخاب کاربر و تغییر مقدار با `.value`، `setValue()` یا `clear()` |
| `intl-navigate` | `NavigateDetail` وقتی جابه‌جایی کاربر، پنجره ماه‌های قابل مشاهده را تغییر دهد |
| `intl-open`، `intl-close` | پیش از باز یا بسته شدن پنجره؛ قابل لغو و بدون داده کاربردی |

اختصاص دوباره همان مقدار رشته‌ای با کد، `intl-change` نمی‌فرستد. انتخاب کاربر یا فعال کردن بازه آماده ممکن است حتی با رشته خروجی یکسان، آن را بفرستد. `clear()` در صورت تغییر، رویداد change می‌فرستد ولی select نمی‌فرستد؛ دکمه پاک کردن هم همین رفتار را دارد. مقدار اولیه، `setAttribute('value', ...)`، تغییر attributeهای تنظیم و بازنشانی فرم، رویداد change ندارند. `goToMonth()` هم navigate نمی‌فرستد.

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.addEventListener('intl-change', ({ detail }) => {
  console.log(detail.value);
  if (detail.type === 'range' && detail.end === null) return;
  // A completed selection or a clear can now update application state.
});
picker.setValue('2026-03-15');
```

اگر مقدار قبلی متفاوت باشد، نمونه `2026-03-15` را چاپ می‌کند. برای لغو باز یا بسته شدن، در رویداد مربوط `event.preventDefault()` را فراخوانی کنید. بسته شدن را بی‌قیدوشرط لغو نکنید؛ در آن صورت Escape هم پنجره را نمی‌بندد. تقویم درون‌صفحه‌ای رویدادهای باز و بسته شدن پنجره را ندارد.

## ساختار داده رویداد

همه گونه‌های `SelectDetail` شامل `type`، `value` و `formatted` هستند.

| نوع | فیلدهای دیگر |
| --- | --- |
| `date` | `calendar: { year, month, day }` یا null |
| `range`، `week` | `start` و `end` به شکل `{ year, month, day }` در تقویم فعال یا null |
| `multiple` | `dates`، آرایه‌ای از `{ year, month, day }` در تقویم فعال |
| `month` | `calendar: { year, month }` یا null؛ رشته‌های میلادی ISO برای `start` و `end` یا null |
| `year` | `calendar: { year }` یا null؛ رشته‌های میلادی ISO برای `start` و `end` یا null |

هنگام پاک کردن، رویداد `value` خالی، فیلدهای تاریخ null یا فهرست `dates` خالی دارد. در مقابل، `getValue()` برای انتخاب خالی null برمی‌گرداند. بازه ناتمام شروع دارد و پایان آن null است. مرزهای ماه و سال شامل آخرین روز هم هستند.

`NavigateDetail` شامل `year` و `month` در تقویم فعال، `direction` با مقدار `forward` یا `backward` و مرزهای میلادی ISO به نام `start` و `end` برای همه ماه‌های نمایان است. هنگام ایجاد اولیه ارسال نمی‌شود؛ ظرفیت اولیه را خودتان بارگذاری کنید.

## propertyها و متدهای عمومی

| API | کاربرد |
| --- | --- |
| `value`، `type`، `name` | خواندن و نوشتن مقدار، نوع انتخابگر و نام فیلد فرم |
| `numerals`، `captionLayout`، `fixedWeeks` | تنظیم‌های نمایشی قابل خواندن و نوشتن که به attributeها متصل‌اند |
| `labels`، `presets` | تنظیم شیء یا آرایه؛ زمان اجرا رشته JSON هم می‌پذیرد |
| `mapDays`، `disabledDatesFilter` | تنظیم تابع JavaScript؛ برای حذف null بدهید |
| `displayValue` | متن محلی فقط‌خواندنی |
| `calendarValue` | `CalendarDate` انتخاب‌شده برای روز، ماه و سال؛ در حالت‌های دیگر null |
| `rangeStart`، `rangeEnd` | مرزهای میلادی ISO فقط‌خواندنی برای بازه و هفته؛ در حالت‌های دیگر null |
| `selectedDates` | خواندن آرایه `CalendarDate[]` انتخاب چند روز |
| `valueAsDate` | مقدار `Date` بومی با ملاحظات منطقه زمانی بالا |
| `getValue()` | داده ساختاریافته انتخاب یا null |
| `setValue(string)`، `clear()` | تنظیم یا پاک کردن انتخاب |
| `open()`، `close()` | کنترل پنجره؛ در حالت درون‌صفحه‌ای اثری ندارند و باز کردن در حالت disabled مسدود است |
| `goToMonth(year, month)` | نمایش ماه تقویم فعال؛ شماره ماه از ۱ شروع می‌شود؛ پس از اتصال عنصر فراخوانی کنید |
| `form`، `validity`، `validationMessage`، `willValidate` | وضعیت بومی فرم از طریق ElementInternals |
| `checkValidity()`، `reportValidity()` | بررسی اعتبار یا بررسی همراه با بازخورد مرورگر |

`goToMonth()` نما را تغییر می‌دهد، نه انتخاب را، و آرگومان‌ها را به `min` و `max` محدود نمی‌کند. عددهای متناسب با تقویم بدهید و نمای درخواستی را در محدوده نگه دارید. برای تغییر انتخاب، شیءهای تقویم یا آرایه‌های برگشتی را دست‌کاری نکنید؛ `setValue()` را به کار ببرید.

## تایپ‌اسکریپت

```ts
import 'intl-datepicker';
import type { IntlDatepickerElement, SelectDetail } from 'intl-datepicker';

const picker: IntlDatepickerElement = document.createElement('intl-datepicker');
picker.type = 'month';
document.body.append(picker);
picker.addEventListener('intl-change', (event) => {
  const detail: SelectDetail = event.detail;
  if (detail.type === 'month' && detail.calendar) {
    console.log(detail.calendar.month, detail.start, detail.end);
  }
});
picker.setValue('2026-03');
```

خروجی نمونه `3`، `2026-03-01` و `2026-03-31` است. پیش از دسترسی به فیلدهای ویژه، `SelectDetail` را با `type` محدود کنید و حالت پاک‌شده را در نظر بگیرید.

ورودی تعریف نوع، `DatepickerType`، `DayOfWeekName`، `ExcludeDisabledMode`، `DateFormat`، `CaptionLayout`، هر ۶ رابط detail، `SelectDetail`، `NavigateDetail`، `DayInfo`، `MapDaysInput`، `MapDaysResult`، `MapDaysFn`، `RangePreset`، `DisabledDatesFilterFn`، `IntlDatepickerLabels`، `PluralLabel` و `IntlDatepickerEventMap` را صادر می‌کند. نگاشت نام عنصر و رویدادها هم گسترش داده می‌شود. ورودی React نوع‌های `IntlDatepickerProps` و `IntlDatepickerRef` را دارد.

از `IntlDatepickerElement` به‌عنوان نوع استفاده کنید، نه سازنده زمان اجرا. ماژول JavaScript، `IntlDatepicker` و `register` را صادر می‌کند، اما تعریف نوع فعلی آن‌ها را اعلام نمی‌کند. همچنین setter تایپ‌شده `labels` و `presets` فقط شیء و آرایه می‌پذیرد، هرچند زمان اجرا رشته JSON هم می‌پذیرد. در TypeScript از import ثبت‌کننده و setter شیء یا آرایه استفاده کنید.
