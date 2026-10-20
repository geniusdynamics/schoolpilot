// ABOUTME: Tests the DR-04 spike cache: keys, dedupe, revalidation, mode precedence, pages and optimistic settlement.
// ABOUTME: Run with: node --test docs/prd/workflow-log/decisions/spikes/DR-04/cache.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveCache, queryKey, runMutation, stableStringify } from './cache.mjs';

function makeArrayRepo(rows) {
  let version = 0;
  return {
    rows,
    calls: 0,
    async list(query = {}) {
      this.calls += 1;
      if (query.id !== undefined) return rows.find((row) => row.id === query.id) ?? null;
      return rows.map((row) => ({ ...row }));
    },
    async update(id, patch) {
      version += 1;
      const index = rows.findIndex((row) => row.id === id);
      rows[index] = { ...rows[index], ...patch, version };
      return rows[index];
    },
  };
}

function makePageRepo(rows) {
  const watchers = new Set();
  return {
    rows,
    listCalls: 0,
    async list() {
      this.listCalls += 1;
      const items = rows.map((row) => ({ ...row }));
      return { items, total: items.length, hasMore: false };
    },
    watch(query, emit) {
      const listener = () => emit(rows.map((row) => ({ ...row })));
      watchers.add(listener);
      listener();
      return () => watchers.delete(listener);
    },
    write(row) {
      rows.push({ ...row });
      for (const listener of watchers) listener();
    },
  };
}

function defineList(cache, repo, entity = 'learner', query = {}) {
  const key = queryKey(entity, query);
  cache.define(key, { entity, query, fetcher: (q) => repo.list(q) });
  return key;
}

function definePage(cache, repo, entity, query, { mode = 'watch' } = {}) {
  const key = queryKey(entity, query);
  cache.define(key, {
    entity,
    query,
    mode,
    fetcher: () => repo.list(query),
    watch:
      mode === 'watch'
        ? (q, emit) =>
            repo.watch(q, (items) => {
              const previous = cache.snapshot(key).data;
              emit({ ...(previous ?? { total: items.length, hasMore: false }), items });
            })
        : undefined,
  });
  return key;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('canonical key includes the entity, normalises dates and rejects unsafe values', () => {
  const first = queryKey('learner', { b: 2, a: { d: 4, c: 3 }, gone: undefined });
  const second = queryKey('learner', { a: { c: 3, d: 4 }, b: 2 });
  assert.equal(first.hash, second.hash);
  assert.notEqual(queryKey('learner', {}).hash, queryKey('class_group', {}).hash);
  assert.equal(
    stableStringify({ from: new Date('2026-01-01T00:00:00Z') }),
    stableStringify({ from: '2026-01-01T00:00:00.000Z' })
  );
  assert.throws(() => stableStringify({ ids: ['a', undefined] }), /undefined array element/);
  assert.throws(() => stableStringify({ n: Number.NaN }), /non-finite/);
});

test('query keys reject non-JSON objects and snapshot the query', () => {
  assert.throws(() => stableStringify({ map: new Map() }), /unsupported object Map/);
  assert.throws(() => stableStringify({ set: new Set() }), /unsupported object Set/);
  assert.throws(() => stableStringify({ re: /x/ }), /unsupported object RegExp/);
  class Custom {
    constructor() {
      this.value = 1;
    }
  }
  assert.throws(() => stableStringify({ custom: new Custom() }), /unsupported object Custom/);

  const input = { status: 'active', nested: { level: 1 } };
  const key = queryKey('learner', input);
  input.status = 'archived';
  input.nested.level = 2;
  assert.equal(key.query.status, 'active');
  assert.equal(key.query.nested.level, 1);
  assert.equal(key.hash, queryKey('learner', { status: 'active', nested: { level: 1 } }).hash);
  assert.equal(Object.isFrozen(key.query), true);
  assert.equal(Object.isFrozen(key.query.nested), true);
  assert.throws(() => {
    key.query.status = 'archived';
  }, TypeError);

  const dated = queryKey('learner', { from: new Date('2026-01-01T00:00:00Z') });
  assert.equal(dated.query.from, '2026-01-01T00:00:00.000Z', 'Dates are stored as ISO strings');
  assert.equal(dated.hash, queryKey('learner', { from: '2026-01-01T00:00:00.000Z' }).hash);
  assert.throws(() => {
    dated.query.from = '2030-01-01T00:00:00.000Z';
  }, TypeError);
});

test('three components on one key share a single fetch', async () => {
  const cache = new LiveCache();
  const repo = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const key = defineList(cache, repo);
  cache.subscribe(key, () => {});
  cache.subscribe(key, () => {});
  cache.subscribe(key, () => {});
  await tick();
  assert.equal(repo.calls, 1);
  assert.equal(cache.snapshot(key).data.length, 1);
});

test('a different entity with deps refreshes on its dependency and ignores unrelated entities', async () => {
  const cache = new LiveCache();
  const learners = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const enrollments = makeArrayRepo([{ id: 'e1', learner_id: 'l1' }]);
  const learnerKey = defineList(cache, learners, 'learner');
  const enrollmentKey = queryKey('enrollment', {});
  let enrollmentFetches = 0;
  cache.define(enrollmentKey, {
    entity: 'enrollment',
    query: {},
    deps: ['learner'],
    fetcher: async () => {
      enrollmentFetches += 1;
      return { learners: learners.rows.length, enrollments: enrollments.rows.length };
    },
  });
  cache.subscribe(learnerKey, () => {});
  cache.subscribe(enrollmentKey, () => {});
  await tick();
  assert.deepEqual(cache.snapshot(enrollmentKey).data, { learners: 1, enrollments: 1 });

  learners.rows.push({ id: 'l2', name: 'Baraka' });
  await cache.notify({ entity: 'learner', type: 'insert', ids: ['l2'] });
  assert.deepEqual(cache.snapshot(enrollmentKey).data, { learners: 2, enrollments: 1 });

  await cache.notify({ entity: 'staff', type: 'insert', ids: ['s1'] });
  assert.equal(enrollmentFetches, 2);
});

test('a detail query ignores events for other ids', async () => {
  const cache = new LiveCache();
  const repo = makeArrayRepo([{ id: 'l1', name: 'Amani' }, { id: 'l2', name: 'Baraka' }]);
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, { entity: 'learner', query: { id: 'l1' }, fetcher: (q) => repo.list(q) });
  cache.subscribe(key, () => {});
  await tick();
  const calls = repo.calls;

  await cache.notify({ entity: 'learner', type: 'update', ids: ['l2'] });
  assert.equal(repo.calls, calls);

  await cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
  assert.equal(repo.calls, calls + 1);
});

