// ABOUTME: Tests the migration progress screen: the progress semantics, the announced state,
// ABOUTME: the failure state, the focus the overlay keeps and the retry and rollback actions.

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';

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

import { createMigrationRunner, type MigrationStatus } from '@/data/migrations';
import { createNodeSqliteAdapter } from '@/data/adapters/sqlite';

import { MigrationScreen, useMigrationStatus } from '../MigrationScreen';

function status(overrides: Partial<MigrationStatus> = {}): MigrationStatus {
  return {
    phase: 'running',
    total: 3,
    completed: 1,
    pending: 2,
    current: { version: 2, name: 'add the widget table' },
    applied: [
      {
        version: 1,
        name: 'add the gadget table',
        checksum: 'abc',
        checksumKind: 'declared',
        appliedAt: 'now',
      },
    ],
    remaining: [
      { version: 2, name: 'add the widget table' },
      { version: 3, name: 'add the sprocket table' },
    ],
    interrupted: [],
    ...overrides,
  };
}

describe('the migration screen', () => {
  it('shows the progress of the run and which migration is running', () => {
    render(<MigrationScreen status={status()} />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '3');
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuetext', '1 of 3 migrations applied');

    expect(
      screen.getByText('Applying migration 2 of 3: add the widget table')
    ).toBeInTheDocument();
    expect(screen.getByText('1 of 3 applied · 2 remaining')).toBeInTheDocument();
  });

  it('renders no progress bar when there is nothing to migrate', () => {
    render(
      <MigrationScreen
        status={status({
          total: 0,
          completed: 0,
          pending: 0,
          current: undefined,
          applied: [],
          remaining: [],
          phase: 'completed',
        })}
      />
    );

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('0 of 0 applied · 0 remaining')).toBeInTheDocument();
  });

  it('announces the state for a screen reader', () => {
    render(<MigrationScreen status={status()} />);

    const announcement = screen.getByRole('status');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    expect(announcement).toHaveTextContent('Applying migration 2 of 3');
  });

  it('reports the failure and offers a retry', () => {
    const onRetry = vi.fn();
    render(
      <MigrationScreen
        status={status({
          phase: 'failed',
          current: undefined,
          error: 'Migration 2 (add the widget table) failed: the table is missing',
          failed: {
            version: 2,
            name: 'add the widget table',
            error: 'Migration 2 (add the widget table) failed: the table is missing',
          },
        })}
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('the table is missing');
    expect(screen.getByText('The database update failed')).toBeInTheDocument();

    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.focus();
    expect(retry).toHaveFocus();
    retry.click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('offers the applied versions to roll back to, but not the newest one', () => {
    const onRollback = vi.fn();
    render(
      <MigrationScreen
        status={status({
          phase: 'failed',
          applied: [
            {
              version: 1,
              name: 'add the gadget table',
              checksum: 'abc',
              checksumKind: 'declared',
              appliedAt: 'now',
            },
            {
              version: 2,
              name: 'add the widget table',
              checksum: 'def',
              checksumKind: 'declared',
              appliedAt: 'now',
            },
          ],
        })}
        onRollback={onRollback}
      />
    );

    const select = screen.getByLabelText('Roll back to version');
    expect(select).toHaveValue('');

    const options = Array.from(select.querySelectorAll('option')).map(
      (option) => option.value
    );
    // Rolling back to the newest applied version would undo nothing, so it is not offered.
    expect(options).toEqual(['', '1']);

    const button = screen.getByRole('button', { name: 'Roll back' });
    expect(button).toBeDisabled();

    fireEvent.change(select, { target: { value: '1' } });
    fireEvent.click(button);

    expect(onRollback).toHaveBeenCalledWith(1);
  });

  it('moves the focus into the overlay and keeps it there', () => {
    render(
      <MigrationScreen
        status={status({
          phase: 'failed',
          applied: [
            {
              version: 1,
              name: 'add the gadget table',
              checksum: 'abc',
              checksumKind: 'declared',
              appliedAt: 'now',
            },
            {
              version: 2,
              name: 'add the widget table',
              checksum: 'def',
              checksumKind: 'declared',
              appliedAt: 'now',
            },
          ],
        })}
        onRetry={vi.fn()}
        onRollback={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { name: 'The database update failed' });
    expect(heading).toHaveFocus();

    const retry = screen.getByRole('button', { name: 'Try again' });
    const select = screen.getByLabelText('Roll back to version');
    fireEvent.change(select, { target: { value: '1' } });
    const rollback = screen.getByRole('button', { name: 'Roll back' });

    // The focus cannot leave the overlay: the last control wraps to the first.
    rollback.focus();
    fireEvent.keyDown(rollback, { key: 'Tab' });
    expect(retry).toHaveFocus();

    // And it cannot escape backwards either.
    fireEvent.keyDown(retry, { key: 'Tab', shiftKey: true });
    expect(rollback).toHaveFocus();
  });

  it('reports that the previous run was interrupted', () => {
    render(
      <MigrationScreen
        status={status({
          interrupted: [{ version: 2, name: 'add the widget table' }],
        })}
      />
    );

    expect(
      screen.getByText(
        'The previous run was interrupted at migration add the widget table. It will be run again.'
      )
    ).toBeInTheDocument();
  });

  it('follows a runner while it works', async () => {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();

    const runner = createMigrationRunner({
      adapter,
      migrations: [
        {
          version: 1,
          name: 'add the gadget table',
          statements: ['CREATE TABLE gadget (id TEXT PRIMARY KEY)'],
        },
        {
          version: 2,
          name: 'add the widget table',
          statements: ['CREATE TABLE widget (id TEXT PRIMARY KEY)'],
        },
      ],
    });

    const { result } = renderHook(() => useMigrationStatus(runner));
    expect(result.current.total).toBe(2);
    expect(result.current.completed).toBe(0);

    await act(async () => {
      await runner.run();
    });

    expect(result.current.phase).toBe('completed');
    expect(result.current.completed).toBe(2);
    expect(result.current.pending).toBe(0);

    await adapter.close();
  });
});
