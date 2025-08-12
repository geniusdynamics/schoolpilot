import {
  BookOpen,
  Users,
  DollarSign,
  UserCheck,
  Package,
  Library,
  UtensilsCrossed,
  BarChart3,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  Save,
  Copy,
  Share,
  Print,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  FileText,
  Image,
  Video,
  Archive,
  Star,
  Heart,
  Flag,
  Tag,
  Link,
  Lock,
  Unlock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  UserPlus
} from 'lucide-react';
import type { ActionDefinition } from './actionRegistry';

// Academics Module Actions
export const academicsActions: ActionDefinition[] = [
  {
    id: 'academics.create_course',
    label: 'Create Course',
    icon: 'Plus',
    variant: 'primary',
    module: 'academics',
    submodule: 'courses',
    requiredPermissions: ['academics.courses.create'],
    onClick: async () => {
      console.log('Creating new course');
    }
  },
  {
    id: 'academics.view_courses',
    label: 'View Courses',
    icon: 'BookOpen',
    variant: 'secondary',
    module: 'academics',
    submodule: 'courses',
    requiredPermissions: ['academics.courses.read'],
    onClick: async () => {
      console.log('Viewing courses');
    }
  },
  {
    id: 'academics.manage_grades',
    label: 'Manage Grades',
    icon: 'BarChart3',
    variant: 'secondary',
    module: 'academics',
    submodule: 'grades',
    requiredPermissions: ['academics.grades.manage'],
    onClick: async () => {
      console.log('Managing grades');
    }
  },
  {
    id: 'academics.schedule_class',
    label: 'Schedule Class',
    icon: 'Calendar',
    variant: 'secondary',
    module: 'academics',
    submodule: 'schedule',
    requiredPermissions: ['academics.schedule.create'],
    onClick: async () => {
      console.log('Scheduling class');
    }
  },
  {
    id: 'academics.export_transcript',
    label: 'Export Transcript',
    icon: 'Download',
    variant: 'secondary',
    module: 'academics',
    submodule: 'transcripts',
    requiredPermissions: ['academics.transcripts.export'],
    onClick: async () => {
      console.log('Exporting transcript');
    }
  }
];

// Administration Module Actions
export const administrationActions: ActionDefinition[] = [
  {
    id: 'administration.create_user',
    label: 'Create User',
    icon: 'UserPlus',
    variant: 'primary',
    module: 'administration',
    submodule: 'users',
    requiredPermissions: ['administration.users.create'],
    onClick: async () => {
      console.log('Creating new user');
    }
  },
  {
    id: 'administration.manage_roles',
    label: 'Manage Roles',
    icon: 'Shield',
    variant: 'secondary',
    module: 'administration',
    submodule: 'roles',
    requiredPermissions: ['administration.roles.manage'],
    onClick: async () => {
      console.log('Managing user roles');
    }
  },
  {
    id: 'administration.view_audit_log',
    label: 'View Audit Log',
    icon: 'FileText',
    variant: 'secondary',
    module: 'administration',
    submodule: 'audit',
    requiredPermissions: ['administration.audit.read'],
    onClick: async () => {
      console.log('Viewing audit log');
    }
  },
  {
    id: 'administration.system_settings',
    label: 'System Settings',
    icon: 'Settings',
    variant: 'secondary',
    module: 'administration',
    submodule: 'settings',
    requiredPermissions: ['administration.settings.manage'],
    onClick: async () => {
      console.log('Managing system settings');
    }
  },
  {
    id: 'administration.backup_data',
    label: 'Backup Data',
    icon: 'Archive',
    variant: 'secondary',
    module: 'administration',
    submodule: 'backup',
    requiredPermissions: ['administration.backup.create'],
    onClick: async () => {
      console.log('Creating data backup');
    }
  }
];

// Finance Module Actions
export const financeActions: ActionDefinition[] = [
  {
    id: 'finance.create_invoice',
    label: 'Create Invoice',
    icon: 'Plus',
    variant: 'primary',
    module: 'finance',
    submodule: 'invoices',
    requiredPermissions: ['finance.invoices.create'],
    onClick: async () => {
      console.log('Creating new invoice');
    }
  },
  {
    id: 'finance.view_payments',
    label: 'View Payments',
    icon: 'DollarSign',
    variant: 'secondary',
    module: 'finance',
    submodule: 'payments',
    requiredPermissions: ['finance.payments.read'],
    onClick: async () => {
      console.log('Viewing payments');
    }
  },
  {
    id: 'finance.generate_report',
    label: 'Generate Report',
    icon: 'BarChart3',
    variant: 'secondary',
    module: 'finance',
    submodule: 'reports',
    requiredPermissions: ['finance.reports.generate'],
    onClick: async () => {
      console.log('Generating financial report');
    }
  },
  {
    id: 'finance.manage_budget',
    label: 'Manage Budget',
    icon: 'Edit',
    variant: 'secondary',
    module: 'finance',
    submodule: 'budget',
    requiredPermissions: ['finance.budget.manage'],
    onClick: async () => {
      console.log('Managing budget');
    }
  },
  {
    id: 'finance.export_data',
    label: 'Export Financial Data',
    icon: 'Download',
    variant: 'secondary',
    module: 'finance',
    submodule: 'export',
    requiredPermissions: ['finance.data.export'],
    onClick: async () => {
      console.log('Exporting financial data');
    }
  }
];

