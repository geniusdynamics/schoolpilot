import { Permission } from '../../core/rbacService';

export const nutritionPermissions: Permission[] = [
  {
    id: 'nutrition.meals.read',
    name: 'View Meals',
    description: 'View meal information',
    resource: 'nutrition.meals',
    action: 'read',
    moduleId: 'nutrition',
    feature: 'meal-planning',
  },
  {
    id: 'nutrition.meals.create',
    name: 'Create Meals',
    description: 'Create meal plans',
    resource: 'nutrition.meals',
    action: 'create',
    moduleId: 'nutrition',
    feature: 'meal-planning',
  },
  {
    id: 'nutrition.meals.update',
    name: 'Update Meals',
    description: 'Update meal information',
    resource: 'nutrition.meals',
    action: 'update',
    moduleId: 'nutrition',
    feature: 'meal-planning',
  },
  {
    id: 'nutrition.meals.delete',
    name: 'Delete Meals',
    description: 'Delete meal plans',
    resource: 'nutrition.meals',
    action: 'delete',
    moduleId: 'nutrition',
    feature: 'meal-planning',
  },
];

export const nutritionDefaultRoles = ['nutrition_officer', 'administrator']; 