// ABOUTME: Spike prototype for DR-04: a live query cache keyed by entity + canonical query.
// ABOUTME: Models dedupe, revalidation, watch/refetch precedence, optimistic layers and settlement.

const hashOf = (key) => (typeof key === 'string' ? key : key.hash);

export function stableStringify(value) {
  return canonical(value, '$');
}

function canonical(value, path) {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError(`query key ${path}: non-finite number`);
      return String(value);
    case 'undefined':
      return 'null';
    case 'object':
      break;
    default:
      throw new TypeError(`query key ${path}: unsupported ${typeof value}`);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new TypeError(`query key ${path}: invalid date`);
    return JSON.stringify(value.toISOString());
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((item, index) => {
        if (item === undefined) {
          throw new TypeError(`query key ${path}[${index}]: undefined array element`);
        }
        return canonical(item, `${path}[${index}]`);
      })
      .join(',')}]`;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const name = value.constructor?.name ?? 'object';
    throw new TypeError(`query key ${path}: unsupported object ${name}`);
  }
  const parts = [];
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${canonical(value[key], `${path}.${key}`)}`);
  }
  return `{${parts.join(',')}}`;
}

function cloneKeyValue(value, path = '$') {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new TypeError(`query key ${path}: invalid date`);
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((item, index) => {
        if (item === undefined) {
          throw new TypeError(`query key ${path}[${index}]: undefined array element`);
        }
        return cloneKeyValue(item, `${path}[${index}]`);
      })
    );
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const name = value.constructor?.name ?? 'object';
    throw new TypeError(`query key ${path}: unsupported object ${name}`);
  }
  const copy = {};
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) continue;
    copy[key] = cloneKeyValue(value[key], `${path}.${key}`);
  }
  return Object.freeze(copy);
}

export function queryKey(entity, query = {}) {
  const snapshot = cloneKeyValue(query);
  return Object.freeze({ entity, query: snapshot, hash: `${entity}:${stableStringify(snapshot)}` });
}

// Models useMutation.mutateAsync: apply optimistic layers, write, wait for the
// cache to observe the write, then drop the layers (also on rejection).
export async function runMutation(cache, key, mutationId, update, write) {
  const rollback = cache.applyOptimistic(key, mutationId, update);
  try {
    const result = await write();
    cache.markCommitted(key, mutationId);
    let settlement;
    try {
      settlement = await cache.whenSettled(key, mutationId);
    } catch (error) {
      settlement = { observed: false, error };
    }
    if (settlement.observed) {
      rollback();
    } else {
      cache.retainOptimistic(key, mutationId);
    }
    return { result, settlement };
  } catch (error) {
    rollback();
    throw error;
  }
}

export class LiveCache {
  constructor() {
    this.entries = new Map();
    this.pending = null;
  }

  define(key, { fetcher, deps = [], mode = 'invalidate', watch }) {
    const existing = this.entries.get(key.hash);
    if (existing) return existing;
    const entry = {
      key,
      entity: key.entity,
      query: key.query,
      fetcher,
      deps,
      mode,
      watch,
      watchers: 0,
      started: false,
      status: 'idle',
      base: undefined,
      error: null,
      layers: [],
      dirty: false,
      inFlight: null,
      needsReload: false,
      stopWatch: null,
      epoch: 0,
      nextCommitSeq: 0,
      committedSeq: 0,
      lastSuccessSeq: -1,
      pendingWatch: [],
      revision: 0,
      listeners: new Set(),
    };
    this.entries.set(key.hash, entry);
    return entry;
  }

  subscribe(key, listener) {
    const hash = hashOf(key);
    const entry = this.entries.get(hash);
    if (!entry) throw new Error(`query cache: define ${hash} before subscribing`);
    entry.watchers += 1;
    entry.listeners.add(listener);
    if (!entry.started) {
      entry.started = true;
      this.start(entry);
    } else if (entry.mode === 'watch' && !entry.stopWatch) {
      this.startWatch(entry);
    } else if (entry.dirty) {
      entry.dirty = false;
      void this.load(entry);
    }
    return () => {
      entry.listeners.delete(listener);
      entry.watchers -= 1;
      if (entry.watchers === 0) this.dispose(entry);
    };
  }

