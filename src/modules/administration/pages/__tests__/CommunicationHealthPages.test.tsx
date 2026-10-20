// ABOUTME: Regression tests for administration communication and student health pages.
// ABOUTME: Verifies the database-backed hooks load stored data into the pages using the expected page-facing APIs.

import { render as rtlRender, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageCampaignsPage from '../MessageCampaignsPage';
import StudentHealthRecordsPage from '../StudentHealthRecordsPage';
import { ToastProvider } from '@/hooks/useToast';
import { CampaignAudienceType, CampaignStatus, TemplateType } from '../../data/types';
import { databaseService } from '@/services/database/databaseService';

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

vi.mock('@/services/database/databaseService', () => ({
  databaseService: { getDatabase: vi.fn(), generateId: vi.fn(() => 'generated-id') }
}));

// Campaigns, templates and health records now come from the database, not mock arrays.
const storedRows: Record<string, Array<Record<string, unknown>>> = {
  communication_templates: [
    {
      id: 'tpl-1',
      name: 'Welcome Message',
      type: TemplateType.SMS,
      body_template: 'Welcome {{student_name}}',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }
  ],
  message_campaigns: [
    {
      id: 'CAMP001',
      name: 'New Term Welcome',
      template_id: 'tpl-1',
      body: 'Welcome to the new academic term!',
      status: CampaignStatus.SENT,
      target_audience_type: CampaignAudienceType.ALL_STUDENTS,
      created_by: 'STF001_USR',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }
  ],
  student_health_records: [
    {
      id: 'SHR001',
      student_id: 'S001',
      blood_type: 'O+',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }
  ]
};

describe('administration communication and health pages', () => {
  beforeEach(() => {
    vi.mocked(databaseService.getDatabase).mockResolvedValue({
      getCollection: (name: string) => ({
        find: async () => (storedRows[name] ?? []).map((row) => ({ ...row }))
      })
    } as never);
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

  it('renders student rows and existing health record state', async () => {
    render(<StudentHealthRecordsPage />);

    expect(screen.getByText('Jim Halpert')).toBeInTheDocument();
    expect(screen.getByText('ADM001')).toBeInTheDocument();
    expect((await screen.findAllByText('Record Exists')).length).toBeGreaterThan(0);
  });

  it('renders populated campaign details from the repaired campaign and template hooks', async () => {
    render(<MessageCampaignsPage />);

    expect(await screen.findByText('New Term Welcome')).toBeInTheDocument();
    expect(await screen.findByText('Welcome Message')).toBeInTheDocument();
    expect(screen.getByText('Michael Scott')).toBeInTheDocument();
    expect(screen.getByText('All Students')).toBeInTheDocument();
  });
});