test('five events in one tick coalesce into one refresh per entry', async () => {
  const cache = new LiveCache();
  const repo = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const key = defineList(cache, repo);
  cache.subscribe(key, () => {});
  await tick();
  const calls = repo.calls;

  const flushes = [];
  for (let i = 0; i < 5; i += 1) {
    flushes.push(cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] }));
  }
  await Promise.all(flushes);

  assert.equal(repo.calls, calls + 1);
});

test('an event during an in-flight read is revalidated after it settles', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', name: 'Amani' }];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const repo = {
    rows,
    async list() {
      calls += 1;
      const snapshot = rows.map((row) => ({ ...row }));
      await gate;
      return snapshot;
    },
  };
  const key = queryKey('learner', {});
  cache.define(key, { entity: 'learner', query: {}, fetcher: () => repo.list() });
  const seen = [];
  cache.subscribe(key, () => {
    const snapshot = cache.snapshot(key);
    if (snapshot.data) seen.push(snapshot.data.length);
  });
  await tick();
  assert.equal(calls, 1);
  assert.equal(cache.snapshot(key).status, 'loading');

  rows.push({ id: 'l2', name: 'Baraka' });
  const pending = cache.notify({ entity: 'learner', type: 'insert', ids: ['l2'] });
  await tick();
  assert.equal(calls, 1, 'the first read is still gated');

  release();
  await pending;
  await tick();
  assert.equal(calls, 2, 'the queued revalidation runs after the first read');
  assert.equal(cache.snapshot(key).data.length, 2);
  assert.deepEqual(
    seen.filter((length, index) => index === 0 || length !== seen[index - 1]),
    [1, 2]
  );
});

