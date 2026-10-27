// ABOUTME: What the Settings overview says about the installation: how many people can sign in, whether an administrator can,
// ABOUTME: whether the school profile is set, what runs, and whether the browser keeps the data. It judges the facts it is given.

import { isUserRowActive } from '@/services/auth/accessRules';

import { isAdministratorRow, type UserRow } from './userDisplay';

/** How the browser is keeping the school's data. */
export interface StorageStatus {
  readonly mode: string;
  readonly persisted: boolean | null;
}

export type StorageVerdict = 'durable' | 'at-risk' | 'unknown';

/**
 * Whether the browser keeps the data durably. Data held in memory is lost when the tab closes, storage
 * that is unavailable saves nothing, and a browser that refused persistent storage may clear the data
 * when space runs low. Storage that is not open yet is not judged: that is a moment, not a fault.
 */
export function judgeStorage(status: StorageStatus): StorageVerdict {
  if (status.mode === 'memory' || status.mode === 'unavailable' || status.persisted === false) return 'at-risk';
  if (status.mode === 'uninitialised') return 'unknown';
  return 'durable';
}

export interface ModuleCounts {
  readonly total: number;
  readonly running: number;
  readonly withProblems: number;
}

export interface OverviewFacts {
  readonly users: { readonly total: number; readonly active: number; readonly activeAdministrators: number };
  readonly profileSet: boolean;
  readonly modules: ModuleCounts;
  readonly storage: StorageVerdict;
}

export interface OverviewInput {
  readonly users: readonly UserRow[];
  /** The school profile as the app holds it: anything but null or undefined means one is set. */
  readonly schoolProfile: unknown;
  readonly modules: ModuleCounts;
  readonly storage: StorageStatus;
}

export function factsOf(input: OverviewInput): OverviewFacts {
  const active = input.users.filter(isUserRowActive);
  return {
    users: {
      total: input.users.length,
      active: active.length,
      activeAdministrators: active.filter(isAdministratorRow).length,
    },
    profileSet: input.schoolProfile !== null && input.schoolProfile !== undefined,
    modules: input.modules,
    storage: judgeStorage(input.storage),
  };
}

export type AttentionCode = 'no-administrator' | 'storage-at-risk' | 'no-profile' | 'module-problems';

export interface Attention {
  readonly code: AttentionCode;
  readonly severity: 'high' | 'warning';
  /** Where to go to deal with it. */
  readonly to: string;
}

/** What needs a look, the serious first. The page words each item; this decides which there are. */
export function whatNeedsAttention(facts: OverviewFacts): Attention[] {
  const items: Attention[] = [];

  if (facts.users.total > 0 && facts.users.activeAdministrators === 0) {
    items.push({ code: 'no-administrator', severity: 'high', to: '/settings/school?tab=users' });
  }
  if (facts.storage === 'at-risk') {
    items.push({ code: 'storage-at-risk', severity: 'high', to: '/settings/system?tab=health' });
  }
  if (!facts.profileSet) {
    items.push({ code: 'no-profile', severity: 'warning', to: '/settings/school' });
  }
  if (facts.modules.withProblems > 0) {
    items.push({ code: 'module-problems', severity: 'warning', to: '/settings/modules' });
  }

  return items;
}
