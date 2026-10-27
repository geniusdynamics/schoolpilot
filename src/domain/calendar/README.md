# Calendar

A calendar here is a way to read a day, not a way to store one. Every stored date stays a Gregorian
`YYYY-MM-DD` (or a local `Date` at midnight); a calendar system converts to and from it, names its
months in a locale and steps through them. Import from `@/domain/calendar`, never from a file inside it.

```ts
import { calendarForLocale, getCalendar } from '@/domain/calendar';

const ethiopic = getCalendar('ethiopic');
ethiopic.fromGregorian(new Date(2023, 8, 12)); // { year: 2016, month: 1, day: 1 }  (Enkutatash)
ethiopic.toGregorian({ year: 2015, month: 13, day: 6 }); // 11 September 2023, the leap day of Pagume
calendarForLocale('am-ET'); // 'ethiopic'; 'en-KE' is 'gregorian'; 'en-u-ca-gregory' keeps Gregorian
```

| Calendar | Months | Notes |
| --- | --- | --- |
| `gregorian` | 12 | The default. Identical to what the date picker always did. |
| `ethiopic` | 13 | Amete Mihret. Twelve months of 30 days and Pagume of 5 days, 6 in years that leave 3 when divided by 4. |

How it is checked: every day from 1900 to 2100 round-trips through the Ethiopian date, every Ethiopian date of the
years 1893 to 2092 round-trips through the Gregorian day, and every day from 1990 to 2060 matches the platform's own
ICU Ethiopic calendar (skipped on an engine without it). Month names come from ICU in the locale; an engine without
the data falls back to the transliterated names.

The date fields use it: `DatePicker` and `DateField` take a `calendar` prop and default to the locale's own.

Not here: Hijri (display only, optional in spec 06 section 6), the Amete Alem era (`ethioaa`), or Ethiopian clock time.

To add a calendar, write a `CalendarSpec` (months, days in a month, the two conversions, names and labels), build it with
`createCalendarSystem`, register it in `calendars.ts` and add its id to `CALENDAR_IDS`.
