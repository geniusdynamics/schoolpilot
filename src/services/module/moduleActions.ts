import { logger } from '@/utils/logging';

import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  CakeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FlagIcon,
  FunnelIcon,
  HeartIcon,
  InformationCircleIcon,
  LinkIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  PhotoIcon,
  PlusIcon,
  PrinterIcon,
  QuestionMarkCircleIcon,
  ShareIcon,
  ShieldCheckIcon,
  Square2StackIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
  UserCircleIcon,
  UserPlusIcon,
  UsersIcon,
  VideoCameraIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import type { ActionDefinition } from '../ui/actionRegistry';

// Academics Module Actions
export const academicsActions: ActionDefinition[] = [
  {
    id: 'academics.create_course',
    label: 'Create Course',
    icon: 'PlusIcon',
    variant: 'primary',
    module: 'academics',
    submodule: 'courses',
    requiredPermissions: ['academics.courses.create'],
    onClick: async () => {
      logger.info('Creating new course');
    }
  },
  {
    id: 'academics.view_courses',
    label: 'View Courses',
    icon: 'BookOpenIcon',
    variant: 'secondary',
    module: 'academics',
    submodule: 'courses',
    requiredPermissions: ['academics.courses.read'],
    onClick: async () => {
      logger.info('Viewing courses');
    }
  },
  {
    id: 'academics.manage_grades',
    label: 'Manage Grades',
    icon: 'ChartBarIcon',
    variant: 'secondary',
    module: 'academics',
    submodule: 'grades',
    requiredPermissions: ['academics.grades.manage'],
    onClick: async () => {
      logger.info('Managing grades');
    }
  },
  {
    id: 'academics.schedule_class',
    label: 'Schedule Class',
    icon: 'CalendarDaysIcon',
    variant: 'secondary',
    module: 'academics',
    submodule: 'schedule',
    requiredPermissions: ['academics.schedule.create'],
    onClick: async () => {
      logger.info('Scheduling class');
    }
  },
  {
    id: 'academics.export_transcript',
    label: 'Export Transcript',
    icon: 'ArrowDownTrayIcon',
    variant: 'secondary',
    module: 'academics',
    submodule: 'transcripts',
    requiredPermissions: ['academics.transcripts.export'],
    onClick: async () => {
      logger.info('Exporting transcript');
    }
  }
];

// Administration Module Actions
export const administrationActions: ActionDefinition[] = [
  {
    id: 'administration.create_user',
    label: 'Create User',
    icon: 'UserPlusIcon',
    variant: 'primary',
    module: 'administration',
    submodule: 'users',
    requiredPermissions: ['administration.users.create'],
    onClick: async () => {
      logger.info('Creating new user');
    }
  },
  {
    id: 'administration.manage_roles',
    label: 'Manage Roles',
    icon: 'ShieldCheckIcon',
    variant: 'secondary',
    module: 'administration',
    submodule: 'roles',
    requiredPermissions: ['administration.roles.manage'],
    onClick: async () => {
      logger.info('Managing user roles');
    }
  },
  {
    id: 'administration.view_audit_log',
    label: 'View Audit Log',
    icon: 'DocumentTextIcon',
    variant: 'secondary',
    module: 'administration',
    submodule: 'audit',
    requiredPermissions: ['administration.audit.read'],
    onClick: async () => {
      logger.info('Viewing audit log');
    }
  },
  {
    id: 'administration.system_settings',
    label: 'System Cog6ToothIcon',
    icon: 'Cog6ToothIcon',
    variant: 'secondary',
    module: 'administration',
    submodule: 'settings',
    requiredPermissions: ['administration.settings.manage'],
    onClick: async () => {
      logger.info('Managing system settings');
    }
  },
  {
    id: 'administration.backup_data',
    label: 'Backup Data',
    icon: 'ArchiveBoxIcon',
    variant: 'secondary',
    module: 'administration',
    submodule: 'backup',
    requiredPermissions: ['administration.backup.create'],
    onClick: async () => {
      logger.info('Creating data backup');
    }
  }
];

