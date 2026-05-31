// ABOUTME: Nutrition module definition
// ABOUTME: Self-contained module definition for nutrition management

import React from 'react';
import { ModuleDefinition } from '@/core/types';
import {
  CakeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  CubeIcon,
} from '@/components/ui/icons';
import { nutritionPermissions, nutritionDefaultRoles } from './rbac';

export const nutritionModule: ModuleDefinition = {
  id: 'nutrition',
  name: 'navigation:nutrition.title',
  description: 'navigation:nutrition.description',
  icon: CakeIcon,
  path: '/nutrition',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:nutrition.dashboard', path: '/nutrition/dashboard', icon: CakeIcon, page: 'NutritionDashboardPage' },
    { name: 'navigation:nutrition.mealPlanning', path: '/nutrition/meal-planning', icon: DocumentTextIcon, page: 'MealPlanningHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:nutrition.nutritionOperations', path: '/nutrition/operations', icon: CubeIcon, page: 'NutritionOperationsHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:nutrition.mealPlans', path: '/nutrition/meal-plans', icon: DocumentTextIcon, page: 'MealPlansPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/nutrition/meal-planning?tab=meal-plans' },
    { name: 'navigation:nutrition.menus', path: '/nutrition/menus', icon: ClipboardDocumentListIcon, page: 'MenusPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/nutrition/meal-planning?tab=menus' },
    { name: 'navigation:nutrition.studentMealAssignments', path: '/nutrition/student-meal-assignments', icon: UserGroupIcon, page: 'StudentMealAssignmentsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/nutrition/meal-planning?tab=assignments' },
    { name: 'navigation:nutrition.mealConsumptionLog', path: '/nutrition/meal-consumption-log', icon: ClipboardDocumentListIcon, page: 'MealConsumptionLogPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/nutrition/meal-planning?tab=consumption-log' },
    { name: 'navigation:nutrition.merchants', path: '/nutrition/merchants', icon: UserGroupIcon, page: 'MerchantsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/nutrition/operations?tab=merchants' },
    { name: 'navigation:nutrition.studentWallet', path: '/nutrition/student-wallet', icon: CurrencyDollarIcon, page: 'StudentWalletPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/nutrition/operations?tab=student-wallet' },
    { name: 'navigation:nutrition.kitchenManagement', path: '/nutrition/kitchen-management', icon: CubeIcon, page: 'KitchenManagementPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/nutrition/operations?tab=kitchen' },
  ],
  features: ['meal-planning', 'menu-management', 'student-nutrition', 'wallet-management'],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    }
  ],
  settings: {
    category: 'nutrition',
    items: [
      {
        key: 'enableMealPlanning',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableStudentNutrition',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableWalletManagement',
        type: 'boolean',
        defaultValue: true
      }
    ]
  },
  rbacPermissions: nutritionPermissions,
  defaultRoles: nutritionDefaultRoles,
};

export default nutritionModule;