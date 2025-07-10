#!/usr/bin/env python3
"""
ABOUTME: Manual fix for problematic mock data files
ABOUTME: Handles specific TypeScript syntax issues that regex can't handle
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Any

class MockDataFixer:
    def __init__(self):
        self.fixes_applied = 0

    def fix_academics_mockdata(self):
        """Manually fix the academics mock data file."""
        file_path = Path(__file__).parent.parent / "src" / "modules" / "academics" / "data" / "mockData.ts"
        
        if not file_path.exists():
            print(f"[FIXER] File not found: {file_path}")
            return
        
        print(f"[FIXER] Fixing academics mock data...")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix 1: Replace new Date().toISOString() with static dates
        content = re.sub(r'new Date\(\)\.toISOString\(\)', '"2024-01-01T00:00:00.000Z"', content)
        
        # Fix 2: Replace enum references with string values
        content = re.sub(r'ExamSessionStatus\.MARKS_ENTRY_OPEN', '"MARKS_ENTRY_OPEN"', content)
        content = re.sub(r'ExamSessionStatus\.PLANNING', '"PLANNING"', content)
        content = re.sub(r'SubjectGrouping\.GROUP_1_COMPULSORY', '"GROUP_1_COMPULSORY"', content)
        content = re.sub(r'SubjectGrouping\.GROUP_2_SCIENCES', '"GROUP_2_SCIENCES"', content)
        content = re.sub(r'SubjectGrouping\.GROUP_3_HUMANITIES', '"GROUP_3_HUMANITIES"', content)
        content = re.sub(r'SubjectGrouping\.GROUP_4_TECHNICALS', '"GROUP_4_TECHNICALS"', content)
        content = re.sub(r'SubjectGrouping\.GROUP_5_LANGUAGES', '"GROUP_5_LANGUAGES"', content)
        content = re.sub(r'SubjectGrouping\.GROUP_6_APPLIED', '"GROUP_6_APPLIED"', content)
        
        # Fix 3: Remove the forEach line that modifies papers
        content = re.sub(r'initialMockSubjects\.forEach\([^;]+\);', '', content)
        
        # Fix 4: Remove the filter expressions in exam sessions
        content = re.sub(r', paper_settings: initialMockExamPaperSettings\.filter\([^)]+\)', '', content)
        
        # Fix 5: Remove the levels array from grading schemes (will be separate)
        content = re.sub(r', levels: \[[^\]]+\]', '', content)
        
        # Write the fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"[FIXER] Fixed academics mock data")
        self.fixes_applied += 1

    def fix_administration_mockdata(self):
        """Manually fix the administration mock data file."""
        file_path = Path(__file__).parent.parent / "src" / "modules" / "administration" / "data" / "mockData.ts"
        
        if not file_path.exists():
            print(f"[FIXER] File not found: {file_path}")
            return
        
        print(f"[FIXER] Fixing administration mock data...")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix 1: Replace new Date().toISOString() with static dates
        content = re.sub(r'new Date\(\)\.toISOString\(\)', '"2024-01-01T00:00:00.000Z"', content)
        
        # Fix 2: Replace generateId() calls with static IDs
        content = re.sub(r'generateId\([^)]*\)', '"FIXED_ID"', content)
        
        # Fix 3: Replace enum references
        content = re.sub(r'UserRole\.ADMIN', '"ADMIN"', content)
        content = re.sub(r'UserRole\.TEACHER', '"TEACHER"', content)
        content = re.sub(r'UserRole\.STUDENT', '"STUDENT"', content)
        content = re.sub(r'UserRole\.PARENT', '"PARENT"', content)
        content = re.sub(r'UserRole\.ACCOUNTANT', '"ACCOUNTANT"', content)
        content = re.sub(r'UserRole\.LIBRARIAN', '"LIBRARIAN"', content)
        content = re.sub(r'UserRole\.NURSE', '"NURSE"', content)
        content = re.sub(r'UserRole\.SECURITY', '"SECURITY"', content)
        content = re.sub(r'UserRole\.CLEANER', '"CLEANER"', content)
        content = re.sub(r'UserRole\.DRIVER', '"DRIVER"', content)
        content = re.sub(r'UserRole\.COOK', '"COOK"', content)
        content = re.sub(r'UserRole\.GARDENER', '"GARDENER"', content)
        content = re.sub(r'UserRole\.MAINTENANCE', '"MAINTENANCE"', content)
        content = re.sub(r'UserRole\.RECEPTIONIST', '"RECEPTIONIST"', content)
        
        # Fix 4: Replace StudentEnrollmentStatus enum
        content = re.sub(r'StudentEnrollmentStatus\.ACTIVE', '"ACTIVE"', content)
        content = re.sub(r'StudentEnrollmentStatus\.INACTIVE', '"INACTIVE"', content)
        content = re.sub(r'StudentEnrollmentStatus\.GRADUATED', '"GRADUATED"', content)
        content = re.sub(r'StudentEnrollmentStatus\.TRANSFERRED', '"TRANSFERRED"', content)
        content = re.sub(r'StudentEnrollmentStatus\.SUSPENDED', '"SUSPENDED"', content)
        content = re.sub(r'StudentEnrollmentStatus\.WITHDRAWN', '"WITHDRAWN"', content)
        
        # Write the fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"[FIXER] Fixed administration mock data")
        self.fixes_applied += 1

    def fix_finance_mockdata(self):
        """Manually fix the finance mock data file."""
        file_path = Path(__file__).parent.parent / "src" / "modules" / "finance" / "data" / "mockData.ts"
        
        if not file_path.exists():
            print(f"[FIXER] File not found: {file_path}")
            return
        
        print(f"[FIXER] Fixing finance mock data...")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix 1: Replace new Date().toISOString() with static dates
        content = re.sub(r'new Date\(\)\.toISOString\(\)', '"2024-01-01T00:00:00.000Z"', content)
        
        # Fix 2: Replace enum references
        content = re.sub(r'InvoiceStatus\.PENDING', '"PENDING"', content)
        content = re.sub(r'InvoiceStatus\.PAID', '"PAID"', content)
        content = re.sub(r'InvoiceStatus\.OVERDUE', '"OVERDUE"', content)
        content = re.sub(r'InvoiceStatus\.CANCELLED', '"CANCELLED"', content)
        content = re.sub(r'InvoiceStatus\.PARTIAL', '"PARTIAL"', content)
        
        content = re.sub(r'PaymentStatus\.PENDING', '"PENDING"', content)
        content = re.sub(r'PaymentStatus\.COMPLETED', '"COMPLETED"', content)
        content = re.sub(r'PaymentStatus\.FAILED', '"FAILED"', content)
        content = re.sub(r'PaymentStatus\.CANCELLED', '"CANCELLED"', content)
        
        content = re.sub(r'PaymentMethod\.CASH', '"CASH"', content)
        content = re.sub(r'PaymentMethod\.MPESA', '"MPESA"', content)
        content = re.sub(r'PaymentMethod\.BANK_TRANSFER', '"BANK_TRANSFER"', content)
        content = re.sub(r'PaymentMethod\.CHEQUE', '"CHEQUE"', content)
        content = re.sub(r'PaymentMethod\.CARD', '"CARD"', content)
        
        # Write the fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"[FIXER] Fixed finance mock data")
        self.fixes_applied += 1

    def fix_inventory_mockdata(self):
        """Manually fix the inventory mock data file."""
        file_path = Path(__file__).parent.parent / "src" / "modules" / "inventory" / "data" / "mockData.ts"
        
        if not file_path.exists():
            print(f"[FIXER] File not found: {file_path}")
            return
        
        print(f"[FIXER] Fixing inventory mock data...")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix 1: Replace new Date().toISOString() with static dates
        content = re.sub(r'new Date\(\)\.toISOString\(\)', '"2024-01-01T00:00:00.000Z"', content)
        
        # Fix 2: Replace enum references
        content = re.sub(r'AssetStatus\.ACTIVE', '"ACTIVE"', content)
        content = re.sub(r'AssetStatus\.INACTIVE', '"INACTIVE"', content)
        content = re.sub(r'AssetStatus\.MAINTENANCE', '"MAINTENANCE"', content)
        content = re.sub(r'AssetStatus\.RETIRED', '"RETIRED"', content)
        content = re.sub(r'AssetStatus\.LOST', '"LOST"', content)
        content = re.sub(r'AssetStatus\.STOLEN', '"STOLEN"', content)
        
        content = re.sub(r'AssetCategory\.EQUIPMENT', '"EQUIPMENT"', content)
        content = re.sub(r'AssetCategory\.FURNITURE', '"FURNITURE"', content)
        content = re.sub(r'AssetCategory\.VEHICLE', '"VEHICLE"', content)
        content = re.sub(r'AssetCategory\.BUILDING', '"BUILDING"', content)
        content = re.sub(r'AssetCategory\.ELECTRONICS', '"ELECTRONICS"', content)
        
        # Write the fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"[FIXER] Fixed inventory mock data")
        self.fixes_applied += 1

    def fix_library_mockdata(self):
        """Manually fix the library mock data file."""
        file_path = Path(__file__).parent.parent / "src" / "modules" / "library" / "data" / "mockData.ts"
        
        if not file_path.exists():
            print(f"[FIXER] File not found: {file_path}")
            return
        
        print(f"[FIXER] Fixing library mock data...")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix 1: Replace new Date().toISOString() with static dates
        content = re.sub(r'new Date\(\)\.toISOString\(\)', '"2024-01-01T00:00:00.000Z"', content)
        
        # Fix 2: Replace enum references
        content = re.sub(r'BookStatus\.AVAILABLE', '"AVAILABLE"', content)
        content = re.sub(r'BookStatus\.BORROWED', '"BORROWED"', content)
        content = re.sub(r'BookStatus\.RESERVED', '"RESERVED"', content)
        content = re.sub(r'BookStatus\.LOST', '"LOST"', content)
        content = re.sub(r'BookStatus\.DAMAGED', '"DAMAGED"', content)
        
        # Write the fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"[FIXER] Fixed library mock data")
        self.fixes_applied += 1

    def fix_nutrition_mockdata(self):
        """Manually fix the nutrition mock data file."""
        file_path = Path(__file__).parent.parent / "src" / "modules" / "nutrition" / "data" / "mockData.ts"
        
        if not file_path.exists():
            print(f"[FIXER] File not found: {file_path}")
            return
        
        print(f"[FIXER] Fixing nutrition mock data...")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix 1: Replace new Date().toISOString() with static dates
        content = re.sub(r'new Date\(\)\.toISOString\(\)', '"2024-01-01T00:00:00.000Z"', content)
        
        # Fix 2: Replace enum references
        content = re.sub(r'MealType\.BREAKFAST', '"BREAKFAST"', content)
        content = re.sub(r'MealType\.LUNCH', '"LUNCH"', content)
        content = re.sub(r'MealType\.DINNER', '"DINNER"', content)
        content = re.sub(r'MealType\.SNACK', '"SNACK"', content)
        
        content = re.sub(r'TransactionType\.DEPOSIT', '"DEPOSIT"', content)
        content = re.sub(r'TransactionType\.WITHDRAWAL', '"WITHDRAWAL"', content)
        content = re.sub(r'TransactionType\.PURCHASE', '"PURCHASE"', content)
        content = re.sub(r'TransactionType\.REFUND', '"REFUND"', content)
        
        # Write the fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"[FIXER] Fixed nutrition mock data")
        self.fixes_applied += 1

    def fix_all_files(self):
        """Fix all problematic mock data files."""
        print(">>> Starting manual fixes for problematic mock data files...")
        
        self.fix_academics_mockdata()
        self.fix_administration_mockdata()
        self.fix_finance_mockdata()
        self.fix_inventory_mockdata()
        self.fix_library_mockdata()
        self.fix_nutrition_mockdata()
        
        print(f">>> Manual fixes complete! Applied {self.fixes_applied} fixes.")

if __name__ == "__main__":
    fixer = MockDataFixer()
    fixer.fix_all_files() 