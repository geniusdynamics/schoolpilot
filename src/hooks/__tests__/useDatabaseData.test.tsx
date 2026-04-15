// ABOUTME: Tests the database-backed app data hook compatibility helpers for timetable and attendance flows.

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDatabaseData } from '../useDatabaseData';
import { ToastProvider } from '../../hooks/useToast';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

vi.mock('../../services/databaseService', () => ({
  databaseService: {
    initializeDatabase: vi.fn().mockResolvedValue(undefined),
    seedDatabaseWithMockData: vi.fn().mockResolvedValue(undefined),
    clearDatabase: vi.fn().mockResolvedValue(undefined),
    generateId: vi.fn().mockReturnValue('generated-id'),
    getDatabase: vi.fn().mockResolvedValue({
      student_attendance: { find: vi.fn().mockResolvedValue([]), insert: vi.fn() },
      timetable_entries: { find: vi.fn().mockResolvedValue([]), insert: vi.fn(), update: vi.fn(), remove: vi.fn() },
      timetable_period_defs: { find: vi.fn().mockResolvedValue([]), insert: vi.fn(), remove: vi.fn() },
      students: { find: vi.fn().mockResolvedValue([]) },
      staff: { find: vi.fn().mockResolvedValue([]) },
      classes: { find: vi.fn().mockResolvedValue([]) },
      class_streams: { find: vi.fn().mockResolvedValue([]) },
      subjects: { find: vi.fn().mockResolvedValue([]) },
      exam_sessions: { find: vi.fn().mockResolvedValue([]) },
      exam_paper_settings: { find: vi.fn().mockResolvedValue([]) },
      grading_schemes: { find: vi.fn().mockResolvedValue([]) },
      student_exam_results: { find: vi.fn().mockResolvedValue([]) },
      class_subject_allocations: { find: vi.fn().mockResolvedValue([]) },
      teacher_subject_assignments: { find: vi.fn().mockResolvedValue([]) },
      student_subject_enrollments: { find: vi.fn().mockResolvedValue([]) },
      academic_years: { find: vi.fn().mockResolvedValue([]) },
      school_periods: { find: vi.fn().mockResolvedValue([]) },
      academic_year_structures: { find: vi.fn().mockResolvedValue([]) },
      academic_period_definitions: { find: vi.fn().mockResolvedValue([]) },
      departments: { find: vi.fn().mockResolvedValue([]) },
      designations: { find: vi.fn().mockResolvedValue([]) },
      student_categories: { find: vi.fn().mockResolvedValue([]) },
      dormitories: { find: vi.fn().mockResolvedValue([]) },
      parents_guardians: { find: vi.fn().mockResolvedValue([]) },
      partners: { find: vi.fn().mockResolvedValue([]) },
      clubs: { find: vi.fn().mockResolvedValue([]) },
      customers: { find: vi.fn().mockResolvedValue([]) },
      student_health_records: { find: vi.fn().mockResolvedValue([]) },
      disciplinary_records: { find: vi.fn().mockResolvedValue([]) },
      health_incident_reports: { find: vi.fn().mockResolvedValue([]) },
      student_class_history: { find: vi.fn().mockResolvedValue([]) },
      chart_of_accounts: { find: vi.fn().mockResolvedValue([]) },
      banks: { find: vi.fn().mockResolvedValue([]) },
      suppliers: { find: vi.fn().mockResolvedValue([]) },
      fee_templates: { find: vi.fn().mockResolvedValue([]) },
      fee_template_items: { find: vi.fn().mockResolvedValue([]) },
      expense_categories: { find: vi.fn().mockResolvedValue([]) },
      expense_claims: { find: vi.fn().mockResolvedValue([]) },
      supplier_invoices: { find: vi.fn().mockResolvedValue([]) },
      customer_invoices: { find: vi.fn().mockResolvedValue([]) },
      student_opening_balances: { find: vi.fn().mockResolvedValue([]) },
      fee_adjustments: { find: vi.fn().mockResolvedValue([]) },
      transport_routes: { find: vi.fn().mockResolvedValue([]) },
      student_transport_assignments: { find: vi.fn().mockResolvedValue([]) },
      student_invoices: { find: vi.fn().mockResolvedValue([]) },
      student_invoice_items: { find: vi.fn().mockResolvedValue([]) },
      student_payments: { find: vi.fn().mockResolvedValue([]) },
      invoice_payment_applications: { find: vi.fn().mockResolvedValue([]) },
      general_payments: { find: vi.fn().mockResolvedValue([]) },
      general_ledger_entries: { find: vi.fn().mockResolvedValue([]) },
      financial_years: { find: vi.fn().mockResolvedValue([]) },
      payroll_periods: { find: vi.fn().mockResolvedValue([]) },
      payroll_item_types: { find: vi.fn().mockResolvedValue([]) },
      staff_salary_settings: { find: vi.fn().mockResolvedValue([]) },
      payslips: { find: vi.fn().mockResolvedValue([]) },
      warehouses: { find: vi.fn().mockResolvedValue([]) },
      item_categories_inv: { find: vi.fn().mockResolvedValue([]) },
      items_inv: { find: vi.fn().mockResolvedValue([]) },
      fixed_assets: { find: vi.fn().mockResolvedValue([]) },
      requisitions: { find: vi.fn().mockResolvedValue([]) },
      purchase_orders: { find: vi.fn().mockResolvedValue([]) },
      stock_levels: { find: vi.fn().mockResolvedValue([]) },
      stock_transactions: { find: vi.fn().mockResolvedValue([]) },
      rfqs: { find: vi.fn().mockResolvedValue([]) },
      book_categories: { find: vi.fn().mockResolvedValue([]) },
      books: { find: vi.fn().mockResolvedValue([]) },
      loans: { find: vi.fn().mockResolvedValue([]) },
      fines: { find: vi.fn().mockResolvedValue([]) },
      meal_plans: { find: vi.fn().mockResolvedValue([]) },
      menus: { find: vi.fn().mockResolvedValue([]) },
      merchants: { find: vi.fn().mockResolvedValue([]) },
      student_meal_plans: { find: vi.fn().mockResolvedValue([]) },
      student_wallets: { find: vi.fn().mockResolvedValue([]) },
      users: { find: vi.fn().mockResolvedValue([]) },
      roles: { find: vi.fn().mockResolvedValue([]) },
      campaigns: { find: vi.fn().mockResolvedValue([]) },
      template_comms: { find: vi.fn().mockResolvedValue([]) },
      audit_logs: { find: vi.fn().mockResolvedValue([]) },
      workflows: { find: vi.fn().mockResolvedValue([]) },
      workflow_states: { find: vi.fn().mockResolvedValue([]) },
      school_details: { find: vi.fn().mockResolvedValue([]), findOne: vi.fn().mockResolvedValue(null) },
    }),
  },
}));

describe('useDatabaseData compatibility helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty arrays when database has no data', async () => {
    const { result } = renderHook(() => useDatabaseData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading.all).toBe(false);
    });

    expect(result.current.getTimetablePeriodDefs()).toEqual([]);
    expect(result.current.getTimetableEntries(7)).toEqual([]);
    expect(result.current.getStudentAttendanceByFilters('2026-01-10', 7, 1)).toEqual([]);
  });
});