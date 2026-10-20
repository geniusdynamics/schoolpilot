// ABOUTME: The live query cache: one entry per query key and repository, fed by the watch
// ABOUTME: streams and the change bus, with commit-epoch settlement for the optimistic layers.

import type {
  ChangeEvent,
  ListQuery,
  Page,
  RepositoryRow,
  Unsubscribe,
} from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { type QueryKey, type QuerySnapshotObject, type Status } from './keys';

/** How an entry reacts to the change bus. */
export type QueryMode = 'watch' | 'invalidate' | 'manual';

/**
 * The listener a watch delivers to.
 *
 * `commitSequence` is the opaque token of the state the payload reflects; a payload
 * tagged below the entry's committed sequence is stale and must be rejected. `error`
 * is only used by a transport that can report a failed delivery.
 */
export type QueryWatchListener<T> = (
  rows: readonly T[],
  commitSequence?: number,
  error?: unknown
) => void;

/**
 * The part of the repository the cache binds to.
 *
 * The real repository satisfies it; a test double may too. The commit sequence is an
 * opaque monotonic token of that repository instance, never a commit count, and tokens
 * of two repositories are never compared.
 */
export interface QueryRepository {
  /** The last allocated commit sequence of this repository. */
  readonly currentCommitSequence: number;
  list<E extends EntityName>(
    entity: E,
    query?: ListQuery
  ): Promise<Page<RepositoryRow<E>>>;
  watch<E extends EntityName>(
    entity: E,
    query: ListQuery,
    listener: QueryWatchListener<RepositoryRow<E>>
  ): Unsubscribe;
  subscribe(listener: (event: ChangeEvent) => void): Unsubscribe;
  /** Resolves when no watch delivery is pending. */
  whenIdle?(): Promise<void>;
}

/** What a subscriber sees. */
export interface QuerySnapshot<T> {
  /** `undefined` means "not loaded"; it is distinct from an empty list. */
  readonly data: T | undefined;
  readonly error: unknown;
  readonly status: Status;
  readonly isFetching: boolean;
}

/** The outcome of a mutation layer: did the cache observe the write? */
export interface Settlement {
  /** True when a read or a stream emission at or after the commit was applied. */
  readonly observed: boolean;
  /** The error of the refresh that failed to observe the write, if any. */
  readonly error: unknown | null;
}

/** What happened to a layer when its write was committed. */
export type CommitOutcome =
  /** The write reached the repository, so an observation can prove it. */
  | 'committed'
  /** The write never moved the repository's counter, so nothing can prove it. */
  | 'unobserved'
  /** The layer is gone; there is nothing to commit. */
  | 'unknown';

/** Reads the data of one key. */
export type Fetcher = (query: QuerySnapshotObject) => Promise<unknown>;

/** Subscribes to the live rows of one key. */
export type WatchFactory = (
  query: QuerySnapshotObject,
  listener: QueryWatchListener<unknown>
) => Unsubscribe;

/** Turns a watched row set into the data of the entry. */
export type WatchMerge = (base: unknown, rows: readonly unknown[]) => unknown;

/** How an entry is configured. */
export interface QueryDefinition {
  readonly key: QueryKey;
  readonly mode?: QueryMode;
  /** Entities whose changes refresh this entry. */
  readonly deps?: readonly EntityName[];
  /** How long a successful read stays fresh, in milliseconds. */
  readonly staleTime?: number;
  readonly repository?: QueryRepository | null;
  readonly fetcher?: Fetcher | null;
  readonly watch?: WatchFactory | null;
  readonly mergeWatch?: WatchMerge | null;
}

/** The default time an entry is kept after its last subscriber left. */
export const DEFAULT_GC_TIME = 60_000;

/** The delay before a failed watch is resubscribed once. */
const WATCH_RETRY_DELAY = 1_000;

/**
 * The failures a watch may accumulate before the entry gives it up.
 *
 * The first failure buys one resubscribe; the second one abandons the watch and the
 * entry lives on the change bus. There is no polling loop.
 */
const MAX_WATCH_FAILURES = 2;

