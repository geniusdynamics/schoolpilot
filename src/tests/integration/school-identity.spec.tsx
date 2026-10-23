// ABOUTME: Integration test on the real SQLite-WASM provider: a school created through the setup wizard
// ABOUTME: with a real curriculum pack (no demo data) comes out with the identity a teaching scope
// ABOUTME: resolves (a canonical `user` linked to a `staff` row) and with promotion rules read from the
// ABOUTME: pack installed for its programme — the two wiring gaps a wizard-created school used to hit.

import { render, screen, fireEvent, waitFor, cleanup, configure } from '@testing-library/react';

// The wizard's steps write through the real provider and take seconds each; Testing Library's
// 1000 ms default for waitFor is tight enough that a slower CI runner fails a passing assertion.
configure({ asyncUtilTimeout: 20_000 });
// The whole wizard runs through the real provider; the default budget is not enough on a loaded runner.
vi.setConfig({ testTimeout: 180_000 });

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SQLiteWASMProvider } from '@/services/database/SQLiteWASMProvider';
import { collectionsDefinition } from '@/services/database/collections';

// The hooks and databaseService are real; only the provider registry is pointed at a fresh in-memory
// SQLite database. The canonical repository is the app's own, opened over Node's in-memory adapter.
const real = vi.hoisted(() => ({ provider: null as null | { getCollection: (n: string) => any; getAllCollections: () => Map<string, any> } }));

vi.mock('@/services/database/ProviderSelector', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const manager = {
    getCollection: (name: string) => real.provider?.getCollection(name) ?? null,
    getAllCollections: () => real.provider?.getAllCollections() ?? new Map(),
  };
  return { ...actual, getDatabaseManager: () => manager };
});

// Creating the administrator goes through the auth service (tested on its own); here it writes the
// real users row the wizard then gives a canonical identity.
vi.mock('@/services/auth/authService', () => ({
  MIN_ADMIN_PASSWORD_LENGTH: 10,
  authService: {
    createInitialAdministrator: vi.fn(async (input: { username: string; displayName: string }) => {
      const users = real.provider!.getCollection('users');
      if ((await users.find({})).length > 0) {
        return { success: false, message: 'An administrator already exists. Sign in instead.' };
      }
      const now = new Date().toISOString();
      await users.insert({
        username: input.username.trim(),
        display_name: input.displayName.trim(),
        email: '',
        role: 'super_admin',
        role_id: 'super_admin',
        is_active: true,
        hashed_password: 'hash:salt:1',
        created_at: now,
        updated_at: now,
      });
      return { success: true, message: 'Administrator created.' };
    }),
  },
}));

// The session a page reads: the login the wizard created, as `AuthContext` would hand it over. The
// id is the legacy login's, which is why a page must resolve the canonical identity through the username.
const session = vi.hoisted(() => ({ userId: '', username: '', role: 'super_admin' }));
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: session.userId, username: session.username, role: session.role },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasPermission: vi.fn(async () => true),
      hasModuleAccess: vi.fn(async () => true),
      isDemoMode: false,
    }),
  };
});

const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

import { SetupWizard, clearWizardDraft } from '@/components/setup/SetupWizard';
import { ensureCanonicalUser } from '@/data/canonicalIdentity';
import { openCanonicalRepository } from '@/data/canonicalRepository';
import { Repository } from '@/data/repository';
import { resolveTeachingScope } from '@/modules/academics/pages/marks/teachingScope';
import { resolvePromotionRules } from '@/modules/administration/pages/promotion/packPromotionRules';
import { AnalysisV2PageContent } from '@/modules/reports/pages/analytics/AnalysisV2Page';

const COLLECTIONS = [
  'school_details', 'users', 'education_system_configurations', 'academic_year_structures',
  'academic_period_definitions', 'academic_years', 'financial_years', 'school_periods',
  'classes', 'class_streams', 'subjects', 'fee_templates',
];
const TOTAL_STEPS = 7;
/** The slot `openCanonicalRepository` keeps the app-wide repository in; cleared so each case starts fresh. */
const REPOSITORY_SLOT = '__schoolpilotCanonicalRepository';
const ADMIN = { username: 'wizard-admin', displayName: 'Wizard Administrator', password: 'correct-horse-1' };
const CLASSES = ['F1', 'F2', 'F3', 'F4'];

let dbSeq = 0;

async function openRealDatabase() {
  vi.stubEnv('VITE_DB_ALLOW_MEMORY', 'true');
  const provider = new SQLiteWASMProvider({ name: `school-identity-${++dbSeq}`, version: 1 });
  await provider.initialize();
  for (const name of COLLECTIONS) {
    await provider.createCollection(name, (collectionsDefinition as Record<string, { schema: any }>)[name].schema);
  }
  real.provider = provider;
  return provider;
}

