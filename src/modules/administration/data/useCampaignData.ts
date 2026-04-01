// ABOUTME: Self-contained hook for campaign data management.
// ABOUTME: Provides CRUD operations plus page-friendly aliases and populated display fields.

import { useMemo, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useAppDataInternal } from '../../../hooks/useAppData';
import { initialMockCampaigns, initialMockClassStreams, initialMockStaff, initialMockTemplateComms, initialMockUsers } from './mockData';
import { AdminCampaignType, CampaignAudienceType } from './types';

type CampaignInput = Omit<
  AdminCampaignType,
  'id' | 'created_at' | 'updated_at' | 'template_name' | 'created_by_name' | 'approved_by_name' | 'target_audience_display'
>;

const createTimestamp = () => new Date().toISOString();

export const useCampaignData = () => {
  const appData = useAppDataInternal();
  const { currentUser } = useUser();
  const templates = appData?.templatesComm ?? initialMockTemplateComms;
  const classStreams = appData?.classStreams ?? initialMockClassStreams;
  const staff = appData?.staff ?? initialMockStaff;
  const users = appData?.users ?? initialMockUsers;
  const [data, setData] = useState<AdminCampaignType[]>(initialMockCampaigns);

  const resolvePersonName = (personId?: string) => {
    if (!personId) {
      return undefined;
    }

    if (currentUser?.id === personId) {
      return currentUser.display_name || currentUser.username;
    }

    const matchedStaff = staff.find(
      (member) => member.id === personId || member.user_id === personId
    );
    if (matchedStaff) {
      return matchedStaff.display_name || `${matchedStaff.first_name} ${matchedStaff.last_name}`.trim();
    }

    const matchedUser = users.find((user) => user.id === personId);
    if (matchedUser) {
      return matchedUser.display_name || matchedUser.username;
    }

    return undefined;
  };

  const resolveTargetAudienceDisplay = (record: AdminCampaignType) => {
    if (!record.target_audience_type) {
      return record.target_audience_display;
    }

    if (
      record.target_audience_type !== CampaignAudienceType.STUDENTS_OF_CLASS &&
      record.target_audience_type !== CampaignAudienceType.PARENTS_OF_CLASS
    ) {
      return record.target_audience_type;
    }

    const targetClassStream = classStreams.find(
      (classStream) => String(classStream.id) === String(record.target_id)
    );

    if (!targetClassStream) {
      return record.target_audience_display || record.target_audience_type;
    }

    return `${record.target_audience_type} (${targetClassStream.class_name} - ${targetClassStream.name})`;
  };

  const populateCampaign = (record: AdminCampaignType): AdminCampaignType => {
    const template = templates.find((item) => item.id === record.template_id);

    return {
      ...record,
      template_name: template?.name || record.template_name,
      created_by_name: resolvePersonName(record.created_by) || record.created_by_name,
      approved_by_name: resolvePersonName(record.approved_by) || record.approved_by_name,
      target_audience_display: resolveTargetAudienceDisplay(record)
    };
  };

  const campaigns = useMemo(
    () => data.map(populateCampaign),
    [classStreams, currentUser, data, staff, templates, users]
  );

  const create = async (newItem: CampaignInput | Partial<AdminCampaignType>) => {
    const timestamp = createTimestamp();
    const newDataItem = populateCampaign({
      ...(newItem as AdminCampaignType),
      id: Date.now().toString(),
      created_at: timestamp,
      updated_at: timestamp
    });

    setData((previousCampaigns) => [...previousCampaigns, newDataItem]);
    return newDataItem;
  };

  const update = async (
    idOrRecord: string | number | AdminCampaignType,
    updatedData?: Partial<AdminCampaignType>
  ) => {
    const recordToPersist =
      typeof idOrRecord === 'object'
        ? idOrRecord
        : ({ id: String(idOrRecord), ...(updatedData || {}) } as AdminCampaignType);

    let updatedCampaign: AdminCampaignType | undefined;

    setData((previousCampaigns) =>
      previousCampaigns.map((campaign) => {
        if (campaign.id !== recordToPersist.id) {
          return campaign;
        }

        updatedCampaign = populateCampaign({
          ...campaign,
          ...recordToPersist,
          updated_at: createTimestamp()
        });

        return updatedCampaign;
      })
    );

    return updatedCampaign;
  };

  const remove = async (id: string | number) => {
    const normalizedId = String(id);
    setData((previousCampaigns) => previousCampaigns.filter((campaign) => campaign.id !== normalizedId));
  };

  return {
    campaigns,
    addCampaign: create,
    updateCampaign: update,
    deleteCampaign: remove,
    data: campaigns,
    create,
    update,
    remove
  };
};

export const isGlobalProvider = true;
