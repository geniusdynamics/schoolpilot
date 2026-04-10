// ABOUTME: DEPRECATED - This file is being phased out in favor of module-specific mock data
// ABOUTME: Use @/modules/{module}/data/mockData.ts instead
// TODO: Remove this file after all imports are migrated to module-specific sources

/** @deprecated Use @/modules/academics/data/mockData instead */
export const academicYears: any[] = [];

/** @deprecated Use @/modules/academics/data/mockData instead */
export const subjects: any[] = [];

/** @deprecated Use @/modules/academics/data/mockData instead */
export const classes: any[] = [];

/** @deprecated Use @/modules/academics/data/mockData instead */
export const classStreams: any[] = [];

/** @deprecated Use @/modules/administration/data/mockData instead */
export const departments: any[] = [];

/** @deprecated Use @/modules/administration/data/mockData instead */
export const staff: any[] = [];

/** @deprecated Use @/modules/finance/data/mockData instead */
export const feeTemplates: any[] = [];

/** @deprecated Use @/modules/finance/data/mockData instead */
export const studentPayments: any[] = [];

/** @deprecated Use @/modules/finance/data/mockData instead */
export const studentInvoices: any[] = [];

/** @deprecated Use @/modules/inventory/data/mockData instead */
export const warehouses: any[] = [];

/** @deprecated Use @/modules/inventory/data/mockData instead */
export const items: any[] = [];

/** @deprecated Use @/modules/inventory/data/mockData instead */
export const stockTransactions: any[] = [];

/** @deprecated Use @/modules/library/data/mockData instead */
export const books: any[] = [];

/** @deprecated Use @/modules/library/data/mockData instead */
export const loans: any[] = [];

/** @deprecated Use @/modules/nutrition/data/mockData instead */
export const mealPlans: any[] = [];

/** @deprecated Use @/modules/nutrition/data/mockData instead */
export const nutritionRecords: any[] = [];

// Legacy mockData object (for backward compatibility)
/** @deprecated Use module-specific mockData exports instead */
export const mockData = {
  academicYears,
  subjects,
  classes,
  classStreams,
  departments,
  staff,
  feeTemplates,
  studentPayments,
  studentInvoices,
  warehouses,
  items,
  stockTransactions,
  books,
  loans,
  mealPlans,
  nutritionRecords,
  loading: false,

  /** @deprecated Use module-specific data hooks instead */
  addStudent: async (data: any) => {
    console.warn('[DEPRECATED] mockData.addStudent is deprecated');
  },
  /** @deprecated Use module-specific data hooks instead */
  updateStudent: async (id: string, data: any) => {
    console.warn('[DEPRECATED] mockData.updateStudent is deprecated');
  },
  /** @deprecated Use module-specific data hooks instead */
  deleteStudent: async (id: string) => {
    console.warn('[DEPRECATED] mockData.deleteStudent is deprecated');
  },
  /** @deprecated Use module-specific data hooks instead */
  getStudentDetailsById: (id: string) => {
    console.warn('[DEPRECATED] mockData.getStudentDetailsById is deprecated');
    return null;
  },
  /** @deprecated Use module-specific data hooks instead */
  getStudentFinancialDetailsById: (id: string) => {
    console.warn('[DEPRECATED] mockData.getStudentFinancialDetailsById is deprecated');
    return null;
  }
};

/** @deprecated Use module-specific mockData exports instead */
export default mockData;