const loginRows = async (): Promise<any[]> => (await real.provider!.getCollection('users').find({})) ?? [];
const onStep = (n: number) => screen.findByText(`Step ${n} of ${TOTAL_STEPS}`, {}, { timeout: 20_000 });
const click = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Walks the wizard end to end: one real pack (8-4-4), four classes, no sample data. */
async function walkWizard(onComplete = vi.fn()) {
  render(<SetupWizard onComplete={onComplete} />);
  await onStep(1);

  fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: 'Mwangaza Secondary' } });
  click(/^Next$/);
  await onStep(2);

  fireEvent.click(screen.getByRole('checkbox', { name: /Kenya 8-4-4 Secondary/ }));
  click(/^Next$/);
  await onStep(3);

  type('Year name', '2027');
  type('Academic year start', '2027-01-05');
  type('Academic year end', '2027-11-30');
  click(/^Next$/);
  await onStep(4);

  for (const [index, name] of CLASSES.entries()) {
    if (index > 0) click(/Add class/);
    const classNames = screen.getAllByPlaceholderText(/^Class \d+$/);
    fireEvent.change(classNames[index], { target: { value: name } });
  }
  const streams = screen.getAllByPlaceholderText(/Streams, comma-separated/);
  fireEvent.change(streams[0], { target: { value: 'North' } });
  click(/^Next$/);
  await onStep(5);

  click(/^Next$/); // subjects: the presets stay ticked
  await onStep(6);
  click(/^Next$/); // sample data: left unticked
  await onStep(7);

  type('Administrator username', ADMIN.username);
  type('Display name', ADMIN.displayName);
  type('Password', ADMIN.password);
  type('Confirm password', ADMIN.password);
  click(/Finish setup/);
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 60_000 });
  return onComplete;
}

async function canonical(): Promise<Repository> {
  const repository = await openCanonicalRepository();
  if (!(repository instanceof Repository)) throw new Error('the canonical repository is not writable');
  return repository;
}

/** The canonical rows a teaching scope and a promotion run are resolved from. */
async function schoolRows(repository: Repository) {
  const list = async <E extends Parameters<Repository['list']>[0]>(entity: E) =>
    (await repository.list(entity, { limit: 500 })).items;
  const [users, staff, programmes, packs, levels, classGroups, campuses, years, learningAreas] = await Promise.all([
    list('user'), list('staff'), list('programme'), list('curriculum_pack'), list('level'),
    list('class_group'), list('campus'), list('academic_year'), list('learning_area'),
  ]);
  return { users, staff, programmes, packs, levels, classGroups, campuses, years, learningAreas };
}

type School = Awaited<ReturnType<typeof schoolRows>>;

/** A teaching group with one learner in it: what the wizard does not create, and marks need. */
async function createTeachingGroup(repository: Repository, school: School) {
  const institutionId = school.programmes[0].institution_id;
  const programme = school.programmes.find((row) => row.curriculum_pack_code === 'ke-844')!;
  const level = school.levels.find((row) => row.code === 'F1')!;
  const classGroup = school.classGroups[0]!;
  const learningArea = school.learningAreas.find((row) => row.programme_id === programme.id)!;

  const learner = await repository.create('learner', {
    institution_id: institutionId,
    given_name: 'Amani',
    family_name: 'Otieno',
    name_order: 'given_first',
    gender: 'female',
    admission_number: 'MS/2027/001',
    status: 'enrolled',
    residence_status: 'day',
  });
  const enrolment = await repository.create('enrolment', {
    institution_id: institutionId,
    learner_id: learner.id,
    academic_year_id: school.years[0]!.id,
    programme_id: programme.id,
    level_id: level.id,
    class_group_id: classGroup.id,
    status: 'active',
    start_date: '2027-01-05',
    entry_reason: 'new_admission',
  });
  const group = await repository.create('teaching_group', {
    institution_id: institutionId,
    campus_id: school.campuses[0]!.id,
    academic_year_id: school.years[0]!.id,
    learning_area_id: learningArea.id,
    name: 'F1 Mathematics',
    level_ids: [level.id],
    class_group_ids: [classGroup.id],
    teacher_ids: [],
    kind: 'whole_class',
  });
  await repository.create('teaching_group_member', {
    institution_id: institutionId,
    teaching_group_id: group.id,
    enrolment_id: enrolment.id,
    valid_from: '2027-01-05',
  });
  return group;
}

/** The scope input a marks, results or analysis screen builds from the canonical rows. */
function scopeInputFor(
  school: School,
  group: { id: string },
  assignments: readonly { readonly staffId: string; readonly role: 'main' | 'assistant' }[]
) {
  return {
    role: 'teacher',
    actorId: '',
    staff: school.staff.map((row) => ({ id: row.id, userId: row.user_id ?? null })),
    groups: [
      {
        id: group.id,
        teacherIds: [],
        classGroupIds: (group as { class_group_ids?: readonly string[] }).class_group_ids ?? [],
      },
    ],
    assignments: assignments.map((row) => ({
      staffId: row.staffId,
      teachingGroupId: group.id,
      validFrom: '2027-01-05',
      validTo: null,
    })),
    classGroups: school.classGroups.map((row) => ({
      id: row.id,
      homeroomTeacherIds: row.homeroom_teacher_ids ?? [],
    })),
    at: '2027-06-01',
  };
}