// Finance Module Actions
export const financeActions: ActionDefinition[] = [
  {
    id: 'finance.create_invoice',
    label: 'Create Invoice',
    icon: 'PlusIcon',
    variant: 'primary',
    module: 'finance',
    submodule: 'invoices',
    requiredPermissions: ['finance.invoices.create'],
    onClick: async () => {
      logger.info('Creating new invoice');
    }
  },
  {
    id: 'finance.view_payments',
    label: 'View Payments',
    icon: 'CurrencyDollarIcon',
    variant: 'secondary',
    module: 'finance',
    submodule: 'payments',
    requiredPermissions: ['finance.payments.read'],
    onClick: async () => {
      logger.info('Viewing payments');
    }
  },
  {
    id: 'finance.generate_report',
    label: 'Generate Report',
    icon: 'ChartBarIcon',
    variant: 'secondary',
    module: 'finance',
    submodule: 'reports',
    requiredPermissions: ['finance.reports.generate'],
    onClick: async () => {
      logger.info('Generating financial report');
    }
  },
  {
    id: 'finance.manage_budget',
    label: 'Manage Budget',
    icon: 'PencilSquareIcon',
    variant: 'secondary',
    module: 'finance',
    submodule: 'budget',
    requiredPermissions: ['finance.budget.manage'],
    onClick: async () => {
      logger.info('Managing budget');
    }
  },
  {
    id: 'finance.export_data',
    label: 'Export Financial Data',
    icon: 'ArrowDownTrayIcon',
    variant: 'secondary',
    module: 'finance',
    submodule: 'export',
    requiredPermissions: ['finance.data.export'],
    onClick: async () => {
      logger.info('Exporting financial data');
    }
  }
];

// HR Module Actions
export const hrActions: ActionDefinition[] = [
  {
    id: 'hr.create_employee',
    label: 'Create Employee',
    icon: 'PlusIcon',
    variant: 'primary',
    module: 'hr',
    submodule: 'employees',
    requiredPermissions: ['hr.employees.create'],
    onClick: async () => {
      logger.info('Creating new employee');
    }
  },
  {
    id: 'hr.manage_payroll',
    label: 'Manage Payroll',
    icon: 'CurrencyDollarIcon',
    variant: 'secondary',
    module: 'hr',
    submodule: 'payroll',
    requiredPermissions: ['hr.payroll.manage'],
    onClick: async () => {
      logger.info('Managing payroll');
    }
  },
  {
    id: 'hr.view_attendance',
    label: 'View Attendance',
    icon: 'ClockIcon',
    variant: 'secondary',
    module: 'hr',
    submodule: 'attendance',
    requiredPermissions: ['hr.attendance.read'],
    onClick: async () => {
      logger.info('Viewing attendance');
    }
  },
  {
    id: 'hr.manage_leave',
    label: 'Manage Leave',
    icon: 'CalendarDaysIcon',
    variant: 'secondary',
    module: 'hr',
    submodule: 'leave',
    requiredPermissions: ['hr.leave.manage'],
    onClick: async () => {
      logger.info('Managing leave requests');
    }
  },
  {
    id: 'hr.performance_review',
    label: 'Performance Review',
    icon: 'StarIcon',
    variant: 'secondary',
    module: 'hr',
    submodule: 'performance',
    requiredPermissions: ['hr.performance.manage'],
    onClick: async () => {
      logger.info('Managing performance reviews');
    }
  }
];

// Inventory Module Actions
export const inventoryActions: ActionDefinition[] = [
  {
    id: 'inventory.add_item',
    label: 'Add Item',
    icon: 'PlusIcon',
    variant: 'primary',
    module: 'inventory',
    submodule: 'items',
    requiredPermissions: ['inventory.items.create'],
    onClick: async () => {
      logger.info('Adding new inventory item');
    }
  },
  {
    id: 'inventory.view_stock',
    label: 'View Stock',
    icon: 'ArchiveBoxIcon',
    variant: 'secondary',
    module: 'inventory',
    submodule: 'stock',
    requiredPermissions: ['inventory.stock.read'],
    onClick: async () => {
      logger.info('Viewing stock levels');
    }
  },
  {
    id: 'inventory.update_stock',
    label: 'Update Stock',
    icon: 'PencilSquareIcon',
    variant: 'secondary',
    module: 'inventory',
    submodule: 'stock',
    requiredPermissions: ['inventory.stock.update'],
    onClick: async () => {
      logger.info('Updating stock levels');
    }
  },
  {
    id: 'inventory.generate_report',
    label: 'Generate Report',
    icon: 'ChartBarIcon',
    variant: 'secondary',
    module: 'inventory',
    submodule: 'reports',
    requiredPermissions: ['inventory.reports.generate'],
    onClick: async () => {
      logger.info('Generating inventory report');
    }
  },
  {
    id: 'inventory.low_stock_alert',
    label: 'Low Stock Alerts',
    icon: 'ExclamationTriangleIcon',
    variant: 'secondary',
    module: 'inventory',
    submodule: 'alerts',
    requiredPermissions: ['inventory.alerts.view'],
    onClick: async () => {
      logger.info('Viewing low stock alerts');
    }
  }
];

