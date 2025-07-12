// ABOUTME: Self-contained hook for bookcategory data management
// ABOUTME: Provides CRUD operations for bookcategory without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockBookCategories } from '../../library/data/mockData';
import { BookCategory } from '../../../core/types';

export const useBookCategoryData = () => {
  const [data, setData] = useState<BookCategory[]>(initialMockBookCategories);

  const create = async (newItem: Partial<BookCategory>) => {
    const newDataItem: BookCategory = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as BookCategory;
    setData((prev: BookCategory[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<BookCategory>) => {
    setData((prev: BookCategory[]) => prev.map((item: BookCategory) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: BookCategory[]) => prev.filter((item: BookCategory) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
