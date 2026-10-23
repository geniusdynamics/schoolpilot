// ABOUTME: The permission tests of the segregation-of-duties matrix of spec 05 §11: every rule is
// ABOUTME: tested positively (the bound role may perform it) and negatively (a role holding the
// ABOUTME: maker's permission may not check, and vice versa), the real workflow guard is asked the
// ABOUTME: same question, and the repository hook is shown to consult the finance permissions.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_APPROVER_ROLES,
  assertMakerIsNotDecider,
  refundApprovalDefinition,
  writeOffApprovalDefinition,
} from '@/domain/finance/adjustments';
import {
  assertMayManageDefinitions,
  documentPosted,
  feeScheduleApproval,
  resolveMove,
  WORKFLOW_MANAGE_PERMISSION,
  type WorkflowActor,
} from '@/domain/workflows';

import { ScopePermissionError, createAuthorizer, type PermissionContext } from '../../authorizer';
import { PERMISSIONS, ROLES, hasPermission, permissionFor, type Role } from '../../roles';
import {
  FINANCE_PERMISSIONS,
  FINANCE_ROLES,
  FinanceDutyError,
  SEGREGATION_OF_DUTIES,
  assertDeciderIsNotMaker,
  assertMayPerform,
  assertSegregatedDuties,
  dutyRule,
  separationViolations,
} from '../finance';

/** The matrix roles as catalogue role keys. */
const MATRIX_ROLES: readonly Role[] = FINANCE_ROLES.map((role) => role.key);

const actor = (roles: readonly Role[]): WorkflowActor => ({ id: `user-${roles.join('-')}`, roles });

/** The permission context of an actor with a finance grant, for the authorizer tests. */
function financeContext(roles: readonly Role[]): PermissionContext {
  return {
    actorId: `user-${roles.join('-')}`,
    roles,
    scope: { institutionId: 'institution-1', grants: [{ kind: 'finance', institutionIds: ['institution-1'] }] },
    at: '2027-03-01',
  };
}

describe('the finance permissions of the catalogue', () => {
  it('names the two finance roles the matrix separates', () => {
    expect(MATRIX_ROLES).toEqual(['accounts_clerk', 'bursar', 'head_teacher', 'auditor']);
    for (const role of MATRIX_ROLES) expect(ROLES).toContain(role);
  });

  it('declares every matrix permission in the one catalogue', () => {
    for (const permission of FINANCE_PERMISSIONS) expect(PERMISSIONS).toContain(permission);
  });

  it('holds every finance permission for the administrator and none for the auditor', () => {
    for (const permission of FINANCE_PERMISSIONS) {
      expect(hasPermission(['administrator'], permission), permission).toBe(true);
      expect(hasPermission(['auditor'], permission), permission).toBe(false);
    }
  });

  it('binds the permission of every rule to the roles it names', () => {
    for (const rule of SEGREGATION_OF_DUTIES) {
      expect(rule.roles.length, rule.id).toBeGreaterThan(0);
      for (const role of rule.roles) {
        expect(hasPermission([role], rule.permission), `${role} ${rule.permission}`).toBe(true);
      }
    }
  });
});

