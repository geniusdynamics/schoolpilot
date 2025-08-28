// ABOUTME: Finance module definition
// ABOUTME: Self-contained module definition for financial management

import React from 'react';
import { ModuleDefinition } from '@/core/types';
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
} from '@/components/ui/icons';
import { financePermissions, financeDefaultRoles } from './rbac';

export const financeModule: ModuleDefinition = {
  id: 'finance',
  name: 'navigation:finance.title',
  description: 'navigation:finance.description',
  icon: CurrencyDollarIcon,
  path: '/finance',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:finance.dashboard', path: '/finance/dashboard', icon: CurrencyDollarIcon, page: 'FinanceDashboardPage' },
    { name: 'navigation:finance.chartOfAccounts', path: '/finance/chart-of-accounts', icon: DocumentTextIcon, page: 'ChartOfAccountsPage' },
    { name: 'navigation:finance.feeTemplates', path: '/finance/fee-templates', icon: DocumentDuplicateIcon, page: 'FeeTemplatesPage' },
    { name: 'navigation:finance.effectFeeStructures', path: '/finance/effect-fee-structures', icon: DocumentDuplicateIcon, page: 'EffectFeeStructuresPage' },
    { name: 'navigation:finance.feeAdjustments', path: '/finance/fee-adjustments', icon: DocumentDuplicateIcon, page: 'FeeAdjustmentsPage' },
    { name: 'navigation:finance.studentPayments', path: '/finance/student-payments', icon: CreditCardIcon, page: 'StudentPaymentsPage' },
    { name: 'navigation:finance.studentOpeningBalances', path: '/finance/student-opening-balances', icon: BanknotesIcon, page: 'StudentOpeningBalancesPage' },
    { name: 'navigation:finance.feeCollectionSummary', path: '/finance/fee-collection-summary', icon: ChartBarIcon, page: 'FeeCollectionSummaryPage' },
    { name: 'navigation:finance.generalReceipts', path: '/finance/general-receipts', icon: ClipboardDocumentListIcon, page: 'GeneralReceiptsPage' },
    { name: 'navigation:finance.customerInvoices', path: '/finance/customer-invoices', icon: DocumentTextIcon, page: 'CustomerInvoicesPage' },
    { name: 'navigation:finance.supplierInvoices', path: '/finance/supplier-invoices', icon: DocumentTextIcon, page: 'SupplierInvoicesPage' },
    { name: 'navigation:finance.expenses', path: '/finance/expenses', icon: BanknotesIcon, page: 'ExpensesPage' },
    { name: 'navigation:finance.banks', path: '/finance/banks', icon: BuildingOffice2Icon, page: 'BanksPage' },
    { name: 'navigation:finance.suppliers', path: '/finance/suppliers', icon: UserGroupIcon, page: 'SuppliersPage' },
    { name: 'navigation:finance.transportRoutes', path: '/finance/transport-routes', icon: TruckIcon, page: 'TransportRoutesPage' },
    { name: 'navigation:finance.studentTransportAssignments', path: '/finance/student-transport-assignments', icon: TruckIcon, page: 'StudentTransportAssignmentsPage' },
  ],
  features: ['fee-management', 'payment-processing', 'accounting', 'expense-tracking', 'transport-finance'],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    }
  ],
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