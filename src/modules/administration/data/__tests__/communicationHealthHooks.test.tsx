// ABOUTME: Regression tests for administration communication and student health data hooks.
// ABOUTME: Verifies page-facing aliases and populated display fields remain available.

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCampaignData } from '../useCampaignData';
import { useStudentHealthRecordData } from '../useStudentHealthRecordData';
import { useTemplateCommData } from '../useTemplateCommData';
import { CampaignAudienceType, CampaignStatus, TemplateType } from '../types';

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
    mockUseAppDataInternal.mockReturnValue({
      students: [
        {
          id: 'S100',
          first_name: 'Ada',
          last_name: 'Lovelace'
        }
      ],
      templatesComm: [
        {
          id: 99,
          name: 'Parent Reminder',
          type: TemplateType.EMAIL,
          subject: 'Reminder',
          body_template: 'Hello {{parent_name}}',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
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

  it('exposes template aliases alongside the legacy template API', () => {
    const { result } = renderHook(() => useTemplateCommData());

    expect(result.current.templateComms.length).toBeGreaterThan(0);
    expect(result.current.templateComms).toEqual(result.current.data);
    expect(result.current.addTemplateComm).toBe(result.current.create);
    expect(result.current.updateTemplateComm).toBe(result.current.update);
    expect(result.current.deleteTemplateComm).toBe(result.current.remove);
  });

  it('populates student names and supports page-style health record updates', async () => {
    const { result } = renderHook(() => useStudentHealthRecordData());

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

    await act(async () => {
      await result.current.addCampaign({
        name: 'Form 4 Reminder',
        template_id: 99,
        body: 'Don\'t forget tomorrow\'s briefing.',
        status: CampaignStatus.DRAFT,
        target_audience_type: CampaignAudienceType.STUDENTS_OF_CLASS,
        target_id: 7,
        created_by: 'USR_MOCK_ADMIN'
      });
    });

    const createdCampaign = result.current.campaigns.at(-1);

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

    await act(async () => {
      await result.current.deleteCampaign(createdCampaign!.id);
    });

    expect(result.current.campaigns.some((campaign) => campaign.id === createdCampaign!.id)).toBe(false);
  });
});
