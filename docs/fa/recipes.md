---
title: نمونه‌های کاربردی و رفع اشکال
description: گزارش ماهانه و دریافت ظرفیت را پیاده کنید و مشکلات رایج تنظیم را برطرف کنید.
---

## ماه شمسی برای گزارش

وقتی گزارش یک ماه تقویمی را پوشش می‌دهد، از انتخابگر ماه استفاده کنید. ماژول مرورگر زیر با HTML همراه آن کار می‌کند:

```html
<label for="period">ماه گزارش</label>
<intl-datepicker id="period" type="month" name="period"
  calendar="persian" locale="fa-IR"
  value="2024-07-22[u-ca=persian]"></intl-datepicker>
<output id="period-bounds"></output>
```

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
const output = document.querySelector('#period-bounds');
function showPeriod(detail) {
  if (!detail || detail.type !== 'month' || !detail.calendar) {
    output.textContent = '';
    return;
  }
  const key = `${detail.calendar.year}-${detail.calendar.month}`;
  output.textContent = `${key}: ${detail.start} / ${detail.end}`;
}
showPeriod(picker.getValue());
picker.addEventListener('intl-change', ({ detail }) => showPeriod(detail));
```

خروجی اولیه `1403-5: 2024-07-22 / 2024-08-21` است. برای پرس‌وجو روی ستون تاریخ، `start` و `end` مرزهای میلادی شامل دو سر بازه‌اند. اگر API شما پایان را خارج از بازه حساب می‌کند، آن مرز را در بخش مدیریت تاریخ برنامه تبدیل کنید. مقدار ارسالی `period` همچنان `2024-07-22[u-ca=persian]` است. نمونه، پاک شدن انتخاب را بدون دسترسی به شیء calendar خالی مدیریت می‌کند.

## به‌روزرسانی ظرفیت

در [نمونه رزرو](constraints.md#نمونه-رزرو-اقامت)، پنجره نمایان مارس و آوریل ۲۰۲۶ است. کد زیر فرض می‌کند سرویس برنامه شما برای پنجره درخواستی، آرایه JSON از شب‌های رزروشده میلادی ISO برمی‌گرداند:

```js
import 'intl-datepicker';

const picker = document.querySelector('#stay');
const booked = new Set();
let request;
async function loadAvailability(start, end) {
  request?.abort();
  const current = new AbortController();
  request = current;
  try {
    const query = new URLSearchParams({ from: start, to: end });
    const response = await fetch(`/api/booked-nights?${query}`, {
      signal: current.signal,
    });
    if (!response.ok) throw new Error(`Availability: ${response.status}`);
    const dates = await response.json();
    if (request !== current) return;
    if (!Array.isArray(dates) || dates.some((d) => typeof d !== 'string')) {
      throw new Error('Expected an array of ISO date strings');
    }
    for (const iso of booked) {
      if (iso >= start && iso <= end) booked.delete(iso);
    }
    for (const iso of dates) booked.add(iso);
    picker.disabledDatesFilter = ({ iso }) => booked.has(iso);
  } catch (error) {
    if (error.name !== 'AbortError') console.error(error);
  }
}
picker.addEventListener('intl-navigate', ({ detail }) => {
  loadAvailability(detail.start, detail.end);
});
loadAvailability('2026-03-01', '2026-04-30');
```

اگر پاسخ شامل `2026-03-20` باشد، آن شب غیرقابل انتخاب می‌شود. اختصاص فیلتر، نما را به‌روز می‌کند و شروع در انتظار را نگه می‌دارد. این قرارداد سرویس برنامه شماست و API آماده‌ای از طرف بسته نیست. معتبر بودن خود تاریخ‌های پاسخ را بررسی کنید، وضعیت بارگذاری و خطا را نشان دهید و تا وقتی ظرفیت لازم معلوم نیست، ارسال را متوقف کنید. هنگام حذف نما، درخواست جاری را لغو کنید.

نمونه، پنجره‌های بارگذاری‌شده را نگه می‌دارد و تاریخ‌های داخل پنجره تازه‌شده را جایگزین می‌کند. برای اقامتی که از پنجره‌های دیگر هم عبور می‌کند، ظرفیت کل اقامت لازم است. سرور باید موجودی را دوباره بررسی کند؛ سلول غیرفعال تقویم قفل رزرو نیست. `disabled-dates` ثابت نمونه رزرو نیز در کنار فیلتر اعمال می‌شود.

## مرخصی شامل آخر هفته

ماژول اصلی را وارد کنید. وقتی درخواست می‌تواند آخر هفته را در بر بگیرد ولی شروع و پایان آن باید روز مجاز باشد، `exclude-disabled` را نگذارید:

```html
<intl-datepicker type="range" locale="en-US" name="leave"
  disabled-days-of-week="sat,sun"
  disabled-dates='["2026-03-17"]'
  value="2026-03-13/2026-03-18"></intl-datepicker>
```

بازه اولیه با وجود آخر هفته و ۱۷ مارس در میانه آن معتبر است. خروجی `2026-03-13/2026-03-18` خواهد بود. اگر همه روزها باید مجاز باشند، `exclude-disabled="days"` اضافه کنید؛ همان مقدار دیده می‌شود، اما اعتبارسنجی را رد می‌کند.

## زمان جلسه و UTC

نوبت‌های جلسه را هر ۱۵ دقیقه از ساعت ۹ نشان دهید و یک لحظه دقیق به سرور بفرستید:

```html
<intl-datepicker id="meeting" name="meeting" time minute-step="15"
  default-time="09:00" min="2026-03-16T09:00"
  calendar="persian" locale="fa-IR"></intl-datepicker>
