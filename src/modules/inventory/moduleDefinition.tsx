// ABOUTME: Inventory module definition
// ABOUTME: Self-contained module definition for inventory management

import React from 'react';
import { ModuleDefinition } from '@/core/types';
import {
  CubeIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  TruckIcon,
  ArchiveIcon,
  ChartPieIcon,
  BellIcon,
  CogIcon,
} from '@/components/ui/icons';
import { inventoryPermissions, inventoryDefaultRoles } from './rbac';

export const inventoryModule: ModuleDefinition = {
  id: 'inventory',
  name: 'navigation:inventory.title',
  description: 'navigation:inventory.description',
  icon: CubeIcon,
  path: '/inventory',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:inventory.dashboard', path: '/inventory/dashboard', icon: CubeIcon, page: 'InventoryDashboardPage' },
    { name: 'navigation:inventory.inventoryHub', path: '/inventory/inventory-management', icon: CubeIcon, page: 'InventoryHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:inventory.items', path: '/inventory/items', icon: CubeIcon, page: 'ItemsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/inventory-management?tab=items' },
    { name: 'navigation:inventory.itemCategories', path: '/inventory/item-categories', icon: DocumentTextIcon, page: 'ItemCategoriesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/inventory-management?tab=categories' },
    { name: 'navigation:inventory.stockLevels', path: '/inventory/stock-levels', icon: ChartBarIcon, page: 'StockLevelsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/inventory-management?tab=stock-levels' },
    { name: 'navigation:inventory.reorderAlerts', path: '/inventory/reorder-alerts', icon: BellIcon, page: 'ReorderAlertsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/inventory-management?tab=reorder-alerts' },
    { name: 'navigation:inventory.warehouses', path: '/inventory/warehouses', icon: BuildingOffice2Icon, page: 'WarehousesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/inventory-management?tab=warehouses' },
    { name: 'navigation:inventory.procurementHub', path: '/inventory/procurement', icon: ClipboardDocumentListIcon, page: 'ProcurementPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:inventory.requisitions', path: '/inventory/requisitions', icon: ClipboardDocumentListIcon, page: 'RequisitionsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/procurement?tab=requisitions' },
    { name: 'navigation:inventory.purchaseOrders', path: '/inventory/purchase-orders', icon: DocumentDuplicateIcon, page: 'PurchaseOrdersPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/procurement?tab=purchase-orders' },
    { name: 'navigation:inventory.suppliers', path: '/inventory/suppliers', icon: UserGroupIcon, page: 'SuppliersPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/procurement?tab=suppliers' },
    { name: 'navigation:inventory.supplierContracts', path: '/inventory/supplier-contracts', icon: DocumentTextIcon, page: 'SupplierContractsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/procurement?tab=contracts' },
    { name: 'navigation:inventory.stockOpsHub', path: '/inventory/stock-operations', icon: ArchiveIcon, page: 'StockOpsHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:inventory.stockReception', path: '/inventory/stock-reception', icon: ArchiveIcon, page: 'StockReceptionPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/stock-operations?tab=reception' },
    { name: 'navigation:inventory.stockIssuance', path: '/inventory/stock-issuance', icon: TruckIcon, page: 'StockIssuancePage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/stock-operations?tab=issuance' },
    { name: 'navigation:inventory.stockReturns', path: '/inventory/stock-returns', icon: TruckIcon, page: 'StockReturnsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/stock-operations?tab=returns' },
    { name: 'navigation:inventory.stationery', path: '/inventory/stationery', icon: CubeIcon, page: 'StationeryPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/inventory/stock-operations?tab=stationery' },
    { name: 'navigation:inventory.fixedAssets', path: '/inventory/fixed-assets', icon: BuildingOffice2Icon, page: 'FixedAssetsPage' },
    { name: 'navigation:inventory.schoolProcurementDashboard', path: '/inventory/school-procurement-dashboard', icon: ChartBarIcon, page: 'SchoolProcurementDashboardPage' },
    { name: 'navigation:inventory.vendorPortalDashboard', path: '/inventory/vendor-portal-dashboard', icon: UserGroupIcon, page: 'VendorPortalDashboardPage' },
    { name: 'navigation:inventory.settings', path: '/inventory/settings', icon: CogIcon, page: 'InventorySettingsPage', showInModes: ['standard', 'fullwidth'] },
  ],
  features: ['inventory-management', 'procurement', 'asset-tracking', 'stock-control', 'inventory-settings'],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    }
  ],
  settings: {
    category: 'inventory',
    items: [
      {
        key: 'enableInventoryManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableProcurement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableAssetTracking',
        type: 'boolean',
        defaultValue: true
      }
    ]
  },
  rbacPermissions: inventoryPermissions,
  defaultRoles: inventoryDefaultRoles,
};

export default inventoryModule;