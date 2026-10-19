# Schema-bound forms

`SchemaEntityForm` is the canonical create/edit form for canonical entities. It takes the
entity's zod schema and a list of field metadata entries; the schema validates the payload,
so the form and the repository accept exactly the same records.

The earlier `EntityForm` (declarative `fields` + `initialData`) remains exported for the
existing module dialogs. `SchemaEntityForm` is the schema-bound replacement those dialogs
move to in the P1-E migration.

## Usage

```tsx
<SchemaEntityForm
  schema={learnerSchema}
  recordKey={learner?.id ?? 'new'}
  initialValues={learner}
  fields={[
    { path: 'given_name', label: 'Given name', order: 1, section: 'Identity' },
    { path: 'date_of_birth', label: 'Date of birth', order: 2, section: 'Identity' },
    { path: 'house_id', label: 'House', order: 3, widget: 'entity', lookupKey: 'house' },
  ]}
  lookups={{ house: houseLookup }}
  onSubmit={(values) => learnerRepo.create(values)}
  onCancel={close}
/>
```

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

## Field components

- `DateField` — typeable locale date, stores `YYYY-MM-DD` with no timezone conversion.
- `MoneyField` — string-based decimal parsing to exact minor units; no float arithmetic.
- `PhoneField` — country/dial-code aware input, stores the schema's E.164 `Phone`.
- `IdentifierField` — identifier scheme plus an opaque string value (leading zeroes kept).
  Emptying the value clears the whole optional identifier (`onChange(undefined)`).
- `EntityField` — binds D01's `EntityPicker` to a lookup injected through props.

`defaultFieldWidgets` is the registry used by the form; pass `widgets` to override entries
without editing the defaults.
