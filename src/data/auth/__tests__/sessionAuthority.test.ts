// ABOUTME: Proves the browser's write authority: unchecked before sign-in, judged by the signed-in
// ABOUTME: actor's roles after it, refused after sign-out, and open again only inside runAsSystem.

import { afterEach, describe, expect, it } from 'vitest';

import type { AuthorizationRequest } from '@/data/repository';
import { ScopePermissionError } from '../authorizer';
import type { PermissionContext } from '../authorizer';
import { bindSessionAuthority, can, clearSessionAuthority, runAsSystem, sessionAuthorizer } from '../sessionAuthority';
import type { Role } from '../roles';

function contextWith(roles: readonly Role[]): PermissionContext {
  return {
    actorId: 'user-1',
    roles,
    scope: { institutionId: 'school-1', grants: [] },
    at: '2026-11-02',
  };
}

const write = (entity: AuthorizationRequest['entity'], action: 'create' | 'update' | 'remove' = 'create'): AuthorizationRequest => ({
  entity,
  action,
});

/** The authority is module state: every test starts from a signed-out tab. */
afterEach(() => {
  clearSessionAuthority();
});

describe('the browser write authority', () => {
  it('checks nothing at boot, so the setup wizard and the demo seed can write before anyone signs in', () => {
    expect(() => sessionAuthorizer(write('class_group'))).not.toThrow();
    expect(can('institution.write')).toBe(true);
  });

  it('lets a signed-in teacher write a mark, which is their work', () => {
    bindSessionAuthority(contextWith(['teacher', 'class_teacher']));
    expect(() => sessionAuthorizer(write('mark'))).not.toThrow();
  });

  it('refuses a signed-in teacher deleting a learning area, naming the permission', () => {
    bindSessionAuthority(contextWith(['teacher']));
    let error: unknown;
    try {
      sessionAuthorizer(write('learning_area', 'remove'));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ScopePermissionError);
    expect((error as ScopePermissionError).reason).toBe('permission');
    // Learning areas live in the shared reference catalogue, so the permission that guards them is
    // `reference.write`; the denial names it so the log says what the teacher lacked.
    expect((error as ScopePermissionError).detail).toContain('reference.write');
  });

  it('denies a finance login the school configuration it does not administer, while letting it write fees', () => {
    bindSessionAuthority(contextWith(['bursar']));
    // A bursar holds `finance.write` and `reference.read` only: the learning areas are the school's
    // configuration, not the cashier's.
    expect(() => sessionAuthorizer(write('fee_schedule'))).not.toThrow();
    expect(() => sessionAuthorizer(write('learning_area'))).toThrow(ScopePermissionError);
    expect(can('reference.write')).toBe(false);
  });

  it('lets every read through, whatever the role, so a page is never emptied by the write rule', () => {
    bindSessionAuthority(contextWith([]));
    for (const action of ['read', 'list', 'watch', 'audit'] as const) {
      expect(() => sessionAuthorizer({ entity: 'fee_item', action })).not.toThrow();
    }
  });

  it('refuses a write after sign-out, naming the reason', () => {
    bindSessionAuthority(contextWith(['administrator']));
    clearSessionAuthority();

    let error: unknown;
    try {
      sessionAuthorizer(write('class_group'));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ScopePermissionError);
    expect((error as ScopePermissionError).reason).toBe('no_context');
    expect(can('class.write')).toBe(false);
  });

  it('opens writes for a system writer and closes them again afterwards', async () => {
    bindSessionAuthority(contextWith(['teacher']));
    await runAsSystem(async () => {
      expect(() => sessionAuthorizer(write('learning_area'))).not.toThrow();
    });
    expect(() => sessionAuthorizer(write('learning_area'))).toThrow(ScopePermissionError);
  });

  it('restores the actor even when the system writer throws', async () => {
    bindSessionAuthority(contextWith(['teacher']));
    await expect(
      runAsSystem(async () => {
        throw new Error('the seed failed');
      })
    ).rejects.toThrow('the seed failed');
    expect(() => sessionAuthorizer(write('learning_area'))).toThrow(ScopePermissionError);
  });
});