// BuildingLibraryIcon Module Actions
export const libraryActions: ActionDefinition[] = [
  {
    id: 'library.add_book',
    label: 'Add Book',
    icon: 'PlusIcon',
    variant: 'primary',
    module: 'library',
    submodule: 'books',
    requiredPermissions: ['library.books.create'],
    onClick: async () => {
      logger.info('Adding new book');
    }
  },
  {
    id: 'library.search_catalog',
    label: 'MagnifyingGlassIcon Catalog',
    icon: 'MagnifyingGlassIcon',
    variant: 'secondary',
    module: 'library',
    submodule: 'catalog',
    requiredPermissions: ['library.catalog.read'],
    onClick: async () => {
      logger.info('Searching library catalog');
    }
  },
  {
    id: 'library.manage_loans',
    label: 'Manage Loans',
    icon: 'BookOpenIcon',
    variant: 'secondary',
    module: 'library',
    submodule: 'loans',
    requiredPermissions: ['library.loans.manage'],
    onClick: async () => {
      logger.info('Managing book loans');
    }
  },
  {
    id: 'library.overdue_notices',
    label: 'Overdue Notices',
    icon: 'ExclamationTriangleIcon',
    variant: 'secondary',
    module: 'library',
    submodule: 'notices',
    requiredPermissions: ['library.notices.send'],
    onClick: async () => {
      logger.info('Sending overdue notices');
    }
  },
  {
    id: 'library.digital_resources',
    label: 'Digital Resources',
    icon: 'BuildingLibraryIcon',
    variant: 'secondary',
    module: 'library',
    submodule: 'digital',
    requiredPermissions: ['library.digital.access'],
    onClick: async () => {
      logger.info('Accessing digital resources');
    }
  }
];

// Nutrition Module Actions
export const nutritionActions: ActionDefinition[] = [
  {
    id: 'nutrition.create_menu',
    label: 'Create Menu',
    icon: 'PlusIcon',
    variant: 'primary',
    module: 'nutrition',
    submodule: 'menus',
    requiredPermissions: ['nutrition.menus.create'],
    onClick: async () => {
      logger.info('Creating new menu');
    }
  },
  {
    id: 'nutrition.view_meals',
    label: 'View Meals',
    icon: 'CakeIcon',
    variant: 'secondary',
    module: 'nutrition',
    submodule: 'meals',
    requiredPermissions: ['nutrition.meals.read'],
    onClick: async () => {
      logger.info('Viewing meal plans');
    }
  },
  {
    id: 'nutrition.track_allergies',
    label: 'Track Allergies',
    icon: 'ExclamationTriangleIcon',
    variant: 'secondary',
    module: 'nutrition',
    submodule: 'allergies',
    requiredPermissions: ['nutrition.allergies.manage'],
    onClick: async () => {
      logger.info('Tracking student allergies');
    }
  },
  {
    id: 'nutrition.nutrition_report',
    label: 'Nutrition Report',
    icon: 'ChartBarIcon',
    variant: 'secondary',
    module: 'nutrition',
    submodule: 'reports',
    requiredPermissions: ['nutrition.reports.generate'],
    onClick: async () => {
      logger.info('Generating nutrition report');
    }
  },
  {
    id: 'nutrition.meal_count',
    label: 'Meal Count',
    icon: 'UsersIcon',
    variant: 'secondary',
    module: 'nutrition',
    submodule: 'count',
    requiredPermissions: ['nutrition.count.manage'],
    onClick: async () => {
      logger.info('Managing meal counts');
    }
  }
];

