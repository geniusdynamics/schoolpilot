// ABOUTME: Module seeder configuration for granular data seeding control
// ABOUTME: Defines available modules for selective database seeding

export type SeederModuleId = 
  | 'all'
  | 'core'
  | 'administration'
  | 'students'
  | 'academics'
  | 'finance'
  | 'hr_payroll'
  | 'library'
  | 'inventory'
  | 'transport'
  | 'nutrition'
  | 'communications';

export interface SeederModuleOption {
  id: SeederModuleId;
  name: string;
  description: string;
  dependencies: SeederModuleId[];
  estimatedRecords: Record<'tiny' | 'small' | 'medium' | 'large' | 'enterprise', number>;
  collections: string[];
}

export const MODULE_SEEDER_OPTIONS: SeederModuleOption[] = [
  {
    id: 'core',
    name: 'Core System',
    description: 'School details, academic years, terms, users, roles, departments',
    dependencies: [],
    estimatedRecords: {
      tiny: 30,
      small: 50,
      medium: 75,
      large: 100,
      enterprise: 150
    },
    collections: [
      'school_details',
      'academic_year_structures',
      'academic_period_definitions',
      'academic_years',
      'school_periods',
      'financial_years',
      'roles',
      'users',
      'departments',
      'designations',
      'student_categories',
      'dormitories',
      'classes',
      'class_streams'
    ]
  },
  {
    id: 'administration',
    name: 'Administration & HR',
    description: 'Staff records, HOD assignments, dormitory masters',
    dependencies: ['core'],
    estimatedRecords: {
      tiny: 15,
      small: 30,
      medium: 50,
      large: 80,
      enterprise: 150
    },
    collections: [
      'staff',
      'payroll_periods',
      'payroll_item_types',
      'staff_salary_settings'
    ]
  },
  {
    id: 'students',
    name: 'Students & Families',
    description: 'Students, guardians, family relationships, health records',
    dependencies: ['core', 'administration'],
    estimatedRecords: {
      tiny: 50,
      small: 250,
      medium: 800,
      large: 2500,
      enterprise: 8000
    },
    collections: [
      'students',
      'parents_guardians',
      'student_guardian_relationships',
      'student_health_records',
      'student_attendance'
    ]
  },
  {
    id: 'academics',
    name: 'Academics',
    description: 'Subjects, exams, grades, timetables, rankings',
    dependencies: ['core', 'administration', 'students'],
    estimatedRecords: {
      tiny: 200,
      small: 1000,
      medium: 3500,
      large: 10000,
      enterprise: 35000
    },
    collections: [
      'subjects',
      'subject_papers',
      'exam_sessions',
      'exam_paper_settings',
      'grading_schemes',
      'student_exam_results',
      'student_paper_marks',
      'class_subject_allocations',
      'teacher_subject_assignments',
      'student_subject_enrollments',
      'timetable_entries',
      'timetable_period_defs'
    ]
  },
  {
    id: 'finance',
    name: 'Finance & Fees',
    description: 'Fee structures, invoices, payments, GL entries, adjustments',
    dependencies: ['core', 'students'],
    estimatedRecords: {
      tiny: 150,
      small: 800,
      medium: 3000,
      large: 9000,
      enterprise: 30000
    },
    collections: [
      'chart_of_accounts',
      'expense_categories',
      'banks',
      'fee_templates',
      'fee_template_items',
      'student_invoices',
      'student_invoice_items',
      'student_payments',
      'invoice_payment_applications',
      'fee_adjustments',
      'student_opening_balances',
      'expense_claims',
      'general_payments',
      'general_ledger_entries',
      'customer_invoices',
      'supplier_invoices'
    ]
  },
  {
    id: 'hr_payroll',
    name: 'HR & Payroll',
    description: 'Payslips, leave applications, training, performance reviews',
    dependencies: ['administration'],
    estimatedRecords: {
      tiny: 30,
      small: 100,
      medium: 300,
      large: 800,
      enterprise: 2000
    },
    collections: [
      'payslips',
      'payslip_items',
      'staff_recurring_items'
    ]
  },
  {
    id: 'library',
    name: 'Library',
    description: 'Books, loans, fines, categories, reservations',
    dependencies: ['core', 'students', 'administration'],
    estimatedRecords: {
      tiny: 50,
      small: 150,
      medium: 400,
      large: 1000,
      enterprise: 2500
    },
    collections: [
      'book_categories',
      'books',
      'loans',
      'fines'
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory & Procurement',
    description: 'Items, stock, requisitions, purchase orders, suppliers',
    dependencies: ['core', 'administration'],
    estimatedRecords: {
      tiny: 80,
      small: 200,
      medium: 500,
      large: 1200,
      enterprise: 3000
    },
    collections: [
      'item_categories_inv',
      'items_inv',
      'warehouses',
      'stock_levels',
      'stock_transactions',
      'fixed_assets',
      'asset_depreciation_logs',
      'requisitions',
      'requisition_items',
      'purchase_orders',
      'purchase_order_items',
      'rfqs',
      'suppliers'
    ]
  },
  {
    id: 'transport',
    name: 'Transport',
    description: 'Routes, assignments, transport billing',
    dependencies: ['core', 'students', 'finance'],
    estimatedRecords: {
      tiny: 20,
      small: 60,
      medium: 150,
      large: 400,
      enterprise: 1000
    },
    collections: [
      'transport_routes',
      'student_transport_assignments'
    ]
  },
  {
    id: 'nutrition',
    name: 'Nutrition & Canteen',
    description: 'Meal plans, menus, consumption logs, student wallets',
    dependencies: ['core', 'students', 'finance'],
    estimatedRecords: {
      tiny: 50,
      small: 150,
      medium: 400,
      large: 1000,
      enterprise: 2500
    },
    collections: [
      'meal_plans',
      'student_meal_plans',
      'menus',
      'meal_consumption_logs',
      'merchants',
      'student_wallets',
      'wallet_transactions'
    ]
  },
  {
    id: 'communications',
    name: 'Communications',
    description: 'Templates, campaigns, SMS/email logs',
    dependencies: ['core', 'students'],
    estimatedRecords: {
      tiny: 20,
      small: 50,
      medium: 100,
      large: 200,
      enterprise: 500
    },
    collections: [
      'templates_comm',
      'communication_campaigns',
      'communication_logs'
    ]
  }
];

/**
 * Resolves module dependencies and returns modules in correct seeding order
 * Uses topological sort to ensure dependencies are seeded first
 */
export const resolveModuleOrder = (selected: SeederModuleId[]): SeederModuleId[] => {
  if (selected.includes('all')) {
    // Return all modules in dependency order
    const allModules = MODULE_SEEDER_OPTIONS.map(m => m.id);
    return sortByDependencies(allModules);
  }

  return sortByDependencies(selected.filter((id): id is SeederModuleId => id !== 'all'));
};

/**
 * Sorts modules by their dependencies using topological sort
 */
const sortByDependencies = (moduleIds: SeederModuleId[]): SeederModuleId[] => {
  const result: SeederModuleId[] = [];
  const visited = new Set<SeederModuleId>();
  const visiting = new Set<SeederModuleId>();

  const visit = (id: SeederModuleId) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      console.warn(`Circular dependency detected in module: ${id}`);
      return;
    }

    visiting.add(id);
    const module = MODULE_SEEDER_OPTIONS.find(m => m.id === id);
    
    // Visit dependencies first
    module?.dependencies.forEach(dep => {
      if (!moduleIds.includes(dep)) {
        // Add missing dependency
        moduleIds.push(dep);
      }
      visit(dep);
    });

    visiting.delete(id);
    visited.add(id);
    result.push(id);
  };

  // Visit all modules
  [...moduleIds].forEach(visit);

  return result;
};

/**
 * Gets total estimated records for selected modules at given volume
 */
export const getEstimatedRecords = (
  modules: SeederModuleId[],
  volume: 'tiny' | 'small' | 'medium' | 'large' | 'enterprise'
): number => {
  const ordered = resolveModuleOrder(modules);
  return ordered.reduce((total, id) => {
    const module = MODULE_SEEDER_OPTIONS.find(m => m.id === id);
    return total + (module?.estimatedRecords[volume] || 0);
  }, 0);
};

/**
 * Gets all collection names for selected modules
 */
export const getCollectionsForModules = (modules: SeederModuleId[]): string[] => {
  const ordered = resolveModuleOrder(modules);
  const collections = new Set<string>();

  ordered.forEach(id => {
    const module = MODULE_SEEDER_OPTIONS.find(m => m.id === id);
    module?.collections.forEach(col => collections.add(col));
  });

  return Array.from(collections);
};
