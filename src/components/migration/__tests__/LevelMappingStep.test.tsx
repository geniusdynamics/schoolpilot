// ABOUTME: Tests the interactive level mapping step: the proposal it shows, the correction the
// ABOUTME: operator makes, the decision it saves, and the decision a fresh step reads back.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, unknown>) => {
      const text = fallback ?? key;
      if (!options) return text;
      return text.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
        const value = options[token];
        return value === undefined ? match : String(value);
      });
    },
  }),
}));

import {
  applyCanonicalSchema,
  createNodeSqliteAdapter,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';
import { createMigrationRunner } from '@/data/migrations';

import { createInstitutionCalendarMigration } from '@/data/migrations/001-institution-calendar';
import { createClassGroupMigration } from '@/data/migrations/002-class-groups';
import {
  buildClassGroupFixture,
  FIXTURE_NOW,
  migrateCalendar,
} from '@/data/migrations/002-legacy-fixture';
import { LEVEL_MAPPING_TABLE } from '@/data/migrations/002-level-mapping';

import { LevelMappingStep } from '../LevelMappingStep';

type Row = Record<string, unknown>;

async function readRows(adapter: SqliteAdapter, table: string): Promise<Row[]> {
  return adapter.all<Row>(`SELECT * FROM "${table}" ORDER BY rowid`);
}

/** The class card a legend names: `Form 1 becomes Form 1`. */
function cardFor(name: string): HTMLElement {
  return screen.getByRole('group', { name: new RegExp(`${name} becomes`) });
}

describe('the level mapping step', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyCanonicalSchema(adapter);
    await buildClassGroupFixture(adapter);
    await migrateCalendar(adapter);
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('shows the legacy classes, the suggested level and the suggested year', async () => {
    render(
      <LevelMappingStep adapter={adapter} now={() => FIXTURE_NOW} onConfirmed={() => undefined} />
    );

    await screen.findByRole('heading', { name: 'Match the old classes to levels' });
    expect(screen.queryByText(/has not been confirmed yet/)).not.toBeNull();

    const formOne = cardFor('Form 1');
    expect(within(formOne).getByLabelText('Level name')).toHaveValue('Form 1');
    expect(within(formOne).getByLabelText('Level code')).toHaveValue('FORM-1');
    expect(within(formOne).getByLabelText('Order')).toHaveValue(1);
    expect(within(formOne).getByText(/Suggestion \(high\)/)).toBeInTheDocument();

    // The streams of Form 1 are A and B, and each has a year to confirm.
    expect(within(formOne).getAllByRole('combobox')).toHaveLength(2);

    // The academic year that covers the migration day is selected.
    const years = await adapter.all<{ id: string; name: string }>(
      `SELECT id, name FROM "academic_year"`
    );
    const year = years.find((entry) => entry.name === 'AY 2024/2025');
    expect(year).toBeDefined();
    for (const select of within(formOne).getAllByRole('combobox')) {
      expect(select).toHaveValue(year?.id);
    }

    // A class with no streams says so, and a stream with no class is reported.
    expect(within(cardFor('Form 5')).getByText(/This class has no streams/)).toBeInTheDocument();
    expect(screen.getByText(/will not be migrated/)).toBeInTheDocument();
    expect(screen.getByText(/Ghost/)).toBeInTheDocument();
  });

  it('saves the operator correction and reads it back when the step is opened again', async () => {
    const { unmount } = render(<LevelMappingStep adapter={adapter} now={() => FIXTURE_NOW} />);
    await screen.findByRole('heading', { name: 'Match the old classes to levels' });

    const years = await readRows(adapter, 'academic_year');
    const current = years.find((entry) => entry.name === 'AY 2024/2025');
    const previous = years.find((entry) => entry.name === 'AY 2023/2024');
    expect(current).toBeDefined();
    expect(previous).toBeDefined();

    const formTwo = cardFor('Form 2');
    fireEvent.change(within(formTwo).getByLabelText('Level name'), {
      target: { value: 'Grade 9' },
    });
    fireEvent.change(within(formTwo).getByLabelText('Level code'), { target: { value: 'G9' } });
    fireEvent.change(within(formTwo).getByLabelText('Order'), { target: { value: '9' } });

    // The first stream of Form 2 is A; the second is B.
    const yearSelects = within(formTwo).getAllByRole('combobox');
    fireEvent.change(yearSelects[0], { target: { value: previous?.id } });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm the mapping' }));
    await waitFor(() =>
      expect(screen.getByText(/The mapping is saved/)).toBeInTheDocument()
    );

    const saved = await readRows(adapter, LEVEL_MAPPING_TABLE);
    expect(saved).toHaveLength(7);

    const formTwoRows = saved.filter((row) => row.legacy_class_name === 'Form 2');
    expect(formTwoRows).toHaveLength(2);
    for (const row of formTwoRows) {
      expect(row.level_name).toBe('Grade 9');
      expect(row.level_code).toBe('G9');
      expect(row.level_ordinal).toBe(9);
      expect(row.operator_corrected).toBe(1);
    }
    const streamA = formTwoRows.find((row) => row.legacy_stream_id === '3');
    const streamB = formTwoRows.find((row) => row.legacy_stream_id === '4');
    expect(streamA?.academic_year_id).toBe(previous?.id);
    expect(streamB?.academic_year_id).toBe(current?.id);

    // The untouched class keeps the proposal.
    const formOne = saved.filter((row) => row.legacy_class_name === 'Form 1');
    expect(formOne.every((row) => row.level_name === 'Form 1')).toBe(true);
    expect(formOne.every((row) => row.operator_corrected === 0)).toBe(true);

    // A fresh step shows the saved decision, not a new proposal.
    unmount();
    render(<LevelMappingStep adapter={adapter} now={() => FIXTURE_NOW} />);
    await screen.findByRole('heading', { name: 'Match the old classes to levels' });
    expect(screen.queryByText(/has not been confirmed yet/)).toBeNull();
    const savedFormTwo = screen.getByRole('group', { name: /Form 2 becomes Grade 9/ });
    expect(within(savedFormTwo).getByLabelText('Level name')).toHaveValue('Grade 9');
    expect(within(savedFormTwo).getByLabelText('Order')).toHaveValue(9);

    // And the migration uses the saved decision.
    const runner = createMigrationRunner({
      adapter,
      migrations: [
        createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
        createClassGroupMigration({ now: () => FIXTURE_NOW }),
      ],
      backupPolicy: 'never',
      now: () => FIXTURE_NOW,
    });
    const result = await runner.run();
    expect(result.status).toBe('completed');

    const levels = await readRows(adapter, 'level');
    const gradeNine = levels.find((level) => level.name === 'Grade 9');
    const groups = await readRows(adapter, 'class_group');
    const groupForA = groups.find((group) => group.level_id === gradeNine?.id && group.name === 'A');
    expect(groupForA).toBeDefined();
    expect(groupForA?.academic_year_id).toBe(previous?.id);
  });

  it('resets the form to the suggested mapping', async () => {
    render(<LevelMappingStep adapter={adapter} now={() => FIXTURE_NOW} />);
    await screen.findByRole('heading', { name: 'Match the old classes to levels' });

    const formThree = cardFor('Form 3');
    fireEvent.change(within(formThree).getByLabelText('Level name'), {
      target: { value: 'Something else' },
    });
    const renamed = screen.getByRole('group', { name: /Form 3 becomes Something else/ });
    expect(within(renamed).getByLabelText('Level name')).toHaveValue('Something else');

    fireEvent.click(screen.getByRole('button', { name: 'Use the suggested mapping' }));
    expect(within(cardFor('Form 3')).getByLabelText('Level name')).toHaveValue('Form 3');
  });
});