describe('the matrix of spec 05 §11, one rule at a time', () => {
  it('receipts a payment: the clerk and the bursar, and not the head or the auditor', () => {
    expect(hasPermission(['accounts_clerk'], 'payment.receipt')).toBe(true);
    expect(hasPermission(['bursar'], 'payment.receipt')).toBe(true);
    expect(hasPermission(['head_teacher'], 'payment.receipt')).toBe(false);
    expect(hasPermission(['auditor'], 'payment.receipt')).toBe(false);
  });

  it('voids a receipt: the clerk only requests, the bursar and the head perform it', () => {
    expect(hasPermission(['accounts_clerk'], 'payment.void.request')).toBe(true);
    expect(hasPermission(['accounts_clerk'], 'payment.void')).toBe(false);
    expect(hasPermission(['bursar'], 'payment.void')).toBe(true);
    expect(hasPermission(['bursar'], 'payment.void.request')).toBe(false);
    expect(hasPermission(['head_teacher'], 'payment.void')).toBe(true);
    expect(hasPermission(['head_teacher'], 'payment.void.request')).toBe(false);
  });

  it('refunds: the clerk and the bursar request, the head approves and neither does the other', () => {
    expect(hasPermission(['accounts_clerk'], 'refund.request')).toBe(true);
    expect(hasPermission(['bursar'], 'refund.request')).toBe(true);
    expect(hasPermission(['accounts_clerk'], 'refund.approve')).toBe(false);
    expect(hasPermission(['bursar'], 'refund.approve')).toBe(false);
    expect(hasPermission(['head_teacher'], 'refund.approve')).toBe(true);
    expect(hasPermission(['head_teacher'], 'refund.request')).toBe(false);
  });

  it('writes off a balance: the clerk and the bursar request, the head approves', () => {
    expect(hasPermission(['accounts_clerk'], 'write_off.request')).toBe(true);
    expect(hasPermission(['bursar'], 'write_off.request')).toBe(true);
    expect(hasPermission(['bursar'], 'write_off.approve')).toBe(false);
    expect(hasPermission(['head_teacher'], 'write_off.approve')).toBe(true);
    expect(hasPermission(['head_teacher'], 'write_off.request')).toBe(false);
  });

  it('edits a fee schedule: the bursar prepares, the head approves, the clerk does neither', () => {
    expect(hasPermission(['bursar'], 'finance.write')).toBe(true);
    expect(hasPermission(['bursar'], 'fee_schedule.approve')).toBe(false);
    expect(hasPermission(['head_teacher'], 'fee_schedule.approve')).toBe(true);
    expect(hasPermission(['head_teacher'], 'finance.write')).toBe(false);
    expect(hasPermission(['accounts_clerk'], 'finance.write')).toBe(false);
    expect(hasPermission(['accounts_clerk'], 'fee_schedule.approve')).toBe(false);
  });

  it('posts a billing run: the bursar posts, the head approves above the threshold', () => {
    expect(hasPermission(['bursar'], 'billing.post')).toBe(true);
    expect(hasPermission(['bursar'], 'billing.post.approve')).toBe(false);
    expect(hasPermission(['head_teacher'], 'billing.post.approve')).toBe(true);
    expect(hasPermission(['head_teacher'], 'billing.post')).toBe(false);
    expect(hasPermission(['accounts_clerk'], 'billing.post')).toBe(false);
  });

  it('closes a period: the bursar prepares, the head approves, the clerk does neither', () => {
    expect(hasPermission(['bursar'], 'period.close.prepare')).toBe(true);
    expect(hasPermission(['bursar'], 'period.close.approve')).toBe(false);
    expect(hasPermission(['head_teacher'], 'period.close.approve')).toBe(true);
    expect(hasPermission(['head_teacher'], 'period.close.prepare')).toBe(false);
    expect(hasPermission(['accounts_clerk'], 'period.close.prepare')).toBe(false);
  });

  it('grants a discount: the bursar grants, the head approves, the clerk does neither', () => {
    expect(hasPermission(['bursar'], 'discount.grant')).toBe(true);
    expect(hasPermission(['bursar'], 'discount.approve')).toBe(false);
    expect(hasPermission(['head_teacher'], 'discount.approve')).toBe(true);
    expect(hasPermission(['head_teacher'], 'discount.grant')).toBe(false);
    expect(hasPermission(['accounts_clerk'], 'discount.grant')).toBe(false);
  });

  it('manages the workflow catalogue: the administrator and the head, and no other matrix role', () => {
    expect(hasPermission(['administrator'], WORKFLOW_MANAGE_PERMISSION)).toBe(true);
    expect(hasPermission(['head_teacher'], WORKFLOW_MANAGE_PERMISSION)).toBe(true);
    expect(hasPermission(['bursar'], WORKFLOW_MANAGE_PERMISSION)).toBe(false);
    expect(hasPermission(['accounts_clerk'], WORKFLOW_MANAGE_PERMISSION)).toBe(false);
    expect(hasPermission(['auditor'], WORKFLOW_MANAGE_PERMISSION)).toBe(false);
  });
});

