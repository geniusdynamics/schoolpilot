<!-- ABOUTME: Glossary of the school terms the Kiswahili and French locales use, so a native reviewer can check choices quickly. -->
<!-- ABOUTME: Every translation here is a DRAFT: no native speaker has reviewed it. Corrections go in this table first, then the locale files. -->

# Translation glossary

Status: **draft, not reviewed by a native speaker**. The Kiswahili column follows usage in Kenyan schools as far as
the author knows it; the French column is added with the French locale (P5-B02). Mark a row `reviewed` in the last
column once a native reviewer has confirmed it.

| English | Kiswahili | French | Note | Status |
| --- | --- | --- | --- | --- |
| Student / Learner | Mwanafunzi (pl. Wanafunzi) | | One word for both: Kenyan CBE material says "learner", ordinary usage says "student". | draft |
| Teacher | Mwalimu (pl. Walimu) | | | draft |
| Head teacher / Principal | Mwalimu Mkuu | | Used by the packs and settings, not yet in the core namespaces. | draft |
| Parent / Guardian | Mzazi / Mlezi | | "Wazazi/walezi" where both are meant. | draft |
| Staff | Wafanyakazi | | Literally "workers". | draft |
| Class | Darasa (pl. Madarasa) | | | draft |
| Class group | Kikundi cha darasa | | Product term for a class in a given academic year. | draft |
| Stream | Mkondo (pl. Mikondo) | | A parallel class within a level; the older text used "mtiririko". | draft |
| Level / Grade / Form | Ngazi | | "Form 1", "Grade 7" are kept as written. | draft |
| Subject | Somo (pl. Masomo) | | | draft |
| Learning area | Eneo la kujifunza | | Used in the CBE pack. | draft |
| Exam | Mtihani (pl. Mitihani) | | | draft |
| Marks | Alama | | | draft |
| Results | Matokeo | | | draft |
| Grading | Upimaji | | | draft |
| Fees | Ada | | School fees. | draft |
| Payments | Malipo | | | draft |
| Invoice | Ankara | | | draft |
| Receipt | Risiti | | | draft |
| Votehead | Votehead | | Kenyan accounting term, kept in English. | draft |
| Term | Muhula | | "Muhula wa 1" for Term 1. | draft |
| Academic year | Mwaka wa masomo | | Older text also has "mwaka wa kisomo". | draft |
| Financial year | Mwaka wa fedha | | | draft |
| Timetable | Ratiba | | | draft |
| Attendance | Mahudhurio | | | draft |
| Promotion (to the next class) | Kupandisha (madarasa) | | | draft |
| Alumni | Wahitimu | | | draft |
| Report card | Kadi ya ripoti | | | draft |
| Settings | Mipangilio | | | draft |
| Configuration | Usanidi | | | draft |
| Dashboard | Dashibodi | | Loanword, as used in Kiswahili software. | draft |
| Portal | Portal | | Loanword kept as written; the allowlist in `src/i18n/untranslatable.ts` records it. | draft |
| Hub | Kituo | | "Kituo cha Maombi" for Applications Hub. | draft |
| Supplier | Muuzaji (pl. Wauzaji) | | | draft |
| Inventory (stock) | Hesabu / Hisa | | "Hesabu" for the module, "hisa" for stock levels. | draft |
| Data integrity | Uadilifu wa data | | | draft |
| Backup | Nakala rudufu | | The older settings label still says "Backup". | draft |
| Migration (database) | Uhamisho (wa data) | | | draft |
| Password | Neno la siri | | | draft |
| Administrator | Msimamizi | | | draft |
| Yes / No | Ndiyo / Hapana | | | draft |

## Rules the locale files follow

- Every `{{placeholder}}` is kept exactly as in English; `src/i18n/completeness.ts` fails the build when one changes.
- Brand names (SchoolPilot) and acronyms (CSV, PDF, KCSE, CBE) stay in English.
- Labels for buttons are kept short; sentences keep the register of the English source.
- A string that is legitimately identical to English is listed with its reason in `src/i18n/untranslatable.ts`.
