// ABOUTME: This file provides basic mock data structure for AppDataContext when enhanced data layer is disabled
// ABOUTME: Contains simplified data objects that match the expected application data structure

export const mockData = {
  // Academic data
  academicYears: [
    { id: 1, name: 'AY 2023/2024', start_date: '2023-09-01', end_date: '2024-08-31', is_active: true }
  ],
  subjects: [
    { id: 1, name: 'English', code: 'ENG', created_at: new Date().toISOString() },
    { id: 2, name: 'Mathematics', code: 'MATH', created_at: new Date().toISOString() },
    { id: 3, name: 'Science', code: 'SCI', created_at: new Date().toISOString() }
  ],
  classes: [
    { id: 1, name: 'Form 1', level: 1, created_at: new Date().toISOString() },
    { id: 2, name: 'Form 2', level: 2, created_at: new Date().toISOString() }
  ],
  classStreams: [
    { id: 1, class_id: 1, name: 'Form 1 A', capacity: 40 },
    { id: 2, class_id: 1, name: 'Form 1 B', capacity: 40 }
  ],

  // Administration data
  departments: [
    { id: 'DEPT001', name: 'Academics', created_at: new Date().toISOString() },
    { id: 'DEPT002', name: 'Administration', created_at: new Date().toISOString() }
  ],
  staff: [
    { id: 'STF001', first_name: 'John', last_name: 'Doe', department_id: 'DEPT001', is_active: true }
  ],

  // Finance data
  feeTemplates: [
    { id: 1, name: 'Tuition Fee', amount: 15000, created_at: new Date().toISOString() }
  ],
  studentPayments: [],
  studentInvoices: [],

  // Inventory data
  warehouses: [
    { id: 1, name: 'Main Store', location: 'Block A', created_at: new Date().toISOString() }
  ],
  items: [],
  stockTransactions: [],

  // Library data
  books: [],
  loans: [],

  // Nutrition data
  mealPlans: [],
  menus: [],

  // Loading states
  loading: false,

  // CRUD operations (mock implementations)
  addStudent: async (data: any) => {
    console.log('Mock: Adding student', data);
  },
  updateStudent: async (id: string, data: any) => {
    console.log('Mock: Updating student', id, data);
  },
  deleteStudent: async (id: string) => {
    console.log('Mock: Deleting student', id);
  },

  // Utility functions
  getStudentDetailsById: (id: string) => {
    console.log('Mock: Getting student details for', id);
    return null;
  },
  getStudentFinancialDetailsById: (id: string) => {
    console.log('Mock: Getting student financial details for', id);
    return null;
  }
};

export default mockData;