describe('the separation is impossible for one person', () => {
  it('splits every maker/checker pair across disjoint roles', () => {
    for (const rule of SEGREGATION_OF_DUTIES) {
      if (rule.separatedFrom === undefined) continue;
      const other = SEGREGATION_OF_DUTIES.find(
        (candidate) => candidate.permission === rule.separatedFrom
      );
      expect(other, `${rule.id} names a rule for ${rule.separatedFrom}`).toBeDefined();
      if (!other) continue;
      const overlap = rule.roles.filter((role) => other.roles.includes(role));
      expect(overlap, `${rule.id} and ${other.id}`).toEqual([]);
    }
  });

  it('leaves no matrix role holding both sides of any pair', () => {
    for (const rule of SEGREGATION_OF_DUTIES) {
      if (rule.separatedFrom === undefined) continue;
      for (const role of MATRIX_ROLES) {
        expect(separationViolations([role], rule), `${role} on ${rule.id}`).toEqual([]);
      }
    }
  });

  it('refuses a role set that holds both sides, and admits one that holds a side', () => {
    const rule = dutyRule('refund.request');
    expect(() => assertSegregatedDuties(['accounts_clerk'], rule)).not.toThrow();
    expect(() => assertSegregatedDuties(['head_teacher'], rule)).not.toThrow();

    const error = (() => {
      try {
        assertSegregatedDuties(['accounts_clerk', 'head_teacher'], rule);
        return null;
      } catch (caught) {
        return caught as FinanceDutyError;
      }
    })();
    expect(error?.code).toBe('permission');
    expect(error?.ruleId).toBe('refund.request');
    expect(error?.message).toContain('refund.request');
    expect(error?.message).toContain('refund.approve');
  });

  it('admits a bound role and refuses the auditor for every rule', () => {
    for (const rule of SEGREGATION_OF_DUTIES) {
      expect(() => assertMayPerform(rule.roles, rule), rule.id).not.toThrow();
      expect(() => assertMayPerform(['auditor'], rule), rule.id).toThrowError(FinanceDutyError);
    }
  });

  it('documents the one role the catalogue has merged', () => {
    // The legacy `accountant` is the bursar and the accounts clerk in one bundle: it holds both
    // `finance.write` and `fee_schedule.approve`, so it could prepare and approve a fee schedule.
    // The fee-schedule gateway's maker-may-not-decide rule is what stops one person doing both; the
    // matrix roles the catalogue separates - accounts_clerk, bursar, head_teacher, auditor - are
    // separated. This test pins the exception so it cannot be mistaken for a separation.
    expect(hasPermission(['accountant'], 'finance.write')).toBe(true);
    expect(hasPermission(['accountant'], 'fee_schedule.approve')).toBe(true);
    expect(separationViolations(['accountant'], dutyRule('fee_schedule.prepare'))).toEqual([
      'accountant',
    ]);
  });
});

describe('the identity rule the engine cannot carry', () => {
  it('refuses the maker deciding their own request', () => {
    expect(() => assertDeciderIsNotMaker('user-1', 'user-1', 'refund R-1')).toThrowError(
      FinanceDutyError
    );
    expect(() => assertDeciderIsNotMaker('user-1', 'user-2', 'refund R-1')).not.toThrow();
    expect(() => assertDeciderIsNotMaker(null, 'user-2', 'refund R-1')).not.toThrow();
  });

  it('agrees with the adjustments module, which enforces the same rule itself', () => {
    expect(() => assertMakerIsNotDecider('user-1', 'user-1', 'refund R-1')).toThrowError(
      /other than the person who requested/
    );
    expect(() => assertDeciderIsNotMaker('user-1', 'user-1', 'refund R-1')).toThrowError(
      /other than the person who requested/
    );
  });
});

describe('the workflow guard enforces the same separation', () => {
  it('refuses the clerk and the bursar a refund approval, and admits the head', () => {
    const definition = refundApprovalDefinition();
    const move = (roles: readonly Role[]) =>
      resolveMove(definition, {
        recordKey: 'refund-1',
        from: 'requested',
        to: 'approved',
        actor: actor(roles),
      });

    expect(move(['accounts_clerk'])).toMatchObject({ allowed: false, code: 'forbidden' });
    expect(move(['bursar'])).toMatchObject({ allowed: false, code: 'forbidden' });
    expect(move(['head_teacher'])).toMatchObject({ allowed: true });
  });

  it('refuses the clerk and the bursar a write-off approval, and admits the head', () => {
    const definition = writeOffApprovalDefinition();
    const move = (roles: readonly Role[]) =>
      resolveMove(definition, {
        recordKey: 'write-off-1',
        from: 'requested',
        to: 'approved',
        actor: actor(roles),
      });

    expect(move(['accounts_clerk'])).toMatchObject({ allowed: false, code: 'forbidden' });
    expect(move(['bursar'])).toMatchObject({ allowed: false, code: 'forbidden' });
    expect(move(['head_teacher'])).toMatchObject({ allowed: true });
  });

  it('refuses the bursar a fee-schedule approval, and admits the head', () => {
    const move = (roles: readonly Role[]) =>
      resolveMove(feeScheduleApproval, {
        recordKey: 'schedule-1',
        from: 'submitted',
        to: 'approved',
        actor: actor(roles),
      });

    expect(move(['bursar'])).toMatchObject({ allowed: false, code: 'forbidden' });
    expect(move(['accounts_clerk'])).toMatchObject({ allowed: false, code: 'forbidden' });
    expect(move(['head_teacher'])).toMatchObject({ allowed: true });
  });

  it('refuses the clerk a receipt void, and admits the bursar', () => {
    const move = (roles: readonly Role[]) =>
      resolveMove(documentPosted, {
        recordKey: 'receipt-1',
        from: 'posted',
        to: 'void',
        actor: actor(roles),
        reason: 'taken in error',
      });

    expect(move(['accounts_clerk'])).toMatchObject({ allowed: false, code: 'forbidden' });
    expect(move(['bursar'])).toMatchObject({ allowed: true });
    expect(move(['head_teacher'])).toMatchObject({ allowed: true });
  });

  it('refuses the bursar the workflow catalogue, and admits the administrator', () => {
    expect(() => assertMayManageDefinitions(actor(['administrator']))).not.toThrow();
    expect(() => assertMayManageDefinitions(actor(['bursar']))).toThrowError(
      /do not hold workflow.manage/
    );
    expect(() => assertMayManageDefinitions(actor(['accounts_clerk']))).toThrowError(
      /do not hold workflow.manage/
    );
  });
});