interface Layer {
  readonly id: string;
  readonly update: (previous: unknown) => unknown;
  /** The counter of the repository before the write; the write is observable only if it moved. */
  counterBefore: number;
  /** The commit sequence of the write; null while the write is in flight or unprovable. */
  commitSeq: number | null;
  /** True while the write is still running. */
  pending: boolean;
  /** True when the write never reached the repository, so no observation can prove it. */
  unobserved: boolean;
}

interface PendingWatch {
  readonly rows: readonly unknown[];
  readonly commitSequence: number | undefined;
}

interface Entry {
  readonly id: string;
  readonly key: QueryKey;
  readonly entity: EntityName;
  repository: QueryRepository | null;
  mode: QueryMode;
  deps: readonly EntityName[];
  staleTime: number;
  fetcher: Fetcher | null;
  watch: WatchFactory | null;
  mergeWatch: WatchMerge | null;
  status: Status;
  base: unknown;
  error: unknown;
  layers: Layer[];
  pendingWatch: PendingWatch[];
  listeners: Set<() => void>;
  subscribers: number;
  started: boolean;
  dirty: boolean;
  stale: boolean;
  inFlight: Promise<void> | null;
  needsReload: boolean;
  stopWatch: Unsubscribe | null;
  /** The highest commit sequence this entry has committed to. */
  committedSeq: number;
  /** The highest commit sequence a successful read or emission reflected. */
  lastSuccessSeq: number;
  lastSuccessAt: number;
  /** The token counter of an entry that has no repository. */
  token: number;
  snapshot: QuerySnapshot<unknown>;
  publishedBase: unknown;
  publishedView: unknown;
  /** Counts every change of the layer set, so the view is rebuilt when one changes. */
  layerVersion: number;
  publishedLayerVersion: number;
  gcTimer: ReturnType<typeof setTimeout> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  watchFailures: number;
  /** The one derived value of this entry, rebuilt when its data changes. */
  derived: { base: unknown; value: unknown } | null;
}

const IDLE_SNAPSHOT: QuerySnapshot<unknown> = Object.freeze({
  data: undefined,
  error: null,
  status: 'idle' as Status,
  isFetching: false,
});

/**
 * The live query cache.
 *
 * One entry per query key *and repository*: two repositories over one entity keep two
 * entries, so their token spaces never mix. An entry owns one read and, in watch mode,
 * one repository subscription. Events from the change bus invalidate the entries that
 * depend on them; watch entries take their own entity from the stream and only refetch
 * for `deps`.
 */
export class QueryCache {
  private readonly entries = new Map<string, Entry>();
  private readonly byHash = new Map<string, Set<Entry>>();
  private readonly repositories = new WeakMap<QueryRepository, Unsubscribe>();
  private readonly repositoryIds = new WeakMap<QueryRepository, string>();
  private repositoryCounter = 0;
  private pendingNotification: Promise<void> | null = null;
  private suspended = false;

  /** How long an entry survives its last subscriber, in milliseconds. */
  readonly gcTime: number;

  constructor(options: { readonly gcTime?: number } = {}) {
    this.gcTime = options.gcTime ?? DEFAULT_GC_TIME;
  }

  /** Registers (or refreshes) the configuration of one entry. */
  define(definition: QueryDefinition): void {
    const repository = definition.repository ?? null;
    const id = this.entryId(repository, definition.key.hash);
    const existing = this.entries.get(id);
    if (existing) {
      existing.repository = repository;
      existing.mode = definition.mode ?? existing.mode;
      existing.deps = definition.deps ?? existing.deps;
      existing.staleTime = definition.staleTime ?? existing.staleTime;
      existing.fetcher = definition.fetcher ?? existing.fetcher;
      existing.watch = definition.watch ?? existing.watch;
      existing.mergeWatch = definition.mergeWatch ?? existing.mergeWatch;
      return;
    }

    const entry: Entry = {
      id,
      key: definition.key,
      entity: definition.key.entity,
      repository,
      mode: definition.mode ?? 'invalidate',
      deps: definition.deps ?? [],
      staleTime: definition.staleTime ?? 0,
      fetcher: definition.fetcher ?? null,
      watch: definition.watch ?? null,
      mergeWatch: definition.mergeWatch ?? null,
      status: 'idle',
      base: undefined,
      error: null,
      layers: [],
      pendingWatch: [],
      listeners: new Set(),
      subscribers: 0,
      started: false,
      dirty: false,
      stale: false,
      inFlight: null,
      needsReload: false,
      stopWatch: null,
      committedSeq: 0,
      lastSuccessSeq: 0,
      lastSuccessAt: 0,
      token: 0,
      snapshot: IDLE_SNAPSHOT,
      publishedBase: undefined,
      publishedView: undefined,
      layerVersion: 0,
      publishedLayerVersion: -1,
      gcTimer: null,
      retryTimer: null,
      watchFailures: 0,
      derived: null,
    };
    this.entries.set(id, entry);
    this.index(entry);
    if (entry.subscribers === 0) this.scheduleGc(entry);
  }

