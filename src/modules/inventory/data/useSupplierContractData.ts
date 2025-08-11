// ABOUTME: Data hook for managing supplier contract entities in the inventory module.
// ABOUTME: Provides CRUD operations and reactive queries for contract management.

import { createDataHook } from '../../../hooks/useDataHookFactory';
import { InvSupplierContractType } from './types';

// Mock data for supplier contracts
const initialMockSupplierContracts: InvSupplierContractType[] = [
  {
    id: 'SC001',
    supplier_id: 1,
    supplier_name: 'Text Book Centre',
    contract_number: 'TBC-2024-001',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: 'Active',
    terms: 'Net 30 payment terms, bulk discount 5%',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'SC002',
    supplier_id: 7,
    supplier_name: 'Scientific Equipment Ltd',
    contract_number: 'SEL-2024-002',
    start_date: '2024-02-01',
    end_date: '2025-01-31',
    status: 'Active',
    terms: 'Net 45 payment terms, warranty included',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Create the data hook using the factory
const useSupplierContractDataHook = createDataHook<InvSupplierContractType>({
  entityName: 'supplierContracts',
  initialData: initialMockSupplierContracts,
  entityModule: 'inventory',
  requiresBackend: false,
  allowOffline: true,
  syncPriority: 'normal'
});

export const useSupplierContractData = () => {
  const {
    data: contracts,
    loading,
    error,
    create,
    update,
    remove,
    refresh
  } = useSupplierContractDataHook();

  // Specialized query methods using local filtering
  const findActiveContracts = () => {
    return contracts.filter(contract => contract.status === 'Active')
      .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
  };

  const findContractsBySupplier = (supplierId: number) => {
    return contracts.filter(contract => contract.supplier_id === supplierId)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  };

  const findExpiringContracts = (daysAhead: number = 30) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return contracts.filter(contract => {
      const endDate = new Date(contract.end_date);
      return endDate <= futureDate && contract.status === 'Active';
    }).sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
  };

  const findContractsByStatus = (status: string) => {
    return contracts.filter(contract => contract.status === status)
      .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
  };

  const findContractsByValue = (minValue: number) => {
    return contracts.filter(contract => contract.contract_value && contract.contract_value >= minValue)
      .sort((a, b) => (b.contract_value || 0) - (a.contract_value || 0));
  };

  const searchContracts = (searchTerm: string) => {
    const regex = new RegExp(searchTerm, 'i');
    return contracts.filter(contract => 
      regex.test(contract.contract_number) ||
      regex.test(contract.supplier_name) ||
      (contract.terms && regex.test(contract.terms))
    ).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  };

  const getContractById = (id: string) => {
    return contracts.find(contract => contract.id === id);
  };

  const getContractStats = () => {
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(c => c.status === 'Active').length;
    const expiredContracts = contracts.filter(c => c.status === 'Expired').length;
    
    return {
      total: totalContracts,
      active: activeContracts,
      expired: expiredContracts,
      pending: totalContracts - activeContracts - expiredContracts
    };
  };

  // Contract validation helpers
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
    
    const overlapping = existingContracts.filter(contract => {
      if (excludeId && contract.id === excludeId) return false;
      
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
    
    return overlapping.length > 0 ? overlapping : null;
  };

  return {
    // Data and state
    contracts,
    loading,
    error,
    
    // CRUD operations
    create,
    update,
    remove,
    refresh,
    
    // Query methods
    findActiveContracts,
    findContractsBySupplier,
    findExpiringContracts,
    findContractsByStatus,
    findContractsByValue,
    searchContracts,
    getContractById,
    getContractStats,
    
    // Validation helpers
    validateContractDates,
    checkContractOverlap
  };
};