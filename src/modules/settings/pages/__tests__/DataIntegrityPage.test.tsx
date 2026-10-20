// ABOUTME: Component tests for the Settings › Data integrity page: the report it renders, the
// ABOUTME: dry run it offers and the fix it applies once the user consents, over real SQLite.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';

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

const HOUSE_ID = '01930000-0000-7000-8000-000000000002';
const LEARNER_ID = '01930000-0000-7000-8000-000000000008';
const MISSING_HOUSE_ID = '01930000-0000-7000-8000-00000000000d';

let adapter: SqliteAdapter;

beforeEach(async () => {
  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  // A table that predates the canonical model: no primary key on the id.
  await adapter.exec(`CREATE TABLE "house" ("id" TEXT PRIMARY KEY, "name" TEXT)`);
  await adapter.exec(`CREATE TABLE "learner" ("id" TEXT, "status" TEXT, "house_id" TEXT)`);
  await adapter.exec(`INSERT INTO "house" VALUES ('${HOUSE_ID}', 'Bamba House')`);
  await adapter.exec(
    `INSERT INTO "learner" VALUES ('${LEARNER_ID}', 'applicant', '${MISSING_HOUSE_ID}')`
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
    LEARNER_ID,
  ]);
}

describe('the data integrity page', () => {
  it('says that the data layer is not connected when there is no storage', () => {
    render(<DataIntegrityPage />);
    expect(screen.getByText('The data layer is not connected')).toBeInTheDocument();
  });

  it('reports the finding with its entity, column, value and row', async () => {
    renderPage();

    const message = await screen.findByText(/learner\.house_id points at/);
    const finding = message.closest('li');
    expect(finding?.textContent).toContain('learner');
    expect(finding?.textContent).toContain('house_id');
    expect(finding?.textContent).toContain(MISSING_HOUSE_ID);
    expect(finding?.textContent).toContain(LEARNER_ID);
  });

  it('shows what the proposed fix would do', async () => {
    renderPage();

    const message = await screen.findByText(/learner\.house_id points at/);
    expect(message.closest('li')?.textContent).toContain(
      'Clears learner.house_id: the reference is dropped and the row itself is kept.'
    );
  });

  it('changes nothing until the user consents', async () => {
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    expect(screen.getByRole('button', { name: 'Apply the fixes' })).toBeDisabled();
    expect((await readLearner())?.['house_id']).toBe(MISSING_HOUSE_ID);
  });

  it('previews the change without making it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Preview the changes' }));

    const preview = await screen.findByTestId('integrity-preview');
    expect(preview.textContent).toContain('Clears learner.house_id');
    expect((await readLearner())?.['house_id']).toBe(MISSING_HOUSE_ID);
  });

  it('applies the fix the user consented to, after the confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Apply the fixes' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/1 changes will be written/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Yes, apply them' }));

    await waitFor(async () => {
      expect((await readLearner())?.['house_id']).toBeNull();
    });
    const outcome = await screen.findByTestId('integrity-outcome');
    expect(outcome.textContent).toContain('Clears learner.house_id');
  });

  it('changes nothing when the confirmation is refused', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/learner\.house_id points at/);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Apply the fixes' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect((await readLearner())?.['house_id']).toBe(MISSING_HOUSE_ID);
  });

  it('reports a clean database', async () => {
    await adapter.exec(`UPDATE "learner" SET "house_id" = '${HOUSE_ID}'`);
    renderPage();

    expect(await screen.findByText(/The checks found nothing/)).toBeInTheDocument();
  });
});