test('watch owns its entity; deps refetch; invalidate refetches; manual ignores events', async () => {
  const cache = new LiveCache();
  const pageRepo = makePageRepo([{ id: 'l1', name: 'Amani' }]);
  const watchKey = definePage(cache, pageRepo, 'learner', {});
  cache.subscribe(watchKey, () => {});
  await tick();
  assert.equal(pageRepo.listCalls, 0, 'watch emitted the first page');

  pageRepo.write({ id: 'l2', name: 'Baraka' });
  assert.equal(cache.snapshot(watchKey).data.items.length, 2);
  assert.equal(pageRepo.listCalls, 0, 'own-entity write came through the stream');

  await cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
  assert.equal(pageRepo.listCalls, 0, 'own-entity events do not double-fetch a live entry');

  let depFetches = 0;
  const depKey = queryKey('enrollment', {});
  cache.define(depKey, {
    entity: 'enrollment',
    query: {},
    mode: 'watch',
    deps: ['learner'],
    fetcher: async () => {
      depFetches += 1;
      return { learners: pageRepo.rows.length };
    },
    watch: (q, emit) => {
      emit({ learners: pageRepo.rows.length });
      return () => {};
    },
  });
  cache.subscribe(depKey, () => {});
  await tick();
  assert.equal(depFetches, 0, 'watch supplied the initial dependency data');
  await cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
  assert.equal(depFetches, 1, 'a dependency event refetches a watch-backed entry');

  const invalidateRepo = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const invalidateKey = queryKey('learner', { mode: 'invalidate' });
  cache.define(invalidateKey, {
    entity: 'learner',
    query: { mode: 'invalidate' },
    mode: 'invalidate',
    fetcher: () => invalidateRepo.list(),
  });
  cache.subscribe(invalidateKey, () => {});
  await tick();
  await cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
  assert.equal(invalidateRepo.calls, 2);

  const manualRepo = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const manualKey = queryKey('learner', { mode: 'manual' });
  cache.define(manualKey, {
    entity: 'learner',
    query: { mode: 'manual' },
    mode: 'manual',
    fetcher: () => manualRepo.list(),
  });
  cache.subscribe(manualKey, () => {});
  await tick();
  assert.equal(manualRepo.calls, 0);
  await cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
  assert.equal(manualRepo.calls, 0);
  await cache.refetch(manualKey);
  assert.equal(manualRepo.calls, 1);
});

test('useEntityQuery shape: list returns Page, watch replaces items and preserves metadata until refetch', async () => {
  const cache = new LiveCache();
  const repo = makePageRepo([{ id: 'l1', name: 'Amani' }]);
  const key = definePage(cache, repo, 'learner', {});
  cache.subscribe(key, () => {});
  await tick();

  assert.deepEqual(cache.snapshot(key).data, {
    items: [{ id: 'l1', name: 'Amani' }],
    total: 1,
    hasMore: false,
  });

  repo.write({ id: 'l2', name: 'Baraka' });
  assert.deepEqual(cache.snapshot(key).data.items, [
    { id: 'l1', name: 'Amani' },
    { id: 'l2', name: 'Baraka' },
  ]);
  assert.equal(cache.snapshot(key).data.total, 1, 'page metadata is advisory until refetch');

  await cache.refetch(key);
  assert.equal(cache.snapshot(key).data.total, 2);
});

test('optimistic layers stack, roll back only their own change, and survive a later write', async () => {
  const cache = new LiveCache();
  const repo = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, { entity: 'learner', query: { id: 'l1' }, fetcher: (q) => repo.list(q) });
  let renders = 0;
  cache.subscribe(key, () => { renders += 1; });
  await tick();

  const rollbackA = cache.applyOptimistic(key, 'm1', (row) => ({ ...row, name: 'Amani A.' }));
  const rollbackB = cache.applyOptimistic(key, 'm2', (row) => ({ ...row, name: 'Amani B.' }));
  assert.equal(cache.snapshot(key).data.name, 'Amani B.');

  rollbackA();
  assert.equal(cache.snapshot(key).data.name, 'Amani B.');

  rollbackB();
  assert.equal(cache.snapshot(key).data.name, 'Amani');

  const rollbackC = cache.applyOptimistic(key, 'm3', (row) => ({ ...row, name: 'Amani C.' }));
  await repo.update('l1', { name: 'Amani C.' });
  await cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
  await cache.whenSettled(key);
  rollbackC();
  assert.equal(cache.snapshot(key).data.name, 'Amani C.');
  assert.ok(renders > 0);
});