  /** Subscribes to the changes of one entry; the returned function unsubscribes. */
  subscribe(
    key: QueryKey,
    repository: QueryRepository | null,
    listener: () => void
  ): Unsubscribe {
    const entry = this.entries.get(this.entryId(repository, key.hash));
    if (!entry) throw new Error(`query cache: define ${key.hash} before subscribing`);

    this.cancelGc(entry);
    entry.listeners.add(listener);
    entry.subscribers += 1;

    if (entry.subscribers === 1) {
      const stale = entry.stale;
      entry.stale = false;
      if (!entry.started) {
        this.start(entry);
      } else if (entry.mode === 'watch' && entry.watch && !entry.stopWatch) {
        // The watch was released with the last subscriber; it starts again.
        this.startWatch(entry);
      }
      if (stale) {
        // An event arrived while nobody watched the entry, so it may be out of date.
        entry.dirty = true;
        void this.load(entry);
      }
    }

    return () => {
      if (!entry.listeners.delete(listener)) return;
      entry.subscribers -= 1;
      if (entry.subscribers === 0) {
        this.releaseWatch(entry);
        this.scheduleGc(entry);
      }
    };
  }

  /** The snapshot a subscriber sees. */
  getSnapshot<T>(key: QueryKey, repository: QueryRepository | null): QuerySnapshot<T> {
    const entry = this.entries.get(this.entryId(repository, key.hash));
    if (!entry) return IDLE_SNAPSHOT as QuerySnapshot<T>;
    return entry.snapshot as QuerySnapshot<T>;
  }

  /** Subscribes to the change bus of a repository, once. */
  attachRepository(repository: QueryRepository): void {
    if (this.repositories.has(repository)) return;
    const unsubscribe = repository.subscribe((event) => this.handleEvent(repository, event));
    this.repositories.set(repository, unsubscribe);
  }

  /** Stops reacting to the change bus until {@link resume} is called. */
  suspend(): void {
    this.suspended = true;
  }

  /** Drops every entry; the next subscriber reads again. */
  clear(): void {
    for (const entry of [...this.entries.values()]) this.dispose(entry);
    this.entries.clear();
    this.byHash.clear();
  }

  /** Resumes the change bus and flushes the entries that went stale meanwhile. */
  resume(): void {
    this.suspended = false;
    void this.scheduleFlush();
  }

  /** Forces a read of one entry, whatever its mode is. */
  async refetch(key: QueryKey, repository: QueryRepository | null): Promise<void> {
    const entry = this.entries.get(this.entryId(repository, key.hash));
    if (!entry) return;
    if (entry.mode === 'watch' && entry.watchFailures > 0) {
      // A watch that failed is given a fresh budget before it is resubscribed.
      entry.watchFailures = 0;
      this.releaseWatch(entry);
      this.startWatch(entry, { fresh: true });
    }
    await this.load(entry, { force: true });
  }

  /** Applies an optimistic layer and returns the function that rolls it back. */
  applyOptimistic(
    key: QueryKey,
    mutationId: string,
    update: (previous: unknown) => unknown
  ): () => boolean {
    const entries = this.entriesFor(key.hash);
    if (entries.length === 0) return () => false;

    for (const entry of entries) {
      entry.layers.push({
        id: mutationId,
        update,
        counterBefore: this.readToken(entry),
        commitSeq: null,
        pending: true,
        unobserved: false,
      });
      entry.layerVersion += 1;
      this.publish(entry);
    }

    return () => {
      let removed = false;
      for (const entry of entries) {
        if (this.removeLayer(entry, mutationId)) removed = true;
      }
      return removed;
    };
  }

