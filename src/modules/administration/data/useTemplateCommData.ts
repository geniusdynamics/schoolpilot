// ABOUTME: Global provider hook for TemplateComm entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AdminTemplateCommType } from './types';
import { initialMockTemplateComms } from './mockData';

export const isGlobalProvider = true;

export function useTemplateCommData() {
  const [templateComms, setTemplateComms] = useState<AdminTemplateCommType[]>(initialMockTemplateComms);

  const addTemplateComm = (data: Omit<AdminTemplateCommType, 'id' | 'created_at' | 'updated_at'>) => {
    const newTemplate: AdminTemplateCommType = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTemplateComms(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateTemplateComm = (updated: AdminTemplateCommType) => {
    setTemplateComms(prev => prev.map(t => t.id === updated.id ? { ...updated } : t));
    return updated;
  };

  const deleteTemplateComm = (id: number) => {
    setTemplateComms(prev => prev.filter(t => t.id !== id));
  };

  return {
    templateComms,
    addTemplateComm,
    updateTemplateComm,
    deleteTemplateComm,
  };
} 