// HR Module Actions
export const hrActions: ActionDefinition[] = [
  {
    id: 'hr.create_employee',
    label: 'Create Employee',
    icon: 'Plus',
    variant: 'primary',
    module: 'hr',
    submodule: 'employees',
    requiredPermissions: ['hr.employees.create'],
    onClick: async () => {
      console.log('Creating new employee');
    }
  },
  {
    id: 'hr.manage_payroll',
    label: 'Manage Payroll',
    icon: 'DollarSign',
    variant: 'secondary',
    module: 'hr',
    submodule: 'payroll',
    requiredPermissions: ['hr.payroll.manage'],
    onClick: async () => {
      console.log('Managing payroll');
    }
  },
  {
    id: 'hr.view_attendance',
    label: 'View Attendance',
    icon: 'Clock',
    variant: 'secondary',
    module: 'hr',
    submodule: 'attendance',
    requiredPermissions: ['hr.attendance.read'],
    onClick: async () => {
      console.log('Viewing attendance');
    }
  },
  {
    id: 'hr.manage_leave',
    label: 'Manage Leave',
    icon: 'Calendar',
    variant: 'secondary',
    module: 'hr',
    submodule: 'leave',
    requiredPermissions: ['hr.leave.manage'],
    onClick: async () => {
      console.log('Managing leave requests');
    }
  },
  {
    id: 'hr.performance_review',
    label: 'Performance Review',
    icon: 'Star',
    variant: 'secondary',
    module: 'hr',
    submodule: 'performance',
    requiredPermissions: ['hr.performance.manage'],
    onClick: async () => {
      console.log('Managing performance reviews');
    }
  }
];

// Inventory Module Actions
export const inventoryActions: ActionDefinition[] = [
  {
    id: 'inventory.add_item',
    label: 'Add Item',
    icon: 'Plus',
    variant: 'primary',
    module: 'inventory',
    submodule: 'items',
    requiredPermissions: ['inventory.items.create'],
    onClick: async () => {
      console.log('Adding new inventory item');
    }
  },
  {
    id: 'inventory.view_stock',
    label: 'View Stock',
    icon: 'Package',
    variant: 'secondary',
    module: 'inventory',
    submodule: 'stock',
    requiredPermissions: ['inventory.stock.read'],
    onClick: async () => {
      console.log('Viewing stock levels');
    }
  },
  {
    id: 'inventory.update_stock',
    label: 'Update Stock',
    icon: 'Edit',
    variant: 'secondary',
    module: 'inventory',
    submodule: 'stock',
    requiredPermissions: ['inventory.stock.update'],
    onClick: async () => {
      console.log('Updating stock levels');
    }
  },
  {
    id: 'inventory.generate_report',
    label: 'Generate Report',
    icon: 'BarChart3',
    variant: 'secondary',
    module: 'inventory',
    submodule: 'reports',
    requiredPermissions: ['inventory.reports.generate'],
    onClick: async () => {
      console.log('Generating inventory report');
    }
  },
  {
    id: 'inventory.low_stock_alert',
    label: 'Low Stock Alerts',
    icon: 'AlertTriangle',
    variant: 'secondary',
    module: 'inventory',
    submodule: 'alerts',
    requiredPermissions: ['inventory.alerts.view'],
    onClick: async () => {
      console.log('Viewing low stock alerts');
    }
  }
];

// Library Module Actions
export const libraryActions: ActionDefinition[] = [
  {
    id: 'library.add_book',
    label: 'Add Book',
    icon: 'Plus',
    variant: 'primary',
    module: 'library',
    submodule: 'books',
    requiredPermissions: ['library.books.create'],
    onClick: async () => {
      console.log('Adding new book');
    }
  },
  {
    id: 'library.search_catalog',
    label: 'Search Catalog',
    icon: 'Search',
    variant: 'secondary',
    module: 'library',
    submodule: 'catalog',
    requiredPermissions: ['library.catalog.read'],
    onClick: async () => {
      console.log('Searching library catalog');
    }
  },
  {
    id: 'library.manage_loans',
    label: 'Manage Loans',
    icon: 'BookOpen',
    variant: 'secondary',
    module: 'library',
    submodule: 'loans',
    requiredPermissions: ['library.loans.manage'],
    onClick: async () => {
      console.log('Managing book loans');
    }
  },
  {
    id: 'library.overdue_notices',
    label: 'Overdue Notices',
    icon: 'AlertTriangle',
    variant: 'secondary',
    module: 'library',
    submodule: 'notices',
    requiredPermissions: ['library.notices.send'],
    onClick: async () => {
      console.log('Sending overdue notices');
    }
  },
  {
    id: 'library.digital_resources',
    label: 'Digital Resources',
    icon: 'Library',
    variant: 'secondary',
    module: 'library',
    submodule: 'digital',
    requiredPermissions: ['library.digital.access'],
    onClick: async () => {
      console.log('Accessing digital resources');
    }
  }
];

