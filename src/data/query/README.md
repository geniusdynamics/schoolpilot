# Query layer contract

Owned by lane B; implemented by P1-B05; decided in
[DR-04](../../../docs/prd/workflow-log/decisions/DR-04.md). Pages never import
collections or the database service. Planned files: `keys.ts`, `cache.ts`,
`useQuery.ts`, `useEntityQuery.ts`, `useMutation.ts`, `useLookup.ts`, `index.ts`.

## Keys and status

```ts
type Status = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';

interface QueryKey<E extends EntityName = EntityName> {
  readonly entity: E;
  readonly query: Query<E>;
  readonly hash: string; // `${entity}:${stableStringify(query)}` - the Map key
}
```

- Canonical: key order and `undefined` object values do not change the hash;
  `Date` becomes ISO; the entity is part of the hash (`learner:{}` and
  `class_group:{}` differ). Undefined array elements, functions, symbols,
  bigints and non-finite numbers throw. Only plain JSON objects are accepted:
  Map, Set, RegExp and class instances throw. `queryKey` deep-clones and freezes
  plain query structures and stores Dates as ISO strings; later mutation cannot
  desync a key from its hash.
- `loading` has no data; `refreshing` shows previous data while a read runs.
  `isFetching` is true for both; `success`/`error` are terminal.

## useQuery

```ts
const { data, status } = useQuery(
  queryKey('learner', { status: 'active' }),
  () => learnerRepo.list({ status: 'active' }),
  { deps: ['level'], enabled: true }
);
```

- `data: T | undefined`; `undefined` means "not loaded", distinct from an empty
  list. One entry per key; N components share one fetch and one snapshot.
- `staleTime` defaults to `0`; `deps` refreshes when a listed entity changes;
  `enabled: false` stays idle. A failed refresh keeps the last good `data` and
  sets `error`/`status: 'error'`; a failed first load leaves `data: undefined`.

## useEntityQuery

```ts
const { data, status } = useEntityQuery(classGroupRepo, { academic_year_id: yearId });
const rows = data?.items ?? [];
```

- `repo.list(query)` returns `Page<E>`; `data` is that page unchanged:
  `{ items, total, hasMore, nextCursor? }`.
- `repo.watch(query)` emits `E[]`; the hook replaces `data.items` and keeps the
  last page metadata. Where the transport can reorder, it may pass a commit
  sequence as a second argument (`emit(rows, commitSeq)`); the cache rejects
  tagged payloads older than the committed sequence.
- In `watch` mode the hook issues no initial `list()`: `watch` must emit the
  current page on subscribe (P1-B02). `refetch()` forces a list and refreshes
  the metadata.
- Watch payloads that arrive while a mutation is pending commit are queued and
  applied against the commit sequence after `mutationFn` resolves, so a payload
  that already contains the write is never applied on top of the optimistic
  layer.

## Modes and event precedence

| mode | own-entity event | dependency event | unrelated |
| --- | --- | --- | --- |
| `watch` (default for useEntityQuery) | stream owns it; no refetch | refetch the base query | ignore |
| `invalidate` (default for useQuery) | refetch; detail queries only for matching ids | refetch | ignore |
| `manual` | ignore | ignore | ignore; call `refetch()` |

`watch` is used only when the repository exposes `watch`; otherwise the entry
falls back to `invalidate`. `manual` is the legacy no-subscribe mode.

## Invalidation rules

Writers emit `ChangeEvent { entity, type, ids, origin }` on the adapter change
bus after commit; repositories re-emit it. The cache subscribes once.

- `watch` entries take own-entity data from the stream; events are used only for
  `deps`, which refetch the base query. `invalidate` entries refetch on
  own-entity events (detail: only matching ids); `manual` ignores events.
- An event during an in-flight read sets a revalidation flag and re-runs after
  it settles; many events in one tick coalesce into one refresh per entry.
- B02 contract: writes emit `ChangeEvent` synchronously before resolving and
  `watch` payloads are delivered after the DB commit and write promise resolve
  (queue on a macrotask). A reordering transport must tag payloads with a commit
  sequence; the cache rejects a tagged payload older than the committed
  sequence. `whenSettled` tolerates one macrotask for a deferred event.
- Residual edge: an untagged pre-commit watch payload cannot be distinguished
  from a current one. B02 must not deliver it after a commit; if the transport
  can reorder, it must tag every payload. This is a contract requirement, not
  something the cache can infer.
- An event while unwatched marks the entry stale; the next subscriber refetches.
  Otherwise a resubscribe reuses the cached snapshot.
- Watch errors keep last good data and set `status: 'error'`; B05 resubscribes
  once on the next mount/refetch with bounded backoff, then falls back to
  `invalidate`. No polling loop.
