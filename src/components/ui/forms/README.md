# Schema-bound forms

`SchemaEntityForm` is the canonical create/edit form for canonical entities. It takes the
entity's zod schema and a list of field metadata entries; the schema validates the payload,
so the form and the repository accept exactly the same records.

The earlier `EntityForm` (declarative `fields` + `initialData`) remains exported for the
existing module dialogs. `SchemaEntityForm` is the schema-bound replacement those dialogs
move to in the P1-E migration.

## Usage

The repository owns the id, the timestamps and the actor, so a form collects only the
writable fields. A create form binds `createSchemaFor`, an edit form binds
`updateSchemaFor` and seeds the writable values of the row:

```tsx
import { createSchemaFor, toWritableValues, updateSchemaFor } from '@/data/repository';

// A create form: the writable fields, no row yet.
<SchemaEntityForm
  schema={createSchemaFor('learner')}
  recordKey="new"
  initialValues={{}}
  fields={[
    { path: 'given_name', label: 'Given name', order: 1, section: 'Identity' },
    { path: 'house_id', label: 'House', order: 2, widget: 'entity', lookupKey: 'house' },
  ]}
  lookups={{ house: houseLookup }}
  onSubmit={(values) => learnerRepo.create('learner', values)}
  onCancel={close}
/>

// An edit form: the same fields, all optional, seeded from the stored row.
<SchemaEntityForm
  schema={updateSchemaFor('learner')}
  recordKey={learner.id}
  initialValues={toWritableValues(learner)}
  fields={[
    { path: 'given_name', label: 'Given name', order: 1, section: 'Identity' },
    { path: 'house_id', label: 'House', order: 2, widget: 'entity', lookupKey: 'house' },
  ]}
  lookups={{ house: houseLookup }}
  onSubmit={(values) =>
    learnerRepo.update('learner', learner.id, values, {
      expectedVersion: learner.rowVersion,
    })
  }
  onCancel={close}
/>
```

- `createSchemaFor(entity)` is the entity schema without the server-owned fields
  (`id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`); a create
  form binds it.
- `updateSchemaFor(entity)` holds the same writable fields, all optional; an edit form
  binds it and submits the patch.
- `toWritableValues(row)` strips the server-owned fields and the concurrency counter
  from a row. A row that comes back from the repository carries both, and the strict
  entity schema would reject it as an unknown key, so a form seeds its fields from the
  stripped values.
- The repository refuses a payload that carries a server-owned field, so the form never
  sends the whole record back.
- `path` is a dotted path into the entity object. Nested issue paths map to the longest
  declared field path, so `total.amount_minor` renders beside `total`.
- `widget` is a hint. When it is omitted the form infers the widget from the schema:

  | Schema at the path | Inferred widget |
  | --- | --- |
  | `z.enum(...)` | `select` |
  | `z.boolean()` | `checkbox` |
  | `z.number()` / `z.int()` | `number` |
  | `z.iso.date()` | `date` |
  | `{ amount_minor, currency }` | `money` |
  | `{ number, label? }` | `phone` |
  | `{ scheme, value }` | `identifier` |
  | anything else | `text` |

- `onValidityChange` is the widget-local validity channel. `MoneyField` and `PhoneField`
  report parse errors through it; the form blocks submit and focuses the first invalid
  widget even when the entity schema would accept an optional field as absent.
- `required` is presentation only. Validation always comes from the schema; when
  `required` is omitted the form infers it from the optional/nullable wrapper.
- `recordKey` identifies the record. A change resets values, errors and field drafts. A
  changed `initialValues` object with the same key does not reset a dirty form, so async
  record loads cannot overwrite in-progress edits.
- `onDirtyChange` and `data-dirty` expose dirty state. `onSubmit` receives `z.input<S>`
  untouched; the helper validates with `schema.safeParse` first.

## Validation parity

`validateEntityForm(schema, values, fieldPaths)` is exported from `validation.ts`. It is
the only validation the form performs and returns the same verdict as a repository calling
`schema.safeParse(values)`, plus the mapped field errors. The parity suite covers learner,
enrolment and invoice valid, required, enum, date, money and refinement cases.

A create form binds `createSchemaFor(entity)` and an edit form `updateSchemaFor(entity)`,
both derived from the entity's own schema. The derived shapes drop the entity's
cross-field refinements, so they check the shape only; the repository re-validates the
assembled row with the entity's own schema, and a refinement therefore still rejects the
write - it surfaces from the repository rather than from the form.

## Field components

- `DateField` — typeable locale date, stores `YYYY-MM-DD` with no timezone conversion.
- `MoneyField` — string-based decimal parsing to exact minor units; no float arithmetic.
- `PhoneField` — country/dial-code aware input, stores the schema's E.164 `Phone`.
- `IdentifierField` — identifier scheme plus an opaque string value (leading zeroes kept).
  Emptying the value clears the whole optional identifier (`onChange(undefined)`).
- `EntityField` — binds D01's `EntityPicker` to a lookup injected through props.

`defaultFieldWidgets` is the registry used by the form; pass `widgets` to override entries
without editing the defaults.