describe('a school created through the wizard', () => {
  beforeEach(async () => {
    localStorage.clear();
    clearWizardDraft();
    Object.values(toast).forEach((fn) => fn.mockClear());
    delete (globalThis as Record<string, unknown>)[REPOSITORY_SLOT];
    await openRealDatabase();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('links its administrator to a staff record and resolves scope and promotion from the installed pack', async () => {
    await walkWizard();
    expect(toast.showError).not.toHaveBeenCalled();

    const repository = await canonical();
    const school = await schoolRows(repository);

    // ── the identity link ──────────────────────────────────────────────────────
    expect(school.users).toHaveLength(1);
    const admin = school.users[0]!;
    expect(admin.username).toBe(ADMIN.username);

    const adminStaff = school.staff.filter((row) => row.user_id === admin.id);
    expect(adminStaff).toHaveLength(1);
    expect(admin.person_ref).toEqual({ type: 'staff', id: adminStaff[0]!.id });

    // The session a page sees carries the legacy login's id and the username, never the canonical id.
    const [login] = await loginRows();
    session.userId = login.id;
    session.username = login.username;
    session.role = login.role;

    // ── the installed programme, and the rules it pins ─────────────────────────
    const installed = school.programmes.find((row) => row.curriculum_pack_code === 'ke-844');
    expect(installed).toBeDefined();
    expect(
      school.packs.some((row) => row.code === 'ke-844' && row.version === installed!.pack_version)
    ).toBe(true);

    const resolution = resolvePromotionRules(school.programmes, school.packs);
    expect(resolution.kind).toBe('rules');
    if (resolution.kind === 'rules') {
      expect(resolution.programmeId).toBe(installed!.id);
      expect(resolution.rules.levels.map((level) => level.code)).toEqual(['F1', 'F2', 'F3', 'F4']);
    }

    // ── a teaching group with a member, which the wizard does not create ───────
    const group = await createTeachingGroup(repository, school);
    await repository.create('teaching_assignment', {
      institution_id: school.programmes[0]!.institution_id,
      staff_id: adminStaff[0]!.id,
      teaching_group_id: group.id,
      role: 'main',
      valid_from: '2027-01-05',
    });

    // The login resolves to the canonical user, which is linked to the staff row: the scope finds it
    // rather than claiming no staff record exists.
    const adminAssignments = [{ staffId: adminStaff[0]!.id, role: 'main' as const }];
    const adminScope = resolveTeachingScope({
      ...scopeInputFor(school, group, adminAssignments),
      actorId: admin.id,
    });
    expect(adminScope.staffId).toBe(adminStaff[0]!.id);
    expect([...adminScope.groupIds]).toEqual([group.id]);
    expect(adminScope.reason).not.toContain('No staff record');

    // An administrator's role reaches every group, and reaches one rather than none.
    const byRole = resolveTeachingScope({
      ...scopeInputFor(school, group, adminAssignments),
      actorId: admin.id,
      role: 'super_admin',
    });
    expect(byRole.mode).toBe('all');
    expect(byRole.groupIds.size).toBe(1);

    // ── a teacher added later ─────────────────────────────────────────────────
    // The path the app offers: a login (Settings › Users) gets a canonical user, and the staff page
    // links the staff record to it. The scope then finds the teacher's own group.
    const teacher = await ensureCanonicalUser(repository, { username: 'teacher.one', passwordHash: 'h' });
    const teacherStaff = await repository.create('staff', {
      institution_id: school.programmes[0]!.institution_id,
      given_name: 'Peter',
      family_name: 'Otieno',
      name_order: 'given_first',
      gender: 'male',
      employee_number: 'EMP002',
      employment_type: 'permanent',
      department_ids: [],
      start_date: '2027-01-05',
      user_id: teacher!.id,
    });
    await repository.create('teaching_assignment', {
      institution_id: school.programmes[0]!.institution_id,
      staff_id: teacherStaff.id,
      teaching_group_id: group.id,
      role: 'assistant',
      valid_from: '2027-01-05',
    });
    const withTeacher = await schoolRows(repository);
    const teacherScope = resolveTeachingScope({
      ...scopeInputFor(withTeacher, group, [{ staffId: teacherStaff.id, role: 'assistant' }]),
      actorId: teacher!.id,
    });
    expect(teacherScope.staffId).toBe(teacherStaff.id);
    expect([...teacherScope.groupIds]).toEqual([group.id]);
    expect(teacherScope.reason).not.toContain('No staff record');

    // ── the analysis screen, mounted by the router with no props ───────────────
    // It resolves the session itself; without that it would claim no staff record is linked.
    render(<AnalysisV2PageContent />);
    await screen.findByTestId('analysis-page', {}, { timeout: 30_000 });
    expect(screen.queryByText(/No staff record is linked to this login/)).toBeNull();
    cleanup();
  }, 180_000);
});
