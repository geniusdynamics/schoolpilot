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
    { name: 'navigation:nutrition.mealPlans', path: '/nutrition/meal-plans', icon: DocumentTextIcon, page: 'MealPlansPage' },
    { name: 'navigation:nutrition.menus', path: '/nutrition/menus', icon: ClipboardDocumentListIcon, page: 'MenusPage' },
    { name: 'navigation:nutrition.merchants', path: '/nutrition/merchants', icon: UserGroupIcon, page: 'MerchantsPage' },
    { name: 'navigation:nutrition.studentMealAssignments', path: '/nutrition/student-meal-assignments', icon: UserGroupIcon, page: 'StudentMealAssignmentsPage' },
    { name: 'navigation:nutrition.mealConsumptionLog', path: '/nutrition/meal-consumption-log', icon: ClipboardDocumentListIcon, page: 'MealConsumptionLogPage' },
    { name: 'navigation:nutrition.studentWallet', path: '/nutrition/student-wallet', icon: CurrencyDollarIcon, page: 'StudentWalletPage' },
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