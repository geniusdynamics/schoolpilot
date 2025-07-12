#!/usr/bin/env python3
"""
ABOUTME: Consolidate multiple JSON files in module data folders into single files
ABOUTME: Creates one JSON file per module with all its mock data
"""

import os
import json
import glob
from pathlib import Path
from typing import Dict, List, Any

class ModuleJSONConsolidator:
    def __init__(self):
        self.consolidated_count = 0
        self.modules_processed = 0

    def find_module_data_dirs(self) -> List[Path]:
        """Find all module data directories."""
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        
        module_dirs = []
        for module_dir in project_root.glob("src/modules/*/data/"):
            if module_dir.exists():
                module_dirs.append(module_dir)
        
        print(f"[CONSOLIDATOR] Found {len(module_dirs)} module data directories")
        return module_dirs

    def consolidate_module_json(self, module_dir: Path):
        """Consolidate all JSON files in a module directory into a single file."""
        module_name = module_dir.parent.name
        print(f"[CONSOLIDATOR] Consolidating {module_name} module...")
        
        # Find all JSON files in this module's data directory
        json_files = list(module_dir.glob("*.json"))
        
        if not json_files:
            print(f"[CONSOLIDATOR] No JSON files found in {module_name}")
            return
        
        print(f"[CONSOLIDATOR] Found {len(json_files)} JSON files in {module_name}")
        
        # Consolidate all JSON data
        consolidated_data = {}
        
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Extract collection name from filename
                collection_name = json_file.stem
                if collection_name.startswith('initialMock'):
                    collection_name = collection_name[12:]  # Remove 'initialMock' prefix
                
                print(f"[CONSOLIDATOR] >>> Adding {collection_name} ({len(data)} items)")
                consolidated_data[collection_name] = data
                
            except Exception as e:
                print(f"[CONSOLIDATOR] Error reading {json_file.name}: {e}")
        
        if consolidated_data:
            # Create consolidated JSON file
            output_file = module_dir / f"{module_name}MockData.json"
            
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(consolidated_data, f, indent=2, ensure_ascii=False)
                
                print(f"[CONSOLIDATOR] >>> Created: {output_file}")
                print(f"[CONSOLIDATOR] >>> Collections: {list(consolidated_data.keys())}")
                print(f"[CONSOLIDATOR] >>> Total items: {sum(len(v) for v in consolidated_data.values())}")
                
                # Optionally remove individual JSON files
                self.remove_individual_files(json_files)
                
                self.consolidated_count += 1
                
            except Exception as e:
                print(f"[CONSOLIDATOR] Error writing {output_file}: {e}")

    def remove_individual_files(self, json_files: List[Path]):
        """Remove individual JSON files after consolidation."""
        print(f"[CONSOLIDATOR] Removing {len(json_files)} individual JSON files...")
        
        for json_file in json_files:
            try:
                json_file.unlink()
                print(f"[CONSOLIDATOR] >>> Removed: {json_file.name}")
            except Exception as e:
                print(f"[CONSOLIDATOR] Error removing {json_file.name}: {e}")

    def consolidate_all_modules(self):
        """Consolidate JSON files in all module directories."""
        print(">>> Starting module JSON consolidation...")
        
        module_dirs = self.find_module_data_dirs()
        
        for module_dir in module_dirs:
            self.consolidate_module_json(module_dir)
            self.modules_processed += 1
        
        print(">>> Module JSON consolidation complete!")
        print(f">>> Modules processed: {self.modules_processed}")
        print(f">>> Modules consolidated: {self.consolidated_count}")

if __name__ == "__main__":
    consolidator = ModuleJSONConsolidator()
    consolidator.consolidate_all_modules() 