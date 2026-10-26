// ABOUTME: What the Settings overview says about the installation: how many people can sign in, whether an administrator can,
// ABOUTME: whether the school profile is set, what runs, and whether the browser keeps the data. It judges the facts it is given.

import { describe, expect, it } from 'vitest';

import { factsOf, judgeStorage, whatNeedsAttention, type OverviewFacts } from '../overview';

describe('judgeStorage', () => {
  it('calls persistent storage with persistence granted durable', () => {
    expect(judgeStorage({ mode: 'opfs-sahpool', persisted: true })).toBe('durable');
  });

  it('calls persistent storage durable while the browser has not said whether it persists', () => {
    expect(judgeStorage({ mode: 'opfs-sahpool', persisted: null })).toBe('durable');
  });

  it('puts data held in memory, storage that is unavailable, and refused persistence at risk', () => {
    expect(judgeStorage({ mode: 'memory', persisted: null })).toBe('at-risk');
    expect(judgeStorage({ mode: 'unavailable', persisted: null })).toBe('at-risk');
    expect(judgeStorage({ mode: 'opfs-sahpool', persisted: false })).toBe('at-risk');
  });

  it('does not judge storage that has not been opened yet', () => {
    expect(judgeStorage({ mode: 'uninitialised', persisted: null })).toBe('unknown');
  });
});

const MODULES = { total: 11, running: 11, withProblems: 0 };
const HEALTHY_STORAGE = { mode: 'opfs-sahpool', persisted: true };

describe('factsOf', () => {
  it('counts the logins, the ones that can sign in, and the active administrators', () => {
    const facts = factsOf({
      users: [
        { role: 'super_admin', is_active: 1 },
        { role_id: 'administrator', is_active: 1 },
        { role_id: 'teacher', is_active: 1 },
        { role_id: 'administrator', is_active: 0 },
        { role: 'teacher' },
      ],
      schoolProfile: { name: 'Hillside' },
      modules: MODULES,
      storage: HEALTHY_STORAGE,
    });

    expect(facts.users).toEqual({ total: 5, active: 3, activeAdministrators: 2 });
  });

  it('reads a login written the older way, with isActive', () => {
    const facts = factsOf({
      users: [{ role: 'administrator', isActive: true }],
      schoolProfile: {},
      modules: MODULES,
      storage: HEALTHY_STORAGE,
    });

    expect(facts.users.activeAdministrators).toBe(1);
  });

  it('says whether a school profile is set', () => {
    const base = { users: [], modules: MODULES, storage: HEALTHY_STORAGE };

    expect(factsOf({ ...base, schoolProfile: { name: 'Hillside' } }).profileSet).toBe(true);
    expect(factsOf({ ...base, schoolProfile: null }).profileSet).toBe(false);
    expect(factsOf({ ...base, schoolProfile: undefined }).profileSet).toBe(false);
  });

  it('carries the module counts, and a verdict on the storage', () => {
    const facts = factsOf({ users: [], schoolProfile: {}, modules: MODULES, storage: { mode: 'memory', persisted: null } });

    expect(facts.modules).toEqual(MODULES);
    expect(facts.storage).toBe('at-risk');
  });
});

const SOUND: OverviewFacts = {
  users: { total: 3, active: 3, activeAdministrators: 1 },
  profileSet: true,
  modules: MODULES,
  storage: 'durable',
};

describe('whatNeedsAttention', () => {
  it('has nothing to say about an installation in order', () => {
    expect(whatNeedsAttention(SOUND)).toEqual([]);
  });

  it('says no administrator can sign in, and sends you to the users', () => {
    expect(whatNeedsAttention({ ...SOUND, users: { total: 3, active: 3, activeAdministrators: 0 } })).toEqual([
      { code: 'no-administrator', severity: 'high', to: '/settings/school?tab=users' },
    ]);
  });

  it('does not say it of a school with no logins at all', () => {
    expect(whatNeedsAttention({ ...SOUND, users: { total: 0, active: 0, activeAdministrators: 0 } })).toEqual([]);
  });

  it('says the school profile is not set, and sends you to it', () => {
    expect(whatNeedsAttention({ ...SOUND, profileSet: false })).toEqual([
      { code: 'no-profile', severity: 'warning', to: '/settings/school' },
    ]);
  });

  it('says the browser is not keeping the data safely, and sends you to System Health', () => {
    expect(whatNeedsAttention({ ...SOUND, storage: 'at-risk' })).toEqual([
      { code: 'storage-at-risk', severity: 'high', to: '/settings/system?tab=health' },
    ]);
  });

  it('does not worry about storage that has not been opened yet', () => {
    expect(whatNeedsAttention({ ...SOUND, storage: 'unknown' })).toEqual([]);
  });

  it('says modules have dependency problems, and sends you to the modules', () => {
    expect(whatNeedsAttention({ ...SOUND, modules: { total: 11, running: 11, withProblems: 2 } })).toEqual([
      { code: 'module-problems', severity: 'warning', to: '/settings/modules' },
    ]);
  });

  it('puts what is serious ahead of what is only worth a look', () => {
    const codes = whatNeedsAttention({
      users: { total: 3, active: 3, activeAdministrators: 0 },
      profileSet: false,
      modules: { total: 11, running: 11, withProblems: 1 },
      storage: 'at-risk',
    }).map((item) => item.code);

    expect(codes).toEqual(['no-administrator', 'storage-at-risk', 'no-profile', 'module-problems']);
  });
});
