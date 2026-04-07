// ABOUTME: Data hook for managing supplier contract entities in the inventory module.
// ABOUTME: Provides CRUD operations and reactive queries for contract management.

import { useMemo } from 'react';
import { createDataHook, DataHookConfig } from '@/hooks/useDataHookFactory';
import { useDataHookRegistration } from '@/hooks/useDataHookRegistration';
import { InvContractStatusEnum, InvSupplierContractType } from './types';

export const initialMockSupplierContracts: InvSupplierContractType[] = [
  {
    id: 'SC001',
    supplier_id: 1,
    supplier_name: 'Text Book Centre',
    contract_number: 'TBC-2024-001',
    title: 'Core textbooks supply agreement',
    description: 'Annual supply contract for curriculum textbooks and classroom stationery.',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: InvContractStatusEnum.ACTIVE,
    contract_value: 125000,
    renewal_notice_days: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'SC002',
    supplier_id: 7,
    supplier_name: 'Scientific Equipment Ltd',
    contract_number: 'SEL-2024-002',
    title: 'Laboratory consumables and equipment contract',
    description: 'Provides science lab consumables, calibrated instruments, and warranty support.',
    start_date: '2024-02-01',
    end_date: '2025-01-31',
    status: InvContractStatusEnum.PENDING_RENEWAL,
    contract_value: 210000,
    renewal_notice_days: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const useSupplierContractData = () => {
  const config = useMemo((): DataHookConfig<InvSupplierContractType> => ({
    entityName: 'supplierContracts',
    initialData: initialMockSupplierContracts,
    entityModule: 'inventory',
    contextCrudName: 'SupplierContract',
    requiresBackend: false,
    allowOffline: true,
    syncPriority: 'normal'
  }), []);

  useDataHookRegistration(config);

  const {
    data: contracts,
    loading,
    error,
    create,
    update,
    remove,
    refresh
  } = createDataHook<InvSupplierContractType>(config)();

  const findActiveContracts = () => {
    return contracts
      .filter((contract) => contract.status === InvContractStatusEnum.ACTIVE)
      .sort((left, right) => new Date(left.end_date).getTime() - new Date(right.end_date).getTime());
  };

  const findContractsBySupplier = (supplierId: number) => {
    return contracts
      .filter((contract) => contract.supplier_id === supplierId)
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
        contract.contract_number.toLowerCase().includes(normalizedTerm) ||
        contract.title.toLowerCase().includes(normalizedTerm) ||
        (contract.supplier_name || '').toLowerCase().includes(normalizedTerm) ||
        (contract.description || '').toLowerCase().includes(normalizedTerm)
      )
      .sort((left, right) => new Date(right.start_date).getTime() - new Date(left.start_date).getTime());
  };

  const getContractById = (id: string) => {
    return contracts.find((contract) => contract.id === id);
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
      if (excludeId && contract.id === excludeId) {
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
    loading,
    error,
    create,
    update,
    remove,
    refresh,
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