test('dropping an optimistic layer before whenSettled flickers; waiting prevents it', async () => {
  const cache = new LiveCache();
  const repo = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, { entity: 'learner', query: { id: 'l1' }, fetcher: (q) => repo.list(q) });
  cache.subscribe(key, () => {});
  await tick();

  // Early drop: the refreshed base has not arrived, so the old value reappears.
  const early = cache.applyOptimistic(key, 'early', (row) => ({ ...row, name: 'New' }));
  const write = repo.update('l1', { name: 'New' });
  const notify = cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
  early();
  assert.equal(cache.snapshot(key).data.name, 'Amani');
  await write;
  await notify;
  await cache.whenSettled(key);
  assert.equal(cache.snapshot(key).data.name, 'New');

  // The seam useMutation uses: hold the layer until the cache is settled.
  const { result: saved, settlement } = await runMutation(
    cache,
    key,
    'safe',
    (row) => ({ ...row, name: 'Safer' }),
    async () => {
      const updated = await repo.update('l1', { name: 'Safer' });
      void cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
      return updated;
    }
  );
  assert.equal(saved.name, 'Safer');
  assert.equal(settlement.observed, true);
  assert.equal(settlement.error, null);
  assert.equal(cache.snapshot(key).data.name, 'Safer');
  assert.equal(cache.entries.get(key.hash).layers.length, 0);
});

test('a successful write with a failed refresh keeps the layer and reports the error', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', name: 'Old' }];
  let failRefresh = false;
  const repo = {
    rows,
    async update(id, patch) {
      const index = rows.findIndex((row) => row.id === id);
      rows[index] = { ...rows[index], ...patch };
      return rows[index];
    },
  };
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, {
    entity: 'learner',
    query: { id: 'l1' },
    fetcher: async () => {
      if (failRefresh) throw new Error('refresh failed');
      return { ...rows[0] };
    },
  });
  cache.subscribe(key, () => {});
  await tick();

  failRefresh = true;
  const { result, settlement } = await runMutation(
    cache,
    key,
    'm1',
    (row) => ({ ...row, name: 'New' }),
    async () => {
      const updated = await repo.update('l1', { name: 'New' });
      void cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
      return updated;
    }
  );

  assert.equal(result.name, 'New');
  assert.equal(settlement.observed, false);
  assert.match(settlement.error.message, /refresh failed/);
  assert.equal(cache.snapshot(key).status, 'error');
  assert.equal(cache.snapshot(key).data.name, 'New', 'the successful write stays visible');
  assert.equal(cache.entries.get(key.hash).layers.length, 1, 'the layer is retained');

  failRefresh = false;
  await cache.refetch(key);
  assert.equal(cache.snapshot(key).status, 'success');
  assert.equal(cache.snapshot(key).data.name, 'New');
  assert.equal(cache.entries.get(key.hash).layers.length, 0, 'a later success settles the layer');
});

test('a read started before the layer does not count as an observation', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', name: 'Old' }];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, {
    entity: 'learner',
    query: { id: 'l1' },
    fetcher: async () => {
      calls += 1;
      const snapshot = { ...rows[0] };
      if (calls === 2) await gate;
      return snapshot;
    },
  });
  cache.subscribe(key, () => {});
  await tick();

  const refetch = cache.refetch(key);
  await tick();
  cache.applyOptimistic(key, 'm1', (row) => ({ ...row, name: 'New' }));
  release();
  await refetch;
  rows[0] = { ...rows[0], name: 'New' };
  cache.markCommitted(key, 'm1');

  const settlement = await cache.whenSettled(key, 'm1');
  assert.equal(settlement.observed, false, 'the old in-flight read is not an observation');
  assert.equal(cache.snapshot(key).data.name, 'New');
  assert.equal(cache.entries.get(key.hash).layers.length, 1);
  cache.retainOptimistic(key, 'm1');

  await cache.refetch(key);
  assert.equal(cache.snapshot(key).data.name, 'New');
  assert.equal(cache.entries.get(key.hash).layers.length, 0);
});