describe('the catalogue agrees with the finance modules', () => {
  it('binds refund.approve to exactly the module approver roles', () => {
    const holders = ROLES.filter((role) => hasPermission([role], 'refund.approve')).sort();
    expect(holders).toEqual([...DEFAULT_APPROVER_ROLES].sort());
  });

  it('binds write_off.approve to exactly the module approver roles', () => {
    const holders = ROLES.filter((role) => hasPermission([role], 'write_off.approve')).sort();
    expect(holders).toEqual([...DEFAULT_APPROVER_ROLES].sort());
  });
});

describe('the repository hook consults the finance permissions', () => {
  it('needs payment.receipt to create a payment, its allocations and its receipt', () => {
    expect(permissionFor('payment', 'create')).toBe('payment.receipt');
    expect(permissionFor('payment_allocation', 'create')).toBe('payment.receipt');
    expect(permissionFor('receipt', 'create')).toBe('payment.receipt');
  });

  it('needs payment.void to update a receipt, and keeps the pair for every other write', () => {
    expect(permissionFor('receipt', 'update')).toBe('payment.void');
    expect(permissionFor('payment', 'read')).toBe('finance.read');
    expect(permissionFor('invoice', 'create')).toBe('finance.write');
    expect(permissionFor('refund', 'update')).toBe('finance.write');
  });

  it('refuses the head a counter payment through the authorizer and admits the clerk', () => {
    const create = (roles: readonly Role[]) =>
      createAuthorizer(financeContext(roles))({
        entity: 'payment',
        action: 'create',
        row: { institution_id: 'institution-1' },
      });

    expect(() => create(['accounts_clerk'])).not.toThrow();
    expect(() => create(['bursar'])).not.toThrow();
    expect(() => create(['head_teacher'])).toThrowError(ScopePermissionError);
    expect(() => create(['head_teacher'])).toThrowError(/do not hold payment.receipt/);
  });

  it('refuses the clerk a receipt void through the authorizer and admits the bursar', () => {
    const voidReceipt = (roles: readonly Role[]) =>
      createAuthorizer(financeContext(roles))({
        entity: 'receipt',
        action: 'update',
        row: { institution_id: 'institution-1' },
      });

    expect(() => voidReceipt(['accounts_clerk'])).toThrowError(/do not hold payment.void/);
    expect(() => voidReceipt(['bursar'])).not.toThrow();
    expect(() => voidReceipt(['head_teacher'])).not.toThrow();
  });
});

describe('the rows the code cannot yet enforce', () => {
  it('names a gap for every rule with no gate, and only for those', () => {
    for (const rule of SEGREGATION_OF_DUTIES) {
      if (rule.mechanism === 'none') expect(rule.gap, rule.id).toBeTruthy();
      else expect(rule.enforcedBy, rule.id).toBeTruthy();
    }
  });

  it('counts the unenforced rows of the matrix', () => {
    const unenforced = SEGREGATION_OF_DUTIES.filter((rule) => rule.mechanism === 'none').map(
      (rule) => rule.id
    );
    expect(unenforced).toEqual([
      'billing.post',
      'billing.post.approve',
      'period.close.prepare',
      'period.close.approve',
      'discount.grant',
      'discount.approve',
    ]);
  });
});
