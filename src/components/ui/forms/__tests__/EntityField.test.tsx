// ABOUTME: Tests for EntityField binding D01's EntityPicker to an injected lookup.
// ABOUTME: Uses a lookup test double; the field must pass opaque ids and picker states through.

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EntityField from '../EntityField';
import type { EntityFormLookup } from '../fieldTypes';

interface ClassGroupRow {
  id: string;
  name: string;
  archived?: boolean;
}

const IDS = {
  blue: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e5f',
  gold: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e60',
  retired: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e61',
} as const;

const BLUE: ClassGroupRow = { id: IDS.blue, name: 'Grade 7 Blue' };
const GOLD: ClassGroupRow = { id: IDS.gold, name: 'Grade 7 Gold' };
const RETIRED: ClassGroupRow = { id: IDS.retired, name: 'Grade 6 Blue', archived: true };

/** Test double for the P1-B05 useLookup result; archived rows resolve but are not offered. */
function makeLookup(rows: ClassGroupRow[], overrides: Partial<EntityFormLookup> = {}): EntityFormLookup {
  const byId = new Map(rows.map((row) => [row.id, row] as const));
  return {
    options: rows.filter((row) => !row.archived),
    byId,
    label: (id, fallback = '') => byId.get(id)?.name ?? fallback,
    resolve: (id) => byId.get(id),
    status: 'success',
    isFetching: false,
    ...overrides,
  };
}

describe('EntityField', () => {
  it('selects an option and emits its opaque UUID', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EntityField
        label="Class group"
        value={null}
        onChange={onChange}
        lookup={makeLookup([BLUE, GOLD])}
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: BLUE.name }));

    expect(onChange).toHaveBeenCalledWith(IDS.blue);
  });

  it('shows the current label and keeps archived values visible', () => {
    render(
      <EntityField
        label="Class group"
        value={IDS.retired}
        onChange={vi.fn()}
        lookup={makeLookup([BLUE, RETIRED])}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Class group' })).toHaveTextContent(
      'Grade 6 Blue'
    );
  });

  it('renders helper text and the picker error with aria-invalid', () => {
    render(
      <EntityField
        label="Class group"
        value={null}
        onChange={vi.fn()}
        lookup={makeLookup([BLUE])}
        helperText="Current academic year only"
        error="Class group is required"
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Class group is required');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger.getAttribute('aria-describedby')).toContain(error.id);

    const describedBy = (trigger.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean);
    expect(describedBy.length).toBeGreaterThan(0);
    for (const id of describedBy) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(screen.queryByText('Current academic year only')).not.toBeInTheDocument();
  });

  it('scopes selection through the injected lookup options', async () => {
    const user = userEvent.setup();
    render(
      <EntityField
        label="Class group"
        value={null}
        onChange={vi.fn()}
        lookup={makeLookup([BLUE, GOLD], { options: [GOLD] })}
      />
    );

    await user.click(screen.getByRole('combobox', { name: 'Class group' }));

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: GOLD.name })).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: BLUE.name })).not.toBeInTheDocument();
  });

  it('is keyboard reachable and disabled while saving', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <EntityField
        label="Class group"
        value={null}
        onChange={onChange}
        lookup={makeLookup([BLUE])}
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Class group' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(IDS.blue);

    rerender(
      <EntityField
        label="Class group"
        value={null}
        onChange={onChange}
        lookup={makeLookup([BLUE])}
        disabled
      />
    );
    expect(screen.getByRole('combobox', { name: 'Class group' })).toBeDisabled();
  });
});
