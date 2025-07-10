#!/usr/bin/env python3
"""
ABOUTME: Converts TypeScript mock data files to JSON files
ABOUTME: Extracts exported arrays/objects and writes them as individual JSON files
"""

import os
import re
import json
import glob
from pathlib import Path
from typing import Dict, List, Any, Optional

class MockDataToJSONConverter:
    def __init__(self):
        self.export_key_map = {
            # Administration module
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
            
            # Academics module
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
            
            # Finance module
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
            
            # HR module
            'payrollPeriods': 'initialMockPayrollPeriods',
            'payrollItemTypes': 'initialMockPayrollItemTypes',
            'payrollItems': 'initialMockPayrollItems',
            'payslips': 'initialMockPayslips',
            
            # Inventory module
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
            
            # Library module
            'bookCategories': 'initialMockBookCategories',
            'books': 'initialMockBooks',
            'bookLoans': 'initialMockBookLoans',
            'bookReturns': 'initialMockBookReturns',
            'bookFines': 'initialMockBookFines',
            'bookReservations': 'initialMockBookReservations',
            
            # Nutrition module
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

    def find_mock_data_files(self) -> List[Path]:
        """Find all mockData.ts files in the modules directory."""
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        pattern = project_root / "src" / "modules" / "*" / "data" / "mockData.ts"
        
        files = list(project_root.glob("src/modules/*/data/mockData.ts"))
        print(f"[CONVERTER] Found {len(files)} mockData.ts files to convert")
        for file in files:
            print(f"[CONVERTER] File: {file}")
        
        return files

    def extract_json_from_typescript(self, content: str, export_name: str) -> Optional[Any]:
        """Extract JSON data from TypeScript export."""
        # Pattern to match the specific export
        pattern = rf'export\s+(?:const|let|var)\s+{re.escape(export_name)}\s*(?::[^=]+)?\s*=\s*(\[.*?\]);'
        
        match = re.search(pattern, content, re.DOTALL)
        if not match:
            return None
        
        # Extract the array/object content
        data_content = match.group(1)
        
        try:
            # Clean up the TypeScript content to make it valid JSON
            # Remove comments
            data_content = re.sub(r'//.*?$', '', data_content, flags=re.MULTILINE)
            data_content = re.sub(r'/\*.*?\*/', '', data_content, flags=re.DOTALL)
            
            # Remove trailing commas
            data_content = re.sub(r',(\s*[}\]])', r'\1', data_content)
            
            # Replace TypeScript-specific syntax
            data_content = re.sub(r'new Date\(\)', '"2024-01-01T00:00:00.000Z"', data_content)
            data_content = re.sub(r'new Date\(([^)]+)\)', r'"\1"', data_content)
            
            # Replace enum values with strings
            data_content = re.sub(r'(\w+)\.(\w+)', r'"\1.\2"', data_content)
            
            # Convert TypeScript object syntax to JSON
            # Replace single quotes with double quotes
            data_content = re.sub(r"'([^']*)'", r'"\1"', data_content)
            
            # Quote unquoted property names (more robust)
            # This regex handles property names that aren't already quoted
            data_content = re.sub(r'(\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):', r'\1"\2"\3:', data_content)
            
            # Handle special cases
            data_content = data_content.replace('true', 'true')
            data_content = data_content.replace('false', 'false')
            data_content = data_content.replace('null', 'null')
            
            # Parse as JSON
            return json.loads(data_content)
            
        except json.JSONDecodeError as e:
            print(f"[CONVERTER] Warning: Could not parse {export_name} as JSON: {e}")
            print(f"[CONVERTER] Content: {data_content[:200]}...")
            
            # Try a more aggressive conversion
            try:
                # More aggressive property name quoting
                data_content = re.sub(r'(\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):', r'\1"\2"\3:', data_content)
                # Handle any remaining unquoted strings
                data_content = re.sub(r':\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}])', r': "\1"\2', data_content)
                
                return json.loads(data_content)
            except json.JSONDecodeError as e2:
                print(f"[CONVERTER] Failed second attempt: {e2}")
                return None

    def convert_file_to_json(self, file_path: Path):
        """Convert a single TypeScript mock data file to JSON files."""
        print(f"[CONVERTER] Converting: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"[CONVERTER] Error reading file {file_path}: {e}")
            return
        
        module_name = file_path.parent.parent.name
        output_dir = file_path.parent
        
        # Create JSON files for each export
        for app_data_key, export_name in self.export_key_map.items():
            json_data = self.extract_json_from_typescript(content, export_name)
            
            if json_data is not None:
                # Write JSON file
                json_file_path = output_dir / f"{export_name}.json"
                try:
                    with open(json_file_path, 'w', encoding='utf-8') as f:
                        json.dump(json_data, f, indent=2, ensure_ascii=False)
                    print(f"[CONVERTER] >>> Created: {json_file_path}")
                except Exception as e:
                    print(f"[CONVERTER] Error writing {json_file_path}: {e}")
            else:
                # Also check for direct exports (without initialMock prefix)
                if export_name.startswith('initialMock'):
                    direct_export = export_name.replace('initialMock', '')
                    json_data = self.extract_json_from_typescript(content, direct_export)
                    if json_data is not None:
                        json_file_path = output_dir / f"{direct_export}.json"
                        try:
                            with open(json_file_path, 'w', encoding='utf-8') as f:
                                json.dump(json_data, f, indent=2, ensure_ascii=False)
                            print(f"[CONVERTER] >>> Created: {json_file_path}")
                        except Exception as e:
                            print(f"[CONVERTER] Error writing {json_file_path}: {e}")

    def convert_all(self):
        """Convert all mock data files to JSON."""
        print(">>> Starting TypeScript to JSON conversion...")
        
        mock_data_files = self.find_mock_data_files()
        
        for file_path in mock_data_files:
            self.convert_file_to_json(file_path)
        
        print(">>> TypeScript to JSON conversion complete!")

if __name__ == "__main__":
    converter = MockDataToJSONConverter()
    converter.convert_all() 