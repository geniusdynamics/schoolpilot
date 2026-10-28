# KEMIS learner register (Kenya)

A plug-in that writes the school's learner register as one CSV file for the Kenyan national education
management information system, KEMIS. It is built on the [plug-in SDK](../sdk/index.ts) and imports
nothing else from the application.

**It does not run inside the app yet.** The host neither loads third-party plug-ins nor hands a plug-in
the school's learner records — see *Not wired into the host yet* in
[`docs/extensions/plugins.md`](../../../docs/extensions/plugins.md). What is here is the file format,
the validator and the tests for them; the host adapter that supplies learners is still to come.

## Verification status: `draft`

**No KEMIS file layout has been published anywhere this plug-in's author could reach.** The columns,
the header names, the sex wording, the date format and the file name are this plug-in's own, chosen to
be readable and unambiguous. They are **not** a KEMIS specification and must not be presented as one.

What was fetched on 2026-10-28, and what it gave:

| URL | Result |
| --- | --- |
| <https://kemis.go.ke/> | Reached. A JavaScript application shell: the served HTML holds styling and a bootstrap tag, no documentation and no layout. Nothing could be read from it. |
| <https://kemis.education.go.ke/> | Did not resolve (no DNS record from this network). |
| <https://www.education.go.ke/> | Connection timed out. |

The UPI itself is the country pack's scheme, `ke.kemis_upi`, which the pack already marks `draft`:
`packs/country/ke/country.json` records that the identifier has no published format and is kept as
written. This plug-in treats it the same way — a string the school copies off the learner's KEMIS
record, trimmed, never reformatted.

### What the school's registrar must confirm before a file is uploaded

1. Whether KEMIS accepts a file at all, or whether the register is keyed on the portal and a file is
   only ever an offline working copy.
2. The exact column names and their order, if a file is accepted.
3. The institution code: its length and form as printed on the school's KEMIS record.
4. How sex is written (a word, an `F`/`M` code, or a number).
5. The date format. This plug-in writes `YYYY-MM-DD`; a portal expecting `DD/MM/YYYY` will read
   `2012-05-25` as an error at best.
6. Whether the guardian contact belongs in the learner register at all, and which guardian is wanted
   when a learner has two.
7. Whether a learner without a UPI may appear (this plug-in refuses the whole file instead).

Until those are answered, treat the output as a working document for the school, not as a submission.

## What it produces

One file, one row per learner whose status is `enrolled`:

```
kemis-learner-register_<institution code>_<YYYY-MM-DD>.csv
```

For example `kemis-learner-register_KE-021-0042_2026-10-28.csv`. Characters in the institution code
that a file name cannot carry become `-`.

| Property | Value |
| --- | --- |
| Encoding | UTF-8 |
| Byte-order mark | Yes, by default — Excel reads the file as UTF-8 only with one. The `byteOrderMark` setting turns it off. |
| Line endings | CRLF, on every record including the last |
| Quoting | RFC 4180: a field holding a comma, a double quote, CR or LF, or leading or trailing space is wrapped in quotes, and each inner quote is doubled |
| Header | Always written, even when the register is empty |
| Row order | Class, then surname, then first name, then admission number, in plain code-unit order so the same learners always give the same file |

### Columns

| Header | Mandatory | What goes in it |
| --- | --- | --- |
| `UPI` | yes | The learner's KEMIS unique pupil identifier, as written on the record. Refused when blank or when two learners carry the same one. |
| `SURNAME` | yes | The family name. |
| `FIRST_NAME` | yes | The given name. |
| `MIDDLE_NAMES` | no | The middle names, space separated. |
| `SEX` | yes | `Female`, `Male`, `Other` or `Not stated`. |
| `DATE_OF_BIRTH` | yes | `YYYY-MM-DD`, and a date that exists. |
| `CLASS` | yes | The class or form as the school writes it, for example `Form 1 East`. |
| `ADMISSION_NUMBER` | yes | The school's own admission number. |
| `GUARDIAN_NAME` | no | The primary guardian's name. |
| `GUARDIAN_RELATIONSHIP` | no | `mother`, `father`, `guardian`, and so on. |
| `GUARDIAN_PHONE` | no | E.164, for example `+254712345678`. A national-format number is refused rather than guessed at. |
| `INSTITUTION_CODE` | yes | The school's code, the same on every row. |

`GUARDIAN_NAME`, `GUARDIAN_RELATIONSHIP` and `GUARDIAN_PHONE` are left empty when the school turns the
`guardianContacts` setting off; the columns stay in the header so the file keeps one shape.

## Refusals

The register is refused whole, with every refused row named, rather than written with a gap:

- a learner with no UPI, no surname, no first name, no class, no admission number or no date of birth;
- two learners carrying the same UPI;
- a date of birth that is not a real `YYYY-MM-DD` date;
- a guardian contact with no name, or a phone number that is not E.164;
- a blank institution code, or a generation time that is not an instant.

Learners whose status is not `enrolled` are not refused: they are left out and reported in
`register.skipped`, with the status that excluded them.

## How to run it

The plug-in's entry point is `exportRegister(context, learners, now)`:

```ts
import { exportRegister } from '@/plugins/ke-kemis';

const register = exportRegister(
  { settings: { institutionCode: 'KE-021-0042' } },
  learners,                     // KemisLearner[]: the host adapter's job
  new Date('2026-10-28T09:15:00.000Z')
);

register.fileName;   // kemis-learner-register_KE-021-0042_2026-10-28.csv
register.csv;        // the file text, byte-order mark included
register.skipped;    // learners left out, and why
```

`buildRegister(input)` is the same thing without the settings layer, and takes the byte-order-mark and
guardian-contact options directly. `KemisExportError.issues` lists `{ path, message }` for a refusal,
where `path` is `learners[3].upi` or `institutionCode`.

Write `register.csv` as UTF-8 bytes for the byte-order mark to reach the file.

### Settings

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `institutionCode` | string | — | Required. The school code as printed on the KEMIS record. |
| `guardianContacts` | boolean | `true` | Fill in the three guardian columns. |
| `byteOrderMark` | boolean | `true` | Start the file with a UTF-8 byte-order mark. |

## Tests

```bash
pnpm vitest run src/plugins/ke-kemis
```

`__tests__/register.test.ts` builds a register from a four-learner fixture (one of them no longer
enrolled), and covers the header, the row order, a comma and an apostrophe in a surname, a non-ASCII
name, the byte-order mark, CRLF, an empty register, and each refusal above.
`__tests__/plugin.test.ts` checks the manifest against the SDK schema, its SDK range, the settings it
reads, and that the plug-in imports nothing beyond `@/plugins/sdk` and its own files.

No test needs a database, a browser or a network connection.
