// ABOUTME: TypeScript module augmentation for Inventory collections in AppData
// ABOUTME: Extends AppDataType and AppDataContextType with inventory-specific properties
// ABOUTME: This is the compile-time equivalent of Frappe's DocType self-registration

import type {
  Warehouse,
  ItemCategoryInv,
  ItemInv,
  FixedAsset,
  StockLevel,
  StockTransaction,
  Requisition,
  PurchaseOrder,
  InvSupplierContractType,
} from './types';

declare module '@/core/types' {
  export interface AppDataType {
    warehouses: Warehouse[];
    itemCategoriesInv: ItemCategoryInv[];
    itemsInv: ItemInv[];
    fixedAssets: FixedAsset[];
    requisitions: Requisition[];
    purchaseOrders: PurchaseOrder[];
    stockLevels: StockLevel[];
    stockTransactions: StockTransaction[];
    supplierContracts: InvSupplierContractType[];
    // Report / View collections
    stationeryItems: any[];
    foodInventory: any[];
  }

  export interface AppDataContextType {
    // Warehouse CRUD
    addWarehouse: (data: any) => Promise<any>;
    updateWarehouse: (id: string, data: any) => Promise<any>;
    deleteWarehouse: (id: string) => Promise<void>;
    // Item CRUD
    addItemInv: (data: any) => Promise<any>;
    updateItemInv: (id: string, data: any) => Promise<any>;
    deleteItemInv: (id: string) => Promise<void>;
    // Fixed Asset CRUD
    addFixedAsset: (data: any) => Promise<any>;
    updateFixedAsset: (id: string, data: any) => Promise<any>;
    deleteFixedAsset: (id: string) => Promise<void>;
    // Requisition CRUD
    addRequisition: (data: any) => Promise<any>;
    updateRequisition: (id: string, data: any) => Promise<any>;
    deleteRequisition: (id: string) => Promise<void>;
    // Purchase Order CRUD
    addPurchaseOrder: (data: any) => Promise<any>;
    updatePurchaseOrder: (id: string, data: any) => Promise<any>;
    deletePurchaseOrder: (id: string) => Promise<void>;
    // Supplier Contract CRUD
    addSupplierContract: (data: Partial<InvSupplierContractType>) => Promise<void>;
    updateSupplierContract: (id: string, data: Partial<InvSupplierContractType>) => Promise<void>;
    deleteSupplierContract: (id: string) => Promise<void>;
  }
}
