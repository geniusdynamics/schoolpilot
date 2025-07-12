#!/usr/bin/env python3
"""
ABOUTME: Revert script to clean up all generated files
ABOUTME: Removes JSON files and gets back to clean TypeScript mock data state
"""

import os
import shutil
from pathlib import Path

class RevertGenerator:
    def __init__(self):
        self.files_removed = 0
        self.directories_cleaned = 0

    def revert_generation(self):
        """Remove all generated files and revert to clean state."""
        print(">>> Starting revert process...")
        
        # Get the project root
        project_root = Path(__file__).parent.parent
        
        # List of patterns to remove
        patterns_to_remove = [
            "src/modules/*/data/*.json",
            "src/modules/*/data/initialMock*.json",
            "src/modules/*/data/*MockData.json",
            "src/modules/*/data/gn-*.json",
            "src/core/types/base.ts",
            "src/modules/*/types.ts",
            "scripts/gn-*.ts",
            "scripts/gn-*.js",
            "scripts/gn-*.cjs",
            "scripts/generate-*.ts",
            "scripts/revert-generation.ts"
        ]
        
        # Remove files matching patterns
        for pattern in patterns_to_remove:
            pattern_path = project_root / pattern
            if pattern_path.exists():
                for file_path in project_root.glob(pattern):
                    try:
                        if file_path.is_file():
                            file_path.unlink()
                            print(f"[REVERT] Removed: {file_path}")
                            self.files_removed += 1
                    except Exception as e:
                        print(f"[REVERT] Error removing {file_path}: {e}")
        
        # Clean up specific directories
        modules_data_dirs = [
            "src/modules/academics/data",
            "src/modules/administration/data", 
            "src/modules/finance/data",
            "src/modules/hr/data",
            "src/modules/inventory/data",
            "src/modules/library/data",
            "src/modules/nutrition/data",
            "src/modules/reports/data",
            "src/modules/settings/data"
        ]
        
        for dir_path in modules_data_dirs:
            full_path = project_root / dir_path
            if full_path.exists():
                # Remove JSON files but keep TypeScript files
                for file_path in full_path.glob("*.json"):
                    try:
                        file_path.unlink()
                        print(f"[REVERT] Removed: {file_path}")
                        self.files_removed += 1
                    except Exception as e:
                        print(f"[REVERT] Error removing {file_path}: {e}")
        
        # Clean up scripts directory
        scripts_dir = project_root / "scripts"
        if scripts_dir.exists():
            # Remove generated script files but keep original ones
            for file_path in scripts_dir.glob("gn-*"):
                try:
                    if file_path.is_file():
                        file_path.unlink()
                        print(f"[REVERT] Removed: {file_path}")
                        self.files_removed += 1
                except Exception as e:
                    print(f"[REVERT] Error removing {file_path}: {e}")
            
            # Remove other generated files
            for file_path in scripts_dir.glob("generate-*"):
                try:
                    if file_path.is_file():
                        file_path.unlink()
                        print(f"[REVERT] Removed: {file_path}")
                        self.files_removed += 1
                except Exception as e:
                    print(f"[REVERT] Error removing {file_path}: {e}")
        
        print(f">>> Revert complete! Removed {self.files_removed} files.")
        print(">>> System is now back to clean TypeScript mock data state.")

    def verify_clean_state(self):
        """Verify that we're back to a clean state."""
        print("\n>>> Verifying clean state...")
        
        project_root = Path(__file__).parent.parent
        
        # Check that TypeScript mock data files still exist
        mock_data_files = [
            "src/modules/academics/data/mockData.ts",
            "src/modules/administration/data/mockData.ts",
            "src/modules/finance/data/mockData.ts", 
            "src/modules/hr/data/mockData.ts",
            "src/modules/inventory/data/mockData.ts",
            "src/modules/library/data/mockData.ts",
            "src/modules/nutrition/data/mockData.ts"
        ]
        
        missing_files = []
        for file_path in mock_data_files:
            full_path = project_root / file_path
            if not full_path.exists():
                missing_files.append(file_path)
        
        if missing_files:
            print(f"[WARNING] Missing mock data files: {missing_files}")
        else:
            print("[VERIFY] All TypeScript mock data files present ✓")
        
        # Check that no JSON files remain
        json_files = list(project_root.glob("src/modules/*/data/*.json"))
        if json_files:
            print(f"[WARNING] Found {len(json_files)} remaining JSON files:")
            for json_file in json_files:
                print(f"  - {json_file}")
        else:
            print("[VERIFY] No JSON files remaining ✓")
        
        print(">>> Clean state verification complete!")

if __name__ == "__main__":
    revert = RevertGenerator()
    revert.revert_generation()
    revert.verify_clean_state() 