  dispose(entry) {
    entry.stopWatch?.();
    entry.stopWatch = null;
    entry.layers = [];
    entry.pendingWatch = [];
    this.entries.delete(entry.key.hash);
  }

  start(entry) {
    if (entry.mode === 'watch' && entry.watch) {
      this.startWatch(entry);
    } else if (entry.mode === 'manual') {
      entry.status = 'idle';
      this.publish(entry);
    } else {
      void this.load(entry);
    }
  }

  startWatch(entry) {
    entry.status = entry.base === undefined ? 'loading' : 'refreshing';
    this.publish(entry);
    entry.stopWatch = entry.watch(entry.query, (data, seq) => {
      this.receiveWatch(entry, data, seq);
    });
  }

  receiveWatch(entry, data, seq) {
    // A watch payload that arrives while a mutation is uncommitted may reflect
    // the DB commit but not yet the resolved write promise. Queue it so the
    // optimistic layer is never applied on top of a base that already has it.
    if (entry.layers.some((layer) => layer.commitSeq == null)) {
      entry.pendingWatch.push({ data, seq });
      return false;
    }
    return this.applyWatch(entry, data, seq);
  }

  applyWatch(entry, data, seq) {
    // A reordering transport can deliver a pre-commit payload after commit.
    // Tagged payloads older than the cache's committed sequence are rejected.
    if (seq !== undefined && seq < entry.committedSeq) return false;
    const observation = seq ?? entry.committedSeq;
    entry.base = data;
    entry.error = null;
    entry.status = 'success';
    entry.lastSuccessSeq = Math.max(entry.lastSuccessSeq, observation);
    this.settleObserved(entry);
    this.publish(entry);
    return true;
  }

  snapshot(key) {
    return (
      this.entries.get(hashOf(key))?.snapshot ?? {
        data: undefined,
        error: null,
        status: 'idle',
        isFetching: false,
      }
    );
  }

  view(entry) {
    return entry.layers.reduce((data, layer) => layer.update(data), entry.base);
  }

  publish(entry) {
    entry.revision += 1;
    entry.snapshot = {
      data: this.view(entry),
      error: entry.error,
      status: entry.status,
      isFetching: entry.status === 'loading' || entry.status === 'refreshing',
    };
    for (const listener of entry.listeners) listener();
  }

  async load(entry) {
    if (!entry || entry.watchers === 0 || entry.mode === 'manual') return;
    if (entry.inFlight) {
      // An event arrived while the read was in flight: re-run once it settles.
      entry.needsReload = true;
      return entry.inFlight;
    }
    const run = (async () => {
      do {
        entry.needsReload = false;
        const readSeq = entry.committedSeq;
        entry.status = entry.base === undefined ? 'loading' : 'refreshing';
        this.publish(entry);
        try {
          entry.base = await entry.fetcher(entry.query);
          entry.error = null;
          entry.status = 'success';
          entry.lastSuccessSeq = Math.max(entry.lastSuccessSeq, readSeq);
          this.settleObserved(entry);
        } catch (error) {
          entry.error = error;
          entry.status = 'error';
        }
        this.publish(entry);
      } while (entry.needsReload && entry.watchers > 0);
    })();
    entry.inFlight = run;
    try {
      await run;
    } finally {
      entry.inFlight = null;
    }
    if (entry.needsReload && entry.watchers > 0) {
      entry.needsReload = false;
      return this.load(entry);
    }
  }

  async refetch(key) {
    const entry = this.entries.get(hashOf(key));
    if (!entry) return;
    const originalMode = entry.mode;
    entry.mode = 'invalidate';
    try {
      await this.load(entry);
    } finally {
      entry.mode = originalMode;
    }
  }

  eventRelevant(entry, event) {
    if (entry.entity === event.entity) {
      // A live stream owns its own entity. Manual entries ignore events entirely.
      if (entry.mode === 'watch' && entry.stopWatch) return false;
      if (entry.mode === 'manual') return false;
      if (entry.query.id !== undefined && event.ids) return event.ids.includes(entry.query.id);
      return true;
    }
    if (entry.mode === 'manual') return false;
    return entry.deps.includes(event.entity);
  }

