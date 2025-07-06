import { Permission } from '@/core/rbacService';

export const inventoryPermissions: Permission[] = [
  {
    id: 'inventory.items.read',
    name: 'View Inventory',
    description: 'View inventory items',
    resource: 'inventory.items',
    action: 'read',
    moduleId: 'inventory',
    feature: 'inventory-management',
  },
  {
    id: 'inventory.items.create',
    name: 'Create Items',
    description: 'Create new inventory items',
    resource: 'inventory.items',
    action: 'create',
    moduleId: 'inventory',
    feature: 'inventory-management',
  },
  {
    id: 'inventory.items.update',
    name: 'Update Items',
    description: 'Update inventory items',
    resource: 'inventory.items',
    action: 'update',
    moduleId: 'inventory',
    feature: 'inventory-management',
  },
  {
    id: 'inventory.items.delete',
    name: 'Delete Items',
    description: 'Delete inventory items',
    resource: 'inventory.items',
    action: 'delete',
    moduleId: 'inventory',
    feature: 'inventory-management',
  },
];

export const inventoryDefaultRoles = ['inventory_manager', 'administrator']; 