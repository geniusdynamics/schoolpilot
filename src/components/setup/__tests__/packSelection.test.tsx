// ABOUTME: The setup wizard's pack selection: the packs come from the registry, a school may choose
// ABOUTME: several, a variant picker appears only where a pack declares one, and an unreviewed pack
// ABOUTME: is labelled as such without being blocked.

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { listAvailablePacks } from '../packs/packLibrary';
import { PackSelection, levelSpan } from '../packs/PackSelection';

const PACKS = listAvailablePacks();

function renderSelection(selected: string[] = []) {
  const onToggle = vi.fn();
  const onCalendar = vi.fn();
  render(
    <PackSelection packs={PACKS} selected={selected} calendars={{}} onToggle={onToggle} onCalendar={onCalendar} />
  );
  return { onToggle, onCalendar };
}

describe('the pack selection step', () => {
  it('offers every pack the registry discovers, with its country and levels', () => {
    renderSelection();

    expect(screen.getByTestId('pack-option-ke-844')).toBeTruthy();
    expect(screen.getByTestId('pack-option-ke-cbe')).toBeTruthy();
    expect(screen.getByTestId('pack-option-gb-national')).toBeTruthy();

    const card = screen.getByTestId('pack-card-ke-844');
    expect(card.textContent).toContain('Kenya 8-4-4 Secondary');
    expect(card.textContent).toContain('KE');
    expect(card.textContent).toContain('Form 1 to Form 4');
  });

  it('names the level span a pack covers', () => {
    const ke844 = PACKS.find((pack) => pack.code === 'ke-844');
    const cbe = PACKS.find((pack) => pack.code === 'ke-cbe');
    expect(ke844 && levelSpan(ke844)).toBe('Form 1 to Form 4');
    expect(cbe && levelSpan(cbe)).toContain(' to ');
  });

  it('says an unreviewed pack has not been reviewed, and does not hide it', () => {
    renderSelection();

    const draft = screen.getByTestId('pack-draft-ke-844');
    expect(draft.textContent).toContain('has not been reviewed by a curriculum officer');
    // The pack is still offered: a school must be able to pilot it.
    expect(screen.getByTestId('pack-option-ke-844')).toBeTruthy();
    expect(within(screen.getByTestId('pack-card-ke-844')).getByRole('checkbox')).toBeTruthy();
  });

  it('toggles a pack on and off through its checkbox', () => {
    const { onToggle } = renderSelection(['ke-cbe']);

    const ke844 = within(screen.getByTestId('pack-card-ke-844')).getByRole('checkbox');
    expect((ke844 as HTMLInputElement).checked).toBe(false);
    fireEvent.click(ke844);
    expect(onToggle).toHaveBeenCalledWith('ke-844', true);

    const cbe = within(screen.getByTestId('pack-card-ke-cbe')).getByRole('checkbox');
    expect((cbe as HTMLInputElement).checked).toBe(true);
    fireEvent.click(cbe);
    expect(onToggle).toHaveBeenCalledWith('ke-cbe', false);
  });

  it('asks for the calendar variant only where the pack declares one', () => {
    renderSelection(['gb-national', 'ke-844']);

    const variant = screen.getByTestId('pack-calendar-gb-national');
    expect(variant).toBeTruthy();
    expect(within(variant as HTMLElement).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Northern academic year (September to July)',
      'Southern academic year (January to November)',
    ]);

    // A single-template pack has nothing to choose.
    expect(screen.queryByTestId('pack-calendar-ke-844')).toBeNull();
  });

  it('reports the chosen calendar variant', () => {
    const { onCalendar } = renderSelection(['gb-national']);
    fireEvent.change(screen.getByTestId('pack-calendar-gb-national'), { target: { value: 'southern' } });
    expect(onCalendar).toHaveBeenCalledWith('gb-national', 'southern');
  });

  it('shows the locale and issuer a pack declares', () => {
    renderSelection();
    const card = screen.getByTestId('pack-card-ke-cbe');
    expect(card.textContent).toContain('Languages: en, sw');
    expect(card.textContent).toContain('KICD');
  });
});
