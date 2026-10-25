// ABOUTME: Component tests for the Settings › Data integrity page: the report it renders, the
// ABOUTME: choices it offers, the dry run and the fix it applies once the user consents.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { CLEAR_REFERENCE } from '@/domain/repair';

import DataIntegrityPage from '../DataIntegrityPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallback?: string | Record<string, unknown>,
      maybeOptions?: Record<string, unknown>
    ) => {
      const options = typeof fallback === 'object' ? fallback : maybeOptions;
      const text =
        typeof fallback === 'string' ? fallback : (options?.defaultValue as string | undefined) ?? key;
      return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options?.[name] ?? ''));
    },
  }),
}));

const IDS = {
  house: '01930000-0000-7000-8000-000000000002',
  missingHouse: '01930000-0000-7000-8000-00000000000d',
  level: '01930000-0000-7000-8000-000000000006',
  otherLevel: '01930000-0000-7000-8000-000000000010',
  year: '01930000-0000-7000-8000-000000000004',
  otherYear: '01930000-0000-7000-8000-000000000011',
  programme: '01930000-0000-7000-8000-000000000005',
  classGroup: '01930000-0000-7000-8000-000000000007',
  otherClassGroup: '01930000-0000-7000-8000-000000000012',
  archivedClassGroup: '01930000-0000-7000-8000-000000000013',
  learner: '01930000-0000-7000-8000-000000000008',
  enrolment: '01930000-0000-7000-8000-0000000000e2',
  institution: '01930000-0000-7000-8000-000000000001',
} as const;

const TIMESTAMP = '2027-01-05T08:00:00.000Z';

let adapter: SqliteAdapter;

beforeEach(async () => {
  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  await adapter.exec(`CREATE TABLE "institution" ("id" TEXT PRIMARY KEY, "name" TEXT)`);
  await adapter.exec(`CREATE TABLE "house" ("id" TEXT PRIMARY KEY, "name" TEXT)`);
  await adapter.exec(`CREATE TABLE "level" ("id" TEXT PRIMARY KEY, "name" TEXT)`);
  await adapter.exec(
    `CREATE TABLE "academic_year" ("id" TEXT PRIMARY KEY, "name" TEXT, "start_date" TEXT, "end_date" TEXT)`
  );
  await adapter.exec(`CREATE TABLE "programme" ("id" TEXT PRIMARY KEY, "name" TEXT)`);
  await adapter.exec(
    `CREATE TABLE "class_group" ("id" TEXT PRIMARY KEY, "name" TEXT, "institution_id" TEXT, "academic_year_id" TEXT, "programme_id" TEXT, "level_id" TEXT, "deleted_at" TEXT)`
  );
  // A table that predates the canonical model: no primary key on the id.
  await adapter.exec(
    `CREATE TABLE "learner" ("id" TEXT, "status" TEXT, "house_id" TEXT, "household_id" TEXT)`
  );
  await adapter.exec(
    `CREATE TABLE "enrolment" ("id" TEXT PRIMARY KEY, "institution_id" TEXT, "learner_id" TEXT, "academic_year_id" TEXT, "programme_id" TEXT, "level_id" TEXT, "class_group_id" TEXT, "status" TEXT, "start_date" TEXT, "entry_reason" TEXT, "created_at" TEXT, "updated_at" TEXT)`
  );

  await adapter.exec(
    `INSERT INTO "institution" VALUES ('${IDS.institution}', 'Greenfield School')`
  );
  await adapter.exec(`INSERT INTO "house" VALUES ('${IDS.house}', 'Bamba House')`);
  await adapter.exec(`INSERT INTO "level" VALUES ('${IDS.level}', 'Grade 6')`);
  await adapter.exec(`INSERT INTO "level" VALUES ('${IDS.otherLevel}', 'Grade 7')`);
  await adapter.exec(
    `INSERT INTO "academic_year" VALUES ('${IDS.year}', '2027', '2027-01-05', '2027-12-18')`
  );
  await adapter.exec(
    `INSERT INTO "academic_year" VALUES ('${IDS.otherYear}', '2028', '2028-01-05', '2028-12-18')`
  );
  await adapter.exec(`INSERT INTO "programme" VALUES ('${IDS.programme}', 'CBC')`);
  await adapter.exec(
    `INSERT INTO "class_group" VALUES ('${IDS.classGroup}', 'Grade 6 Blue', '${IDS.institution}', '${IDS.year}', '${IDS.programme}', '${IDS.level}', NULL)`
  );
  await adapter.exec(
    `INSERT INTO "class_group" VALUES ('${IDS.otherClassGroup}', 'Grade 7 Red', '${IDS.institution}', '${IDS.otherYear}', '${IDS.programme}', '${IDS.otherLevel}', NULL)`
  );
  await adapter.exec(
    `INSERT INTO "class_group" VALUES ('${IDS.archivedClassGroup}', 'Grade 6 Green', '${IDS.institution}', '${IDS.year}', '${IDS.programme}', '${IDS.level}', '${TIMESTAMP}')`
  );
  await adapter.exec(
    `INSERT INTO "learner" VALUES ('${IDS.learner}', 'enrolled', '${IDS.missingHouse}', NULL)`
  );
  // The legacy class group the old system wrote.
  await adapter.exec(
    `INSERT INTO "enrolment" VALUES ('${IDS.enrolment}', '${IDS.institution}', '${IDS.learner}', '${IDS.year}', '${IDS.programme}', '${IDS.level}', '42', 'active', '2027-01-05', 'new_admission', '${TIMESTAMP}', '${TIMESTAMP}')`
  );
});