// Reports Module Actions
export const reportsActions: ActionDefinition[] = [
  {
    id: 'reports.create_report',
    label: 'Create Report',
    icon: 'PlusIcon',
    variant: 'primary',
    module: 'reports',
    submodule: 'create',
    requiredPermissions: ['reports.create'],
    onClick: async () => {
      logger.info('Creating new report');
    }
  },
  {
    id: 'reports.view_dashboard',
    label: 'View Dashboard',
    icon: 'ChartBarIcon',
    variant: 'secondary',
    module: 'reports',
    submodule: 'dashboard',
    requiredPermissions: ['reports.dashboard.read'],
    onClick: async () => {
      logger.info('Viewing reports dashboard');
    }
  },
  {
    id: 'reports.export_data',
    label: 'Export Data',
    icon: 'ArrowDownTrayIcon',
    variant: 'secondary',
    module: 'reports',
    submodule: 'export',
    requiredPermissions: ['reports.export'],
    onClick: async () => {
      logger.info('Exporting report data');
    }
  },
  {
    id: 'reports.schedule_report',
    label: 'Schedule Report',
    icon: 'CalendarDaysIcon',
    variant: 'secondary',
    module: 'reports',
    submodule: 'schedule',
    requiredPermissions: ['reports.schedule'],
    onClick: async () => {
      logger.info('Scheduling automated report');
    }
  },
  {
    id: 'reports.share_report',
    label: 'ShareIcon Report',
    icon: 'ShareIcon',
    variant: 'secondary',
    module: 'reports',
    submodule: 'share',
    requiredPermissions: ['reports.share'],
    onClick: async () => {
      logger.info('Sharing report');
    }
  }
];

// Cog6ToothIcon Module Actions
export const settingsActions: ActionDefinition[] = [
  {
    id: 'settings.general',
    label: 'General Cog6ToothIcon',
    icon: 'Cog6ToothIcon',
    variant: 'secondary',
    module: 'settings',
    submodule: 'general',
    requiredPermissions: ['settings.general.manage'],
    onClick: async () => {
      logger.info('Managing general settings');
    }
  },
  {
    id: 'settings.security',
    label: 'Security Cog6ToothIcon',
    icon: 'ShieldCheckIcon',
    variant: 'secondary',
    module: 'settings',
    submodule: 'security',
    requiredPermissions: ['settings.security.manage'],
    onClick: async () => {
      logger.info('Managing security settings');
    }
  },
  {
    id: 'settings.notifications',
    label: 'Notification Cog6ToothIcon',
    icon: 'EnvelopeIcon',
    variant: 'secondary',
    module: 'settings',
    submodule: 'notifications',
    requiredPermissions: ['settings.notifications.manage'],
    onClick: async () => {
      logger.info('Managing notification settings');
    }
  },
  {
    id: 'settings.integrations',
    label: 'Integrations',
    icon: 'LinkIcon',
    variant: 'secondary',
    module: 'settings',
    submodule: 'integrations',
    requiredPermissions: ['settings.integrations.manage'],
    onClick: async () => {
      logger.info('Managing integrations');
    }
  },
  {
    id: 'settings.backup_restore',
    label: 'Backup & Restore',
    icon: 'ArchiveBoxIcon',
    variant: 'secondary',
    module: 'settings',
    submodule: 'backup',
    requiredPermissions: ['settings.backup.manage'],
    onClick: async () => {
      logger.info('Managing backup and restore');
    }
  }
];

// Export all module actions
export const allModuleActions = {
  academics: academicsActions,
  administration: administrationActions,
  finance: financeActions,
  hr: hrActions,
  inventory: inventoryActions,
  library: libraryActions,
  nutrition: nutritionActions,
  reports: reportsActions,
  settings: settingsActions
};

// Helper function to get actions by module
export const getActionsByModule = (module: string): ActionDefinition[] => {
  return allModuleActions[module as keyof typeof allModuleActions] || [];
};

// Helper function to register all module actions
export const registerAllModuleActions = (registerAction: (action: ActionDefinition) => void) => {
  Object.values(allModuleActions).flat().forEach(action => {
    registerAction(action);
  });
};

export default allModuleActions;