  /**
   * Assigns the commit sequence of a written layer.
   *
   * The token is the sequence the write itself reached, so it can be compared with the
   * tags of the watch payloads of that same repository. A write that never moved the
   * repository's counter did not reach the repository at all: no observation can prove
   * it, so the layer is marked unobserved instead of being reported as applied.
   */
  markCommitted(key: QueryKey, mutationId: string): CommitOutcome {
    const entries = this.entriesFor(key.hash);
    let outcome: CommitOutcome = 'unknown';

    for (const entry of entries) {
      const layer = entry.layers.find((candidate) => candidate.id === mutationId);
      if (!layer || !layer.pending) continue;
      layer.pending = false;
      entry.layerVersion += 1;

      if (entry.repository) {
        const after = entry.repository.currentCommitSequence;
        if (after > layer.counterBefore) {
          layer.commitSeq = after;
          entry.committedSeq = Math.max(entry.committedSeq, after);
        } else {
          layer.unobserved = true;
          outcome = 'unobserved';
        }
      } else {
        layer.commitSeq = this.nextToken(entry);
        entry.committedSeq = Math.max(entry.committedSeq, layer.commitSeq);
        outcome = 'committed';
      }

      this.flushPendingWatch(entry);
      this.publish(entry);
    }

    return outcome;
  }

  /** Removes one layer; the other layers stay untouched. */
  removeLayer(entry: Entry, mutationId: string): boolean {
    const before = entry.layers.length;
    entry.layers = entry.layers.filter((layer) => layer.id !== mutationId);
    if (entry.layers.length === before) return false;
    entry.layerVersion += 1;
    if (entry.layers.length === 0) entry.pendingWatch = [];
    this.publish(entry);
    return true;
  }

  /**
   * Waits until the cache observed the write of a layer.
   *
   * An observation is a successful read or a stream emission that reflects the commit
   * sequence of the layer or a later one.
   */
  async whenSettled(key: QueryKey, mutationId?: string): Promise<Settlement> {
    const entries = this.entriesFor(key.hash);
    if (entries.length === 0) return { observed: true, error: null };

    let observed = true;
    let error: unknown = null;
    for (const entry of entries) {
      const settlement = await this.whenSettledFor(entry, mutationId);
      if (!settlement.observed) observed = false;
      if (error === null && settlement.error !== null) error = settlement.error;
    }
    return { observed, error };
  }

  /** Settles the layers of one mutation across every patched key. */
  async settlePatches(keys: readonly QueryKey[], mutationId: string): Promise<Settlement> {
    let observed = true;
    let error: unknown = null;
    for (const key of keys) {
      const settlement = await this.whenSettled(key, mutationId);
      if (!settlement.observed) observed = false;
      if (error === null && settlement.error !== null) error = settlement.error;
    }
    return { observed, error };
  }

  /** Awaits the queued refreshes and the reads that are in flight. */
  async flush(): Promise<void> {
    let pending = this.pendingNotification;
    while (pending) {
      await pending;
      pending = this.pendingNotification;
    }
    await this.flushDirty();
    pending = this.pendingNotification;
    while (pending) {
      await pending;
      pending = this.pendingNotification;
    }
  }

  /**
   * A value derived from the data of one entry, shared by every consumer.
   *
   * The entry keeps one derived value; it is rebuilt only when the data it was derived
   * from changes, so a consumer that passes a new label function on every render does
   * not pile up derived values.
   */
  derivedValue<T>(
    key: QueryKey,
    repository: QueryRepository | null,
    data: unknown,
    compute: (data: unknown) => T
  ): T {
    const entry = this.entries.get(this.entryId(repository, key.hash));
    if (!entry) return compute(data);

    const cached = entry.derived;
    if (cached && sameValue(cached.base, data)) return cached.value as T;

    const value = compute(data);
    entry.derived = { base: data, value };
    return value;
  }