  notify(event) {
    for (const entry of this.entries.values()) {
      if (this.eventRelevant(entry, event)) entry.dirty = true;
    }
    if (!this.pending) {
      // A macrotask (not a microtask) lets `mutateAsync` mark the write committed
      // after `mutationFn` resolves but before an event-triggered read starts.
      this.pending = new Promise((resolve) => {
        setTimeout(() => {
          this.pending = null;
          resolve(this.flush());
        }, 0);
      });
    }
    return this.pending;
  }

  async flush() {
    for (;;) {
      const dirty = [...this.entries.values()].filter((entry) => entry.dirty && entry.watchers > 0);
      if (dirty.length === 0) break;
      for (const entry of dirty) entry.dirty = false;
      await Promise.all(dirty.map((entry) => this.load(entry)));
    }
    const inFlight = [...this.entries.values()].filter((entry) => entry.inFlight);
    await Promise.all(inFlight.map((entry) => entry.inFlight));
  }

  async whenSettled(key, mutationId = null) {
    const hash = hashOf(key);
    const entry = this.entries.get(hash);
    if (!entry) return { observed: true, error: null };
    const layer = mutationId ? entry.layers.find((candidate) => candidate.id === mutationId) : null;
    if (mutationId && !layer) return { observed: true, error: null };
    if (layer && layer.commitSeq == null) return { observed: false, error: null };
    const baseline = layer ? layer.commitSeq : entry.committedSeq;

    const check = () => {
      const current = this.entries.get(hash);
      if (!current) return { observed: true, error: null };
      if (mutationId && !current.layers.some((candidate) => candidate.id === mutationId)) {
        return { observed: true, error: null };
      }
      const observed = current.lastSuccessSeq >= baseline;
      return { observed, error: observed ? null : current.error ?? null };
    };
    const settlePending = async () => {
      if (this.pending) await this.pending;
      const current = this.entries.get(hash);
      if (current?.inFlight) await current.inFlight;
      if (this.pending) await this.pending;
    };

    await settlePending();
    const first = check();
    if (first.observed) return first;

    // One macrotask lets a just-emitted event schedule its refresh. If nothing
    // arrives, the caller retains the layer and the next successful read settles it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settlePending();
    return check();
  }

  settleObserved(entry) {
    const before = entry.layers.length;
    entry.layers = entry.layers.filter(
      (layer) => layer.commitSeq == null || layer.commitSeq > entry.lastSuccessSeq
    );
    if (entry.layers.length === 0) entry.pendingWatch = [];
    return entry.layers.length !== before;
  }

  markCommitted(key, mutationId) {
    const entry = this.entries.get(hashOf(key));
    if (!entry) return false;
    const layer = entry.layers.find((candidate) => candidate.id === mutationId);
    if (!layer) return false;
    if (layer.commitSeq == null) {
      entry.nextCommitSeq += 1;
      layer.commitSeq = entry.nextCommitSeq;
      entry.committedSeq = Math.max(entry.committedSeq, layer.commitSeq);
    }
    if (!entry.layers.some((candidate) => candidate.commitSeq == null) && entry.pendingWatch.length > 0) {
      const queued = entry.pendingWatch.splice(0);
      for (const message of queued) this.applyWatch(entry, message.data, message.seq);
    }
    return true;
  }

  retainOptimistic(key, mutationId) {
    const entry = this.entries.get(hashOf(key));
    if (!entry) return false;
    const layer = entry.layers.find((candidate) => candidate.id === mutationId);
    if (!layer) return false;
    layer.retained = true;
    return true;
  }

  applyOptimistic(key, mutationId, update) {
    const entry = this.entries.get(hashOf(key));
    if (!entry) return () => false;
    entry.epoch += 1;
    entry.layers.push({
      id: mutationId,
      update,
      epoch: entry.epoch,
      commitSeq: null,
      retained: false,
    });
    this.publish(entry);
    return () => this.settleOptimistic(key, mutationId);
  }

  settleOptimistic(key, mutationId) {
    const entry = this.entries.get(hashOf(key));
    if (!entry) return false;
    const before = entry.layers.length;
    entry.layers = entry.layers.filter((layer) => layer.id !== mutationId);
    if (entry.layers.length === 0) entry.pendingWatch = [];
    if (entry.layers.length !== before) this.publish(entry);
    return true;
  }
}
