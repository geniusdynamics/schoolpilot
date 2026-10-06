// ABOUTME: Regression tests for administration communication and student health pages.
// ABOUTME: Verifies the repaired hooks load data into the pages using the expected page-facing APIs.

import { render as rtlRender, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageCampaignsPage from '../MessageCampaignsPage';
import StudentHealthRecordsPage from '../StudentHealthRecordsPage';
import { ToastProvider } from '@/hooks/useToast';
import { TemplateType } from '../../data/types';

// This file imports RTL's render directly (bypassing the global provider
// wrapper in setup.ts); MessageCampaignsPage calls useToast(), so wrap here.
const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(<ToastProvider>{ui}</ToastProvider>, options);

const mockUseAppData = vi.fn();
const mockUseAppDataInternal = vi.fn();
const mockUseUser = vi.fn();

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mockUseAppData(),
  useAppDataInternal: () => mockUseAppDataInternal()
}));

vi.mock('@/contexts/UserContext', () => ({
  useUser: () => mockUseUser()
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('administration communication and health pages', () => {
  beforeEach(() => {
    const appData = {
      students: [
        {
          id: 'S001',
          admission_no: 'ADM001',
          first_name: 'Jim',
          last_name: 'Halpert',
          current_class_name: 'Form 1'
        },
        {
          id: 'S002',
          admission_no: 'ADM002',
          first_name: 'Michael',
          last_name: 'Scofield',
          current_class_name: 'Form 1'
        }
      ],
      classStreams: [
        {
          id: 1,
          class_id: 1,
          name: 'A',
          class_name: 'Form 1',
          class_teacher_id: 'STF013'
        }
      ],
      templatesComm: [
        {
          id: 1,
          name: 'Welcome Message',
          type: TemplateType.SMS,
          body_template: 'Welcome {{student_name}}',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      ],
      staff: [
        {
          id: 'STF001',
          user_id: 'STF001_USR',
          staff_no: 'EMP001',
          first_name: 'Michael',
          last_name: 'Scott',
          display_name: 'Michael Scott',
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      ],
      users: []
    };

    mockUseAppData.mockReturnValue(appData);
    mockUseAppDataInternal.mockReturnValue(appData);
    mockUseUser.mockReturnValue({
      currentUser: {
        id: 'USR_MOCK_ADMIN',
        username: 'admin_user',
        display_name: 'Admin User (Mock)'
      }
    });
  });

  it('renders student rows and existing health record state', () => {
    render(<StudentHealthRecordsPage />);

    expect(screen.getByText('Jim Halpert')).toBeInTheDocument();
    expect(screen.getByText('ADM001')).toBeInTheDocument();
    expect(screen.getAllByText('Record Exists').length).toBeGreaterThan(0);
  });

  it('renders populated campaign details from the repaired campaign and template hooks', () => {
    render(<MessageCampaignsPage />);

    expect(screen.getByText('New Term Welcome')).toBeInTheDocument();
    expect(screen.getByText('Welcome Message')).toBeInTheDocument();
    expect(screen.getByText('Michael Scott')).toBeInTheDocument();
    expect(screen.getByText('All Students')).toBeInTheDocument();
  });
});
