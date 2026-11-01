// ABOUTME: The header's setup nag: it appears only for someone who can finish setup, only while rows
// ABOUTME: are missing, and it takes the reader to the wizard.

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'u1', role: 'super_admin', permissions: ['*'] } as {
    id: string;
    role: string;
    permissions: string[];
  },
  checklist: {
    loading: false,
    readable: true,
    complete: false,
    completed: 2,
    total: 5,
    missing: [
      { id: 'year', label: 'Academic year and terms', complete: false },
      { id: 'subjects', label: 'Subjects', complete: false },
    ],
  },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useSetupChecklist', () => ({ useSetupChecklist: () => state.checklist }));
vi.mock('@/components/ui/icons', () => ({
  ArrowRightIcon: () => null,
  ExclamationTriangleIcon: () => null,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : key;
      return text.replace('{{missing}}', String(options?.missing ?? ''));
    },
  }),
}));

import { SetupNag } from '../SetupNag';

let currentPath = '/';
const LocationProbe = () => {
  currentPath = useLocation().pathname;
  return null;
};

const renderNag = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <SetupNag />
      <LocationProbe />
    </MemoryRouter>
  );

describe('SetupNag', () => {
  beforeEach(() => {
    state.user = { id: 'u1', role: 'super_admin', permissions: ['*'] };
    state.checklist = {
      ...state.checklist,
      readable: true,
      loading: false,
      complete: false,
      completed: 2,
      total: 5,
    };
    currentPath = '/dashboard';
  });

  it('shows the missing count and opens the wizard', () => {
    renderNag();

    const button = screen.getByTestId('setup-nag');
    expect(button).toHaveTextContent('2/5');
    expect(button).toHaveAttribute(
      'title',
      expect.stringContaining('Academic year and terms, Subjects')
    );

    fireEvent.click(button);

    expect(currentPath).toBe('/setup');
  });

  it('is silent when the school is set up', () => {
    state.checklist = { ...state.checklist, complete: true, completed: 5 };

    renderNag();

    expect(screen.queryByTestId('setup-nag')).not.toBeInTheDocument();
  });

  it('is silent while the checklist is loading', () => {
    state.checklist = { ...state.checklist, loading: true };

    renderNag();

    expect(screen.queryByTestId('setup-nag')).not.toBeInTheDocument();
  });

  it('does not nag a role that cannot change settings', () => {
    state.user = { id: 'u2', role: 'teacher', permissions: ['academics.view'] };

    renderNag();

    expect(screen.queryByTestId('setup-nag')).not.toBeInTheDocument();
  });
});