- `gcTime` is 60 s: after the last unsubscribe the entry is kept that long, a new
  subscriber cancels disposal, then data is dropped. (The spike disposes at once.)
- Bulk `sync`/`migration` runs may call `cache.suspend()`/`resume()` to flush once.

## useMutation

```ts
const save = useMutation({
  mutationFn: (input: UpdateLearner) => learnerService.update(input),
  optimistic: (input) => [{
    key: queryKey('learner', { id: input.id }),
    update: (prev) => (prev ? { ...prev, ...input.patch } : prev),
  }],
  onSuccess: (learner) => toast.success(t('learner.saved')),
  onError: (error) => toast.error(messageOf(error)),
});
const { result, settlement } = await save.mutateAsync(input); // or save.mutate(input)
save.isPending; save.settlement; save.error; save.reset();
```

- Optimistic patches are stackable; each mutation rolls back only its own layer.
- `mutateAsync` applies layers, awaits `mutationFn`, assigns a fresh monotonic
  commit sequence, then calls `whenSettled(key, mutationId)`. It resolves
  `{ result, settlement: { observed, error } }`; `save.settlement` mirrors it.
- `observed` requires a successful read or stream emission at or after the
  layer's commit sequence. A read that started before commit (even after the
  layer was applied) or a tagged sequence below the entry's committed sequence
  does not count.
- A successful post-commit read drops all observed layers before publishing, so
  non-idempotent patches (increments) are not applied twice. A later failed
  refresh does not erase an earlier observation: `observed` stays true and
  `settlement.error` is null; the cache still exposes the later error.
- Policy: retain-until-observed. On `observed: false` (failed refresh or late
  event) the layer stays visible and `settlement.error` carries the refresh
  error when there is one; the next successful read drops it. Dropping on error
  would revert a successful write.
- `whenSettled` awaits queued flushes/in-flight reads, tolerates one macrotask
  for a just-emitted event, and returns `{ observed: true }` for disposed or
  missing entries. `flush()` awaits all queued refreshes.
- Rejected writes roll back immediately and rethrow; no automatic retry. A patch
  for a missing entry is a no-op.

## useLookup

```ts
const groups = useLookup('class_group', {
  idField: 'id',
  label: (group) => group.name, // optional if the entity registers labelOf
  filter: { academic_year_id: yearId },
  includeArchived: false,
});

groups.status; groups.error; groups.isFetching;
groups.label(group.id, 'Unknown group'); // computed, never stored
groups.resolve(archivedId);              // row, even when archived
groups.options; groups.byId;             // picker options and row map
```

- State is explicit: `loading` -> `options: []`, label fallback; `success` with
  no rows is an empty lookup (not loading); `error` exposes `error` and safe
  fallbacks; `refreshing` keeps the previous options visible.
- `resolve()`/`label()` still return archived rows (`label` appends
  ` (archived)`); `options` excludes them unless `includeArchived: true` -
  P1-D01's archived display and empty-state CTA.
- One list query and one map per (entity, filter), shared by every consumer.
  B05 unwraps `Page.items` before `createLookup`: a Page is never a row list.
- `byId` is `Map<Id<E>, E>` (not the spec's `Map<Id, Label>`): pickers need the
  row for scoping; `label()` returns the string. Deliberate deviation.
- A03 owns `EntityName` and per-entity `labelOf`; B05 imports them and does not
  define entity string unions. `idField` is for legacy non-`id` keys.

## Migrating from useDatabaseCollection

| Today | P1 |
| --- | --- |
| `useDatabaseCollection<T>('students')` | `useEntityQuery(studentRepo, query)` |
| `data: T[]`, default `[]` | `data?: Page<E>`; read `data?.items`; loading first |
| `loading` | `status === 'loading'` (plus `isFetching`) |
| `refresh()` | `refetch()` |
| `insert` / `update` / `remove` | `useMutation` calling the service/repository |
| `collection` escape hatch | none; use a repository or service |
| `subscribeToChanges: false` | `mode: 'manual'` (no event refetch) |
| `loadOnMount: false` | `enabled: false` (idle until enabled/refetch) |

No shim: both layers share the database and provider events.
`useDatabaseCollection` is deleted in P1-E06.

## Deviations and constraints

- Spec 06 writes `useQuery(entity, query)`; here `useQuery(key, fetcher)` is the
  primitive and `useEntityQuery(repo, query)` the repository spelling. Same
  behaviour; the key makes `deps` and invalidation explicit.
- No cache persistence (SQLite is truth); no Suspense in P1. No `collection.find`
  in pages, string-literal entity names outside the registry, or `as any` here.
- Hook tests use vitest; the DR-04 spike proves the mechanics under `node --test`
  (30/30 cases: 24 cache, 6 lookup) for keys, dedupe, revalidation, precedence,
  pages, commit-sequence settlement and lookup state.
