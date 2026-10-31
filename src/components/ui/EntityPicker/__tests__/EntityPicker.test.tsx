// ABOUTME: Conformance tests for EntityPicker (P1-D01, UX standard 07 section 2).
// ABOUTME: Covers UUID round trip, live create/relabel, scoped filter, keyboard CTA, archived values and load states.

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityPicker, { type EntityPickerLookup } from '../EntityPicker';

interface ClassGroupRow {
  id: string;
  name: string;
  year_id: string;
  archived?: boolean;
}

const IDS = {
  blue: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e5f',
  gold: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e60',
  retired: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e61',
  unknown: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e62',
} as const;

const BLUE: ClassGroupRow = { id: IDS.blue, name: 'Grade 7 Blue', year_id: 'year-2027' };
const GOLD: ClassGroupRow = { id: IDS.gold, name: 'Grade 7 Gold', year_id: 'year-2026' };
const RETIRED: ClassGroupRow = { id: IDS.retired, name: 'Grade 6 Blue', year_id: 'year-2025', archived: true };

/** Test double for the P1-B05 useLookup result: rows stay live, archived rows resolve but are not offered. */
function makeLookup(
  rows: ClassGroupRow[],
  overrides: Partial<EntityPickerLookup<ClassGroupRow>> = {}
): EntityPickerLookup<ClassGroupRow> {
  const byId = new Map(rows.map((row) => [row.id, row] as const));
  return {
    options: rows.filter((row) => !row.archived),
    byId,
    label: (id, fallback = '') => {
      const row = byId.get(id);
      if (!row) return fallback;
      return row.archived ? `${row.name} (archived)` : row.name;
    },
    resolve: (id) => byId.get(id),
    status: 'success',
    isFetching: false,
    getId: (row) => row.id,
    ...overrides,
  };
}

interface HarnessProps {
  lookup: EntityPickerLookup<ClassGroupRow>;
  initialValue?: string | null;
  onChange?: (id: string | null) => void;
  filter?: (row: ClassGroupRow) => boolean;
  emptyState?: React.ReactNode;
  allowClear?: boolean;
}

function Harness({ lookup, initialValue = null, onChange, filter, emptyState, allowClear = true }: HarnessProps) {
  const [value, setValue] = React.useState<string | null>(initialValue);
  return (
    <EntityPicker
      label="Class group"
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange?.(id);
      }}
      lookup={lookup}
      filter={filter}
      emptyState={emptyState}
      allowClear={allowClear}
    />
  );
}

