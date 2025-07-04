// ABOUTME: Inventory module definition
// ABOUTME: Self-contained module definition for inventory management

import React from 'react';
import { ModuleDefinition } from '../../core/types';
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
} from '../../components/ui/icons';
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
    { name: 'navigation:inventory.items', path: '/inventory/items', icon: CubeIcon, page: 'ItemsPage' },
    { name: 'navigation:inventory.itemCategories', path: '/inventory/item-categories', icon: DocumentTextIcon, page: 'ItemCategoriesPage' },
    { name: 'navigation:inventory.stockLevels', path: '/inventory/stock-levels', icon: ChartBarIcon, page: 'StockLevelsPage' },
    { name: 'navigation:inventory.requisitions', path: '/inventory/requisitions', icon: ClipboardDocumentListIcon, page: 'RequisitionsPage' },
    { name: 'navigation:inventory.purchaseOrders', path: '/inventory/purchase-orders', icon: DocumentDuplicateIcon, page: 'PurchaseOrdersPage' },
    { name: 'navigation:inventory.stockIssuance', path: '/inventory/stock-issuance', icon: TruckIcon, page: 'StockIssuancePage' },
    { name: 'navigation:inventory.fixedAssets', path: '/inventory/fixed-assets', icon: BuildingOffice2Icon, page: 'FixedAssetsPage' },
    { name: 'navigation:inventory.warehouses', path: '/inventory/warehouses', icon: BuildingOffice2Icon, page: 'WarehousesPage' },
    { name: 'navigation:inventory.schoolProcurementDashboard', path: '/inventory/school-procurement-dashboard', icon: ChartBarIcon, page: 'SchoolProcurementDashboardPage' },
    { name: 'navigation:inventory.vendorPortalDashboard', path: '/inventory/vendor-portal-dashboard', icon: UserGroupIcon, page: 'VendorPortalDashboardPage' },
  ],
  features: ['inventory-management', 'procurement', 'asset-tracking', 'stock-control'],
  dependencies: ['administration'],
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