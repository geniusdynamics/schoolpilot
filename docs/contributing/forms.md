# Forms — conventions and building blocks

This is the canonical guide for form work in SchoolPilot. For tables see
[grids.md](./grids.md); for the overall list-page pattern see [crud.md](./crud.md).

## The stack

| Need | Use |
| --- | --- |
| Create/edit dialog for an entity | `EntityForm` (`@/components/ui/forms`) |
| Schema validation of a whole entity (one-shot) | `useValidation` (`@/hooks/useValidation`) |
| Realtime per-field validation with debounce | `useFormValidation` (`@/hooks/useValidation`, re-exported at old path) |
| Destructive-action confirmation | `useConfirm()` from `@/components/ui/ConfirmDialog` |
| Operation feedback | `useToast()` from `@/hooks/useToast` |
| Layout primitives | `DialogForm` + `FormSection` / `FormGrid` / `FormField` / `FormActions` |

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

Declarative modal form — the default for create/edit flows:

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

1. New forms go through `EntityForm` unless there is a documented reason not to.
2. No new `window.confirm`/`alert`/`prompt` anywhere.
3. Validation messages belong next to fields, not in toasts, when tied to a
   specific input.
4. Keep submit handlers async-safe: guard double submits (EntityForm does this;
   hand-rolled DialogForms must too).
