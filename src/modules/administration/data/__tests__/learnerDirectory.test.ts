// ABOUTME: Repository-backed tests for the learner directory: admitting a learner with a guardian
// ABOUTME: writes the learner, the guardian, the primary link and the enrolment in one transaction,
// ABOUTME: and editing a learner adds a guardian the same way.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';
import { asId, type Id } from '@/domain/ids';

import {
  admitLearner,
  learnerUpdateInput,
  updateLearner,
  type LearnerFormValues,
} from '../useCanonicalLearners';

let context: TestContext;

beforeEach(async () => {
  context = await createTestContext();
});

afterEach(async () => {
  await closeTestContext(context);
});

/** The learner an admit form collects. */
function learnerValues(overrides: Partial<LearnerFormValues> = {}): LearnerFormValues {
  return {
    admission_no: 'GA/2027/501',
    first_name: 'Zawadi',
    last_name: 'Otieno',
    gender: 'Female',
    status: 'Active',
    admission_date: '2027-01-05',
    ...overrides,
  };
}

const institutionId = (): Id<'institution'> => context.seed.idOf('institution');
const classGroupId = (): Id<'class_group'> => context.seed.idOf('class_group');

describe('the learner directory admits and edits with a guardian', () => {
  it('writes the learner, the guardian, the primary link and the enrolment together', async () => {
    const result = await admitLearner(context.repository, {
      institutionId: institutionId(),
      values: learnerValues(),
      guardian: { name: 'Grace Otieno', phone: '+254711222333', relationship: 'Mother' },
      placement: { classGroupId: classGroupId(), startDate: '2027-01-05' },
    });

    const learner = await context.repository.get('learner', asId<'learner'>(result.learnerId));
    expect(learner?.admission_number).toBe('GA/2027/501');
    expect(learner?.given_name).toBe('Zawadi');

    const guardians = await context.repository.list('guardian', {
      where: { institution_id: institutionId() },
      limit: 10,
    });
    const guardian = guardians.items.find((row) => row.family_name === 'Otieno');
    expect(guardian).toBeDefined();
    expect(guardian?.given_name).toBe('Grace');
    expect(guardian?.phones?.[0]?.number).toBe('+254711222333');

    const links = await context.repository.list('learner_guardian', {
      where: { learner_id: result.learnerId },
      limit: 10,
    });
    expect(links.items).toHaveLength(1);
    expect(links.items[0]?.guardian_id).toBe(guardian?.id);
    expect(links.items[0]?.relationship).toBe('mother');
    expect(links.items[0]?.is_primary).toBe(true);

    const enrolment = await context.repository.get(
      'enrolment',
      asId<'enrolment'>(result.enrolmentId as string)
    );
    expect(enrolment?.learner_id).toBe(result.learnerId);
    expect(enrolment?.class_group_id).toBe(classGroupId());
  });

  it('links a guardian the school already knows instead of copying them', async () => {
    const first = await admitLearner(context.repository, {
      institutionId: institutionId(),
      values: learnerValues({ admission_no: 'GA/2027/502', first_name: 'Amani' }),
      guardian: { name: 'Grace Otieno', phone: '+254711222333', relationship: 'Mother' },
      placement: { classGroupId: classGroupId() },
    });

    const second = await admitLearner(context.repository, {
      institutionId: institutionId(),
      values: learnerValues({ admission_no: 'GA/2027/503', first_name: 'Baraka' }),
      // The same number written with separators: the de-duplication compares the digits.
      guardian: { name: 'Grace Otieno', phone: '+254 711 222 333', relationship: 'Mother' },
      placement: { classGroupId: classGroupId() },
    });

    const guardians = await context.repository.list('guardian', {
      where: { family_name: 'Otieno' },
      limit: 10,
    });
    expect(guardians.items.map((row) => [row.given_name, row.phones?.[0]?.number])).toEqual([
      ['Grace', '+254711222333'],
    ]);

    const links = await context.repository.list('learner_guardian', {
      where: { guardian_id: guardians.items[0]?.id ?? '' },
      limit: 10,
    });
    expect(links.items.map((link) => link.learner_id).sort()).toEqual(
      [first.learnerId, second.learnerId].sort()
    );
  });

  it('adds a guardian when a learner without one is edited', async () => {
    const admitted = await admitLearner(context.repository, {
      institutionId: institutionId(),
      values: learnerValues({ admission_no: 'GA/2027/504' }),
      placement: { classGroupId: classGroupId() },
    });

    const before = await context.repository.list('learner_guardian', {
      where: { learner_id: admitted.learnerId },
      limit: 10,
    });
    expect(before.total).toBe(0);

    const learner = await context.repository.get('learner', asId<'learner'>(admitted.learnerId));
    expect(learner).not.toBeNull();

    await updateLearner(context.repository, {
      learner: learner!,
      values: learnerValues({ admission_no: 'GA/2027/504', first_name: 'Zawadi' }),
      guardian: { name: 'Peter Otieno', phone: '+254733444555', relationship: 'Father' },
      placement: { classGroupId: classGroupId() },
    });

    const guardians = await context.repository.list('guardian', {
      where: { family_name: 'Otieno' },
      limit: 10,
    });
    const guardian = guardians.items.find((row) => row.given_name === 'Peter');
    expect(guardian).toBeDefined();
    expect(guardian?.phones?.[0]?.number).toBe('+254733444555');

    const links = await context.repository.list('learner_guardian', {
      where: { learner_id: admitted.learnerId },
      limit: 10,
    });
    expect(links.items).toHaveLength(1);
    expect(links.items[0]?.guardian_id).toBe(guardian?.id);
    expect(links.items[0]?.relationship).toBe('father');
    expect(links.items[0]?.is_primary).toBe(true);
  });

  it('rolls the whole admission back when a later write fails', async () => {
    const values = learnerValues({ admission_no: 'GA/2027/505', upi_no: 'UPI-CLAIMED' });

    // A national identifier another owner already holds: the identifier write is refused after
    // the learner row has been written, so the transaction has to take the learner with it.
    const holder = await context.repository.create('guardian', {
      institution_id: institutionId(),
      given_name: 'Holder',
      family_name: 'Guardian',
      name_order: 'given_first',
      gender: 'female',
    });
    await context.repository.create('identifier', {
      institution_id: institutionId(),
      owner_type: 'guardian',
      owner_id: holder.id,
      scheme: 'ke.kemis_upi',
      value: 'UPI-CLAIMED',
    });

    await expect(
      admitLearner(context.repository, {
        institutionId: institutionId(),
        values,
        guardian: { name: 'Grace Otieno', phone: '+254711222333', relationship: 'Mother' },
        placement: { classGroupId: classGroupId() },
      })
    ).rejects.toThrow(/already belongs to another owner/);

    const learners = await context.repository.list('learner', {
      where: { admission_number: 'GA/2027/505' },
    });
    expect(learners.total).toBe(0);

    // The guardian of the failed admission rolled back with the learner it belonged to.
    const guardians = await context.repository.list('guardian', {
      where: { family_name: 'Otieno' },
      limit: 10,
    });
    expect(guardians.items.some((row) => row.given_name === 'Grace')).toBe(false);
  });

  it('keeps the learner patch the directory sends in step with the canonical status', () => {
    const patch = learnerUpdateInput(learnerValues({ status: 'Transferred' }));
    expect(patch.status).toBe('transferred_out');
    expect(patch.admission_number).toBe('GA/2027/501');
  });
});
