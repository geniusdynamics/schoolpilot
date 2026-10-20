// ABOUTME: Tests the DR-04 lookup spike: loading, empty, error, archived resolution and live refresh.
// ABOUTME: Run with: node --test docs/prd/workflow-log/decisions/spikes/DR-04/lookup.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveCache, queryKey } from './cache.mjs';
import { createLookup, lookupState } from './lookup.mjs';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function defineLookup(cache, repo, options = {}) {
  const key = queryKey('learner', { lookup: true, includeArchived: Boolean(options.includeArchived) });
  cache.define(key, {
    entity: 'learner',
    query: {},
    fetcher: async () => {
      const page = await repo.list(options);
      return createLookup(page.items, options);
    },
  });
  return key;
}

test('lookup state is explicit while loading, then success', async () => {
  const cache = new LiveCache();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const repo = {
    async list() {
      await gate;
      return { items: [{ id: 'l1', name: 'Amani' }], total: 1, hasMore: false };
    },
  };
  const key = defineLookup(cache, repo);
  cache.subscribe(key, () => {});
  await tick();

  let state = lookupState(cache, key);
  assert.equal(state.status, 'loading');
  assert.equal(state.isFetching, true);
  assert.equal(state.error, null);
  assert.equal(state.options.length, 0, 'no options before the list arrives');
  assert.equal(state.label('l1', 'Unknown'), 'Unknown', 'label falls back while loading');

  release();
  await tick();
  state = lookupState(cache, key);
  assert.equal(state.status, 'success');
  assert.equal(state.isFetching, false);
  assert.deepEqual(state.options, [{ value: 'l1', label: 'Amani' }]);
});

test('lookup error is exposed, options stay empty and labels fall back', async () => {
  const cache = new LiveCache();
  const key = queryKey('learner', { lookup: true });
  cache.define(key, {
    entity: 'learner',
    query: {},
    fetcher: async () => {
      throw new Error('lookup unavailable');
    },
  });
  cache.subscribe(key, () => {});
  await tick();

  const state = lookupState(cache, key);
  assert.equal(state.status, 'error');
  assert.equal(state.error.message, 'lookup unavailable');
  assert.equal(state.options.length, 0);
  assert.equal(state.label('l1', 'Unknown'), 'Unknown');
  assert.equal(state.byId.size, 0);
});

test('an empty lookup is success, not loading or error', async () => {
  const cache = new LiveCache();
  const key = queryKey('learner', { lookup: true, empty: true });
  cache.define(key, {
    entity: 'learner',
    query: {},
    fetcher: async () => createLookup([]),
  });
  cache.subscribe(key, () => {});
  await tick();

  const state = lookupState(cache, key);
  assert.equal(state.status, 'success');
  assert.equal(state.error, null);
  assert.equal(state.isFetching, false);
  assert.deepEqual(state.options, []);
  assert.equal(state.byId.size, 0);
  assert.equal(state.label('missing', 'N/A'), 'N/A');
});

test('archived rows stay resolvable and labelled, but leave picker options by default', () => {
  const rows = [
    { id: 'g1', name: 'Grade 7', archived: true },
    { id: 'g2', name: 'Grade 8' },
  ];

  const current = createLookup(rows);
  assert.deepEqual(current.options, [{ value: 'g2', label: 'Grade 8' }]);
  assert.equal(current.resolve('g1').name, 'Grade 7');
  assert.equal(current.label('g1'), 'Grade 7 (archived)');
  assert.equal(current.label('missing', 'N/A'), 'N/A');

  const withArchived = createLookup(rows, { includeArchived: true });
  assert.equal(withArchived.options.length, 2);
  assert.equal(withArchived.options.find((option) => option.value === 'g1').label, 'Grade 7 (archived)');

  const legacy = createLookup([{ _id: 'g3', name: 'Legacy grade' }], { idField: '_id' });
  assert.equal(legacy.byId.get('g3').name, 'Legacy grade');
  assert.deepEqual(legacy.options, [{ value: 'g3', label: 'Legacy grade' }]);
});

test('a lookup reads Page.items, not the Page wrapper', async () => {
  const cache = new LiveCache();
  const repo = {
    async list() {
      return { items: [{ id: 'l1', name: 'Amani' }], total: 1, hasMore: false };
    },
  };
  const key = defineLookup(cache, repo);
  cache.subscribe(key, () => {});
  await tick();

  const state = lookupState(cache, key);
  assert.equal(state.status, 'success');
  assert.equal(state.options.length, 1, 'the Page wrapper is not treated as a row list');
  assert.deepEqual(state.options, [{ value: 'l1', label: 'Amani' }]);
});

test('a lookup refreshes through the cache after a write event', async () => {
  const cache = new LiveCache();
  const rows = [{ id: 'l1', name: 'Amani' }];
  const repo = {
    async list() {
      const items = rows.map((row) => ({ ...row }));
      return { items, total: items.length, hasMore: false };
    },
  };
  const key = defineLookup(cache, repo);
  cache.subscribe(key, () => {});
  await tick();
  assert.equal(lookupState(cache, key).options.length, 1);

  rows.push({ id: 'l2', name: 'Baraka' });
  await cache.notify({ entity: 'learner', type: 'insert', ids: ['l2'] });
  const state = lookupState(cache, key);
  assert.equal(state.status, 'success');
  assert.equal(state.options.length, 2);
  assert.equal(state.label('l2'), 'Baraka');
});
