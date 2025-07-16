// ABOUTME: Self-contained hook for book data management
// ABOUTME: Provides CRUD operations for book without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockBooks } from './mockData';
import { Book } from '../../../core/types';

export const useBookData = () => {
  const [data, setData] = useState<Book[]>(initialMockBooks);

  const create = async (newItem: Partial<Book>) => {
    const newDataItem: Book = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Book;
    setData((prev: Book[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Book>) => {
    setData((prev: Book[]) => prev.map((item: Book) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Book[]) => prev.filter((item: Book) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
