# Data protection guide for schools

What personal data SchoolPilot holds, where it lives, who can see it, how long to keep it, and what
to tell a parent.

**This is guidance, not legal advice.** Data-protection law differs by country and changes; a school
is the data controller for its learners' records and answers for them. Use this page to run the
system in a way that makes compliance possible, and take the legal questions to whoever advises the
school — a data protection officer, a lawyer or the national authority. Two examples of the law that
may apply are Kenya's Data Protection Act, 2019 and, for a school with any EU connection, the GDPR;
this page does not interpret either.

## 1. What the system holds

| Data | Examples of the fields | Where it is entered |
| --- | --- | --- |
| **Learner identity** | given and family name, date of birth, gender, admission number, residence status, previous school, photo if the school stores one | Admissions → **Admit learner**; Administration → **Students** |
| **Learner restricted data** | `medical` notes, `special_needs` | Learner record (the fields the entity registry marks encrypted) |
| **Health visits** | complaint, treatment, date | Administration → Students → **Health Records** |
| **Conduct incidents** | description, action taken | Administration → **Disciplinary Cases** |
| **Guardians and households** | name, relationship, phone, email, identifier (national ID, birth certificate, KRA PIN), household link | The admission form; Admissions → **Register** |
| **Staff** | name, contacts, designation, department, identifiers (national ID, KRA PIN, NSSF, SHA, TSC), salary settings | Administration → **Staff**; HR |
| **Accounts** | username, email, role, display name, password **hash**, sessions, TOTP secret (encrypted) | Settings → **Users & Roles**; the hub's auth tables |
| **Academic** | marks, assessment results, competency observations and their evidence, report cards | Marks Entry, Observations, Results, Report Publishing |
| **Financial** | invoices, payments, receipts, statements, balances, sponsor records | Finance |
| **Attendance** | daily register entries per learner | Administration → **Attendance** |
| **Audit and access logs** | who changed which row, who read a restricted field | Written by the repository and the hub; read at Settings → **Audit Log** |

There is no marketing profile, no analytics on learners and no third-party tracker in the app.
Optional outbound integrations exist and are off unless the school configures them: an
error-reporting DSN (`VITE_BUGSINK_DSN`), the optional backend/ERP presets behind
`VITE_BACKEND_*`, and a messaging gateway. Anything the school turns on becomes part of its
processing and belongs in its privacy notice — and a DSN or gateway credential must never carry a
learner's record.

## 2. Where it lives

### On a single device (browser only)

The database is a SQLite file in the browser's **origin-private file system (OPFS)**, named
`schoolpilot-canonical`. It belongs to that browser profile on that device.

- It is not encrypted by the school; it is protected by the device's disk encryption and the
  browser profile's access control. **Turn on full-disk encryption** (BitLocker on Windows,
  FileVault on macOS, LUKS on Linux) and a screen lock, and set a browser profile password if the
  browser offers one.
- Clearing the browser's site data deletes the school's records. That is also, incidentally, the only
  way to erase them completely from that device.
- A second browser or device starts empty; copying the address does not copy the data.

### On a hub (school server)

- One SQLite file, `<data dir>/schoolpilot.db`, on the hub machine.
- **Restricted fields are encrypted at rest** with AES-256-GCM, sealed as
  `enc:v1:<iv>:<tag>:<ciphertext>`: a learner's `medical` and `special_needs`, a health visit's
  complaint and treatment, a conduct incident's description and action. The key comes from
  `SCHOOLPILOT_RESTRICTED_KEY` or `<data dir>/keys/restricted-data.key` (mode 0600 in a 0700
  directory). A hub that finds sealed values with no key **refuses to start** rather than run with
  those columns unreadable.
- **Every access to a restricted value is logged** to `<data dir>/logs/restricted-access.jsonl`: the
  actor, the action, the row ids and the field names — never the value. A read that cannot be
  recorded is refused rather than served unlogged.
- **Passwords are hashed, never stored in the clear.** The hub's authentication service uses
  PBKDF2-SHA256 at 600,000 iterations; the browser app's own accounts use PBKDF2-SHA256 from the Web
  Crypto API at 100,000 iterations. **Sessions** are opaque tokens, stored as `sha256:<hex>`, so a
  stolen database holds no live session. **TOTP secrets** are encrypted under `<data dir>/auth.key`.
- **Backups** are encrypted archives (`.spbk`) under `<data dir>/backups`, keyed from the operator's
  passphrase by scrypt. The passphrase is not in the archive; keep it separate from the backup
  media, or the archive is unreadable to you and to a thief alike.
- **Logs**: `<data dir>/logs/hub.log`, the restricted-access log, and the `auth_event` table
  (sign-ins, refusals, lockouts, factor changes, resets — no passwords, codes or tokens).

### Two known leaks to plan around

Both are written down in the code's own documentation and are open work, not secrets:

1. **The sync change log holds restricted values in the clear.** `sync_change.payload` carries the
   fields a change touched, opened, so the encryption at rest covers the canonical columns and not
   that one (`server/README.md`). A hub that is syncing restricted fields therefore stores them
   twice, once sealed and once not.
2. **The browser app does not enforce the permission matrix on its own writes.** The canonical
   repository in the app is built without the authoriser, so the field policy that strips a learner's
   medical data for a role without `learner.medical.read` is applied by the hub's API and by the
   scoped repository, not by the app's pages (`src/data/auth/README.md`).

Until those close: keep a hub on a trusted network, restrict who can reach the machine's data
directory, and do not rely on the browser's screens as the only control over medical notes.

## 3. Who can see what

The role catalogue assigns each role a set of permissions and a scope. The scopes that decide whose
rows a person sees:

