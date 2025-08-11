// ABOUTME: Library reports index file
// ABOUTME: Exports all report definitions from the library module

export { default as OverdueReport } from './OverdueReport';
export { default as InventoryStatusReport } from './InventoryStatusReport';

// Report definitions for dynamic loading
export const reportDefinitions = [
  {
    id: 'overdue-report',
    name: 'Overdue Books Report',
    description: 'Shows all books that are currently overdue with borrower details',
    component: 'OverdueReport',
    module: 'library',
    category: 'Library',
    permissions: ['library.reports.view', 'library.view'],
  },
  {
    id: 'inventory-status-report',
    name: 'Inventory Status Report',
    description: 'Shows comprehensive inventory status including stock levels and alerts',
    component: 'InventoryStatusReport',
    module: 'inventory',
    category: 'Inventory',
    permissions: ['inventory.reports.view', 'inventory.view'],
  },
];
