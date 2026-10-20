# DataGrid — the one table contract

`src/components/ui/data/DataGrid.tsx` is the only table component in the app.
Do not add new `ui/Table`-style competitors; migrate existing ones when you
touch a page.

## Quick start

```tsx
import { DataGrid, DataGridColumn } from '@/components/ui/data';

const columns: DataGridColumn<Student>[] = [
  { key: 'admission_no', header: 'Adm. No', width: 120 },
  { key: 'name', header: 'Name', minWidth: 180 },          // auto layout still applies
  { key: 'balance', header: 'Balance', align: 'right',
    render: (_v, row) => formatKES(row.balance) },
  { key: 'actions', header: '', sortable: false, filterable: false, sticky: 'right',
    render: (_v, row) => <RowActions row={row} /> }
];

<DataGrid
  columns={columns}
  data={students}
  loading={loading}
  keyField="id"                       // default; any stable unique field
  pagination={{ pageSize: 25 }}       // internal pagination — buttons just work
  emptyState={{ title: 'No students yet', description: 'Add your first student to get started.' }}
/>
```

## Column contract

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `key` | `keyof T \| string` | — | Row field to display; `'actions'`-style keys are fine with `render` |
| `header` | `string` | — | Heading text |
| `render` | `(value, row) => ReactNode` | — | Custom cell; receives the raw field value and full row |
| `width` | `string \| number` | — | Fixed width. If ANY column sets `width`, the table switches to `table-layout: fixed`; otherwise auto layout sizes columns by content |
| `minWidth` | `string \| number` | — | Minimum width, honored in both layouts |
| `align` | `'left' \| 'center' \| 'right'` | `left` | Applies to header and cells |
| `sortable` | `boolean` | `true` | Set `false` for actions/computed columns |
| `filterable` | `boolean` | `true` | Set `false` to hide from the filter bar |
| `sticky` | `boolean \| 'left' \| 'right'` | — | Pin the column |

**Width guidance:** prefer no widths at all (auto layout). Set `width` only
for narrow fixed columns (checkbox, actions, short codes); use `minWidth`
when a content-sized column must not collapse.

## Behavior

- **Keys & selection** — rows are keyed by `keyField` (default `'id'`).
  Selection is tracked by that key, so it survives sorting and filtering, and
  select-all only selects the rows visible under the current filters. In dev,
  a warning fires if rows lack the key field.
- **Pagination** — internal by default: pass `pagination={{ pageSize }}` and
  Next/Previous/page-size work with no page state in your component. Switch to
  controlled by passing `onPageChange` (then you own slicing and pass
  `page`/`total`).
- **Sorting & filtering** — internal by default; pass `onSort`/`onFilter` to
  take over (e.g. server-side).
- **Empty & loading** — `emptyState` accepts a React node or
  `{ icon?, title, description?, action? }`; `loading` renders a skeleton.
- **Validation** — bad input (non-array data, missing keys) logs a dev-mode
  warning; data is never silently rewritten.

## Migrating from the old `ui/Table`

| Old | New |
| --- | --- |
| `{ header, accessor: 'field' }` | `{ key: 'field', header }` |
| `{ header, render: item => ... }` | `{ key: 'x', header, render: (_v, item) => ... }` |
| `accessor: item => ...` (fn) | `render: (_v, item) => ...` |
| `isLoading` | `loading` |
| `emptyStateMessage="..."` | `emptyState="..."` or the object form |

You gain sorting, filtering, sticky columns, pagination and error boundaries
for free.