```

```js
import 'intl-datepicker/calendars/persian';
import 'intl-datepicker/labels/fa';
import 'intl-datepicker';

const picker = document.querySelector('#meeting');
picker.addEventListener('intl-change', () => {
  // '2026-03-16T09:30' در منطقه زمانی مرورگر خوانده و به UTC تبدیل می‌شود.
  const utc = picker.valueAsDate?.toISOString() ?? null;
  console.log(picker.value, utc);
});
```

انتخاب ۲۵ اسفند ۱۴۰۴ مقدار `2026-03-16T09:00` را می‌دهد و انتخاب `۳۰` در منوی دقیقه، `2026-03-16T09:30`. در تهران (UTC+03:30)، `utc` برابر `2026-03-16T06:00:00.000Z` است. `valueAsDate` از منطقه زمانی محیط اجرا استفاده می‌کند. برای منطقه دیگر، با Temporal تبدیل کنید: `Temporal.PlainDateTime.from(picker.value).toZonedDateTime('Asia/Tehran').toInstant().toString()`. فیلد ارسالی فرم همان `value` ساعت محلی می‌ماند.

## مشکلات رایج تنظیم

| نشانه | بررسی لازم |
| --- | --- |
| زبان فارسی ولی تقویم میلادی | `/calendars/persian` را وارد کنید و `calendar="persian"` بگذارید |
| نام ماه فارسی ولی دکمه انگلیسی | پیش از ساخت عنصر، `/labels/fa` را وارد کنید |
| هشدار تقویم ناشناخته | نگاشت ماژول‌ها در [نصب](installation.md) را ببینید؛ گونه‌ها ماژول مشترک دارند |
| شکست import نام بسته در HTML | ابزار ساخت، import map یا نمونه CDN مستندشده لازم است |
| مقدار جدید نادیده گرفته می‌شود | قالب را با نوع تطبیق دهید؛ ماه و سال غیرمیلادی روز ISO می‌خواهند، نه سال و ماه کوتاه بومی |
| تغییر روز پس از ذخیره | مقدار بدون ساعت را نگه دارید و تبدیل timestamp خارج از انتخابگر را بررسی کنید |
| نبود فیلد در FormData | `name`، مقدار خالی، disabled و fieldset و پشتیبانی ElementInternals را بررسی کنید |
| نبود رویداد پس از تغییر attribute | تغییر attribute بدون رویداد است؛ برای رویداد تغییر مقدار از `.value` یا `setValue()` استفاده کنید |
| رد شدن بازه کامل تایپ‌شده | هر بار یک روز در تقویم فعال وارد کنید |
| بی‌اثر بودن سبک کلاس داخلی | متغیر CSS، بخش عمومی یا سبک درون‌خطی `mapDays` به کار ببرید |
| بریده شدن تقویم بدون Popover | از والد دارای تبدیل یا برش دوری کنید یا `inline` بگذارید |
| بی‌اثر بودن property جاوااسکریپت | فقط setterهای عمومی کار می‌کنند؛ برای بقیه تنظیم‌ها attribute بگذارید |

attribute با JSON خراب نادیده گرفته می‌شود. ویژگی‌های بولی مانند `required`، `disabled` و `allow-input` با حضورشان فعال‌اند، حتی اگر متن `"false"` داشته باشند. برای اعتبارسنجی داده نامطمئن سرور به تجزیه‌کننده تکیه نکنید؛ مثلا هفته ۵۳ با تعداد واقعی هفته‌های آن سال تطبیق داده نمی‌شود و بخش‌های اضافه بعد از ممیز دوم در مقدار بازه نادیده گرفته می‌شوند.

## فقط‌خواندنی بودن و ورودی سفارشی

رعایت readonly در تقویم درون‌صفحه‌ای، محرک خارجی `for` و فراخوانی مستقیم `open()` کامل نیست؛ کنترل‌های انتخاب می‌توانند قابل استفاده بمانند. اگر نمایش فقط‌خواندنی لازم دارید، یک مقدار قالب‌بندی‌شده ثابت نشان دهید. `disabled` روی تعامل و ارسال بومی فرم اثر دیگری دارد و جایگزین هم‌معنی فیلد فقط‌خواندنی ارسالی نیست.

ورودی خارجی و slot به مدیریت وضعیت و دسترس‌پذیری در برنامه نیاز دارند. مگر برای نیاز مشخص به محرک سفارشی، ورودی داخلی را ترجیح دهید. همگام‌سازی متن اولیه خارجی و رفتار `allow-input` در [راهنمای فرم](forms.md#ورودی-سفارشی) آمده است.

## بررسی در برنامه خودتان

در آزمون خودکار، زبان و تاریخ را صریح تعیین کنید. مقدار پاک‌شده، مقدار نامعتبر حفظ‌شده، بازه ناقص، بازنشانی فرم و تغییر تقویم را بررسی کنید. آزمون بومی فرم و فوکوس را در مرورگر واقعی اجرا کنید؛ شبیه‌ساز DOM همه رفتارهای ElementInternals و پنجره را بازسازی نمی‌کند. نمونه‌های چارچوب‌ها الگوی اتصال‌اند، نه جدول جامع سازگاری.
