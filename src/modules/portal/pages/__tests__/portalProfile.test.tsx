// ABOUTME: The portal profile: the consent editor a guardian uses, the change it persists, the error
// ABOUTME: it reports, and the learner's view without a consent editor.

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PortalSession } from '../../data/usePortalSession';
import type { PortalConsent } from '../../data/portalConsent';

const hooks = vi.hoisted(() => ({
  consent: {} as Record<string, unknown>,
}));
const toast = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
}));

vi.mock('../../data/usePortalSession', () => ({
  usePortalConsent: () => hooks.consent,
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

import { PortalProfileContent } from '../PortalProfilePage';

const LEARNER = {
  id: '00000000-0000-7000-8000-0000000000a1',
  name: 'Amina Wanjiku',
  admissionNumber: 'ADM/2026/001',
  className: 'Form 1 North',
};

const session = (overrides: Partial<PortalSession> = {}): PortalSession => ({
  identity: { status: 'linked', role: 'guardian', learners: [LEARNER], guardianName: 'Grace Mwangi' },
  status: 'linked',
  role: 'guardian',
  learners: [LEARNER],
  selectedLearner: LEARNER,
  selectLearner: vi.fn(),
  displayName: 'Grace Mwangi',
  readerId: 'user-1',
  loading: false,
  error: null,
  ...overrides,
});

const consent = (overrides: Partial<PortalConsent> = {}): PortalConsent => ({
  linkId: 'link-1',
  learnerId: LEARNER.id,
  learnerName: LEARNER.name,
  receivesReports: true,
  receivesSms: false,
  preferredChannel: 'sms',
  preferredLanguage: 'en',
  ...overrides,
});

const renderProfile = () =>
  render(
    <MemoryRouter>
      <PortalProfileContent />
    </MemoryRouter>
  );

beforeEach(() => {
  toast.showSuccess.mockClear();
  toast.showError.mockClear();
  hooks.consent = { session: session(), consents: [consent()], loading: false, error: null, save: vi.fn() };
});

describe('the portal profile', () => {
  it('shows each child’s consent preferences to a guardian', () => {
    renderProfile();

    expect(screen.getAllByText('Amina Wanjiku').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Send me this child’s term reports/)).toBeChecked();
    expect(screen.getByLabelText(/Send me SMS about this child/)).not.toBeChecked();
    expect((screen.getByLabelText('Preferred contact channel') as HTMLSelectElement).value).toBe(
      'sms'
    );
  });

  it('saves the change the guardian made and says so', async () => {
    const save = vi.fn(async () => undefined);
    hooks.consent = { session: session(), consents: [consent()], loading: false, error: null, save };
    renderProfile();

    fireEvent.click(screen.getByLabelText(/Send me SMS about this child/));
    fireEvent.change(screen.getByLabelText('Preferred contact channel'), {
      target: { value: 'email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toast.showSuccess).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith({
      consent: consent(),
      receivesReports: true,
      receivesSms: true,
      preferredChannel: 'email',
      preferredLanguage: 'en',
    });
  });

  it('reports a refused change instead of pretending it was saved', async () => {
    const save = vi.fn(async () => {
      throw new Error('A newer copy of this preference was saved; reload and try again.');
    });
    hooks.consent = { session: session(), consents: [consent()], loading: false, error: null, save };
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(toast.showError).toHaveBeenCalledWith(
        'A newer copy of this preference was saved; reload and try again.'
      )
    );
  });

  it('does not offer a consent editor to a learner', () => {
    hooks.consent = {
      session: session({ role: 'learner', displayName: 'Amina Wanjiku' }),
      consents: [],
      loading: false,
      error: null,
      save: vi.fn(),
    };
    renderProfile();

    expect(screen.queryByText('Consent and contact preferences')).toBeNull();
    expect(screen.getByText('Signed in as a learner.')).toBeTruthy();
  });

  it('says plainly which consents the schema does not hold', () => {
    renderProfile();

    expect(screen.getByText(/Marketing, photography and data-sharing consents/)).toBeTruthy();
  });
});