  /** How many derived values the cache holds; a diagnostic. */
  derivedEntryCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.derived) count += 1;
    }
    return count;
  }

  // ---------------------------------------------------------------- internals

  /** The identity of an entry: the repository instance and the query key. */
  private entryId(repository: QueryRepository | null, hash: string): string {
    return `${this.repositoryId(repository)}:${hash}`;
  }

  private repositoryId(repository: QueryRepository | null): string {
    if (!repository) return 'any';
    const existing = this.repositoryIds.get(repository);
    if (existing) return existing;
    this.repositoryCounter += 1;
    const created = `r${this.repositoryCounter}`;
    this.repositoryIds.set(repository, created);
    return created;
  }

  private index(entry: Entry): void {
    const bucket = this.byHash.get(entry.key.hash) ?? new Set<Entry>();
    bucket.add(entry);
    this.byHash.set(entry.key.hash, bucket);
  }

  private unindex(entry: Entry): void {
    const bucket = this.byHash.get(entry.key.hash);
    if (!bucket) return;
    bucket.delete(entry);
    if (bucket.size === 0) this.byHash.delete(entry.key.hash);
  }

  /** Every entry of one key, over every repository. */
  private entriesFor(hash: string): Entry[] {
    const bucket = this.byHash.get(hash);
    return bucket ? [...bucket] : [];
  }

  private start(entry: Entry): void {
    if (entry.started) return;
    entry.started = true;

    if (entry.mode === 'watch' && entry.watch) {
      this.startWatch(entry, { fresh: true });
      return;
    }
    if (entry.mode === 'manual') {
      entry.status = 'idle';
      this.publish(entry);
      return;
    }
    void this.load(entry);
  }

  private startWatch(entry: Entry, options: { readonly fresh?: boolean } = {}): void {
    const watch = entry.watch;
    if (!watch) return;
    if (options.fresh) entry.watchFailures = 0;

    entry.status = entry.base === undefined ? 'loading' : 'refreshing';
    this.publish(entry);

    try {
      entry.stopWatch = watch(entry.key.query, (rows, commitSequence, error) => {
        if (error !== undefined) {
          this.handleWatchError(entry, error);
          return;
        }
        this.receiveWatch(entry, rows, commitSequence);
      });
    } catch (error) {
      this.handleWatchError(entry, error);
    }
  }

  private releaseWatch(entry: Entry): void {
    entry.stopWatch?.();
    entry.stopWatch = null;
  }

  private handleWatchError(entry: Entry, error: unknown): void {
    entry.watchFailures += 1;
    entry.error = error;
    entry.status = 'error';
    this.publish(entry);

    if (entry.watchFailures < MAX_WATCH_FAILURES) {
      // One bounded resubscribe; the next failure abandons the watch.
      this.releaseWatch(entry);
      if (entry.retryTimer !== null) clearTimeout(entry.retryTimer);
      entry.retryTimer = setTimeout(() => {
        entry.retryTimer = null;
        if (entry.subscribers > 0 && entry.mode === 'watch') this.startWatch(entry);
      }, WATCH_RETRY_DELAY);
      return;
    }

    // The watch is abandoned: the entry lives on the change bus from now on.
    this.releaseWatch(entry);
    if (entry.retryTimer !== null) {
      clearTimeout(entry.retryTimer);
      entry.retryTimer = null;
    }
    entry.mode = 'invalidate';
    void this.load(entry);
  }

  private receiveWatch(entry: Entry, rows: readonly unknown[], commitSequence?: number): void {
    if (entry.layers.some((layer) => layer.pending)) {
      // The write has not resolved yet: the payload is applied against the commit
      // sequence afterwards, so it is never layered on top of a base that has it.
      entry.pendingWatch.push({ rows, commitSequence });
      return;
    }
    this.applyWatch(entry, rows, commitSequence);
  }

  private applyWatch(
    entry: Entry,
    rows: readonly unknown[],
    commitSequence?: number
  ): boolean {
    const token = commitSequence ?? entry.committedSeq;
    if (token < entry.committedSeq) return false; // a stale payload is rejected

    entry.base = entry.mergeWatch ? entry.mergeWatch(entry.base, rows) : rows;
    entry.error = null;
    entry.status = 'success';
    entry.committedSeq = Math.max(entry.committedSeq, token);
    entry.lastSuccessSeq = Math.max(entry.lastSuccessSeq, token);
    entry.lastSuccessAt = Date.now();
    this.settleObserved(entry);
    this.publish(entry);
    return true;
  }

  private flushPendingWatch(entry: Entry): void {
    if (entry.layers.some((layer) => layer.pending)) return;
    const queued = entry.pendingWatch.splice(0);
    for (const message of queued) this.applyWatch(entry, message.rows, message.commitSequence);
  }

  private async load(entry: Entry, options: { readonly force?: boolean } = {}): Promise<void> {
    if (!options.force && entry.mode === 'manual') return;
    if (entry.inFlight) {
      // An event arrived while the read was in flight: re-run once it settles.
      entry.needsReload = true;
      return entry.inFlight;
    }
    const fetcher = entry.fetcher;
    if (!fetcher) return;

    const run = (async () => {
      do {
        entry.needsReload = false;
        const token = this.readToken(entry);
        entry.status = entry.base === undefined ? 'loading' : 'refreshing';
        this.publish(entry);
        try {
          const data = await fetcher(entry.key.query);
          entry.base = data;
          entry.error = null;
          entry.status = 'success';
          entry.lastSuccessSeq = Math.max(entry.lastSuccessSeq, token);
          entry.lastSuccessAt = Date.now();
          // The observed layers are dropped before the new base is published, so a
          // non-idempotent patch is never applied twice.
          this.settleObserved(entry);
        } catch (error) {
          entry.error = error;
          entry.status = 'error';
        }
        this.publish(entry);
      } while (entry.needsReload && entry.subscribers > 0);
    })();

    entry.inFlight = run;
    try {
      await run;
    } finally {
      entry.inFlight = null;
    }
  }

  /** Drops the layers the cache observed; a layer that cannot be observed stays. */
  private settleObserved(entry: Entry): boolean {
    const before = entry.layers.length;
    entry.layers = entry.layers.filter(
      (layer) => layer.pending || layer.unobserved || (layer.commitSeq ?? 0) > entry.lastSuccessSeq
    );
    if (entry.layers.length === before) return false;
    entry.layerVersion += 1;
    if (entry.layers.length === 0) entry.pendingWatch = [];
    return true;
  }

  private async whenSettledFor(
    entry: Entry,
    mutationId?: string
  ): Promise<Settlement> {
    const layer = mutationId
      ? entry.layers.find((candidate) => candidate.id === mutationId)
      : undefined;
    if (mutationId && !layer) return { observed: true, error: null };
    if (layer?.pending) return { observed: false, error: null };
    if (layer?.unobserved) return { observed: false, error: entry.error ?? null };

    const baseline = layer ? (layer.commitSeq ?? entry.committedSeq) : entry.committedSeq;

    await this.settlePending();
    const first = this.checkSettlement(entry, baseline, mutationId);
    if (first.observed) return first;

    // One macrotask lets a deferred event schedule its refresh.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await this.settlePending();
    return this.checkSettlement(entry, baseline, mutationId);
  }

  private checkSettlement(
    entry: Entry,
    baseline: number,
    mutationId?: string
  ): Settlement {
    if (mutationId) {
      const layer = entry.layers.find((candidate) => candidate.id === mutationId);
      if (!layer) return { observed: true, error: null };
      if (layer.unobserved) return { observed: false, error: entry.error ?? null };
    }
    const observed = entry.lastSuccessSeq >= baseline;
    return { observed, error: observed ? null : (entry.error ?? null) };
  }

  private async settlePending(): Promise<void> {
    if (this.pendingNotification) await this.pendingNotification;
    for (const entry of this.entries.values()) {
      if (entry.inFlight) await entry.inFlight;
      const repository = entry.repository;
      if (repository?.whenIdle) await repository.whenIdle();
    }
    if (this.pendingNotification) await this.pendingNotification;
  }

  private readToken(entry: Entry): number {
    return entry.repository ? entry.repository.currentCommitSequence : entry.committedSeq;
  }

  private nextToken(entry: Entry): number {
    if (entry.repository) return entry.repository.currentCommitSequence;
    // An entry without a repository counts in its own token space, so the tokens of
    // two entries are never compared.
    entry.token += 1;
    return entry.token;
  }

  private view(entry: Entry): unknown {
    // A layer whose write never reached the repository shows a value the database does
    // not hold, so it is not part of the view.
    return entry.layers
      .filter((layer) => !layer.unobserved)
      .reduce((data, layer) => layer.update(data), entry.base);
  }

  /** True when the same layers are applied as when the view was published. */
  private layersUnchanged(entry: Entry): boolean {
    return entry.layerVersion === entry.publishedLayerVersion;
  }

  private publish(entry: Entry): void {
    const baseUnchanged = sameValue(entry.publishedBase, entry.base);
    const view =
      baseUnchanged && this.layersUnchanged(entry) ? entry.publishedView : this.view(entry);
    const previous = entry.snapshot;

    if (
      previous.status === entry.status &&
      previous.error === entry.error &&
      sameValue(previous.data, view)
    ) {
      return;
    }

    entry.publishedBase = entry.base;
    entry.publishedView = view;
    entry.publishedLayerVersion = entry.layerVersion;
    entry.snapshot = {
      data: view,
      error: entry.error,
      status: entry.status,
      isFetching: entry.status === 'loading' || entry.status === 'refreshing',
    };
    for (const listener of [...entry.listeners]) listener();
  }

  private handleEvent(repository: QueryRepository, event: ChangeEvent): void {
    for (const entry of this.entries.values()) {
      // An entry without a repository listens to every attached repository.
      if (entry.repository !== null && entry.repository !== repository) continue;
      if (!this.eventRelevant(entry, event)) continue;
      if (entry.subscribers === 0) {
        entry.stale = true;
        continue;
      }
      entry.dirty = true;
    }
    if (this.suspended) return;
    void this.scheduleFlush();
  }

  private eventRelevant(entry: Entry, event: ChangeEvent): boolean {
    if (entry.entity === event.entity) {
      if (entry.mode === 'manual') return false;
      // A live stream owns its own entity; only deps refetch the base query.
      if (entry.mode === 'watch' && entry.stopWatch) return false;
      const id = detailIdOf(entry.key.query);
      if (id !== undefined) return event.ids.includes(id);
      return true;
    }
    if (entry.mode === 'manual') return false;
    if (!entry.deps.includes(event.entity)) return false;
    return Date.now() - entry.lastSuccessAt >= entry.staleTime;
  }

  private scheduleFlush(): Promise<void> {
    if (!this.pendingNotification) {
      this.pendingNotification = new Promise<void>((resolve) => {
        setTimeout(() => {
          this.pendingNotification = null;
          resolve(this.flushDirty());
        }, 0);
      });
    }
    return this.pendingNotification;
  }

  private async flushDirty(): Promise<void> {
    for (;;) {
      const dirty = [...this.entries.values()].filter(
        (entry) => entry.dirty && entry.subscribers > 0
      );
      if (dirty.length === 0) break;
      for (const entry of dirty) entry.dirty = false;
      await Promise.all(dirty.map((entry) => this.load(entry)));
    }
    const inFlight = [...this.entries.values()]
      .map((entry) => entry.inFlight)
      .filter((pending): pending is Promise<void> => pending !== null);
    await Promise.all(inFlight);
  }

  private scheduleGc(entry: Entry): void {
    if (entry.gcTimer !== null) return;
    entry.gcTimer = setTimeout(() => {
      entry.gcTimer = null;
      this.dispose(entry);
    }, this.gcTime);
  }

  private cancelGc(entry: Entry): void {
    if (entry.gcTimer === null) return;
    clearTimeout(entry.gcTimer);
    entry.gcTimer = null;
  }

  private dispose(entry: Entry): void {
    this.releaseWatch(entry);
    if (entry.retryTimer !== null) {
      clearTimeout(entry.retryTimer);
      entry.retryTimer = null;
    }
    entry.layers = [];
    entry.pendingWatch = [];
    entry.started = false;
    entry.derived = null;
    this.entries.delete(entry.id);
    this.unindex(entry);
  }
}

/** The id a detail query asks for, if it names one. */
function detailIdOf(query: QuerySnapshotObject): string | undefined {
  const where = query.where;
  if (where !== null && typeof where === 'object' && !Array.isArray(where)) {
    const id = (where as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }
  return typeof query.id === 'string' ? query.id : undefined;
}

/** Structural equality, so a re-read of unchanged rows does not re-render a view. */
export function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => sameValue(item, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) && sameValue(left[key], right[key])
    );
  }

  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** The module-scoped cache the hooks use. */
export const queryCache = new QueryCache();
