// ABOUTME: Database-backed message campaigns (collection 'message_campaigns') with persistent CRUD and page aliases.
// ABOUTME: Display fields (template, creator, approver, audience) are resolved at read time and never stored.

import { useCallback, useMemo } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useAppDataInternal } from '@/hooks/useAppData';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useTemplateCommData } from './useTemplateCommData';
import { AdminCampaignType, CampaignAudienceType } from './types';

export const MESSAGE_CAMPAIGNS_COLLECTION = 'message_campaigns';

/** A stored campaign; template and target ids are strings at runtime. */
export type CampaignRecord = Omit<AdminCampaignType, 'template_id' | 'target_id'> & {
  template_id?: string;
  target_id?: string;
};

type CampaignInput = Omit<
  CampaignRecord,
  'id' | 'created_at' | 'updated_at' | 'template_name' | 'created_by_name' | 'approved_by_name' | 'target_audience_display'
>;

const DISPLAY_FIELDS = new Set(['id', 'template_name', 'created_by_name', 'approved_by_name', 'target_audience_display']);

const stamp = () => new Date().toISOString();

/** Keep only storable fields: no id, no read-time display fields, no undefined; ids as strings. */
const toStored = (record: Partial<CampaignRecord>): Partial<CampaignRecord> => {
  const stored = Object.fromEntries(
    Object.entries(record).filter(([key, value]) => !DISPLAY_FIELDS.has(key) && value !== undefined)
  ) as Partial<CampaignRecord>;
  if (stored.template_id !== undefined) stored.template_id = String(stored.template_id);
  if (stored.target_id !== undefined) stored.target_id = String(stored.target_id);
  return stored;
};

type NamedPerson = { id?: string; user_id?: string; display_name?: string; username?: string; first_name?: string; last_name?: string };
type StreamLike = { id: string | number; name?: string; class_name?: string };

export const useCampaignData = () => {
  const appData = useAppDataInternal() as { classStreams?: StreamLike[]; staff?: NamedPerson[]; users?: NamedPerson[] } | null | undefined;
  const { currentUser } = useUser();
  const { templateComms } = useTemplateCommData();
  const classStreams = appData?.classStreams;
  const staff = appData?.staff;
  const users = appData?.users;

  const collection = useDatabaseCollection<CampaignRecord>(MESSAGE_CAMPAIGNS_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const campaigns = useMemo(() => {
    const personName = (personId?: string) => {
      if (!personId) return undefined;
      if (currentUser?.id === personId) return currentUser.display_name || currentUser.username;
      const member = (staff ?? []).find((item) => item.id === personId || item.user_id === personId);
      if (member) return member.display_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim();
      const user = (users ?? []).find((item) => item.id === personId);
      return user ? user.display_name || user.username : undefined;
    };

    const audience = (record: CampaignRecord) => {
      if (!record.target_audience_type) return record.target_audience_display;
      if (
        record.target_audience_type !== CampaignAudienceType.STUDENTS_OF_CLASS &&
        record.target_audience_type !== CampaignAudienceType.PARENTS_OF_CLASS
      ) {
        return record.target_audience_type;
      }
      const stream = (classStreams ?? []).find((item) => String(item.id) === String(record.target_id));
      return stream ? `${record.target_audience_type} (${stream.class_name} - ${stream.name})` : record.target_audience_type;
    };

    return data.map((record) => ({
      ...record,
      template_name: templateComms.find((item) => item.id === String(record.template_id))?.name || record.template_name,
      created_by_name: personName(record.created_by) || record.created_by_name,
      approved_by_name: personName(record.approved_by) || record.approved_by_name,
      target_audience_display: audience(record),
    }));
  }, [classStreams, currentUser, data, staff, templateComms, users]);

  const create = useCallback(
    async (newItem: CampaignInput | Partial<CampaignRecord>) => {
      const now = stamp();
      return insert({ ...(toStored(newItem) as CampaignInput), created_at: now, updated_at: now } as Omit<CampaignRecord, 'id'>);
    },
    [insert]
  );

  const update = useCallback(
    async (idOrRecord: string | CampaignRecord, patch?: Partial<CampaignRecord>) => {
      const id = typeof idOrRecord === 'object' ? idOrRecord.id : idOrRecord;
      const changes = typeof idOrRecord === 'object' ? idOrRecord : patch ?? {};
      return updateDocument(String(id), { ...toStored(changes), updated_at: stamp() });
    },
    [updateDocument]
  );

  const remove = useCallback(async (id: string) => removeDocument(String(id)), [removeDocument]);

  return {
    campaigns,
    addCampaign: create,
    updateCampaign: update,
    deleteCampaign: remove,
    loading: collection.loading,
    error: collection.error,
    refresh,
    data: campaigns,
    create,
    update,
    remove,
  };
};

export const isGlobalProvider = true;
