/**
 * Merchant Data Hook
 * 
 * Provides CRUD operations for merchant management.
 * 
 * @module nutrition/data/useMerchantData
 */

import { useState, useEffect } from 'react';

interface Merchant {
  id: number;
  name: string;
  description?: string;
  location?: string;
  contact_info?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at?: string;
}

interface UseMerchantDataResult {
  data: Merchant[];
  isLoading: boolean;
  error: string | null;
  create: (newItem: Partial<Merchant>) => Promise<Merchant>;
  update: (id: number, updatedData: Partial<Merchant>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

/**
 * Hook for managing merchant data
 * @returns {UseMerchantDataResult} Object containing merchants data and CRUD operations
 */
const useMerchantData = (): UseMerchantDataResult => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO: Fetch from database
        setMerchants([]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch merchants');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  /**
   * Creates a new merchant
   * @param {Partial<Merchant>} newItem - The merchant data to create
   * @returns {Promise<Merchant>} The created merchant
   */
  const create = async (newItem: Partial<Merchant>): Promise<Merchant> => {
    const newDataItem: Merchant = {
      ...newItem,
      id: Date.now(),
      name: newItem.name || '',
      status: newItem.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Merchant;
    setMerchants((prev: Merchant[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  /**
   * Updates an existing merchant
   * @param {number} id - The merchant ID to update
   * @param {Partial<Merchant>} updatedData - The updated merchant data
   * @returns {Promise<void>}
   */
  const update = async (id: number, updatedData: Partial<Merchant>): Promise<void> => {
    setMerchants((prev: Merchant[]) => prev.map((item: Merchant) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  /**
   * Removes a merchant
   * @param {number} id - The merchant ID to remove
   * @returns {Promise<void>}
   */
  const remove = async (id: number): Promise<void> => {
    setMerchants((prev: Merchant[]) => prev.filter((item: Merchant) => item.id !== id));
  };

  return {
    data: merchants,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useMerchantData };
export type { Merchant, UseMerchantDataResult };
