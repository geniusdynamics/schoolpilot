// ABOUTME: Database-backed student health records (collection 'student_health_records') with persistent CRUD.
// ABOUTME: Student names are resolved at read time from app data and never stored; page aliases are kept.

import { useCallback, useMemo } from 'react';
import { useAppDataInternal } from '@/hooks/useAppData';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { AdminStudentHealthRecordType } from './types';

export const STUDENT_HEALTH_RECORDS_COLLECTION = 'student_health_records';

type StudentHealthRecordInput = Omit<AdminStudentHealthRecordType, 'id' | 'created_at' | 'updated_at' | 'student_name'>;
type StudentLike = { id: string; first_name?: string; last_name?: string };

const stamp = () => new Date().toISOString();

const toStored = (record: Partial<AdminStudentHealthRecordType>) =>
  Object.fromEntries(
    Object.entries(record).filter(([key, value]) => key !== 'id' && key !== 'student_name' && value !== undefined)
  ) as Partial<AdminStudentHealthRecordType>;

export const useStudentHealthRecordData = () => {
  const appData = useAppDataInternal() as { students?: StudentLike[] } | null | undefined;
  const students = appData?.students;

  const collection = useDatabaseCollection<AdminStudentHealthRecordType>(STUDENT_HEALTH_RECORDS_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const studentHealthRecords = useMemo(
    () =>
      data.map((record) => {
        const student = (students ?? []).find((item) => item.id === record.student_id);
        const name = student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : '';
        return { ...record, student_name: name || record.student_name };
      }),
    [data, students]
  );

  const create = useCallback(
    async (newItem: StudentHealthRecordInput | Partial<AdminStudentHealthRecordType>) => {
      const now = stamp();
      return insert({ ...(toStored(newItem) as StudentHealthRecordInput), created_at: now, updated_at: now });
    },
    [insert]
  );

  const update = useCallback(
    async (idOrRecord: string | AdminStudentHealthRecordType, patch?: Partial<AdminStudentHealthRecordType>) => {
      const id = typeof idOrRecord === 'object' ? idOrRecord.id : idOrRecord;
      const changes = typeof idOrRecord === 'object' ? idOrRecord : patch ?? {};
      return updateDocument(String(id), { ...toStored(changes), updated_at: stamp() });
    },
    [updateDocument]
  );

  const remove = useCallback(async (id: string) => removeDocument(String(id)), [removeDocument]);

  return {
    studentHealthRecords,
    addStudentHealthRecord: create,
    updateStudentHealthRecord: update,
    deleteStudentHealthRecord: remove,
    loading: collection.loading,
    error: collection.error,
    refresh,
    data: studentHealthRecords,
    create,
    update,
    remove,
  };
};

export const isGlobalProvider = true;
