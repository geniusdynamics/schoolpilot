# KNEC candidate registration (Kenya)

A plug-in that writes a KCSE candidate registration as a candidate list, a subject-entry list and a
JSON bundle, allocating each candidate the index number KNEC's bands call for and refusing an entry
the KCSE rules do not allow. It is built on the [plug-in SDK](../sdk/index.ts) and imports nothing
else from the application.

**It does not run inside the app yet.** The host neither loads third-party plug-ins nor hands a
plug-in the school's learner records — see *Not wired into the host yet* in
[`docs/extensions/plugins.md`](../../../docs/extensions/plugins.md). What is here is the rules, the
file layout, the validator and the tests for them.

## Verification status

Split down the middle, on purpose:

| What | Status | Where it comes from |
| --- | --- | --- |
| The KCSE subject codes, names and groups | **verified** | KCSE user guide, §2.8.1 Table 2 (fetched, text read) |
| The index-number structure and the two bands | **verified** | KCSE user guide, §2.3.22 to §2.3.24 (fetched, text read) |
| The entry codes 1, 2 and 3 | **verified** | KCSE user guide, §2.3.20 (fetched, text read) |
| The seven-subject minimum and nine-subject maximum, and the sighted combination rules | **verified** | KCSE user guide, §2.8.1, §2.8.2 and §2.8.4 (fetched, text read) |
| The file layout: header names, column order, subject separator, JSON shape, encoding | **draft** | No published upload layout was found. These are this plug-in's own. |

### What was fetched on 2026-10-28

| URL | Result |
| --- | --- |
| <https://www.knec.ac.ke/wp-content/uploads/2024/10/USER-GUIDE-FOR-KCSE-EXAMINATION-2024-EDITION-23rd-Oct_2.pdf> | Reached, 113 pages, text read. Every rule marked **verified** above is quoted from it. |
| <https://www.knec.ac.ke/services/registration-of-candidates/index.html> | Reached. "The Registration of the mentioned KNEC examinations is done online." After the candidates are keyed, the head teacher downloads the list, signs and stamps it, and the nominal-roll documents go to KNEC through the SCDE. |
| <https://knec-portal.ac.ke/> | Reached. The portal's own menu: *Secondary Schools (KCSE) → Candidate Registration*, and *Primary and Junior Schools → CBA Portal*. |
| <https://www.knec.ac.ke/wp-content/uploads/2026/02/REGISTRATION-OF-CANDIDATES-FOR-THE-2026-KCSE-EXAMINATION-1.pdf> | Reached, but it is a scanned document: a text extraction of it returned no content, so its nominal-roll field list could not be read. |
| <https://new.kenyalaw.org/akn/ke/act/ln/2009/176/eng@2022-12-31> | Fetched, empty response (the site refused the request). Nothing was read from it. |

So: KNEC registration is **keyed on a portal**, and no file layout for importing a roll is published
anywhere this plug-in's author could reach. The layout below is a best-effort working document, not a
KNEC specification, and nobody may call it one.

### What the school's registrar must confirm before a file is used

1. Whether the portal accepts an imported file at all, or whether every candidate is keyed by hand and
   these files are only a worksheet for that keying.
2. The nominal roll's exact columns and their order. The 2026 registration circular lists them, but the
   reachable copy is a scan.
3. Whether the portal wants one row per candidate or one row per candidate-and-subject, and how subject
   entries are separated.
4. Whether index numbers may be supplied, or whether the portal allocates them and a supplied one is
   ignored — the allocation here follows the published bands, but the portal is the authority.
5. Whether the submitted entry code (1, 2, 3) is the value the portal keys, or an internal label.
6. The encoding and line endings the portal tolerates (this plug-in writes UTF-8 with a byte-order
   mark and CRLF).
7. The current edition of the KCSE user guide. The rules here are the 2nd Edition 2024; a later edition
   could change a band or a subject code.

## What it produces

Three files for one examination at one centre, named after the centre and the day:

| File | Contents |
| --- | --- |
| `knec-kcse-candidates_<county><centre>_<YYYY-MM-DD>.csv` | One row per candidate |
| `knec-kcse-subject-entries_<county><centre>_<YYYY-MM-DD>.csv` | One row per candidate and subject |
| `knec-kcse-registration_<county><centre>_<YYYY-MM-DD>.json` | The same data as a bundle, with the exam, the centre, the bands and the sources it was read from. Omitted when the `writeJsonBundle` setting is off. |

For example `knec-kcse-candidates_24950500_2026-10-28.csv`.

| Property | Value |
| --- | --- |
| Encoding | UTF-8 |
| Byte-order mark | Yes, on both CSV files |
| Line endings | CRLF, on every record including the last; the JSON bundle uses LF |
| Quoting | RFC 4180: a field holding a comma, a double quote, CR or LF, or leading or trailing space is wrapped in quotes, and each inner quote is doubled |
| Header | Always written, even when there are no candidates |
| Row order | The order the candidates were supplied, which is the order the index numbers were allocated in |

### Candidate file columns

