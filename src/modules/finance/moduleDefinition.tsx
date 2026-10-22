// ABOUTME: Finance module definition
// ABOUTME: Self-contained module definition for financial management

import { ModuleDefinition } from '@/core/types';
import { CurrencyDollarIcon, BanknotesIcon, BuildingOffice2Icon, TruckIcon, DocumentTextIcon, ClipboardDocumentListIcon, ChartBarIcon, UserGroupIcon, DocumentDuplicateIcon, CreditCardIcon, TableCellsIcon, DownloadIcon, WalletIcon, ExclamationTriangleIcon, CalendarIcon, BookOpenIcon, BanknotesIcon as CashIcon, UsersIcon, DocumentReportIcon, ArrowPathIcon, ScaleIcon, BuildingLibraryIcon } from '@/components/ui/icons';
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
    // Dashboard (always visible)
    { name: 'navigation:finance.dashboard', path: '/finance/dashboard', icon: CurrencyDollarIcon, page: 'FinanceDashboardPage', showInModes: ['standard', 'fullwidth'] },

    // Hub pages (standard mode)
    { name: 'navigation:finance.feeConfiguration', path: '/finance/fee-configuration', icon: DocumentDuplicateIcon, page: 'FeeConfigurationPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.feeRules', path: '/finance/fee-rules', icon: ClipboardDocumentListIcon, page: 'FeeRulesPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.accountingConfig', path: '/finance/accounting-config', icon: DocumentTextIcon, page: 'AccountingConfigPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.financialYears', path: '/finance/financial-years', icon: CalendarIcon, page: 'FinancialYearsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.accountingOps', path: '/finance/accounting-ops', icon: BookOpenIcon, page: 'AccountingOperationsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.financialStatements', path: '/finance/financial-statements', icon: ScaleIcon, page: 'FinancialStatementsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.accountingReports', path: '/finance/accounting-reports', icon: DocumentReportIcon, page: 'accounting/AccountingReportsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.payments', path: '/finance/payments', icon: CreditCardIcon, page: 'PaymentsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.studentFeeHistory', path: '/finance/student-fee-history', icon: BanknotesIcon, page: 'StudentFeeHistoryPage', showInModes: ['standard', 'fullwidth'] },
    // M3: Finance reports hub relocated to /reports/finance (see reports/moduleDefinition.tsx).
    // Old /finance/reports path is now handled by redirectMap.
    { name: 'navigation:finance.invoicing', path: '/finance/invoicing', icon: DocumentDuplicateIcon, page: 'InvoicingPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.expenses', path: '/finance/expenses', icon: BanknotesIcon, page: 'ExpensesPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:finance.transport', path: '/finance/transport', icon: TruckIcon, page: 'TransportFinancePage', showInModes: ['standard', 'fullwidth'] },

    // Deprecated standalone pages (fullwidth mode only)
    { name: 'navigation:finance.chartOfAccounts', path: '/finance/chart-of-accounts', icon: DocumentTextIcon, page: 'ChartOfAccountsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/accounting-config?tab=chart-of-accounts' },
    { name: 'navigation:finance.feeTemplates', path: '/finance/fee-templates', icon: DocumentDuplicateIcon, page: 'FeeTemplatesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/fee-configuration?tab=templates' },
    { name: 'navigation:finance.effectFeeStructures', path: '/finance/effect-fee-structures', icon: DocumentDuplicateIcon, page: 'EffectFeeStructuresPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/fee-configuration?tab=structures' },
    { name: 'navigation:finance.feeAdjustments', path: '/finance/fee-adjustments', icon: DocumentDuplicateIcon, page: 'FeeAdjustmentsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/fee-rules?tab=adjustments' },
    { name: 'navigation:finance.feesFines', path: '/finance/fees-fines', icon: ExclamationTriangleIcon, page: 'FeesFinesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/fee-rules?tab=fines' },
    { name: 'navigation:finance.feesInstallments', path: '/finance/fees-installments', icon: CalendarIcon, page: 'FeesInstallmentsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/fee-rules?tab=installments' },
    { name: 'navigation:finance.feesReceiptTemplate', path: '/finance/fees-receipt-template', icon: DocumentTextIcon, page: 'FeesReceiptTemplatePage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/fee-configuration?tab=receipt-template' },
    { name: 'navigation:finance.dayBook', path: '/finance/day-book', icon: BookOpenIcon, page: 'DayBookPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/accounting-ops?tab=day-book' },
    { name: 'navigation:finance.cashBook', path: '/finance/cash-book', icon: CashIcon, page: 'CashBookPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/accounting-ops?tab=cash-book' },
    { name: 'navigation:finance.studentsPaidBook', path: '/finance/students-paid-book', icon: UsersIcon, page: 'StudentsPaidBookPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/finance?tab=students-paid' },
    { name: 'navigation:finance.feesDueReport', path: '/finance/fees-due-report', icon: DocumentReportIcon, page: 'FeesDueReportPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/finance?tab=fees-due' },
    { name: 'navigation:finance.previousSessionFees', path: '/finance/previous-session-fees', icon: ArrowPathIcon, page: 'PreviousSessionFeesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/student-fee-history?tab=previous-session' },
    { name: 'navigation:finance.journalRegister', path: '/finance/journal-register', icon: BookOpenIcon, page: 'JournalRegisterPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/accounting-ops?tab=journal' },
    { name: 'navigation:finance.trialBalance', path: '/finance/trial-balance', icon: ScaleIcon, page: 'TrialBalancePage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/financial-statements?tab=trial-balance' },
    { name: 'navigation:finance.incomeStatement', path: '/finance/income-statement', icon: ChartBarIcon, page: 'IncomeStatementPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/financial-statements?tab=income-statement' },
    { name: 'navigation:finance.balanceSheet', path: '/finance/balance-sheet', icon: BuildingLibraryIcon, page: 'BalanceSheetPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/financial-statements?tab=balance-sheet' },
    { name: 'navigation:finance.studentPayments', path: '/finance/student-payments', icon: CreditCardIcon, page: 'StudentPaymentsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/payments?tab=student-payments' },
    { name: 'navigation:finance.studentOpeningBalances', path: '/finance/student-opening-balances', icon: BanknotesIcon, page: 'StudentOpeningBalancesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/student-fee-history?tab=opening-balances' },
    { name: 'navigation:finance.feeCollectionSummary', path: '/finance/fee-collection-summary', icon: ChartBarIcon, page: 'FeeCollectionSummaryPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/payments?tab=collection-summary' },
    { name: 'navigation:finance.studentFinancialSummary', path: '/finance/student-financial-summary', icon: WalletIcon, page: 'StudentFinancialSummaryPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/payments?tab=financial-summary' },
    { name: 'navigation:finance.voteheadStatement', path: '/finance/votehead-statement', icon: TableCellsIcon, page: 'VoteheadStatementPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/finance?tab=votehead-statement' },
    { name: 'navigation:finance.accountLedger', path: '/finance/account-ledger', icon: DownloadIcon, page: 'AccountLedgerPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/accounting-ops?tab=ledger' },
    { name: 'navigation:finance.invoiceGeneration', path: '/finance/invoice-generation', icon: DocumentDuplicateIcon, page: 'InvoiceGenerationPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/invoicing?tab=invoice-generation' },
    { name: 'navigation:finance.paymentAllocation', path: '/finance/payment-allocation', icon: CreditCardIcon, page: 'PaymentAllocationPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/payments?tab=payment-allocation' },
    { name: 'navigation:finance.generalReceipts', path: '/finance/general-receipts', icon: ClipboardDocumentListIcon, page: 'GeneralReceiptsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/payments?tab=general-receipts' },
    { name: 'navigation:finance.customerInvoices', path: '/finance/customer-invoices', icon: DocumentTextIcon, page: 'CustomerInvoicesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/invoicing?tab=customer-invoices' },
    { name: 'navigation:finance.supplierInvoices', path: '/finance/supplier-invoices', icon: DocumentTextIcon, page: 'SupplierInvoicesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/invoicing?tab=supplier-invoices' },
    { name: 'navigation:finance.banks', path: '/finance/banks', icon: BuildingOffice2Icon, page: 'BanksPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/accounting-config?tab=banks' },
    { name: 'navigation:finance.suppliers', path: '/finance/suppliers', icon: UserGroupIcon, page: 'SuppliersPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/expenses?tab=suppliers' },
    { name: 'navigation:finance.transportRoutes', path: '/finance/transport-routes', icon: TruckIcon, page: 'TransportRoutesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/transport?tab=routes' },
    { name: 'navigation:finance.studentTransportAssignments', path: '/finance/student-transport-assignments', icon: TruckIcon, page: 'StudentTransportAssignmentsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/finance/transport?tab=assignments' },
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
  routes: [
    { path: '/finance/dashboard', page: 'FinanceDashboardPage' },
    { path: '/finance/fee-configuration', page: 'FeeConfigurationPage' },
    // Fee items (vote heads) live in their own nested page, surfaced as a tab of the fee
    // configuration hub; the route is the deep link the hub tab points at.
    { path: '/finance/fee-items', page: 'feeItems/FeeItemsPage' },
    // The fee-schedule matrix editor is the same shape: a nested page and a hub tab.
    { path: '/finance/fee-schedules', page: 'schedules/FeeSchedulesPage' },
    { path: '/finance/fee-rules', page: 'FeeRulesPage' },
    { path: '/finance/accounting-config', page: 'AccountingConfigPage' },
    { path: '/finance/financial-years', page: 'FinancialYearsPage' },
    { path: '/finance/accounting-ops', page: 'AccountingOperationsPage' },
    { path: '/finance/financial-statements', page: 'FinancialStatementsPage' },
    { path: '/finance/accounting-reports', page: 'accounting/AccountingReportsPage' },
    { path: '/finance/payments', page: 'PaymentsPage' },
    { path: '/finance/student-fee-history', page: 'StudentFeeHistoryPage' },
    // M3: /finance/reports removed; redirected to /reports/finance via redirectMap.
    { path: '/finance/invoicing', page: 'InvoicingPage' },
    { path: '/finance/expenses', page: 'ExpensesPage' },
    { path: '/finance/transport', page: 'TransportFinancePage' },
  ],
  rbacPermissions: financePermissions,
  defaultRoles: financeDefaultRoles,
};

export default financeModule;