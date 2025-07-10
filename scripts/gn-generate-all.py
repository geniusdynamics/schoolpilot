#!/usr/bin/env python3
"""
ABOUTME: All-in-One Generator for RxDB schemas and mock data aggregation
ABOUTME: Generates comprehensive schemas and aggregates mock data from all modules
"""

import os
import re
import json
import glob
from pathlib import Path
from typing import Dict, List, Any, Optional

class MockDataGenerator:
    def __init__(self):
        self.aggregated_data = {}
        # Updated mapping based on actual export names found in mockData files
        self.export_key_map = {
            # Administration module - actual exports found
            'users': 'initialMockUsers',
            'roles': 'initialMockRoles', 
            'students': 'initialMockStudents',
            'staff': 'initialMockStaff',
            'classes': 'initialMockClasses',
            'classStreams': 'initialMockClassStreams',
            'schoolDetails': 'initialMockSchoolDetails',
            'departments': 'initialMockDepartments',
            'designations': 'initialMockDesignations',
            'studentCategories': 'initialMockStudentCategories',
            'dormitories': 'initialMockDormitories',
            'academicYears': 'initialMockAcademicYears',
            'schoolPeriods': 'initialMockSchoolPeriods',
            'academicYearStructures': 'initialMockAcademicYearStructures',
            'academicPeriodDefinitions': 'initialMockAcademicPeriodDefinitions',
            'partners': 'initialMockPartners',
            'clubs': 'initialMockClubs',
            'studentHealthRecords': 'initialMockStudentHealthRecords',
            
            # Academics module - actual exports found
            'subjects': 'initialMockSubjects',
            'subjectPapers': 'initialMockSubjectPapers',
            'gradingSchemes': 'initialMockGradingSchemes',
            'gradingSchemeLevels': 'initialMockGradingSchemeLevels',
            'examSessions': 'initialMockExamSessions',
            'examPaperSettings': 'initialMockExamPaperSettings',
            'studentExamResults': 'initialMockStudentExamResults',
            'studentPaperMarks': 'initialMockStudentPaperMarks',
            'studentSubjectEnrollments': 'initialMockStudentSubjectEnrollments',
            'teacherSubjectAssignments': 'initialMockTeacherSubjectAssignments',
            'classSubjectAllocations': 'initialMockClassSubjectAllocations',
            'timetablePeriodDefs': 'initialMockTimetablePeriodDefs',
            'timetableEntries': 'initialMockTimetableEntries',
            
            # Finance module - actual exports found
            'financialYears': 'initialMockFinancialYears',
            'chartOfAccounts': 'initialMockChartOfAccounts',
            'banks': 'initialMockBanks',
            'customers': 'initialMockCustomers',
            'suppliers': 'initialMockSuppliers',
            'feeTemplates': 'initialMockFeeTemplates',
            'studentFees': 'initialMockStudentFees',
            'feePayments': 'initialMockFeePayments',
            'expenses': 'initialMockExpenses',
            'invoices': 'initialMockInvoices',
            'invoiceItems': 'initialMockInvoiceItems',
            'purchaseOrders': 'initialMockPurchaseOrders',
            'purchaseOrderItems': 'initialMockPurchaseOrderItems',
            'requisitions': 'initialMockRequisitions',
            'requisitionItems': 'initialMockRequisitionItems',
            'stockIssuances': 'initialMockStockIssuances',
            'stockIssuanceItems': 'initialMockStockIssuanceItems',
            'routes': 'initialMockRoutes',
            'studentRouteAssignments': 'initialMockStudentRouteAssignments',
            
            # HR module - actual exports found
            'payrollPeriods': 'initialMockPayrollPeriods',
            'payrollItemTypes': 'initialMockPayrollItemTypes',
            'payrollItems': 'initialMockPayrollItems',
            'payslips': 'initialMockPayslips',
            
            # Inventory module - actual exports found
            'warehouses': 'initialMockWarehouses',
            'itemCategories': 'initialMockItemCategories',
            'items': 'initialMockItems',
            'stockLevels': 'initialMockStockLevels',
            'fixedAssets': 'initialMockFixedAssets',
            'assetCategories': 'initialMockAssetCategories',
            'assetDepreciations': 'initialMockAssetDepreciations',
            'assetMaintenance': 'initialMockAssetMaintenance',
            'assetAssignments': 'initialMockAssetAssignments',
            'assetTransfers': 'initialMockAssetTransfers',
            'assetDisposals': 'initialMockAssetDisposals',
            'assetInspections': 'initialMockAssetInspections',
            'assetInsurance': 'initialMockAssetInsurance',
            
            # Library module - actual exports found
            'bookCategories': 'initialMockBookCategories',
            'books': 'initialMockBooks',
            'bookLoans': 'initialMockBookLoans',
            'bookReturns': 'initialMockBookReturns',
            'bookFines': 'initialMockBookFines',
            'bookReservations': 'initialMockBookReservations',
            
            # Nutrition module - actual exports found
            'mealPlans': 'initialMockMealPlans',
            'menus': 'initialMockMenus',
            'menuItems': 'initialMockMenuItem',
            'mealConsumptions': 'initialMockMealConsumptions',
            'studentWallets': 'initialMockStudentWallets',
            'walletTransactions': 'initialMockWalletTransactions',
            'nutritionalInfo': 'initialMockNutritionalInfo',
            'allergenInfo': 'initialMockAllergenInfo',
            'dietaryRestrictions': 'initialMockDietaryRestrictions',
        }
        
        # Initialize aggregated data structure with all possible keys
        self.app_data_keys = [
            'schoolDetails', 'roles', 'users', 'students', 'staff', 'classes', 'classStreams', 
            'subjects', 'departments', 'designations', 'studentCategories', 'dormitories', 
            'academicYears', 'schoolPeriods', 'academicYearStructures', 'academicPeriodDefinitions', 
            'financialYears', 'partners', 'clubs', 'customers', 'studentHealthRecords', 
            'studentAttendance', 'timetablePeriodDefs', 'templatesComm', 'campaigns', 
            'subjectPapers', 'examSessions', 'examPaperSettings', 'studentExamResults', 
            'studentPaperMarks', 'studentSubjectEnrollments', 'teacherSubjectAssignments', 
            'classSubjectAllocations', 'timetableEntries', 'chartOfAccounts', 'banks', 
            'suppliers', 'feeTemplates', 'studentFees', 'feePayments', 'expenses', 
            'invoices', 'invoiceItems', 'purchaseOrders', 'purchaseOrderItems', 
            'requisitions', 'requisitionItems', 'stockIssuances', 'stockIssuanceItems', 
            'routes', 'studentRouteAssignments', 'payrollPeriods', 'payrollItemTypes', 
            'payrollItems', 'payslips', 'warehouses', 'itemCategories', 'items', 
            'stockLevels', 'fixedAssets', 'assetCategories', 'assetDepreciations', 
            'assetMaintenance', 'assetAssignments', 'assetTransfers', 'assetDisposals', 
            'assetInspections', 'assetInsurance', 'bookCategories', 'books', 'bookLoans', 
            'bookReturns', 'bookFines', 'bookReservations', 'mealPlans', 'menus', 
            'menuItems', 'mealConsumptions', 'studentWallets', 'walletTransactions', 
            'nutritionalInfo', 'allergenInfo', 'dietaryRestrictions', 'gradingSchemes', 'gradingSchemeLevels'
        ]
        
        for key in self.app_data_keys:
            self.aggregated_data[key] = []

    def find_mock_data_files(self) -> List[Path]:
        """Find all mockData.ts files in the modules directory."""
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        pattern = project_root / "src" / "modules" / "*" / "data" / "mockData.ts"
        
        files = list(project_root.glob("src/modules/*/data/mockData.ts"))
        print(f"[GENERATOR] Found {len(files)} mockData.ts files to process")
        for file in files:
            print(f"[GENERATOR] File: {file}")
        
        return files

    def parse_typescript_file(self, file_path: Path) -> Dict[str, Any]:
        print(f"[GENERATOR] Parsing file: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"[GENERATOR] Error reading file {file_path}: {e}")
            return {}

        print(f"[GENERATOR] File head (first 200 chars):\n{content[:200]}\n---")
        exports = {}
        found_any = False
        # Enhanced patterns for more robust matching
        export_patterns = [
            # export const/let/var with optional type annotation, as const, trailing comma, optional semicolon
            r'export\s+(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?\s*=\s*(\[.*?\])\s*(?:as\s+const)?\s*[;,]?',  # array
            r'export\s+(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?\s*=\s*(\{.*?\})\s*(?:as\s+const)?\s*[;,]?',  # object
            r'export\s+(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?\s*=\s*(\[.*?\n(?:.*?\n)*?\])\s*(?:as\s+const)?\s*[;,]?',  # multi-line array
            r'export\s+(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?\s*=\s*(\{.*?\n(?:.*?\n)*?\})\s*(?:as\s+const)?\s*[;,]?',  # multi-line object
            # export default
            r'export\s+default\s+(\w+);',
            # export { ... }
            r'export\s*\{\s*([^}]+)\s*\}',
            # export function/class
            r'export\s+(?:function|class)\s+(\w+)',
            # export type/interface
            r'export\s+(?:type|interface)\s+(\w+)',
        ]
        for pattern in export_patterns:
            matches = list(re.finditer(pattern, content, re.DOTALL))
            if matches:
                found_any = True
                print(f"[GENERATOR] Pattern matched: {pattern}")
            for match in matches:
                match_str = match.group(0)[:120].replace('\n',' ')
                print(f"[GENERATOR]   Match: {match_str}...")
                if len(match.groups()) >= 1:
                    export_name = match.group(1)
                    if export_name and ',' in export_name:
                        individual_exports = [x.strip() for x in export_name.split(',')]
                        for exp in individual_exports:
                            if exp and not exp.startswith('//'):
                                exports[exp] = "[Exported]"
                    else:
                        exports[export_name] = "[Exported]"
                if len(match.groups()) >= 2:
                    export_value = match.group(2)
                    export_value_snippet = export_value[:80].replace('\n',' ')
                    print(f"[GENERATOR]     Export name: {export_name}")
                    print(f"[GENERATOR]     Export value snippet: {export_value_snippet}...")
                    try:
                        if export_value.strip().startswith('[') and export_value.strip().endswith(']'):
                            item_count = export_value.count('{') if '{' in export_value else 0
                            exports[export_name] = f"[Array with ~{item_count} items]"
                        elif export_value.strip().startswith('{') and export_value.strip().endswith('}'):
                            exports[export_name] = "[Object]"
                        else:
                            exports[export_name] = export_value
                    except Exception as e:
                        print(f"[GENERATOR] Error parsing export {export_name}: {e}")
                        exports[export_name] = "[Parse Error]"
        if not found_any:
            print(f"[GENERATOR] No export patterns matched in {file_path}")
        print(f"[GENERATOR] Found exports: {list(exports.keys())}")
        return exports

    def aggregate_modular_mock_data(self):
        """Aggregate mock data from all modules."""
        print("  -> Aggregating all module mockData.ts files by AppDataType key (with mapping)...")
        
        mock_data_files = self.find_mock_data_files()
        
        # Track statistics
        total_found = 0
        total_mapped = 0
        total_direct_matches = 0
        
        for file_path in mock_data_files:
            module_name = file_path.parent.parent.name
            print(f"\n[GENERATOR] Processing module: {module_name}")
            
            exports = self.parse_typescript_file(file_path)
            total_found += len(exports)
            
            print(f"[GENERATOR] >>> Module {module_name} summary:")
            print(f"[GENERATOR]   Found exports: {list(exports.keys())}")
            
            # Track expected exports for this module
            expected_for_module = []
            for app_data_key, export_name in self.export_key_map.items():
                if export_name in exports:
                    expected_for_module.append(export_name)
            
            print(f"[GENERATOR]   Expected exports found: {expected_for_module}")
            
            # Map exports to AppDataType keys
            mapped_count = 0
            for app_data_key, export_name in self.export_key_map.items():
                if export_name in exports:
                    print(f"[GENERATOR]   >>> FOUND {export_name} -> {app_data_key}")
                    mapped_count += 1
                    total_mapped += 1
                    # For now, we'll just note that we found the export
                    # In a full implementation, you'd parse the actual data
                    self.aggregated_data[app_data_key].append({
                        'source': module_name,
                        'export': export_name,
                        'data': exports[export_name]
                    })
                else:
                    print(f"[GENERATOR]   >>> MISSING {export_name} for {app_data_key}")
            
            # Also check for direct matches (in case export names match app_data_keys)
            direct_matches = []
            for app_data_key in self.app_data_keys:
                if app_data_key in exports:
                    print(f"[GENERATOR]   >>> DIRECT MATCH: {app_data_key}")
                    direct_matches.append(app_data_key)
                    total_direct_matches += 1
                    self.aggregated_data[app_data_key].append({
                        'source': module_name,
                        'export': app_data_key,
                        'data': exports[app_data_key]
                    })
            
            print(f"[GENERATOR]   >>> Module {module_name} stats: {mapped_count} mapped, {len(direct_matches)} direct matches")
        
        print(f"\n[GENERATOR] >>> GLOBAL STATISTICS:")
        print(f"[GENERATOR]   Total exports found: {total_found}")
        print(f"[GENERATOR]   Total exports mapped: {total_mapped}")
        print(f"[GENERATOR]   Total direct matches: {total_direct_matches}")
        populated_count = len([k for k, v in self.aggregated_data.items() if v])
        print(f"[GENERATOR]   Total collections populated: {populated_count}")

    def generate_mock_data_file(self):
        """Generate the aggregated mock data file."""
        output_path = Path(__file__).parent.parent / "src" / "gn-globalMockData.ts"
        
        content = """// ABOUTME: Aggregated mock data from all modules
// ABOUTME: Generated by gn-generate-all.py script

export const globalMockData = {
"""
        
        for key, items in self.aggregated_data.items():
            if items:
                content += f"  {key}: [\n"
                for item in items:
                    content += f"    // From {item['source']}: {item['export']}\n"
                    content += f"    ...{item['data']},\n"
                content += "  ],\n"
            else:
                content += f"  {key}: [],\n"
        
        content += """};

export default globalMockData;
"""
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[GENERATOR] Generated: {output_path}")
        except Exception as e:
            print(f"[GENERATOR] Error writing file: {e}")

    def generate(self):
        """Main generation process."""
        print(">>> Starting Mock Data Generator (Python)...")
        
        self.aggregate_modular_mock_data()
        self.generate_mock_data_file()
        
        print(">>> Mock Data Generation Complete!")
        print(f">>> Processed {len([k for k, v in self.aggregated_data.items() if v])} collections")
        print(f">>> Output: {Path(__file__).parent.parent / 'src' / 'gn-globalMockData.ts'}")

if __name__ == "__main__":
    generator = MockDataGenerator()
    generator.generate() 