test('a pre-commit read plus a deferred event cannot settle the layer', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', name: 'Old' }];
  let calls = 0;
  let releasePre;
  const preGate = new Promise((resolve) => {
    releasePre = resolve;
  });
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, {
    entity: 'learner',
    query: { id: 'l1' },
    fetcher: async () => {
      calls += 1;
      const snapshot = { ...rows[0] };
      if (calls === 2) await preGate;
      return snapshot;
    },
  });
  cache.subscribe(key, () => {});
  await tick();

  cache.applyOptimistic(key, 'm1', (row) => ({ ...row, name: 'New' }));
  const preCommit = cache.refetch(key);
  await tick();
  releasePre();
  await preCommit;
  assert.equal(cache.snapshot(key).data.name, 'New', 'the layer still masks the old base');

  rows[0] = { ...rows[0], name: 'New' };
  cache.markCommitted(key, 'm1');
  let emitEvent;
  const eventEmitted = new Promise((resolve) => {
    emitEvent = () => resolve(cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] }));
  });
  setTimeout(emitEvent, 5);

  const settlement = await cache.whenSettled(key, 'm1');
  assert.equal(settlement.observed, false, 'the pre-commit read does not count');
  assert.equal(cache.snapshot(key).data.name, 'New');
  assert.equal(cache.entries.get(key.hash).layers.length, 1);

  await eventEmitted;
  await tick();
  assert.equal(cache.snapshot(key).data.name, 'New');
  assert.equal(cache.entries.get(key.hash).layers.length, 0, 'the deferred event settles it');
});

test('a post-commit read drops the layer before publishing (no double apply)', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', count: 0 }];
  const repo = {
    async update(id, patch) {
      const index = rows.findIndex((row) => row.id === id);
      rows[index] = { ...rows[index], ...patch };
      return rows[index];
    },
  };
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, { entity: 'learner', query: { id: 'l1' }, fetcher: async () => ({ ...rows[0] }) });
  const seen = [];
  cache.subscribe(key, () => {
    const data = cache.snapshot(key).data;
    if (data) seen.push(data.count);
  });
  await tick();

  const { result, settlement } = await runMutation(
    cache,
    key,
    'm1',
    (row) => ({ ...row, count: row.count + 1 }),
    async () => {
      const updated = await repo.update('l1', { count: rows[0].count + 1 });
      void cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] });
      return updated;
    }
  );

  assert.equal(result.count, 1);
  assert.equal(settlement.observed, true);
  assert.equal(cache.snapshot(key).data.count, 1);
  assert.equal(seen.includes(2), false, 'the layer was not applied a second time');
  assert.equal(cache.entries.get(key.hash).layers.length, 0);
});

test('an earlier successful observation survives a later failed refresh', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', count: 0 }];
  let failRefresh = false;
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, {
    entity: 'learner',
    query: { id: 'l1' },
    fetcher: async () => {
      if (failRefresh) throw new Error('later refresh failed');
      return { ...rows[0] };
    },
  });
  cache.subscribe(key, () => {});
  await tick();

  cache.applyOptimistic(key, 'm1', (row) => ({ ...row, count: row.count + 1 }));
  rows[0] = { ...rows[0], count: 1 };
  cache.markCommitted(key, 'm1');
  await cache.refetch(key);
  assert.equal(cache.snapshot(key).data.count, 1);
  assert.equal(cache.entries.get(key.hash).layers.length, 0);

  failRefresh = true;
  await cache.refetch(key);
  assert.equal(cache.snapshot(key).status, 'error');
  const settlement = await cache.whenSettled(key, 'm1');
  assert.equal(settlement.observed, true, 'the earlier success is not masked by the later error');
  assert.equal(settlement.error, null);
  assert.equal(cache.entries.get(key.hash).layers.length, 0);
});