// Nutrition Module Actions
export const nutritionActions: ActionDefinition[] = [
  {
    id: 'nutrition.create_menu',
    label: 'Create Menu',
    icon: 'Plus',
    variant: 'primary',
    module: 'nutrition',
    submodule: 'menus',
    requiredPermissions: ['nutrition.menus.create'],
    onClick: async () => {
      console.log('Creating new menu');
    }
  },
  {
    id: 'nutrition.view_meals',
    label: 'View Meals',
    icon: 'UtensilsCrossed',
    variant: 'secondary',
    module: 'nutrition',
    submodule: 'meals',
    requiredPermissions: ['nutrition.meals.read'],
    onClick: async () => {
      console.log('Viewing meal plans');
    }
  },
  {
    id: 'nutrition.track_allergies',
    label: 'Track Allergies',
    icon: 'AlertTriangle',
    variant: 'secondary',
    module: 'nutrition',
    submodule: 'allergies',
    requiredPermissions: ['nutrition.allergies.manage'],
    onClick: async () => {
      console.log('Tracking student allergies');
    }
  },
  {
    id: 'nutrition.nutrition_report',
    label: 'Nutrition Report',
    icon: 'BarChart3',
    variant: 'secondary',
    module: 'nutrition',
    submodule: 'reports',
    requiredPermissions: ['nutrition.reports.generate'],
    onClick: async () => {
      console.log('Generating nutrition report');
    }
  },
  {
    id: 'nutrition.meal_count',
    label: 'Meal Count',
    icon: 'Users',
    variant: 'secondary',
    module: 'nutrition',
    submodule: 'count',
    requiredPermissions: ['nutrition.count.manage'],
    onClick: async () => {
      console.log('Managing meal counts');
    }
  }
];

// Reports Module Actions
export const reportsActions: ActionDefinition[] = [
  {
    id: 'reports.create_report',
    label: 'Create Report',
    icon: 'Plus',
    variant: 'primary',
    module: 'reports',
    submodule: 'create',
    requiredPermissions: ['reports.create'],
    onClick: async () => {
      console.log('Creating new report');
    }
  },
  {
    id: 'reports.view_dashboard',
    label: 'View Dashboard',
    icon: 'BarChart3',
    variant: 'secondary',
    module: 'reports',
    submodule: 'dashboard',
    requiredPermissions: ['reports.dashboard.read'],
    onClick: async () => {
      console.log('Viewing reports dashboard');
    }
  },
  {
    id: 'reports.export_data',
    label: 'Export Data',
    icon: 'Download',
    variant: 'secondary',
    module: 'reports',
    submodule: 'export',
    requiredPermissions: ['reports.export'],
    onClick: async () => {
      console.log('Exporting report data');
    }
  },
  {
    id: 'reports.schedule_report',
    label: 'Schedule Report',
    icon: 'Calendar',
    variant: 'secondary',
    module: 'reports',
    submodule: 'schedule',
    requiredPermissions: ['reports.schedule'],
    onClick: async () => {
      console.log('Scheduling automated report');
    }
  },
  {
    id: 'reports.share_report',
    label: 'Share Report',
    icon: 'Share',
    variant: 'secondary',
    module: 'reports',
    submodule: 'share',
    requiredPermissions: ['reports.share'],
    onClick: async () => {
      console.log('Sharing report');
    }
  }
];

// Settings Module Actions
export const settingsActions: ActionDefinition[] = [
  {
    id: 'settings.general',
    label: 'General Settings',
    icon: 'Settings',
    variant: 'secondary',
    module: 'settings',
    submodule: 'general',
    requiredPermissions: ['settings.general.manage'],
    onClick: async () => {
      console.log('Managing general settings');
    }
  },
  {
    id: 'settings.security',
    label: 'Security Settings',
    icon: 'Shield',
    variant: 'secondary',
    module: 'settings',
    submodule: 'security',
    requiredPermissions: ['settings.security.manage'],
    onClick: async () => {
      console.log('Managing security settings');
    }
  },
  {
    id: 'settings.notifications',
    label: 'Notification Settings',
    icon: 'Mail',
    variant: 'secondary',
    module: 'settings',
    submodule: 'notifications',
    requiredPermissions: ['settings.notifications.manage'],
    onClick: async () => {
      console.log('Managing notification settings');
    }
  },
  {
    id: 'settings.integrations',
    label: 'Integrations',
    icon: 'Link',
    variant: 'secondary',
    module: 'settings',
    submodule: 'integrations',
    requiredPermissions: ['settings.integrations.manage'],
    onClick: async () => {
      console.log('Managing integrations');
    }
  },
  {
    id: 'settings.backup_restore',
    label: 'Backup & Restore',
    icon: 'Archive',
    variant: 'secondary',
    module: 'settings',
    submodule: 'backup',
    requiredPermissions: ['settings.backup.manage'],
    onClick: async () => {
      console.log('Managing backup and restore');
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