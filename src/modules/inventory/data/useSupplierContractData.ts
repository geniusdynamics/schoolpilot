// ABOUTME: Database-backed hook for managing supplier contract entities in the inventory module.
// ABOUTME: Backed by the 'supplier_contracts' collection; seed data lives in ./mockData.

import { useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { InvContractStatusEnum, InvSupplierContractType } from './types';

export const useSupplierContractData = () => {
  const contractsCollection = useDatabaseCollection<InvSupplierContractType>('supplier_contracts');

  const contracts = contractsCollection.data;

  const create = useCallback(async (input: Partial<InvSupplierContractType>): Promise<InvSupplierContractType> => {
    const now = new Date().toISOString();
    const payload = {
      status: InvContractStatusEnum.ACTIVE,
      created_at: now,
      updated_at: now,
      ...input
    } as Omit<InvSupplierContractType, 'id'> & { id?: string };
    const result = await contractsCollection.insert(payload);
    return result as InvSupplierContractType;
  }, [contractsCollection]);

  const update = useCallback(async (id: number | string, updates: Partial<InvSupplierContractType>): Promise<InvSupplierContractType> => {
    const result = await contractsCollection.update(String(id), {
      ...updates,
      updated_at: new Date().toISOString()
    });
    return result as InvSupplierContractType;
  }, [contractsCollection]);

  const remove = useCallback(async (id: number | string): Promise<boolean> => {
    return contractsCollection.remove(String(id));
  }, [contractsCollection]);

  const findActiveContracts = () => {
    return contracts
      .filter((contract) => contract.status === InvContractStatusEnum.ACTIVE)
      .sort((left, right) => new Date(left.end_date).getTime() - new Date(right.end_date).getTime());
  };

  const findContractsBySupplier = (supplierId: number) => {
    return contracts
      .filter((contract) => String(contract.supplier_id) === String(supplierId))
      .sort((left, right) => new Date(right.start_date).getTime() - new Date(left.start_date).getTime());
  };

  const findExpiringContracts = (daysAhead: number = 30) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return contracts
      .filter((contract) => {
        const endDate = new Date(contract.end_date);
        return endDate <= futureDate && contract.status === InvContractStatusEnum.ACTIVE;
      })
      .sort((left, right) => new Date(left.end_date).getTime() - new Date(right.end_date).getTime());
  };

  const findContractsByStatus = (status: string) => {
    return contracts
      .filter((contract) => contract.status === status)
      .sort((left, right) => new Date(left.end_date).getTime() - new Date(right.end_date).getTime());
  };

  const findContractsByValue = (minValue: number) => {
    return contracts
      .filter((contract) => contract.contract_value && contract.contract_value >= minValue)
      .sort((left, right) => (right.contract_value || 0) - (left.contract_value || 0));
  };

  const searchContracts = (searchTerm: string) => {
    const normalizedTerm = searchTerm.toLowerCase();

    return contracts
      .filter((contract) =>
        (contract.contract_number?.toLowerCase() ?? '').includes(normalizedTerm) ||
        (contract.title?.toLowerCase() ?? '').includes(normalizedTerm) ||
        (contract.supplier_name || '').toLowerCase().includes(normalizedTerm) ||
        (contract.description || '').toLowerCase().includes(normalizedTerm)
      )
      .sort((left, right) => new Date(right.start_date).getTime() - new Date(left.start_date).getTime());
  };

  const getContractById = (id: string | number) => {
    return contracts.find((contract) => String(contract.id) === String(id));
  };

  const getContractStats = () => {
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter((contract) => contract.status === InvContractStatusEnum.ACTIVE).length;
    const expiredContracts = contracts.filter((contract) => contract.status === InvContractStatusEnum.EXPIRED).length;

    return {
      total: totalContracts,
      active: activeContracts,
      expired: expiredContracts,
      pending: totalContracts - activeContracts - expiredContracts
    };
  };

  const validateContractDates = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new Error('Contract start date must be before end date');
    }

    if (start < new Date()) {
      throw new Error('Contract start date cannot be in the past');
    }

    return true;
  };

  const checkContractOverlap = (supplierId: number, startDate: string, endDate: string, excludeId?: string) => {
    const existingContracts = findContractsBySupplier(supplierId);

    const overlappingContracts = existingContracts.filter((contract) => {
      if (excludeId && String(contract.id) === String(excludeId)) {
        return false;
      }

      const contractStart = new Date(contract.start_date);
      const contractEnd = new Date(contract.end_date);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      return (
        (newStart >= contractStart && newStart <= contractEnd) ||
        (newEnd >= contractStart && newEnd <= contractEnd) ||
        (newStart <= contractStart && newEnd >= contractEnd)
      );
    });

    return overlappingContracts.length > 0 ? overlappingContracts : null;
  };

  return {
    contracts,
    loading: contractsCollection.loading,
    error: contractsCollection.error,
    create,
    update,
    remove,
    refresh: contractsCollection.refresh,
    findActiveContracts,
    findContractsBySupplier,
    findExpiringContracts,
    findContractsByStatus,
    findContractsByValue,
    searchContracts,
    getContractById,
    getContractStats,
    validateContractDates,
    checkContractOverlap
  };
};
