// ABOUTME: Self-contained hook for library settings/borrowing rules data management
// ABOUTME: Provides CRUD operations for library settings without depending on AppDataContext

import { useState, useEffect } from 'react';
import { LibrarySettingsType } from './types';

// Mock initial data for library settings
const initialMockLibrarySettings: LibrarySettingsType[] = [
  {
    id: '1',
    name: 'Student Standard Rule',
    description: 'Standard borrowing rules for students',
    max_loan_days: 14,
    max_renewals: 2,
    fine_per_day: 5.0,
    max_books_per_user: 3,
    book_categories: ['Fiction', 'Non-Fiction', 'Reference'],
    user_types: ['Student'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Staff Extended Rule',
    description: 'Extended borrowing privileges for staff members',
    max_loan_days: 30,
    max_renewals: 5,
    fine_per_day: 10.0,
    max_books_per_user: 10,
    book_categories: ['Fiction', 'Non-Fiction', 'Reference', 'Academic'],
    user_types: ['Staff'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const useLibrarySettingsData = () => {
  const [data, setData] = useState<LibrarySettingsType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setTimeout(() => {
        setData(initialMockLibrarySettings);
        setIsLoading(false);
      }, 500);
    } catch (e) {
      setError('Failed to fetch library settings');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<LibrarySettingsType>) => {
    const newDataItem: LibrarySettingsType = {
      ...newItem,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as LibrarySettingsType;
    setData((prev: LibrarySettingsType[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<LibrarySettingsType>) => {
    setData((prev: LibrarySettingsType[]) => prev.map((item: LibrarySettingsType) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: LibrarySettingsType[]) => prev.filter((item: LibrarySettingsType) => item.id !== id));
  };

  const search = async (query: string) => {
    if (!query) {
      return data; // Return all data if query is empty
    }
    const lowerCaseQuery = query.toLowerCase();
    return data.filter(setting =>
      setting.name.toLowerCase().includes(lowerCaseQuery) ||
      setting.description?.toLowerCase().includes(lowerCaseQuery) ||
      setting.user_types.some(type => type.toLowerCase().includes(lowerCaseQuery)) ||
      setting.book_categories.some(category => category.toLowerCase().includes(lowerCaseQuery))
    );
  };

  const getActiveSettings = async () => {
    return data.filter(setting => setting.is_active === true);
  };

  const getSettingsByUserType = async (userType: string) => {
    return data.filter(setting => setting.user_types.includes(userType));
  };

  const toggleActiveStatus = async (id: string) => {
    const setting = data.find(s => s.id === id);
    if (setting) {
      await update(id, { is_active: !setting.is_active });
    }
  };

  return {
    data,
    isLoading,
    error,
    create,
    update,
    remove,
    search,
    getActiveSettings,
    getSettingsByUserType,
    toggleActiveStatus
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