test('a stale tagged watch payload queued during a write is rejected at commit', async () => {
  const cache = new LiveCache();
  let emitWatch;
  const key = queryKey('learner', { watch: true });
  cache.define(key, {
    entity: 'learner',
    query: {},
    mode: 'watch',
    fetcher: async () => ({ count: 0 }),
    watch: (q, emit) => {
      emitWatch = emit;
      emit({ count: 0 });
      return () => {};
    },
  });
  cache.subscribe(key, () => {});
  await tick();

  cache.applyOptimistic(key, 'm1', (row) => ({ ...row, count: row.count + 1 }));
  emitWatch({ count: 0 }, 0);
  assert.equal(cache.snapshot(key).data.count, 1, 'the queued stale payload does not drop the layer');
  cache.markCommitted(key, 'm1');

  const settlement = await cache.whenSettled(key, 'm1');
  assert.equal(settlement.observed, false);
  assert.equal(cache.snapshot(key).data.count, 1);
  assert.equal(cache.entries.get(key.hash).layers.length, 1);

  emitWatch({ count: 1 }, 1);
  assert.equal(cache.snapshot(key).data.count, 1);
  assert.equal(cache.entries.get(key.hash).layers.length, 0, 'the post-commit emission settles it');
  assert.equal((await cache.whenSettled(key, 'm1')).observed, true);
});

test('a synchronous watch emission during a write is queued, not double-applied', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', count: 0 }];
  let emitWatch;
  const key = queryKey('learner', { watch: true });
  cache.define(key, {
    entity: 'learner',
    query: {},
    mode: 'watch',
    fetcher: async () => ({ ...rows[0] }),
    watch: (q, emit) => {
      emitWatch = emit;
      emit({ ...rows[0] });
      return () => {};
    },
  });
  const seen = [];
  cache.subscribe(key, () => {
    const data = cache.snapshot(key).data;
    if (data) seen.push(data.count);
  });
  await tick();

  const { settlement } = await runMutation(
    cache,
    key,
    'm1',
    (row) => ({ ...row, count: row.count + 1 }),
    async () => {
      rows[0] = { ...rows[0], count: 1 };
      emitWatch({ ...rows[0] });
      return { ...rows[0] };
    }
  );

  assert.equal(settlement.observed, true);
  assert.equal(cache.snapshot(key).data.count, 1);
  assert.equal(seen.includes(2), false, 'the queued payload was not applied over the layer');
  assert.equal(cache.entries.get(key.hash).layers.length, 0);
});

test('a stale tagged watch payload delivered after commit is rejected', async () => {
  const cache = new LiveCache();
  let emitWatch;
  const key = queryKey('learner', { watch: true });
  cache.define(key, {
    entity: 'learner',
    query: {},
    mode: 'watch',
    fetcher: async () => ({ count: 0 }),
    watch: (q, emit) => {
      emitWatch = emit;
      emit({ count: 0 });
      return () => {};
    },
  });
  cache.subscribe(key, () => {});
  await tick();

  cache.applyOptimistic(key, 'm1', (row) => ({ ...row, count: row.count + 1 }));
  cache.markCommitted(key, 'm1');

  emitWatch({ count: 0 }, 0);
  assert.equal(cache.snapshot(key).data.count, 1, 'the stale payload is ignored');
  const settlement = await cache.whenSettled(key, 'm1');
  assert.equal(settlement.observed, false);
  assert.equal(cache.entries.get(key.hash).layers.length, 1);

  emitWatch({ count: 1 }, 1);
  assert.equal(cache.snapshot(key).data.count, 1);
  assert.equal(cache.entries.get(key.hash).layers.length, 0);
  assert.equal((await cache.whenSettled(key, 'm1')).observed, true);
});

test('out-of-order commits use a fresh sequence and do not settle each other', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', count: 0 }];
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, { entity: 'learner', query: { id: 'l1' }, fetcher: async () => ({ ...rows[0] }) });
  cache.subscribe(key, () => {});
  await tick();

  cache.applyOptimistic(key, 'a', (row) => ({ ...row, count: row.count + 10 }));
  cache.applyOptimistic(key, 'b', (row) => ({ ...row, count: row.count + 1 }));

  rows[0] = { ...rows[0], count: 1 };
  cache.markCommitted(key, 'b');
  await cache.refetch(key);
  assert.equal(cache.entries.get(key.hash).layers.length, 1, 'only b is settled');
  assert.equal(cache.snapshot(key).data.count, 11, 'a remains optimistic on top of the committed base');
  assert.equal((await cache.whenSettled(key, 'b')).observed, true);
  assert.equal((await cache.whenSettled(key, 'a')).observed, false);

  rows[0] = { ...rows[0], count: 11 };
  cache.markCommitted(key, 'a');
  await cache.refetch(key);
  assert.equal(cache.entries.get(key.hash).layers.length, 0);
  assert.equal(cache.snapshot(key).data.count, 11);
  assert.equal((await cache.whenSettled(key, 'a')).observed, true);
});

