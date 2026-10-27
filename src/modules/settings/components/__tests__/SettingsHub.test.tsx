// ABOUTME: A Settings hub is a title, one row of tabs and the body of the tab the address names. The address decides
// ABOUTME: the tab, so a link to another tab of the hub you are on works in place, and an old tab name redirects.

import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { SettingsHub, type SettingsHubTab } from '../SettingsHub';

const tabs: SettingsHubTab[] = [
  { id: 'first', label: 'First', icon: null, render: () => <p>the first body</p> },
  { id: 'second', label: 'Second', icon: null, render: () => <p>the second body</p> },
  { id: 'third', label: 'Third', icon: null, render: () => <p>the third body</p> },
];

let search = '';
const LocationProbe: React.FC = () => {
  search = useLocation().search;
  return null;
};

/** A control elsewhere on the page that follows a link, as a card or a menu entry would. */
const Link: React.FC<{ to: string }> = ({ to }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      follow {to}
    </button>
  );
};

const renderHub = (url: string, extra?: React.ReactNode, props?: Partial<React.ComponentProps<typeof SettingsHub>>) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LocationProbe />
      {extra}
      <Routes>
        <Route path="/hub" element={<SettingsHub title="The hub" tabs={tabs} defaultTab="first" {...props} />} />
        <Route path="/elsewhere" element={<p>the page it moved to</p>} />
      </Routes>
    </MemoryRouter>
  );

describe('SettingsHub', () => {
  it('shows its title, one row of tabs, and the default tab\'s body', () => {
    renderHub('/hub');

    expect(screen.getByText('The hub')).toBeTruthy();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual(['First', 'Second', 'Third']);
    expect(screen.getAllByRole('tablist')).toHaveLength(1);
    expect(screen.getByText('the first body')).toBeTruthy();
  });

  it('opens the tab the address names', () => {
    renderHub('/hub?tab=third');

    expect(screen.getByText('the third body')).toBeTruthy();
    expect(screen.queryByText('the first body')).toBeNull();
  });

  it('opens the default tab for a tab it does not have', () => {
    renderHub('/hub?tab=nonsense');

    expect(screen.getByText('the first body')).toBeTruthy();
  });

  it('switches to a tab when it is clicked, and puts the tab in the address', () => {
    renderHub('/hub');

    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));

    expect(screen.getByText('the second body')).toBeTruthy();
    expect(search).toBe('?tab=second');
  });

  it('leaves the address bare when the default tab is clicked', () => {
    renderHub('/hub?tab=second');

    fireEvent.click(screen.getByRole('tab', { name: 'First' }));

    expect(screen.getByText('the first body')).toBeTruthy();
    expect(search).toBe('');
  });

  it('switches tab in place when a link to another tab of the same hub is followed', () => {
    // The hubs used to copy ?tab= into state once, so this link did nothing: the old tab stayed open.
    renderHub('/hub', <Link to="/hub?tab=third" />);
    expect(screen.getByText('the first body')).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'follow /hub?tab=third' }));
    });

    expect(screen.getByText('the third body')).toBeTruthy();
    expect(screen.queryByText('the first body')).toBeNull();
  });

  it('keeps the other parts of the address when it changes tab', () => {
    renderHub('/hub?keep=me');

    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));

    expect(new URLSearchParams(search).get('keep')).toBe('me');
    expect(new URLSearchParams(search).get('tab')).toBe('second');
  });

  it('sends an old tab name to the page that holds it now', () => {
    renderHub('/hub?tab=old', null, { movedTabs: { old: '/elsewhere?tab=new' } });

    expect(screen.getByText('the page it moved to')).toBeTruthy();
    expect(search).toBe('?tab=new');
  });

  it('shows its banner above the body of every tab', () => {
    renderHub('/hub', null, { banner: <p>a warning for every tab</p> });
    expect(screen.getByText('a warning for every tab')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    expect(screen.getByText('a warning for every tab')).toBeTruthy();
    expect(screen.getByText('the second body')).toBeTruthy();
  });
});