describe('EntityPicker conformance', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('round-trips the exact UUID string through onChange and back into the trigger', async () => {
    const onChange = vi.fn();
    render(<Harness lookup={makeLookup([BLUE, GOLD])} onChange={onChange} />);

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: BLUE.name }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(IDS.blue);
    expect(onChange.mock.calls[0][0]).toBe(IDS.blue);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent(BLUE.name);
  });

  it('keeps the selection, relabels it and accepts newly created options', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Harness lookup={makeLookup([BLUE])} initialValue={IDS.blue} onChange={onChange} />);

    expect(screen.getByRole('combobox', { name: 'Class group' })).toHaveTextContent('Grade 7 Blue');

    rerender(
      <Harness
        lookup={makeLookup([{ ...BLUE, name: 'Grade 8 Blue' }, GOLD])}
        initialValue={IDS.blue}
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    expect(trigger).toHaveTextContent('Grade 8 Blue');
    expect(onChange).not.toHaveBeenCalled();

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: GOLD.name }));

    expect(onChange).toHaveBeenCalledWith(IDS.gold);
    expect(trigger).toHaveTextContent(GOLD.name);
  });

  it('offers only options that pass the scope filter', async () => {
    render(<Harness lookup={makeLookup([BLUE, GOLD])} filter={(row) => row.year_id === 'year-2027'} />);

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: BLUE.name })).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: GOLD.name })).not.toBeInTheDocument();
    expect(within(listbox).getAllByRole('option')).toHaveLength(1);
  });

  it('renders the empty-state CTA when the lookup has no options', async () => {
    const onCreate = vi.fn();
    render(
      <Harness
        lookup={makeLookup([])}
        emptyState={
          <button type="button" onClick={onCreate}>
            Create class group
          </button>
        }
      />
    );

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));
    const cta = screen.getByRole('button', { name: 'Create class group' });
    expect(screen.getByRole('status')).toHaveTextContent('Create class group');
    await user.click(cta);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('does not show the empty-state CTA while the lookup is idle', async () => {
    render(
      <Harness
        lookup={makeLookup([], { status: 'idle' })}
        emptyState={<button type="button">Create class group</button>}
      />
    );

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));

    expect(screen.queryByRole('button', { name: 'Create class group' })).not.toBeInTheDocument();
  });

  it('reaches the empty-state CTA with Tab and activates it with Enter', async () => {
    const onCreate = vi.fn();
    render(
      <Harness
        lookup={makeLookup([])}
        emptyState={
          <button type="button" onClick={onCreate}>
            Create class group
          </button>
        }
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.tab();

    const cta = screen.getByRole('button', { name: 'Create class group' });
    expect(cta).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Enter}');
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('reaches the empty-state CTA with Tab and activates it with Space', async () => {
    const onCreate = vi.fn();
    render(
      <Harness
        lookup={makeLookup([])}
        emptyState={
          <button type="button" onClick={onCreate}>
            Create class group
          </button>
        }
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.tab();

    const cta = screen.getByRole('button', { name: 'Create class group' });
    expect(cta).toHaveFocus();

    await user.keyboard(' ');
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('closes the empty-state popup with Escape and restores focus from the CTA', async () => {
    render(
      <Harness
        lookup={makeLookup([])}
        emptyState={<button type="button">Create class group</button>}
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Create class group' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes and moves on when tabbing from a normal options list', async () => {
    render(
      <>
        <Harness lookup={makeLookup([BLUE, GOLD])} />
        <button type="button">Next field</button>
      </>
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.tab();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Next field' })).toHaveFocus();
  });

  it('shows loading instead of the empty state while the lookup loads', async () => {
    render(
      <Harness
        lookup={makeLookup([], { status: 'loading', isFetching: true })}
        emptyState={<button type="button">Create class group</button>}
      />
    );

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));

    expect(screen.getByText('Loading options...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create class group' })).not.toBeInTheDocument();
  });

  it('surfaces lookup errors as an alert instead of an empty state', async () => {
    render(
      <Harness
        lookup={makeLookup([], { status: 'error', error: new Error('offline') })}
        emptyState={<button type="button">Create class group</button>}
      />
    );

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load options.');
    expect(screen.queryByRole('button', { name: 'Create class group' })).not.toBeInTheDocument();
  });

  it('filters the options by the search text', async () => {
    render(<Harness lookup={makeLookup([BLUE, GOLD])} />);

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));
    await user.type(screen.getByLabelText('Search options'), 'Gold');

    expect(screen.getByRole('option', { name: 'Grade 7 Gold' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Grade 7 Blue' })).not.toBeInTheDocument();
  });

  it('queries a remote lookup and selects a result outside the loaded options', async () => {
    const search = vi.fn(async (term: string) => (term === 'gold' ? [GOLD] : []));
    render(
      <Harness
        lookup={makeLookup([], {
          search,
          describe: (row) => row.name,
        })}
      />
    );

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));
    await user.type(screen.getByLabelText('Search options'), 'gold');

    await waitFor(() => expect(search).toHaveBeenCalledWith('gold'));
    await user.click(await screen.findByRole('option', { name: 'Grade 7 Gold' }));

    expect(screen.getByRole('combobox', { name: 'Class group' })).toHaveTextContent(
      'Grade 7 Gold'
    );
  });

  it('marks an archived stored value and makes it clearable without opting in', async () => {
    const onChange = vi.fn();
    render(
      <EntityPicker
        label="Class group"
        value={IDS.retired}
        onChange={onChange}
        lookup={makeLookup([BLUE, RETIRED])}
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    expect(trigger).toHaveTextContent('Grade 6 Blue (archived)');
    expect(trigger).not.toHaveTextContent(/\(archived\) \(archived\)/);

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('keeps clearing opt-in for current values', () => {
    render(<EntityPicker label="Class group" value={IDS.blue} onChange={vi.fn()} lookup={makeLookup([BLUE])} />);

    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
  });

  it('falls back to the raw id for an archived value with no known label', () => {
    render(<EntityPicker label="Class group" value={IDS.unknown} onChange={vi.fn()} lookup={makeLookup([BLUE])} />);

    expect(screen.getByRole('combobox', { name: 'Class group' })).toHaveTextContent(
      `(archived) ${IDS.unknown}`
    );
  });

  it('prefixes the archived marker when the lookup label does not include it', () => {
    const byId = new Map([[RETIRED.id, RETIRED]]);
    const lookup: EntityPickerLookup<ClassGroupRow> = {
      options: [],
      byId,
      label: (id, fallback = '') => byId.get(id)?.name ?? fallback,
      resolve: (id) => byId.get(id),
      status: 'success',
      isArchived: (row) => row.archived === true,
      getId: (row) => row.id,
    };

    render(<EntityPicker label="Class group" value={IDS.retired} onChange={vi.fn()} lookup={lookup} />);

    expect(screen.getByRole('combobox', { name: 'Class group' })).toHaveTextContent(
      '(archived) Grade 6 Blue'
    );
  });

  it('lets the user replace an archived value with a current option', async () => {
    const onChange = vi.fn();
    render(<Harness lookup={makeLookup([BLUE, RETIRED])} initialValue={IDS.retired} onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));
    await user.click(screen.getByRole('option', { name: BLUE.name }));

    expect(onChange).toHaveBeenCalledWith(IDS.blue);
  });

  it('opens, selects and closes from the keyboard', async () => {
    const onChange = vi.fn();
    render(<EntityPicker label="Class group" value={null} onChange={onChange} lookup={makeLookup([BLUE, GOLD])} />);

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-activedescendant');

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(IDS.blue);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
