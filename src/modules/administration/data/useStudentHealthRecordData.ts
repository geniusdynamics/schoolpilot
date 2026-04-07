// ABOUTME: Self-contained hook for student health record data management.
// ABOUTME: Provides CRUD operations plus page-friendly aliases and populated student names.

import { useMemo, useState } from 'react';
import { useAppDataInternal } from '@/hooks/useAppData';
import { initialMockStudentHealthRecords, initialMockStudents } from './mockData';
import { AdminStudentHealthRecordType } from './types';

type StudentHealthRecordInput = Omit<
  AdminStudentHealthRecordType,
  'id' | 'created_at' | 'updated_at' | 'student_name'
>;

const createTimestamp = () => new Date().toISOString();

export const useStudentHealthRecordData = () => {
  const appData = useAppDataInternal();
  const students = appData?.students ?? initialMockStudents;
  const [data, setData] = useState<AdminStudentHealthRecordType[]>(initialMockStudentHealthRecords);

  const populateStudentHealthRecord = (record: AdminStudentHealthRecordType): AdminStudentHealthRecordType => {
    const student = students.find((item) => item.id === record.student_id);
    const studentName = student
      ? `${student.first_name} ${student.last_name}`.trim()
      : record.student_name;

    return {
      ...record,
      student_name: studentName || record.student_name
    };
  };

  const studentHealthRecords = useMemo(
    () => data.map(populateStudentHealthRecord),
    [data, students]
  );

  const create = async (newItem: StudentHealthRecordInput | Partial<AdminStudentHealthRecordType>) => {
    const timestamp = createTimestamp();
    const newDataItem = populateStudentHealthRecord({
      ...(newItem as AdminStudentHealthRecordType),
      id: Date.now().toString(),
      created_at: timestamp,
      updated_at: timestamp
    });

    setData((previousRecords) => [...previousRecords, newDataItem]);
    return newDataItem;
  };

  const update = async (
    idOrRecord: string | number | AdminStudentHealthRecordType,
    updatedData?: Partial<AdminStudentHealthRecordType>
  ) => {
    const recordToPersist =
      typeof idOrRecord === 'object'
        ? idOrRecord
        : ({ id: String(idOrRecord), ...(updatedData || {}) } as AdminStudentHealthRecordType);

    let updatedRecord: AdminStudentHealthRecordType | undefined;

    setData((previousRecords) =>
      previousRecords.map((record) => {
        if (record.id !== recordToPersist.id) {
          return record;
        }

        updatedRecord = populateStudentHealthRecord({
          ...record,
          ...recordToPersist,
          updated_at: createTimestamp()
        });

        return updatedRecord;
      })
    );

    return updatedRecord;
  };

  const remove = async (id: string | number) => {
    const normalizedId = String(id);
    setData((previousRecords) => previousRecords.filter((record) => record.id !== normalizedId));
  };

  return {
    studentHealthRecords,
    addStudentHealthRecord: create,
    updateStudentHealthRecord: update,
    deleteStudentHealthRecord: remove,
    data: studentHealthRecords,
    create,
    update,
    remove
  };
};

export const isGlobalProvider = true;
