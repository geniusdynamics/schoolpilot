// ABOUTME: The replica scope proved over two institutions on one server: what a scoped pull
// ABOUTME: can see, what a scoped push is refused, and the reference closure a pull needs.

import { afterEach, describe, expect, it } from 'vitest';

import { ENTITY_NAMES } from '@/domain/schema';
import { asId } from '@/domain/ids';
import { RepositoryPermissionError } from '@/data/repository';

import type { Envelope } from '../envelope';
import { formatHlc } from '../hlc';
import { DeviceNode } from '../node';
import { entityInScope, rowInScope, scopeKey, scopedEntities } from '../scope';
import { openRig, type Rig } from './rig';

let rig: Rig | undefined;

afterEach(async () => {
  await rig?.close();
  rig = undefined;
});

/**
 * Each test pushes and pulls hundreds of rows through real SQLite, which costs more than the
 * repository's default per-test budget on a cold machine.
 */
function itSync(name: string, body: () => void | Promise<void>): void {
  it(name, body, 60_000);
}

/** A server holding two institutions, each with a campus of its own. */
async function openTwoSchools(): Promise<{
  rig: Rig;
  schoolA: string;
  schoolB: string;
  campusB: string;
}> {
  const opened = await openRig();
  rig = opened;
  const seed = opened.serverContext.seed;
  const schoolA = seed.idOf('institution');

  const schoolB = await opened.server.repo.create('institution', {
    ...seed.inputFor('institution'),
    name: 'Second School',
    short_name: 'Second',
  });
  const campusB = await opened.server.repo.create(
    'campus',
    seed.inputFor('campus', { institution_id: schoolB.id, name: 'B Campus' })
  );
  await opened.server.bootstrap();

  return { rig: opened, schoolA, schoolB: schoolB.id, campusB: campusB.id };
}

describe('the scope of a replica', () => {
  itSync('closes a narrowed entity list over the references a pull has to satisfy', () => {
    const closure = scopedEntities({ institutionId: 'school-a', entities: ['mark'] });

    expect(closure).toContain('mark');
    expect(closure).toContain('institution');
    expect(closure).toContain('enrolment');
    expect(closure).toContain('learner');
    // The closure is in reference order, so a parent lands before the row pointing at it.
    expect(closure.indexOf('learner')).toBeLessThan(closure.indexOf('enrolment'));
    expect(closure.indexOf('enrolment')).toBeLessThan(closure.indexOf('mark'));
  });

  itSync('covers every entity when the scope narrows nothing', () => {
    expect(scopedEntities({ institutionId: 'school-a' })).toEqual([...ENTITY_NAMES]);
    expect(entityInScope({ institutionId: 'school-a' }, 'payment')).toBe(true);
    expect(entityInScope({ institutionId: 'school-a', entities: ['campus'] }, 'payment')).toBe(false);
  });

  itSync('names a row by its own id for the institution and by tenancy for everything else', () => {
    const scope = { institutionId: 'school-a' };

    expect(rowInScope(scope, 'institution', { id: 'school-a' })).toBe(true);
    expect(rowInScope(scope, 'institution', { id: 'school-b' })).toBe(false);
    expect(rowInScope(scope, 'campus', { institution_id: 'school-a' })).toBe(true);
    expect(rowInScope(scope, 'campus', { institution_id: 'school-b' })).toBe(false);
    // A row whose tenancy cannot be established is refused rather than leaked.
    expect(rowInScope(scope, 'campus', {})).toBe(false);
  });

  itSync('honours a row predicate as the permission seam', () => {
    const scope = {
      institutionId: 'school-a',
      allowsRow: (entity: string, row: Readonly<Record<string, unknown>>) =>
        entity !== 'campus' || row.name === 'Visible',
    };

    expect(rowInScope(scope, 'campus', { institution_id: 'school-a', name: 'Visible' })).toBe(true);
    expect(rowInScope(scope, 'campus', { institution_id: 'school-a', name: 'Hidden' })).toBe(false);
  });

  itSync('changes its key when the narrowed list changes', () => {
    expect(scopeKey({ institutionId: 'school-a' })).toBe('school-a|*|all');
    expect(scopeKey({ institutionId: 'school-a', entities: ['mark', 'campus'] })).toBe(
      'school-a|campus,mark|all'
    );
    expect(scopeKey({ institutionId: 'school-b' })).not.toBe(scopeKey({ institutionId: 'school-a' }));
  });
});

