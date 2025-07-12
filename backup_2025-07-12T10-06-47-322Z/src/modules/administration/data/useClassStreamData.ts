// ABOUTME: Global provider hook for ClassStream entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { ClassStream } from '../../../core/types';
import { initialMockClassStreams } from './mockData';

export const isGlobalProvider = true;

export function useClassStreamData() {
  const [classStreams, setClassStreams] = useState<ClassStream[]>(initialMockClassStreams);

  const addClassStream = async (classId: number, streamData: Omit<ClassStream, 'id' | 'class_id'>) => {
    const newStream: ClassStream = {
      ...streamData,
      id: Math.max(...classStreams.map(cs => cs.id), 0) + 1,
      class_id: classId,
    };
    setClassStreams(prev => [...prev, newStream]);
    return newStream;
  };

  const updateClassStream = (updated: ClassStream) => {
    setClassStreams(prev => prev.map(cs => cs.id === updated.id ? updated : cs));
    return updated;
  };

  const deleteClassStream = (id: number) => {
    setClassStreams(prev => prev.filter(cs => cs.id !== id));
  };

  return {
    classStreams,
    addClassStream,
    updateClassStream,
    deleteClassStream,
  };
}