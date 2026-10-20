# Query layer contract

Owned by lane B; implemented by P1-B05; decided in
[DR-04](../../../docs/prd/workflow-log/decisions/DR-04.md). Pages never import
collections or the database service. Files: `keys.ts`, `cache.ts`, `useQuery.ts`,
`useEntityQuery.ts`, `useMutation.ts`, `useLookup.ts`, `index.ts`.

## Keys and status

```ts
type Status = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';

interface QueryKey<E extends EntityName = EntityName> {
  readonly entity: E;
  readonly query: QuerySnapshotObject;
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
  { deps: ['level'], enabled: true, repository }
);
```

- `data: T | undefined`; `undefined` means "not loaded", distinct from an empty
  list. One entry per key; N components share one fetch and one snapshot.
- `staleTime` defaults to `0`; `deps` refreshes when a listed entity changes;
  `enabled: false` stays idle. A failed refresh keeps the last good `data` and
  sets `error`/`status: 'error'`; a failed first load leaves `data: undefined`.
- `repository` is optional: it is the repository whose change bus carries the events
  this entry listens to. The cache subscribes to a repository once, the first time a
  hook names it, so an entry without one still hears every attached repository. An
  application that only uses `useQuery` attaches its repository once with
  `queryCache.attachRepository(repository)`.
- `refetch()` forces a read; `mode` overrides the default `invalidate`.

## useEntityQuery

```ts
const { data, status } = useEntityQuery(repository, 'class_group', { where: { academic_year_id: yearId } });
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
- Watch errors keep last good data and set `status: 'error'`; B05 resubscribes once
  on the next mount/refetch with bounded backoff, then falls back to
  `invalidate`. A delivery failure counts as a failure too, so the budget cannot
  be spent twice; there is no polling loop.
- `gcTime` is 60 s: after the last unsubscribe the entry is kept that long, a new
  subscriber cancels disposal, then data is dropped. (The spike disposes at once.)
- Bulk `sync`/`migration` runs may call `cache.suspend()`/`resume()` to flush once.
- One entry per query key **and repository**: two repositories over one entity
  keep two entries, so their token spaces never mix.

## Commit sequences and settlement

The commit sequence is an **opaque monotonic token**, never a commit count. The
token space of an entry is the commit sequence of *its* repository
(`repository.currentCommitSequence`); an entry without a repository counts in its
own space. Tokens of two repository instances are never compared, and the
application runs one repository per database.

- A payload is delivered only after the write promise resolved; the cache adds
  no delay of its own. The change event is emitted before the write resolves, so
  the refresh it schedules starts after the layer was committed.
- A payload tagged **below** the committed sequence of the entry is stale and is
  rejected: neither the data nor the settlement changes.
- The committed sequence of an entry rises with every accepted payload and with
  every committed layer. A read observes the committed sequence of the moment it
  *started*: a read that started before the commit does not count, even when it
  finishes after it.
- The sequence of a layer is the sequence **the write itself reached**, not the
  counter of the moment the layer was committed: the counter is read before the
  write and after it. A write that never moved the counter never reached the
  repository, so no observation can prove it - the layer is *unobserved*, the
  settlement reports `observed: false`, and the layer does not show a value the
  database does not hold.
- An observation is a successful read or a stream emission at or after the
  commit sequence of the layer. A successful post-commit read drops every
  observed layer before it publishes, so a non-idempotent patch is never applied
  twice.
- Policy: retain-until-observed. On `observed: false` the layer stays visible
  and `settlement.error` carries the refresh error when there is one; the next
  successful read drops it. Dropping on error would revert a successful write.

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
- Policy: retain-until-observed. A layer is dropped only when the cache observed
  it, so an unobserved layer stays visible and `settlement.error` carries the
  refresh error when there is one; the next successful read drops it. Dropping on
  error would revert a successful write.
- A write that never reached the repository is never reported as observed: the
  layer is unobserved, the settlement reports `observed: false`, and the layer
  does not show a value the database does not hold.
- `whenSettled` awaits queued flushes/in-flight reads, tolerates one macrotask
  for a just-emitted event, and returns `{ observed: true }` for disposed or
  missing entries. `flush()` awaits all queued refreshes.
- Rejected writes roll back immediately and rethrow; no automatic retry. A patch
  for a missing entry is a no-op.

## useLookup

```ts
const groups = useLookup(repository, 'class_group', {
  idField: 'id',
  label: (group) => group.name, // optional if the entity registers labelOf
  filter: { academic_year_id: yearId },
  includeArchived: false,
});

groups.status; groups.error; groups.isFetching;
groups.label(group.id, 'Unknown group'); // computed, never stored
groups.resolve(archivedId);              // row, even when archived
groups.options; groups.byId;             // picker options and row map
groups.isArchived(row); groups.getId(row); // the hooks P1-D01's picker consumes
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
- The map is built once per read and kept until the data changes; the label of a
  row is computed when it is asked for. A caller that passes `label` inline
  therefore does not build a new map on every render.
- `isArchived(row)` tells the picker which rows are archived, and `getId(row)`
  reads the id column (`idField`). P1-D01's `EntityPicker` consumes both.
- A03 owns `EntityName` and per-entity `labelOf`; B05 imports them and does not
  define entity string unions. `idField` is for legacy non-`id` keys.
- The read carries the archived rows (`includeDeleted`), so an archived value
  stays resolvable; the picker decides whether to offer them.
- The ` (archived)` marker is the English default of the label. The UI localises
  it through `common.query.archived` and replaces it with the picker's own
  `archivedLabel`; the query layer does not translate it itself.

## Migrating from useDatabaseCollection

| Today | P1 |
| --- | --- |
| `useDatabaseCollection<T>('students')` | `useEntityQuery(repository, 'student', query)` |
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
- **The repository is one instance for every entity** (P1-B02), not one per
  entity, so the hooks name the entity as well: `useEntityQuery(repository,
  entity, query)` and `useLookup(repository, entity, options)`. `useLookup` also
  accepts the shorter `useLookup(entity, { repository, ... })`. Deliberate
  deviation from the per-entity spelling above.
- `useLookup.options` holds the **rows**, not `{ value, label }` pairs: that is
  what P1-D01's `EntityPicker` consumes (`options`, `byId`, `label`, `resolve`,
  `status`, `error`, `isFetching`).
- No cache persistence (SQLite is truth); no Suspense in P1. No `collection.find`
  in pages, string-literal entity names outside the registry, or `as any` here.
- Hook tests use vitest; the DR-04 spike proves the mechanics under `node --test`
  (30/30 cases: 24 cache, 6 lookup) for keys, dedupe, revalidation, precedence,
  pages, commit-sequence settlement and lookup state.
