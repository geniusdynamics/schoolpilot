# Scripts Directory

This directory contains utility scripts for the SchoolPilot3 project.

## Scripts

### `page_issue_analysis.ps1`
**Purpose**: Analyzes React pages for common issues and generates a detailed report.

**Features**:
- Detects missing imports
- Identifies unused imports
- Finds JSX syntax issues
- Checks for component naming conflicts
- Analyzes type usage patterns

**Usage**:
```powershell
.\page_issue_analysis.ps1
```

**Output**: Generates a comprehensive analysis report of all React pages in the project.

### `page_validation_check.ps1`
**Purpose**: Validates that all expected route pages exist in the project structure.

**Features**:
- Compares expected routes from App.tsx with actual files
- Identifies missing page files
- Checks for correct file naming conventions
- Validates directory structure

**Usage**:
```powershell
.\page_validation_check.ps1
```

**Output**: Reports any missing pages and validates the completeness of the routing structure.

## Notes

- All scripts are designed to be run from the project root directory
- Scripts use PowerShell and are optimized for Windows development environments
- Results are typically output to the console and can be redirected to files if needed

## Development Guidelines

When adding new scripts to this directory:

1. **Naming**: Use descriptive names with underscores (e.g., `feature_analysis.ps1`)
2. **Documentation**: Update this README with script descriptions
3. **Error Handling**: Include proper error handling and user feedback
4. **Consistency**: Follow the established patterns used in existing scripts
