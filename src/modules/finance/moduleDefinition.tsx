// ABOUTME: Finance module definition
// ABOUTME: Self-contained module definition for financial management

import React from 'react';
import { ModuleDefinition } from '../../core/types';
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  TruckIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  CreditCardIcon,
} from '../../components/ui/icons';
import { financePermissions, financeDefaultRoles } from './rbac';

export const financeModule: ModuleDefinition = {
  id: 'finance',
  name: 'navigation:finance.title',
  description: 'navigation:finance.description',
  icon: <CurrencyDollarIcon />,
  path: '/finance',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:finance.dashboard', path: '/finance/dashboard', icon: <CurrencyDollarIcon /> },
    { name: 'navigation:finance.chartOfAccounts', path: '/finance/chart-of-accounts', icon: <DocumentTextIcon /> },
    { name: 'navigation:finance.feeTemplates', path: '/finance/fee-templates', icon: <DocumentDuplicateIcon /> },
    { name: 'navigation:finance.effectFeeStructures', path: '/finance/effect-fee-structures', icon: <DocumentDuplicateIcon /> },
    { name: 'navigation:finance.feeAdjustments', path: '/finance/fee-adjustments', icon: <DocumentDuplicateIcon /> },
    { name: 'navigation:finance.studentPayments', path: '/finance/student-payments', icon: <CreditCardIcon /> },
    { name: 'navigation:finance.studentOpeningBalances', path: '/finance/student-opening-balances', icon: <BanknotesIcon /> },
    { name: 'navigation:finance.feeCollectionSummary', path: '/finance/fee-collection-summary', icon: <ChartBarIcon /> },
    { name: 'navigation:finance.generalReceipts', path: '/finance/general-receipts', icon: <ClipboardDocumentListIcon /> },
    { name: 'navigation:finance.customerInvoices', path: '/finance/customer-invoices', icon: <DocumentTextIcon /> },
    { name: 'navigation:finance.supplierInvoices', path: '/finance/supplier-invoices', icon: <DocumentTextIcon /> },
    { name: 'navigation:finance.expenses', path: '/finance/expenses', icon: <BanknotesIcon /> },
    { name: 'navigation:finance.banks', path: '/finance/banks', icon: <BuildingOffice2Icon /> },
    { name: 'navigation:finance.suppliers', path: '/finance/suppliers', icon: <UserGroupIcon /> },
    { name: 'navigation:finance.transportRoutes', path: '/finance/transport-routes', icon: <TruckIcon /> },
    { name: 'navigation:finance.studentTransportAssignments', path: '/finance/student-transport-assignments', icon: <TruckIcon /> },
  ],
  features: ['fee-management', 'payment-processing', 'accounting', 'expense-tracking', 'transport-finance'],
  dependencies: ['administration'],
  settings: {
    category: 'finance',
    items: [
      {
        key: 'enableFeeManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enablePaymentProcessing',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableExpenseTracking',
        type: 'boolean',
        defaultValue: true
      }
    ]
  },
  rbacPermissions: financePermissions,
  defaultRoles: financeDefaultRoles,
};

export default financeModule; 