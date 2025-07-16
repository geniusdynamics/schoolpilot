// ABOUTME: Self-contained hook for bookcategory data management
// ABOUTME: Provides CRUD operations for bookcategory without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockBookCategories } from './mockData';
import { BookCategory } from '../../../core/types';

export const useBookCategoryData = () => {
  const [bookCategories, setBookCategories] = useState<BookCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setBookCategories(initialMockBookCategories);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch book categories');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<BookCategory>) => {
    const newDataItem: BookCategory = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as BookCategory;
    setBookCategories((prev: BookCategory[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<BookCategory>) => {
    setBookCategories((prev: BookCategory[]) => prev.map((item: BookCategory) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setBookCategories((prev: BookCategory[]) => prev.filter((item: BookCategory) => item.id !== id));
  };

  return {
    data: bookCategories,
    isLoading,
    error,
    create,
    update,
    remove
  };
};