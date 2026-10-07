# 07 — UX Standards: Forms, Pickers, Tables, Feedback, Printing

These standards exist because most audit defects surfaced as broken forms and
comboboxes. Every new or touched screen must comply; reviewers check against this list.

## 1. Forms

1. **One form stack**: `EntityForm` (schema-driven) for CRUD dialogs; `WizardForm` for multi-step flows with the `{ id, title, content, validate }` contract enforced by types.
2. **Schema-driven validation**: the same entity schema validates in the form, the repository and the server. Field errors inline; a form-level error summary for server/storage errors. **No silent failures** — every failed save shows a message in the dialog and keeps the user's input.
3. **Required fields** marked with `*` and announced to screen readers; optional sections collapsed by default.
4. **Defaults from context**: current academic year/term, the class group the user came from, today's date, the school's currency.
5. **Labels from the active pack**: "Grade/Form/Year/Class", "Term/Semester/Trimestre", "Stream/Arm/Section", "Learning area/Subject" are resolved from the programme's pack, never hard-coded.
6. **Idempotent submit**: the submit button disables while saving; double-submit cannot create duplicates; save returns the canonical record.
7. **Unsaved-changes guard** on navigation/close.
8. **Dates**: one `DateField` — typeable in the locale format, calendar popover with month and year selectors, min/max, keyboard support, "today" shortcut; date-of-birth fields open at a sensible year (age range from level).
9. **Phone/email/ID fields** validate format (E.164, email, identifier scheme regex from country pack) and normalise on save.
10. **Money fields** show the currency, accept locale separators, store minor units.
11. Dialogs ≤ ~12 fields; longer entities use a page with sections (learner profile, staff profile).

## 2. Pickers (comboboxes)

A single **`EntityPicker`** component replaces ad-hoc `<select>`s for any reference to another
record.

| Property | Requirement |
| --- | --- |
| Value | Always the record's `Id` string (never numbers, never names) |
| Label | From `useLookup(entity)` — e.g. learner `"Amani Wekesa · GA/2027/001 · Grade 7 Blue"`, class group `"Grade 7 · Blue (2027)"`, stream options always **prefixed by level** |
| Data | Live query; reflects records created anywhere (other tab, other device after sync) without reload |
| Scope | Filtered by context: current academic year, programme, campus, user permissions (a teacher sees only their groups) |
| Search | Type-ahead for lists > 15 items, server/replica-side for large entities (learners, guardians, accounts) with debounce; matches name, admission number, phone, identifiers |
| Empty state | Explains why it is empty and links to create the missing prerequisite (e.g. "No financial year yet — Create financial year") |
| Create inline | Optional "+ New …" for simple entities (category, department) with permission |
| Multi-select | Chips with "select all in level/class" helpers |
| Invalid value | If the stored id is no longer valid (deleted/archived), show "(archived) …" instead of blank, and warn |
| Duplicates | Impossible by construction (unique ids); identical labels are disambiguated with the parent (class/level/year) |
| Accessibility | ARIA combobox pattern, keyboard navigation, screen-reader announcements |

**Picker conformance tests** (component level) cover: id round-trip with UUIDs, live update
after create, scoped filtering, empty-state CTA, archived value display.

## 3. Tables and lists

- `DataGrid` with server/replica pagination, virtualised rows, column chooser, saved views, CSV/XLSX export respecting permissions.
- No internal ids in visible columns; human identifiers (admission number, receipt number) instead.
- Row actions: primary action on row click (open profile), secondary in a menu; destructive actions require confirmation with consequences explained (e.g. "This learner has 3 invoices; they will be kept").
- Bulk actions with selection count and undo where possible.
- Empty, loading and error states are explicit and actionable.

## 4. Navigation and workspace

- Module → hub → tab hierarchy; hub tabs are URL state (`?tab=`), **not** separate workspace tabs.
- Workspace tabs (if retained) mirror real routes exactly; the active tab always matches the router; 404s never become tabs.
- Every record has a stable URL (learner, staff, invoice, receipt, report card, assessment) that works on reload and when shared.
- Each hub tab has its own error boundary reset on tab change, so a crash in one tab never blanks the others.
- Global search (learners, guardians, staff, receipts, invoices) in the header.
- Role-based home dashboards with **real data or explicit empty states** — never sample numbers.

## 5. Feedback

- Toast API: `toast.success(msg)`, `toast.error(msg, { action })` — typed so the string/options confusion cannot recur.
- Long operations (billing run, report generation, promotion, import) run as **jobs** with progress, can continue in the background, and end with a result summary and downloadable log.
- Destructive or financial actions show a review step summarising the effect before commit.

## 6. Printing and documents

- Print templates for receipts (80 mm thermal, A5), invoices, statements, report cards, class lists, registers, certificates and letters; school branding; QR verification.
- Print preview with page breaks that keep a learner's report on one page/sheet.
- Batch printing per class with sort order (admission number, surname, house).

## 7. Accessibility and inclusion

WCAG 2.1 AA: contrast, focus order, keyboard-only operation of all core workflows (receipting
and mark entry especially), screen-reader labels, reduced motion. Plain-language copy
reviewed for non-native English speakers; translations for all user-facing strings.

## 8. Mobile

Responsive layouts for teacher and guardian flows (attendance, mark entry, exeat approval,
fee balance, pay link, report download). Touch targets ≥ 44 px. Works in Android Chrome on
2–3 GB RAM devices. Guardians without smartphones get SMS equivalents (balance on request,
payment confirmation, report-ready notice with short link).

## 9. Copy and terminology

Glossary terms (00 §5) used consistently; pack-provided labels for curriculum terms;
errors say what happened, why, and what to do next; no developer jargon ("collection",
"provider", "UDM") in user-facing messages.