afterEach(async () => {
  await adapter.close();
});

const renderPage = () =>
  render(
    <ConfirmProvider>
      <DataIntegrityPage adapter={adapter} />
    </ConfirmProvider>
  );

/** The learner row of the fixture. */
async function readLearner(): Promise<Record<string, unknown> | null> {
  return adapter.get<Record<string, unknown>>('SELECT * FROM "learner" WHERE "id" = ?', [
    IDS.learner,
  ]);
}

describe('the data integrity page', () => {
  it('says that the data layer is not connected when there is no storage', () => {
    render(<DataIntegrityPage />);
    expect(screen.getByText('The data layer is not connected')).toBeInTheDocument();
  });

  // The page is a tab of the Data & System hub, and the hub supplies the title.
  it('has no page header of its own, connected or not', async () => {
    const { unmount } = render(<DataIntegrityPage />);
    expect(screen.queryByText('Data integrity')).toBeNull();
    unmount();

    renderPage();
    await screen.findByText(/learner\.house_id points at/);
    expect(screen.queryByText('Data integrity')).toBeNull();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('keeps what the header carried: what the checks look for, and the action to run them again', async () => {
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    expect(screen.getByText(/Nothing is changed until you agree to a fix/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
  });

  it('reports the finding with its entity, column, value and row', async () => {
    renderPage();

    const message = await screen.findByText(/learner\.house_id points at/);
    const finding = message.closest('li');
    expect(finding?.textContent).toContain('learner');
    expect(finding?.textContent).toContain('house_id');
    expect(finding?.textContent).toContain(IDS.missingHouse);
    expect(finding?.textContent).toContain(IDS.learner);
  });

  it('shows what the proposed fix would do', async () => {
    renderPage();

    const message = await screen.findByText(/learner\.house_id points at/);
    expect(message.closest('li')?.textContent).toContain(
      'Sets learner.house_id to the house row you choose, or clears the reference if you choose that instead.'
    );
  });

  it('describes the finding once: the description is the details, not the name', async () => {
    renderPage();
    const message = await screen.findByText(/learner\.house_id points at/);

    const checkbox = screen.getByRole('checkbox', { name: /learner\.house_id points at/ });
    const describedBy = checkbox.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const description = document.getElementById(describedBy ?? '');
    expect(description?.textContent).toContain('Entity:');
    expect(description?.textContent).not.toContain(message.textContent ?? '');
  });

  it('offers the choice to clear the reference and the live rows of the target', async () => {
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    const select = screen.getByLabelText(/the house row to point at/);
    const values = within(select)
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value);
    expect(values).toContain(CLEAR_REFERENCE);
    expect(values).toContain(IDS.house);
  });

  it('marks a choice that is not available and does not offer an archived row', async () => {
    renderPage();
    await screen.findByText(/enrolment\.class_group_id holds/);

    const select = screen.getByLabelText(/the id of the class_group row to point at/);
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    const other = options.find((option) => option.value === IDS.otherClassGroup);
    expect(other).toBeDefined();
    expect(other?.disabled).toBe(true);
    expect(other?.title).toContain('Grade 7');

    expect(options.find((option) => option.value === IDS.archivedClassGroup)).toBeUndefined();
    expect(screen.getByText(/choices are not available/)).toBeInTheDocument();
  });

  it('changes nothing until the user consents', async () => {
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    expect(screen.getByRole('button', { name: 'Apply the fixes' })).toBeDisabled();
    expect((await readLearner())?.['house_id']).toBe(IDS.missingHouse);
  });

  it('previews the change without making it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    await user.click(screen.getByRole('checkbox', { name: /learner\.house_id points at/ }));
    await user.selectOptions(screen.getByLabelText(/the house row to point at/), CLEAR_REFERENCE);
    await user.click(screen.getByRole('button', { name: 'Preview the changes' }));

    const preview = await screen.findByTestId('integrity-preview');
    expect(preview.textContent).toContain('Sets learner.house_id');
    expect((await readLearner())?.['house_id']).toBe(IDS.missingHouse);
  });

  it('applies the fix the user consented to, after the confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    await user.click(screen.getByRole('checkbox', { name: /learner\.house_id points at/ }));
    await user.selectOptions(screen.getByLabelText(/the house row to point at/), CLEAR_REFERENCE);
    await user.click(screen.getByRole('button', { name: 'Apply the fixes' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/1 changes will be written/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Yes, apply them' }));

    await waitFor(async () => {
      expect((await readLearner())?.['house_id']).toBeNull();
    });
    const outcome = await screen.findByTestId('integrity-outcome');
    expect(outcome.textContent).toContain('Sets learner.house_id');
  });

  it('changes nothing when the confirmation is refused', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    await user.click(screen.getByRole('checkbox', { name: /learner\.house_id points at/ }));
    await user.selectOptions(screen.getByLabelText(/the house row to point at/), CLEAR_REFERENCE);
    await user.click(screen.getByRole('button', { name: 'Apply the fixes' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect((await readLearner())?.['house_id']).toBe(IDS.missingHouse);
  });

  it('reports a clean database', async () => {
    await adapter.exec(`UPDATE "learner" SET "house_id" = '${IDS.house}'`);
    await adapter.exec(`UPDATE "enrolment" SET "class_group_id" = '${IDS.classGroup}'`);
    renderPage();

    expect(await screen.findByText(/The checks found nothing/)).toBeInTheDocument();
  });
});
