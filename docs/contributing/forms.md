# Forms — conventions and building blocks

This is the canonical guide for form work in SchoolPilot. For tables see
[grids.md](./grids.md); for the overall list-page pattern see [crud.md](./crud.md).

## The stack

| Need | Use |
| --- | --- |
| Create/edit form for a canonical entity | `SchemaEntityForm` (`@/components/ui/forms`), validated with the entity's zod schema |
| Legacy module dialogs not yet migrated (P1-E) | `EntityForm` (`@/components/ui/forms`) |
| Schema validation of a whole entity (one-shot) | `useValidation` (`@/hooks/useValidation`) |
| Realtime per-field validation with debounce | `useFormValidation` (`@/hooks/useValidation`, re-exported at old path) |
| Destructive-action confirmation | `useConfirm()` from `@/components/ui/ConfirmDialog` |
| Operation feedback | `useToast()` from `@/hooks/useToast` |
| Layout primitives | `DialogForm` + `FormSection` / `FormGrid` / `FormField` / `FormActions` |

## Visual conventions (design system)

- **Labels are top-aligned** (`FormField` renders them; small, medium-weight).
  `Input`'s legacy `floatingLabel` mode still exists but is not the default —
  don't opt into it in new code.
- **One accent**: everything uses the `primary` scale (indigo) via Tailwind
  tokens. Never hardcode `blue-*`/`indigo-*` for interactive states.
- **Surfaces use semantic tokens** (`bg-surface-card`, `border-surface-input`,
  `bg-surface-muted`, `text-surface-foreground`, …) so forms render correctly
  under the light/dark theme toggle. Don't hardcode `bg-white`/`text-gray-900`.
- **Control heights**: `sm` 32px / `md` 40px / `lg` 44px across `Input`,
  `Select`, and `Button`.
- **Focus treatment**: accent border + soft ring (`focus:ring-primary-500/15`);
  the old `glow-*` classes are retired.
- **Extra controls**: `Checkbox`, `Radio`/`RadioGroup`, `Switch`
  (`@/components/ui`) share the same language — use them instead of raw
  `<input type="checkbox|radio">`.

## Select API notes

`Select` supports two option sources: `<option>` children (legacy native
select) or the typed `options` prop (custom listbox with search/multi-select).

- Options mode reports the selected value(s) directly through **both**
  `onValueChange(value)` and `onChange(value)` (no event object).
- Children mode fires `onChange` with a native-style
  `{ target: { name, value } }` event, so plain handlers keep working.
- Defensive handlers like `v => typeof v === 'string' ? v : v.target.value`
  work with either mode.

## Validation

`src/hooks/useValidation.ts` exports both APIs:

- **Schema-driven** (`useValidation<T>()`) — pure function style:
  `validate(data, schema, existing?) → { valid, errors }`. Rules: `required`,
  `minLength/maxLength`, `min/max`, `pattern`, `email`, `unique`, `custom`.
  Prefer this for CRUD saves; it is what `EntityForm` composes internally.
- **Field-level realtime** (`useFormValidation(config, options)`) — debounced
  validators per field with `getFieldProps(name)` for wiring inputs, plus
  `validators.required/email/minLength/...` factories.

> Historical note: `useFormValidation` used to live in its own file and had an
> infinite-render bug (state re-initialisation keyed on the config object's
> identity). It was fixed during the 1b merge; inline config literals are safe.
> A regression test lives in `src/tests/useValidation.test.tsx`.

## EntityForm

Declarative modal form — retained for module dialogs that have not yet migrated in P1-E.
Canonical entities use `SchemaEntityForm` instead; see `src/components/ui/forms/README.md`.

```tsx
<EntityForm
  isOpen={open}
  onClose={() => setOpen(false)}
  title={editing ? 'Edit subject' : 'Add subject'}
  initialData={editing ?? undefined}
  fields={[
    { name: 'name', label: t('subjects.name'), required: true,
      validate: v => (v.length < 3 ? 'Too short' : null) },
    { name: 'subject_code', label: t('subjects.code'), required: true },
    { name: 'grouping', label: 'Grouping', type: 'select',
      options: [{ value: 'core', label: 'Core' }] },
    { name: 'is_compulsory', label: 'Compulsory', type: 'checkbox' },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ]}
  onSubmit={async (values) => { await save(values); }}
/>
```

Behaviour you get for free: required-marker labels, blur-time validation,
inline field errors (`role="alert"`), submit disabled while saving,
success/error toasts, dialog stays open on failure.

## Confirmation

Replace any `window.confirm` with the awaitable hook — the call shape stays
almost identical:

```tsx
const confirm = useConfirm();

const handleDelete = async (id: number) => {
  if (await confirm({
    title: 'Delete subject',
    message: 'Are you sure you want to delete this subject?',
    variant: 'danger',
  })) {
    await deleteSubject(id);
  }
};
```

`variant: 'danger'` gives a red confirm button + warning icon. Outside the app
tree (isolated tests) `useConfirm` falls back to `window.confirm`.

## Feedback

Use `useToast()` — never `alert()`:

```tsx
const toast = useToast();
toast.showSuccess('Subject created');
toast.showError(err.message);
toast.showWarning('Please select at least one row');
```

Severity guide: `showSuccess` for completed operations, `showWarning` for
user-input problems the user can fix now, `showError` for failed operations.
Inline field errors always beat toasts for form validation; toasts are the
fallback for non-field errors (network, permissions).

## Rules

1. New forms for canonical entities go through `SchemaEntityForm` with the exact zod schema the repository uses; the legacy `EntityForm` is only for module dialogs not yet migrated in P1-E.
2. No new `window.confirm`/`alert`/`prompt` anywhere.
3. Validation messages belong next to fields, not in toasts, when tied to a
   specific input.
4. Keep submit handlers async-safe: guard double submits (EntityForm does this;
   hand-rolled DialogForms must too).
