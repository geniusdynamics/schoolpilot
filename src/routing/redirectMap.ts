// ABOUTME: Centralized mapping of deprecated routes to their new hub+tab destinations
// ABOUTME: Prevents hardcoded redirect strings scattered across module definitions

export const DEPRECATED_ROUTE_REDIRECTS: Record<string, string> = {
  '/administration/prenas-marks': '/administration/entry-marks',
  // Administration
  // M5: SchoolConfigurationPage split into /administration/organization + /administration/student-life
  '/administration/configuration': '/administration/organization',
  '/administration/departments': '/administration/organization?tab=departments',
  '/administration/designations': '/administration/organization?tab=designations',
  '/administration/clubs': '/administration/organization?tab=clubs',
  '/administration/dormitories': '/administration/student-life?tab=dormitories',
  '/administration/student-categories': '/administration/student-life?tab=categories',
  '/administration/partners': '/administration/student-life?tab=partners',
  '/administration/customers': '/administration/student-life?tab=partners',
  '/administration/student-bio-data': '/administration/students?tab=bio-data',
  '/administration/student-health': '/administration/students?tab=health',
  '/administration/student-clearance': '/administration/students?tab=clearance',
  '/administration/student-id-cards': '/administration/students?tab=id-cards',
  '/administration/manual-attendance': '/administration/attendance?tab=manual',
  '/administration/dynamic-attendance': '/administration/attendance?tab=dynamic',
  '/administration/student-attendance': '/administration/attendance?tab=student-view',
  '/administration/attendance-reports': '/administration/attendance?tab=reports',
  '/administration/communication-templates': '/administration/communication?tab=templates',
  '/administration/message-campaigns': '/administration/communication?tab=campaigns',
  '/administration/newsletters': '/administration/communication?tab=newsletters',
  '/administration/sms-reports': '/administration/communication?tab=reports',
  '/administration/auto-sms-settings': '/administration/communication?tab=settings',
  '/administration/birth-certificate': '/administration/certificates?tab=birth',
  '/administration/character-certificate': '/administration/certificates?tab=character',
  '/administration/transfer-certificate': '/administration/certificates?tab=transfer',
  '/administration/visitors': '/administration/security?tab=visitors',
  '/administration/gate-pass': '/administration/security?tab=gate-pass',
  '/administration/staff-id-cards': '/administration/staff?tab=id-cards',
  '/administration/staff-wallet': '/administration/staff?tab=wallet',
  '/administration/staff-attendance': '/administration/staff/operations?tab=attendance',
  '/administration/bulk-staff-update': '/administration/staff/operations?tab=bulk-update',
  '/administration/bulk-student-update': '/administration/students/bulk-ops?tab=bulk-update',
  '/administration/bulk-assign-roll-numbers': '/administration/students/bulk-ops?tab=roll-numbers',
  '/administration/student-import': '/administration/students/bulk-ops?tab=data-import',
  '/administration/academic-years': '/administration/academic-calendar?tab=academic-years',
  '/administration/school-periods': '/administration/academic-calendar?tab=school-periods',
  '/administration/academic-period-definitions': '/administration/academic-calendar?tab=period-definitions',
  '/administration/academic-structures': '/administration/academic-calendar?tab=structure',

  // Finance accounting redirects
  '/finance/accounting': '/finance/accounting-config',
  '/finance/chart-of-accounts': '/finance/accounting-config?tab=chart-of-accounts',
  '/finance/banks': '/finance/accounting-config?tab=banks',
  '/finance/account-ledger': '/finance/accounting-ops?tab=ledger',
  '/finance/cash-book': '/finance/accounting-ops?tab=cash-book',
  '/finance/day-book': '/finance/accounting-ops?tab=day-book',
  '/finance/journal-register': '/finance/accounting-ops?tab=journal',
  '/finance/trial-balance': '/finance/financial-statements?tab=trial-balance',
  '/finance/balance-sheet': '/finance/financial-statements?tab=balance-sheet',
  '/finance/income-statement': '/finance/financial-statements?tab=income-statement',
  '/finance/student-opening-balances': '/finance/student-fee-history?tab=opening-balances',
  '/finance/previous-session-fees': '/finance/student-fee-history?tab=previous-session',
  // M3: Finance reports hub relocated to /reports/finance
  '/finance/finance-reports': '/reports/finance?tab=fees-due',
  '/finance/reports': '/reports/finance',

  // Academics redirects
  '/academics/subject-management': '/academics/subjects',
  '/academics/subject-management?tab=subjects': '/academics/subjects?tab=subjects',
  '/academics/subject-management?tab=class-allocations': '/academics/allocations?tab=class-allocations',
  '/academics/subject-management?tab=teacher-assignments': '/academics/allocations?tab=teacher-assignments',
  '/academics/subject-management?tab=student-enrollment': '/academics/allocations?tab=student-enrollment',
  // Route path corrections
  '/academics/verification': '/academics/marks-verification',
  '/academics/analysis': '/academics/exam-analysis',
  '/academics/distribution': '/academics/results-distribution',
  '/academics/grading': '/academics/grading-systems',

  // Finance fee rule redirects
  '/finance/fees-fines': '/finance/fee-rules?tab=fines',
  '/finance/fees-installments': '/finance/fee-rules?tab=installments',
  '/finance/fee-adjustments': '/finance/fee-rules?tab=adjustments',
  '/finance/fees-receipt-template': '/finance/fee-configuration?tab=receipt-template',

  // Cross-module redirects (handled at route level, NOT in module nav)
  '/hr/staff-bio-data': '/administration/staff?tab=bio-data',
};

export const getRedirectForRoute = (path: string): string | undefined => {
  if (DEPRECATED_ROUTE_REDIRECTS[path]) return DEPRECATED_ROUTE_REDIRECTS[path];
  // Strip query/hash for lookup so `/academics/x?tab=y` still matches bare key if needed
  const stripped = path.split('?')[0].split('#')[0];
  if (stripped !== path && DEPRECATED_ROUTE_REDIRECTS[stripped]) return DEPRECATED_ROUTE_REDIRECTS[stripped];
  return undefined;
};
