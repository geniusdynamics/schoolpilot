// ABOUTME: Self-contained hook for communication template data management.
// ABOUTME: Provides CRUD operations plus page-friendly aliases for administration pages.

import { useState } from 'react';
import { initialMockTemplateComms } from './mockData';
import { AdminTemplateCommType } from './types';

const createTimestamp = () => new Date().toISOString();

export const useTemplateCommData = () => {
  const [data, setData] = useState<AdminTemplateCommType[]>(initialMockTemplateComms);

  const create = async (newItem: Partial<AdminTemplateCommType>) => {
    const timestamp = createTimestamp();
    const newDataItem: AdminTemplateCommType = {
      ...(newItem as AdminTemplateCommType),
      id: Date.now(),
      created_at: timestamp,
      updated_at: timestamp
    };

    setData((previousTemplates) => [...previousTemplates, newDataItem]);
    return newDataItem;
  };

  const update = async (
    idOrRecord: number | AdminTemplateCommType,
    updatedData?: Partial<AdminTemplateCommType>
  ) => {
    const recordToPersist =
      typeof idOrRecord === 'object'
        ? idOrRecord
        : ({ id: idOrRecord, ...(updatedData || {}) } as AdminTemplateCommType);

    let updatedTemplate: AdminTemplateCommType | undefined;

    setData((previousTemplates) =>
      previousTemplates.map((template) => {
        if (template.id !== recordToPersist.id) {
          return template;
        }

        updatedTemplate = {
          ...template,
          ...recordToPersist,
          updated_at: createTimestamp()
        };

        return updatedTemplate;
      })
    );

    return updatedTemplate;
  };

  const remove = async (id: number) => {
    setData((previousTemplates) => previousTemplates.filter((template) => template.id !== id));
  };

  return {
    templateComms: data,
    addTemplateComm: create,
    updateTemplateComm: update,
    deleteTemplateComm: remove,
    data,
    create,
    update,
    remove
  };
};

export const isGlobalProvider = true;
