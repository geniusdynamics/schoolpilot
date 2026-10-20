# CRUD list-page pattern

The canonical structure for entity management pages. The reference
implementation is `src/modules/academics/pages/SubjectsPage.tsx`.
Related guides: [forms.md](./forms.md), [grids.md](./grids.md).

## Anatomy

```
Card (title + "Add X" action)
└── DataGrid            — columns, sort/filter, internal pagination
EntityForm              — create/edit dialog (schema-driven fields)
useEntityCrud           — data: items, loading, create/update/confirmRemove
```

```tsx
const subjects = useEntityCrud<SubjectRow>({
  collectionName: 'subjects',
  entityName: 'Subject',
});

// Create or update (EntityForm calls this; toasts + optimistic updates included)
await subjects.update(editing.id, values);
await subjects.create(values);

// Delete = ConfirmDialog → optimistic remove → rollback+toast on failure
await subjects.confirmRemove(id);
```

## Rules

1. **Data** comes from `useEntityCrud` (wraps `useCrudFactory`: optimistic
   updates, rollback, success/error toasts). Do not hand-write
   `useState(items) + fetch` in new pages.
2. **Delete confirmation** is owned by `useEntityCrud.confirmRemove` /
   `confirmRemoveMany` through the ConfirmDialog flow. Never `window.confirm`.
3. **Create/edit UI** is `EntityForm` with a declarative field config. Reach
   for raw `DialogForm` only when the form genuinely doesn't fit a flat field
   schema (e.g. multi-section wizards), and say why in a comment.
4. **Grid contract** follows [grids.md](./grids.md): stable `keyField`, auto
   layout by default, `pagination` prop for internal paging.
5. **Loading** passes straight to `<DataGrid loading={crud.loading}>` — avoid
   full-page spinners that hide grid chrome.
6. AppDataContext stays additive: pages that own their data via useEntityCrud
   render `crud.items`; they may still read reference data (departments,
   academic years) from context for select options.
