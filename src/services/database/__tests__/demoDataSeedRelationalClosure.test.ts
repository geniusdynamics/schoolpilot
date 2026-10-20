// ABOUTME: Guards that the demo seed is relationally closed at every volume under strict (CI) validation.
// ABOUTME: Repeats randomized sampling many times so a missing parent record cannot hide behind luck.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IDatabaseProvider } from '../interfaces';
import { seedProviderWithDemoData, validateRelationships } from '../demoDataSeed';

const VOLUMES = ['tiny', 'small', 'medium', 'large', 'enterprise'] as const;
const ITERATIONS = 20;

// Minimal in-memory provider: records every insert so seeding can run end to end.
const createCapturingProvider = (): IDatabaseProvider => {
  const store = new Map<string, any[]>();
  const collections = new Map<string, any>();
  const makeCollection = (name: string) => ({
    insertMany: async (docs: any[]) => {
      store.set(name, [...(store.get(name) ?? []), ...docs]);
      return [];
    },
    count: async () => (store.get(name) ?? []).length,
    clear: async () => {
      store.set(name, []);
    }
  });
  return {
    name: 'relational-closure-memory',
    getCollection: (name: string) => collections.get(name) ?? null,
    createCollection: async (name: string) => {
      const collection = makeCollection(name);
      collections.set(name, collection);
      return collection;
    }
  } as unknown as IDatabaseProvider;
};

describe('demoDataSeed relational closure', () => {
  beforeEach(() => {
    vi.stubEnv('CI', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(VOLUMES)('sampled seed at volume %s has zero relationship errors across repeated samples', async (volume) => {
    for (let i = 0; i < ITERATIONS; i++) {
      const result = await validateRelationships(undefined, volume);
      expect(result.errors, `volume=${volume} iteration=${i}`).toEqual([]);
    }
  });

  it.each(VOLUMES)('strict seeding at volume %s resolves for all modules', async (volume) => {
    for (let i = 0; i < ITERATIONS; i++) {
      await expect(
        seedProviderWithDemoData(createCapturingProvider(), { volume, clearExisting: true })
      ).resolves.toMatchObject({ insertedCounts: expect.any(Object) });
    }
  });

  it.each([
    [['administration', 'academics']],
    [['academics']],
    [['finance']],
    [['inventory']],
    [['library']]
  ])('strict seeding with module filter %j resolves at every volume', async (modules) => {
    for (const volume of VOLUMES) {
      for (let i = 0; i < 5; i++) {
        await expect(
          seedProviderWithDemoData(createCapturingProvider(), { modules, volume, clearExisting: true })
        ).resolves.toMatchObject({ insertedCounts: expect.any(Object) });
      }
    }
  });
});