describe('a replica scoped to one institution', () => {
  itSync('pulls its own rows and never the other institution', async () => {
    const { rig: opened, schoolA, schoolB, campusB } = await openTwoSchools();

    const unscoped = await opened.device('device-all');
    const all = await unscoped.pull(opened.server.transport());
    expect(all.received).toBe(ENTITY_NAMES.length + 2);

    const scoped = await opened.device('device-a', { scope: { institutionId: schoolA } });
    const summary = await scoped.pull(opened.server.transport({ institutionId: schoolA }));

    expect(summary.received).toBe(ENTITY_NAMES.length);
    expect(summary.failed).toBe(0);
    expect(await scoped.read('institution', schoolA)).not.toBeNull();
    expect(await scoped.read('institution', schoolB)).toBeNull();
    expect(await scoped.repo.get('campus', asId<'campus'>(campusB))).toBeNull();
    expect((await scoped.repo.list('campus')).total).toBe(1);
  });

  itSync('refuses a row the server serves outside its scope', async () => {
    const { rig: opened, schoolA, schoolB, campusB } = await openTwoSchools();

    const scoped = await opened.device('device-a', { scope: { institutionId: schoolA } });
    // This transport is unscoped, so the server hands over both institutions at once.
    const summary = await scoped.pull(opened.server.transport());

    expect(summary.received).toBe(ENTITY_NAMES.length + 2);
    expect(summary.failed).toBe(2);
    expect(await scoped.read('institution', schoolB)).toBeNull();
    expect(await scoped.repo.get('campus', asId<'campus'>(campusB))).toBeNull();

    const logged = await scoped.conflicts();
    expect(logged).toHaveLength(2);
    expect(logged.map((entry) => entry.policy)).toEqual(['scope', 'scope']);
  });

  itSync('refuses a local write outside its institution before the repository runs it', async () => {
    const { rig: opened, schoolA, schoolB } = await openTwoSchools();
    const scoped = await opened.device('device-a', { scope: { institutionId: schoolA } });
    await scoped.pull(opened.server.transport({ institutionId: schoolA }));

    const seed = opened.serverContext.seed;
    await expect(
      scoped.create('campus', seed.inputFor('campus', { institution_id: schoolB, name: 'Sneaky' }))
    ).rejects.toBeInstanceOf(RepositoryPermissionError);

    // A scoped device never creates the institution itself: it holds exactly one, by definition.
    await expect(
      scoped.create('institution', {
        ...seed.inputFor('institution'),
        name: 'Another',
      })
    ).rejects.toBeInstanceOf(RepositoryPermissionError);
  });

  itSync('refuses a push from another institution and records it as a conflict', async () => {
    const { rig: opened, schoolA, schoolB, campusB } = await openTwoSchools();
    const campus = await opened.server.repo.get('campus', asId<'campus'>(campusB));
    if (!campus) throw new Error('the second campus is missing');

    const payload = { ...campus } as Record<string, unknown>;
    delete payload.rowVersion;
    payload.name = 'Renamed by a stranger';

    const envelope: Envelope = {
      entity: 'campus',
      id: campusB,
      op: 'update',
      hlc: formatHlc({ wall: 1_800_000_000_000, counter: 0, device: 'device-a' }),
      deviceId: 'device-a',
      fields: ['name'],
      base: {},
      payload,
    };

    const results = await opened.server
      .transport({ institutionId: schoolA })
      .push([envelope]);

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('forbidden');
    expect(results[0]?.error).toContain(schoolA);

    expect((await opened.server.repo.get('campus', asId<'campus'>(campusB)))?.name).toBe('B Campus');

    const conflicts = await opened.server.conflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      entity: 'campus',
      entityId: campusB,
      policy: 'scope',
      kind: 'unresolved',
      loser: 'device-a',
    });

    // The row belongs to the other school; the refusal is what kept it out of this replica.
    expect(schoolB).not.toBe(schoolA);
  });

  itSync('starts its pull again when its scope widens', async () => {
    const { rig: opened, schoolA } = await openTwoSchools();

    const narrow = await opened.device('device-narrow', {
      scope: { institutionId: schoolA, entities: ['campus'] },
    });
    const first = await narrow.pull(opened.server.transport({ institutionId: schoolA, entities: ['campus'] }));
    // The institution row plus the one campus of school A.
    expect(first.received).toBe(2);

    // The same database, opened with a wider scope: the stored scope key no longer matches,
    // so the cursor resets and the rows it skipped arrive.
    const wider = await DeviceNode.open({
      repository: narrow.repo,
      adapter: narrow.database,
      deviceId: 'device-narrow',
      dialect: 'sqlite',
      scope: { institutionId: schoolA },
    });
    const widened = await wider.pull(opened.server.transport({ institutionId: schoolA }));
    expect(widened.received).toBe(ENTITY_NAMES.length);

    const settled = await wider.pull(opened.server.transport({ institutionId: schoolA }));
    expect(settled.received).toBe(0);
  });
});