| Header | What goes in it |
| --- | --- |
| `INDEX_NUMBER` | The eleven-digit index number: two county digits, six centre digits, three candidate digits. |
| `SURNAME` | The family name. |
| `GIVEN_NAMES` | The given names, space separated. |
| `SEX` | `Female`, `Male`, `Other` or `Not stated`. |
| `DATE_OF_BIRTH` | `YYYY-MM-DD`. |
| `ENTRY_CODE` | `1` first attempt, `2` repeat of the whole examination, `3` partial repeater (user guide §2.3.20). |
| `SUBJECT_CODES` | The subject codes, ascending, separated by `;` — for example `101;102;121;231;232;311;565`. |
| `SUBJECT_COUNT` | How many subjects, which is what decides the index-number band. |
| `KCPE_INDEX_NUMBER` | The candidate's KCPE index number, where the school holds it (§2.3.25). |
| `KCPE_YEAR` | The year of that KCPE examination. |
| `ADMISSION_NUMBER` | The school's own admission number. |

The subject-entry file carries `INDEX_NUMBER`, `SUBJECT_CODE`, `SUBJECT_NAME` and `SUBJECT_GROUP`, one
row per candidate and subject, with the subject names as KNEC prints them.

## The rules it enforces

**Index numbers** (user guide §2.3.22 to §2.3.24):

- Eleven digits: county (2) + centre (6) + candidate (3).
- A candidate with **seven subjects or more** is numbered **001 to 499**.
- A candidate with **fewer than seven subjects** is numbered **801 to 899** — the band KNEC reserves
  for repeaters who return for a few subjects. The band follows the subject count, not the entry code.
- Numbers are allocated in the order the candidates are supplied, skipping a number a candidate already
  carries, and the centre is refused once a band is exhausted.

**Entries** (user guide §2.3.20, §2.8.1, §2.8.2, §2.8.4), checked for a candidate entered for seven
subjects or more:

- at least seven and at most nine subjects;
- `101` English, and `102` Kiswahili — or `504` Kenyan Sign Language for a candidate entered on the
  sign-language route;
- exactly one Mathematics option, `121` or `122`;
- `237` General Science only with `122` Mathematics Option B;
- at least two Group II subjects, or one when `237` is taken;
- at least one Group III subject;
- at most one of `313`, `314` and `315`;
- every code in the KNEC catalogue, and no subject entered twice.

A candidate with fewer than seven subjects must be entered as a repeater: the seven-subject minimum
applies to everyone else. A repeater entering fewer subjects is not checked against the combination
rules, which is how KNEC itself treats them.

**Refused** with `KnecRegistrationError`, listing every refused candidate and field:

- a subject code the catalogue does not hold, a duplicated subject, more than nine subjects, a
  first-attempt entry for fewer than seven, or a combination the rules above forbid;
- an index number that is not eleven digits, that belongs to another centre, that sits in the wrong
  band for the subject count, or that another candidate already holds;
- a county code that is not two digits, a centre number that is not six digits;
- a candidate with no surname, given names, admission number or date of birth, or with a date that does
  not exist in the calendar;
- an examination that cannot be exported, such as KCPE.

## KCPE

KCPE is listed in `KNEC_EXAMS` with status `retired`, and an export for it is refused with the reason:
the KNEC portal lists primary and junior school assessment under the CBA portal and offers no KCPE
candidate registration, and no KCPE registration layout is published. What the last KCPE cohort still
needs from a school system is a question for the registrar, not a guess this plug-in makes.

## How to run it

```ts
import { exportRegistration } from '@/plugins/ke-knec';

const registration = exportRegistration(
  { settings: { countyCode: '24', centreNumber: '950500' } },
  candidates,                   // KnecCandidate[]: the host adapter's job
  new Date('2026-10-28T09:15:00.000Z')
);

registration.fileNames;          // the three file names
registration.candidatesCsv;      // candidate file text, byte-order mark included
registration.subjectEntriesCsv;  // subject-entry file text
registration.json;               // the bundle, or null when the setting turns it off
```

`buildRegistration(input)` is the same thing without the settings layer and takes the exam, the centre
and the candidate list directly — useful for a JSON bundle for KCPE-free work, or for a preview.
`subjectByCode`, `KCSE_SUBJECTS` and `parseIndexNumber` are exported for a host that wants to check a
code or an index number before asking for a file.

### Settings

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `countyCode` | string | — | Required. Two digits. |
| `centreNumber` | string | — | Required. Six digits. |
| `writeJsonBundle` | boolean | `true` | Write the JSON bundle beside the two CSV files. |

## Tests

```bash
pnpm vitest run src/plugins/ke-knec
```

| File | Covers |
| --- | --- |
| `__tests__/subjects.test.ts` | The 31 subjects and their groups, unique three-digit codes, the source citation, and that every national code the Kenya 8-4-4 pack models is in the catalogue. |
| `__tests__/indexNumbers.test.ts` | The eleven-digit structure read and written both ways, the two bands, the candidate-number padding, and the centre checks. |
| `__tests__/registration.test.ts` | A four-candidate fixture (one of them a partial repeater), the allocated index numbers, both CSV files, the JSON bundle, a comma and an apostrophe in a surname, a non-ASCII name, an empty registration, and every refusal above. |
| `__tests__/plugin.test.ts` | The manifest against the SDK schema, the SDK range, the centre settings, and that the plug-in imports nothing beyond `@/plugins/sdk` and its own files. |

No test needs a database, a browser or a network connection: the fixtures are plain objects.
