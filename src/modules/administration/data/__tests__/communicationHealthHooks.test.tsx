// ABOUTME: Regression tests for administration communication and student health data hooks.
// ABOUTME: Verifies page-facing aliases, read-time display fields, and CRUD through an in-memory database collection.

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCampaignData } from '../useCampaignData';
import { useStudentHealthRecordData } from '../useStudentHealthRecordData';
import { useTemplateCommData } from '../useTemplateCommData';
import { CampaignAudienceType, CampaignStatus, TemplateType } from '../types';
import { databaseService } from '@/services/database/databaseService';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: { getDatabase: vi.fn(), generateId: vi.fn() }
}));

type Row = { id: string } & Record<string, unknown>;
let store: Record<string, Row[]>;
let idCounter = 0;

const collectionFor = (name: string) => ({
  find: async () => (store[name] ?? []).map((row) => ({ ...row })),
  insert: async (doc: Row) => {
    store[name] = [...(store[name] ?? []), { ...doc }];
    return { ...doc };
  },
  update: async (id: string, patch: Record<string, unknown>) => {
    store[name] = (store[name] ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row));
    return store[name].find((row) => row.id === id) ?? null;
  },
  remove: async (id: string) => {
    store[name] = (store[name] ?? []).filter((row) => row.id !== id);
    return true;
  }
});

const mockUseAppDataInternal = vi.fn();
const mockUseUser = vi.fn();

vi.mock('../../../../hooks/useAppData', () => ({
  useAppDataInternal: () => mockUseAppDataInternal()
}));

vi.mock('@/contexts/UserContext', () => ({
  useUser: () => mockUseUser()
}));

describe('administration communication and health hooks', () => {
  beforeEach(() => {
    idCounter = 0;
    store = {
      communication_templates: [
        {
          id: 'tpl-99',
          name: 'Parent Reminder',
          type: TemplateType.EMAIL,
          subject: 'Reminder',
          body_template: 'Hello {{parent_name}}',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      ]
    };
    vi.mocked(databaseService.generateId).mockImplementation(() => `new-${++idCounter}`);
    vi.mocked(databaseService.getDatabase).mockResolvedValue({ getCollection: collectionFor } as never);

    mockUseAppDataInternal.mockReturnValue({
      students: [
        {
          id: 'S100',
          first_name: 'Ada',
          last_name: 'Lovelace'
        }
      ],
      classStreams: [
        {
          id: 7,
          class_id: 4,
          name: 'East',
          class_name: 'Form 4',
          class_teacher_id: 'STF200'
        }
      ],
      staff: [],
      users: []
    });

    mockUseUser.mockReturnValue({
      currentUser: {
        id: 'USR_MOCK_ADMIN',
        username: 'admin_user',
        display_name: 'Admin User (Mock)'
      }
    });
  });

  it('exposes template aliases alongside the legacy template API', async () => {
    const { result } = renderHook(() => useTemplateCommData());

    await waitFor(() => expect(result.current.templateComms.length).toBeGreaterThan(0));
    expect(result.current.templateComms).toEqual(result.current.data);
    expect(result.current.addTemplateComm).toBe(result.current.create);
    expect(result.current.updateTemplateComm).toBe(result.current.update);
    expect(result.current.deleteTemplateComm).toBe(result.current.remove);
  });

  it('populates student names and supports page-style health record updates', async () => {
    const { result } = renderHook(() => useStudentHealthRecordData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addStudentHealthRecord({
        student_id: 'S100',
        blood_type: 'AB+'
      });
    });

    const createdRecord = result.current.studentHealthRecords.at(-1);

    expect(createdRecord).toMatchObject({
      student_id: 'S100',
      student_name: 'Ada Lovelace',
      blood_type: 'AB+'
    });

    await act(async () => {
      await result.current.updateStudentHealthRecord({
        ...createdRecord!,
        allergies: 'Dust'
      });
    });

    expect(result.current.studentHealthRecords.at(-1)).toMatchObject({
      student_name: 'Ada Lovelace',
      allergies: 'Dust'
    });
  });

  it('populates campaign display fields and supports page-style campaign CRUD', async () => {
    const { result } = renderHook(() => useCampaignData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addCampaign({
        name: 'Form 4 Reminder',
        template_id: 'tpl-99',
        body: 'Don\'t forget tomorrow\'s briefing.',
        status: CampaignStatus.DRAFT,
        target_audience_type: CampaignAudienceType.STUDENTS_OF_CLASS,
        target_id: '7',
        created_by: 'USR_MOCK_ADMIN'
      });
    });

    await waitFor(() => expect(result.current.campaigns.at(-1)?.template_name).toBe('Parent Reminder'));
    const createdCampaign = result.current.campaigns.at(-1);
    expect(store.message_campaigns[0]).not.toHaveProperty('template_name');

    expect(createdCampaign).toMatchObject({
      template_name: 'Parent Reminder',
      created_by_name: 'Admin User (Mock)',
      target_audience_display: 'Students of Class (Form 4 - East)'
    });

    await act(async () => {
      await result.current.updateCampaign({
        ...createdCampaign!,
        status: CampaignStatus.SCHEDULED
      });
    });

    expect(result.current.campaigns.at(-1)?.status).toBe(CampaignStatus.SCHEDULED);
    expect(store.message_campaigns[0].status).toBe(CampaignStatus.SCHEDULED);

    await act(async () => {
      await result.current.deleteCampaign(createdCampaign!.id);
    });

    expect(result.current.campaigns.some((campaign) => campaign.id === createdCampaign!.id)).toBe(false);
  });
});
