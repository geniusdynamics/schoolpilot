#!/usr/bin/env python3
"""
ABOUTME: Enhanced TypeScript to JSON converter
ABOUTME: Handles complex TypeScript syntax including spread operators and template literals
"""

import os
import json
import re
import glob
from pathlib import Path
from typing import Dict, List, Any, Optional

class EnhancedTypeScriptToJSONConverter:
    def __init__(self):
        self.conversion_stats = {
            'successful': 0,
            'failed': 0,
            'warnings': 0
        }

    def find_mockdata_files(self) -> List[Path]:
        """Find all mockData.ts files in module data directories."""
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        
        mockdata_files = []
        for module_dir in project_root.glob("src/modules/*/data/"):
            mockdata_file = module_dir / "mockData.ts"
            if mockdata_file.exists():
                mockdata_files.append(mockdata_file)
        
        print(f"[ENHANCED CONVERTER] Found {len(mockdata_files)} mockData.ts files to convert")
        for file in mockdata_files:
            print(f"[ENHANCED CONVERTER] File: {file}")
        
        return mockdata_files

    def clean_typescript_syntax(self, content: str) -> str:
        """Enhanced cleaning of TypeScript syntax to JSON-compatible format."""
        # Remove TypeScript type annotations
        content = re.sub(r':\s*[A-Za-z<>\[\]{}|&, ]+', '', content)
        
        # Handle spread operators (...)
        content = re.sub(r'\.\.\.\s*([A-Za-z_][A-Za-z0-9_]*)', '', content)
        
        # Handle template literals with ${} expressions
        content = re.sub(r'\$\{[^}]*\}', '""', content)
        
        # Handle template literals with backticks
        content = re.sub(r'`([^`]*)`', r'"\1"', content)
        
        # Handle single quotes
        content = re.sub(r"'([^']*)'", r'"\1"', content)
        
        # Handle unquoted property names
        content = re.sub(r'(\w+):', r'"\1":', content)
        
        # Handle trailing commas
        content = re.sub(r',(\s*[}\]])', r'\1', content)
        
        # Handle comments
        content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        
        # Handle multiline strings
        content = re.sub(r'"([^"]*)\n([^"]*)"', r'"\1 \2"', content)
        
        # Handle Date() constructors
        content = re.sub(r'new Date\([^)]*\)', '"2024-01-01"', content)
        
        # Handle Math.random() and other functions
        content = re.sub(r'Math\.random\(\)', '0.5', content)
        content = re.sub(r'Math\.floor\([^)]*\)', '1', content)
        
        # Handle array spread
        content = re.sub(r'\.\.\.\s*\[[^\]]*\]', '', content)
        
        # Handle object spread
        content = re.sub(r'\.\.\.\s*\{[^}]*\}', '', content)
        
        # Handle function calls
        content = re.sub(r'\w+\([^)]*\)', '""', content)
        
        # Handle undefined and null
        content = re.sub(r'\bundefined\b', 'null', content)
        
        # Handle boolean values
        content = re.sub(r'\btrue\b', 'true', content)
        content = re.sub(r'\bfalse\b', 'false', content)
        
        return content

    def extract_export_arrays(self, content: str) -> Dict[str, Any]:
        """Extract exported arrays and objects from TypeScript content."""
        exports = {}
        
        # Clean the content first
        cleaned_content = self.clean_typescript_syntax(content)
        
        # Find export const patterns
        export_patterns = [
            r'export\s+const\s+(\w+)\s*=\s*(\[[^\]]*\])',
            r'export\s+const\s+(\w+)\s*=\s*(\{[^}]*\})',
            r'export\s+default\s+(\w+)',
            r'const\s+(\w+)\s*=\s*(\[[^\]]*\])',
            r'const\s+(\w+)\s*=\s*(\{[^}]*\})'
        ]
        
        for pattern in export_patterns:
            matches = re.finditer(pattern, cleaned_content, re.MULTILINE | re.DOTALL)
            for match in matches:
                var_name = match.group(1)
                if len(match.groups()) > 1:
                    var_value = match.group(2)
                    try:
                        # Try to parse as JSON
                        parsed_value = json.loads(var_value)
                        exports[var_name] = parsed_value
                        print(f"[ENHANCED CONVERTER] Successfully extracted: {var_name}")
                    except json.JSONDecodeError as e:
                        print(f"[ENHANCED CONVERTER] Warning: Could not parse {var_name}: {e}")
                        self.conversion_stats['warnings'] += 1
        
        return exports

    def convert_file(self, file_path: Path) -> Dict[str, Any]:
        """Convert a single TypeScript mock data file to JSON exports."""
        print(f"[ENHANCED CONVERTER] Converting: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            exports = self.extract_export_arrays(content)
            
            # Write individual JSON files for each export
            module_name = file_path.parent.parent.name
            output_dir = file_path.parent
            
            for export_name, export_data in exports.items():
                # Create filename with initialMock prefix
                json_filename = f"initialMock{export_name}.json"
                json_path = output_dir / json_filename
                
                try:
                    with open(json_path, 'w', encoding='utf-8') as f:
                        json.dump(export_data, f, indent=2, ensure_ascii=False)
                    print(f"[ENHANCED CONVERTER] >>> Created: {json_path}")
                    self.conversion_stats['successful'] += 1
                except Exception as e:
                    print(f"[ENHANCED CONVERTER] Error writing {json_filename}: {e}")
                    self.conversion_stats['failed'] += 1
            
            return exports
            
        except Exception as e:
            print(f"[ENHANCED CONVERTER] Error reading {file_path}: {e}")
            self.conversion_stats['failed'] += 1
            return {}

    def convert_all_files(self):
        """Convert all mockData.ts files to JSON."""
        print(">>> Starting Enhanced TypeScript to JSON conversion...")
        
        mockdata_files = self.find_mockdata_files()
        
        for file_path in mockdata_files:
            self.convert_file(file_path)
        
        print(">>> Enhanced TypeScript to JSON conversion complete!")
        print(f">>> Successful conversions: {self.conversion_stats['successful']}")
        print(f">>> Failed conversions: {self.conversion_stats['failed']}")
        print(f">>> Warnings: {self.conversion_stats['warnings']}")

if __name__ == "__main__":
    converter = EnhancedTypeScriptToJSONConverter()
    converter.convert_all_files() 