| Scope | The rows it covers | How it is resolved |
| --- | --- | --- |
| `institution` | the institution's rows, except finance documents | the actor's user row |
| `class_group` | a homeroom's class, its enrolments, learners, guardians and assessments | the class groups that name the actor as homeroom teacher |
| `teaching_group` | the teaching group, its members, assessments and marks | the actor's effective teaching assignments |
| `finance` | the institution's finance documents | the actor's user row |

Roles, in the catalogue's own words: **administrator**, **head teacher/principal**, **registrar**,
**class teacher**, **subject teacher**, **bursar**, **accounts clerk/cashier**, **nurse**,
**auditor**. A file policy worth knowing by name: `learner.medical.read` — without it, the learner's
medical field is stripped on read and on list, not merely hidden in the screen.

What that means in practice, and where the limit is:

- A teacher sees their own groups; a bursar sees finance; a registrar sees the institution's people.
  That is how the hub judges a request, and how the scoped repository judges a read.
- The audit trail records who wrote what, per row, and the repository's audit trail is readable at
  Settings → **Audit Log** and at `GET /api/entities/<entity>/<id>/audit`.
- **The browser app's pages do not consult the matrix** (see above). Treat the screen-level scope as
  a convenience and the hub's API as the control.

## 4. How long to keep it

The app does not impose retention; it keeps what it is given. A school needs a written schedule, and
these are the questions it has to answer (as guidance, not as legal advice):

| Record | The question to settle |
| --- | --- |
| Learner identity and enrolment | How long after a learner leaves do you keep the record — for transcripts, for audit, for a statutory minimum? |
| Academic results and report cards | Published report snapshots are immutable and versioned, which makes them good evidence and bad to delete. |
| Financial records | Usually the longest statutory minimum of anything here (tax and audit). Ask the school's auditor. |
| Medical and conduct records | The most sensitive and the least useful long-term. A shorter period than the rest is defensible; an indefinite one is not. |
| Attendance | Often a fixed number of years set by the education authority. |
| Staff records and payroll | Keep with the financial records; payroll packs' rates are statutory data, not personal, but payslips are personal. |
| Audit logs | Keep at least as long as the records they describe. |
| Backups | Retention is 7 daily / 4 weekly / 12 monthly on a hub: a deletion is only gone from the backups after the last archive containing it expires. Plan for that, or delete the archives deliberately. |

### Deleting

- **Deactivating an account** (Settings → Users & Roles → **Is Active User** off) keeps the person's
  name on the audit trail. Do that for staff who leave; deleting the row loses the attribution.
- **Deleting a learner or a guardian** removes the row through the repository, which the audit trail
  records. There is no bulk "erase this person everywhere" tool: related invoices, payments,
  attendance marks and report snapshots are separate rows and, in the case of a published report,
  deliberately immutable.
- **A single device** can be erased by clearing the browser's site data, and that is the only
  complete erasure. **A hub** needs its database and backups dealt with together, including the
  off-machine copies.
- A data-subject request — "give me everything you hold on my child" — is answered from screens you
  already have: the statement (Finance → Statements), the results and report card (Academics →
  Report Publishing), the attendance register (Administration → Attendance), and the learner record.
  Compile them into one document; the app has no one-click export of a person.

## 5. What to tell parents

A short notice, in plain language, answering the questions parents actually ask. Adapt it; do not
publish this page as it stands.

> **What we keep about your child.** Their name, date of birth, class, admission number, the
> guardian contacts you gave us, attendance, marks and reports, and — if the school records them —
> health and behaviour notes. We keep fee records for your family.
>
> **Why.** To teach and assess your child, to keep them safe, to contact you, and to run the
> school's finances. We do not sell it, and we do not use it for advertising.
>
> **Who sees it.** Your child's teachers, the school office, the head teacher, and the staff who deal
> with fees or health. Health and behaviour notes are restricted: staff see them only if their role
> needs them, and every look at those fields is recorded.
>
> **Where it is.** On the school's computer (and its backup) — or, if the school runs the app on one
> machine, on that machine only. It is not on the internet, and there is no parent login yet: ask the
> office for a printed statement or report.
>
> **How long.** For as long as the school's records policy says, which we can tell you.
>
> **Your questions.** To see what we hold, to correct something, or to ask us to delete what we no
> longer need, contact the school office. We will answer within the period the law allows.
>
> **If something goes wrong.** If a device or a backup is lost, the school follows its breach
> procedure and tells the people affected and the authority where the law requires it.

## 6. A school's checklist

- [ ] Written retention schedule, approved by whoever governs the school.
- [ ] Full-disk encryption and screen locks on every device that opens the app.
- [ ] A hub's restricted-data key and backup passphrase in a safe place, known to two people.
- [ ] Backups copied off the machine, and a restore proved.
- [ ] Staff accounts deactivated on leaving, not deleted.
- [ ] Roles assigned by what a person needs, not by convenience — and the enforcement gap in
      section 2 understood.
- [ ] A breach procedure: who is told, what is preserved (logs, the affected device), and by when.
- [ ] The parent notice above, adapted, given at admission.
- [ ] A named person who answers a data-subject request.

---

Sources: `server/README.md` (encryption, key handling, access log, session and password policy, the
routes that are not yet authorised), `server/backup/README.md` (archive encryption and key sources),
`src/data/auth/README.md` (the role catalogue, scopes and the `learner.medical.read` field policy,
and the app's missing authoriser), `src/components/StorageUnavailableScreen.tsx` (the storage
message), `src/modules/finance/pages/statements/StatementsPage.tsx`,
`src/modules/academics/pages/reports/ReportsPage.tsx`, and the settings pages, read on 2026-10-28.
Nothing in this page was reviewed by a lawyer or a data protection officer.