test('a deferred change event retains the layer without a stale flash', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', name: 'Old' }];
  const repo = {
    rows,
    async update(id, patch) {
      const index = rows.findIndex((row) => row.id === id);
      rows[index] = { ...rows[index], ...patch };
      return rows[index];
    },
  };
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, {
    entity: 'learner',
    query: { id: 'l1' },
    fetcher: async () => ({ ...rows[0] }),
  });
  cache.subscribe(key, () => {});
  await tick();

  let emitEvent;
  const eventEmitted = new Promise((resolve) => {
    emitEvent = () => resolve(cache.notify({ entity: 'learner', type: 'update', ids: ['l1'] }));
  });

  const { settlement } = await runMutation(
    cache,
    key,
    'm1',
    (row) => ({ ...row, name: 'New' }),
    async () => {
      const updated = await repo.update('l1', { name: 'New' });
      setTimeout(emitEvent, 5);
      return updated;
    }
  );

  assert.equal(settlement.observed, false, 'the event has not arrived yet');
  assert.equal(cache.snapshot(key).data.name, 'New', 'no flash back to the old value');
  assert.equal(cache.entries.get(key.hash).layers.length, 1);

  await eventEmitted;
  await tick();
  assert.equal(cache.snapshot(key).data.name, 'New');
  assert.equal(cache.entries.get(key.hash).layers.length, 0, 'the event settles the layer');
});

test('a rejected write rolls back the layer and rethrows', async () => {
  const cache = new LiveCache();
  const repo = makeArrayRepo([{ id: 'l1', name: 'Old' }]);
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, { entity: 'learner', query: { id: 'l1' }, fetcher: (q) => repo.list(q) });
  cache.subscribe(key, () => {});
  await tick();

  await assert.rejects(
    runMutation(
      cache,
      key,
      'm1',
      (row) => ({ ...row, name: 'Nope' }),
      async () => {
        throw new Error('denied');
      }
    ),
    /denied/
  );
  assert.equal(cache.snapshot(key).data.name, 'Old');
  assert.equal(cache.entries.get(key.hash).layers.length, 0);
});

test('settling after disposal and patching a missing entry are safe no-ops', async () => {
  const cache = new LiveCache();
  const repo = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const key = queryKey('learner', { id: 'l1' });
  cache.define(key, { entity: 'learner', query: { id: 'l1' }, fetcher: (q) => repo.list(q) });
  const off = cache.subscribe(key, () => {});
  await tick();
  cache.applyOptimistic(key, 'm1', (row) => ({ ...row, name: 'Pending' }));
  off();
  assert.equal(cache.entries.has(key.hash), false);

  assert.equal(cache.settleOptimistic(key, 'm1'), false);
  assert.deepEqual(await cache.whenSettled(key), { observed: true, error: null });

  const missing = queryKey('learner', { id: 'missing' });
  const rollback = cache.applyOptimistic(missing, 'm2', (row) => row);
  assert.equal(rollback(), false);
  assert.deepEqual(await cache.whenSettled(missing, 'm2'), { observed: true, error: null });
});

test('the last unsubscribe disposes the entry and stops refreshes', async () => {
  const cache = new LiveCache();
  const repo = makeArrayRepo([{ id: 'l1', name: 'Amani' }]);
  const key = defineList(cache, repo);
  const off = cache.subscribe(key, () => {});
  await tick();
  off();
  assert.equal(cache.entries.has(key.hash), false);

  await cache.notify({ entity: 'learner', type: 'insert', ids: ['l2'] });
  assert.equal(repo.calls, 1);
});
