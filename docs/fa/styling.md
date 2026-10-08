---
title: تنظیم ظاهر و محتوای روزها
description: ظاهر انتخابگر را با متغیرهای CSS، بخش‌های عمومی سایه و تزئین روزها تغییر دهید.
---

## متغیرهای CSS

سبک‌ها داخل ریشه سایه کامپوننت قرار دارند. متغیرهای عمومی را روی عنصر میزبان تنظیم کنید:

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

| متغیر | پیش‌فرض |
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
| `--idp-day-size` | `40px`؛ حداقل اندازه هدف روز ۲۴ پیکسل است |
| `--idp-font-size` | `14px` |
| `--idp-font-family` | `system-ui, -apple-system, sans-serif` |
| `--idp-z-index` | `1000` برای پنجره جایگزین |
| `--idp-input-min-width` | `200px` |
| `--idp-calendar-min-width` | `300px` |

تنظیم داخلی حالت تاریک، رنگ پس‌زمینه، متن، کادر، اشاره، پس‌زمینه بازه و متن کم‌رنگ را تغییر می‌دهد. اگر برنامه کلید تغییر پوسته دارد، این متغیرها را برای هر پوسته با هم تنظیم کنید. سبک‌های رنگ اجباری و کاهش حرکت هم وجود دارند؛ هنگام بازنویسی، کادر فوکوس و تضاد خوانا را حفظ کنید.

## بخش‌های عمومی سایه

```css
intl-datepicker::part(calendar) {
  box-shadow: 0 8px 24px rgb(0 0 0 / 15%);
}
intl-datepicker::part(day) { border-radius: 50%; }
intl-datepicker::part(input-wrapper) { border-width: 2px; }
```

| بخش | عنصر |
| --- | --- |
| `input-wrapper`، `input` | ظرف ورودی و ورودی داخلی |
| `hint`، `error` | راهنمای قالب تایپ و خطا |
| `calendar` | پنل تقویم |
| `header`، `header-title` | سربرگ جابه‌جایی و ناحیه عنوان |
| `nav-prev`، `nav-next` | دکمه‌های جابه‌جایی |
| `month-dropdown`، `year-dropdown` | فهرست‌های بازشونده ماه و سال |
| `weekday`، `day` | عنوان روز هفته و دکمه روز |
| `month-cell`، `year-cell` | دکمه‌های نمای ماه و سال |
| `footer`، `today-btn`، `clear-btn` | بخش پایین تقویم و دکمه‌های آن |
| `alternate` | خط تاریخ معادل میلادی |
| `presets` | ظرف بازه‌های آماده |
| `range-hint` | راهنمای طول بازه در حال انتخاب |

`clear-btn` دکمه پاک کردن پایین تقویم را هدف می‌گیرد، نه دکمه کوچک کنار ورودی. بخش‌ها امکان انتخاب هر فرزند داخلی یا کلاس وضعیت را نمی‌دهند. قانون سراسری `.idp-day` از مرز سایه عبور نمی‌کند. کلاس‌های داخلی جزئیات پیاده‌سازی‌اند و قرارداد عمومی ظاهر نیستند.

## گزینه‌های چیدمان

- `inline` تقویم را در صفحه نگه می‌دارد و پنجره باز نمی‌کند؛ ورودی همچنان جزئی از کامپوننت است.
- `months="1"` تا `"3"` تعداد پنل‌های روز را مشخص می‌کند. مقدار به این محدوده محدود می‌شود.
- `fixed-weeks` شش ردیف می‌سازد و `hide-outside-days` روزهای ماه مجاور را پنهان می‌کند.
- `show-week-numbers` شماره هفته محلی را اضافه می‌کند.
- `caption-layout` به‌طور پیش‌فرض `button` است و گزینه‌های `dropdown`، `dropdown-months` و `dropdown-years` هم دارد. فهرست‌های بازشونده برای نمای روز تک‌پنلی هستند؛ چند پنل عنوان ثابت ماه دارند.
- `show-alternate` وقتی یک روز انتخاب‌شده وجود دارد، معادل میلادی آن را نشان می‌دهد؛ روز مبنای ماه و سال را هم شامل می‌شود. خلاصه معادل برای بازه، هفته یا چند روز تولید نمی‌کند.
- `no-animation` پویانمایی پنجره را خاموش می‌کند؛ تنظیم کاهش حرکت کاربر هم رعایت می‌شود.

Popover پنجره را در لایه بالایی مرورگر می‌گذارد. `--idp-z-index` فقط برای حالت جایگزین با موقعیت ثابت کاربرد دارد و در آن حالت، برش محتوا یا والد دارای تبدیل را اصلاح نمی‌کند. در صورت نیاز، از ظرف بدون برش یا `inline` استفاده کنید.

## تغییر محتوای روز با mapDays

```js
import 'intl-datepicker';

const picker = document.querySelector('intl-datepicker');
picker.setValue('2026-03-15');
picker.mapDays = ({ date, isCheckoutOnly, isRangeBlocked }) => {
  if (isCheckoutOnly) return { title: 'فقط خروج' };
  if (isRangeBlocked) return { style: 'text-decoration: line-through' };
  if (date.iso === '2026-03-20') {
    return { content: ' •', title: 'نرخ ویژه', style: 'font-weight: 700' };
  }
  return null;
};
```

این نمونه بدون تغییر انتخاب، ۲۰ مارس را علامت می‌زند. `date` شامل سال، ماه و روز تقویم فعال، `iso` میلادی و `dayOfWeek` با شروع شماره‌گذاری از یکشنبه است. پرچم‌های دیگر `isToday`، `isSelected`، `isDisabled`، `isInRange`، `isRangeStart`، `isRangeEnd` و `isCurrentMonth` هستند. `isDisabled` قواعد عادی روز را نشان می‌دهد و `isRangeBlocked` درباره پایان غیرمجاز بازه در انتظار است.

می‌توانید `className`، سبک درون‌خطی `style`، محتوای افزوده `content`، `title`، `disabled` یا `hidden` برگردانید. `content` به‌عنوان HTML درج می‌شود؛ فقط محتوای قابل اعتماد برنامه را بدهید و متن پاک‌سازی‌نشده کاربر یا API را وارد نکنید. کلاس سفارشی داخل ریشه سایه است و انتخابگر معمولی کلاس بیرونی به آن نمی‌رسد. برای تزئین هر روز، `style` برگشتی را به کار ببرید.

`disabled: true` همان سلول نمایشی را مسدود می‌کند، اما قاعده ظرفیت کسب‌وکار اضافه نمی‌کند. `hidden: true` محتوای سلول را حذف می‌کند. هیچ‌کدام جایگزین [محدودیت ظرفیت](constraints.md) نیستند. تابع‌ها را همگام نگه دارید و پس از تغییر داده تزئین، تابع تازه‌ای اختصاص دهید.
