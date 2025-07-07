# Scripts Directory

This directory contains various utility scripts for the SchoolPilot3 project. All scripts are organized by functionality and include comprehensive documentation.

## Translation Management Scripts

### Core Translation Scripts

#### `translation-completeness-check.js`
**Purpose:** Automated script to check translation completeness across all modules.

**Usage:**
```bash
# Using npm script (recommended)
npm run check-translations

# Direct execution
node scripts/translation-completeness-check.js
```

**Features:**
- Scans all modules for translation files
- Compares English and French translation key counts
- Identifies missing translation files
- Provides detailed summary report
- Color-coded output for easy identification of issues

**Output Example:**
```
✅ academics: 206 keys total
✅ administration: 249 keys total
❌ core: Missing translation files
```

#### `analyze-translation-usage.js`
**Purpose:** Comprehensive analysis of translation key usage across all modules.

**Usage:**
```bash
# Using npm script (recommended)
npm run analyze-translations

# Direct execution
node scripts/analyze-translation-usage.js
```

**Features:**
- Extracts all translation keys used in code files
- Identifies hardcoded strings that should be translation keys
- Provides detailed breakdown by module and file
- Generates usage statistics

#### `fix-translation-keys.js`
**Purpose:** Automatically adds missing translation keys to translation files based on actual code usage.

**Usage:**
```bash
node scripts/fix-translation-keys.js
```

**Features:**
- Scans code files for translation key usage
- Generates missing translation keys with reasonable default values
- Updates both English and French translation files
- Preserves existing translation structure
- Handles nested key structures automatically

**Key Generation Logic:**
- Converts camelCase to readable text
- Handles common patterns (Title, Label, Button, etc.)
- Generates appropriate prefixes (validation, messages, etc.)

#### `analyze-translation-issues.js`
**Purpose:** Focused analysis tool for identifying specific translation problems in problematic modules.

**Usage:**
```bash
node scripts/analyze-translation-issues.js
```

**Features:**
- Analyzes specific modules (academics, administration, inventory, reports)
- Compares used keys vs available keys
- Identifies hardcoded strings vs proper translation keys
- Provides detailed issue breakdown
- Focuses on modules with known translation problems

#### `fix-hardcoded-strings.js`
**Purpose:** Systematically replaces hardcoded strings with proper translation keys.

**Usage:**
```bash
node scripts/fix-hardcoded-strings.js
```

**Features:**
- Identifies common hardcoded strings (validation messages, alerts, etc.)
- Replaces hardcoded strings with appropriate translation keys
- Updates translation files with new keys
- Handles alert() calls and other common patterns
- Generates meaningful translation keys from string content

**Common Replacements:**
- Validation messages → `validation.*` keys
- Status messages → `messages.*` keys
- Common actions → `common.*` keys
- Alert dialogs → proper translation calls

### Specialized Analysis Scripts

#### `analyze-nutrition-keys.js`
**Purpose:** Focused analysis for the nutrition module translation keys.

**Usage:**
```bash
node scripts/analyze-nutrition-keys.js
```

**Features:**
- Module-specific analysis for nutrition
- Identifies used vs available keys
- Provides targeted recommendations
- Useful for debugging specific module issues

## NPM Script Shortcuts

For convenience, the following NPM scripts are available:

```bash
# Quick translation completeness check
npm run check-translations

# Comprehensive translation usage analysis
npm run analyze-translations
```

## Development Workflow

### Adding New Translation Keys

1. **Write code with translation keys:**
   ```typescript
   const message = t('validation.fieldRequired');
   ```

2. **Run analysis to identify missing keys:**
   ```bash
   npm run analyze-translations
   ```

3. **Auto-fix missing keys:**
   ```bash
   node scripts/fix-translation-keys.js
   ```

4. **Verify completeness:**
   ```bash
   npm run check-translations
   ```

### Fixing Hardcoded Strings

1. **Identify hardcoded strings:**
   ```bash
   node scripts/analyze-translation-issues.js
   ```

2. **Replace with translation keys:**
   ```bash
   node scripts/fix-hardcoded-strings.js
   ```

3. **Verify fixes:**
   ```bash
   node scripts/analyze-translation-issues.js
   ```

### Best Practices

1. **Always use translation keys instead of hardcoded strings**
   ```typescript
   // ❌ Bad
   alert("Field is required");
   
   // ✅ Good
   alert(t('validation.fieldRequired'));
   ```

2. **Use consistent key naming conventions:**
   - `validation.*` for form validation messages
   - `messages.*` for general user messages
   - `common.*` for shared UI elements
   - `[module].*` for module-specific content

3. **Run translation checks before commits:**
   ```bash
   npm run check-translations
   ```

4. **Keep French translations updated:**
   - The scripts generate English placeholders for French
   - Replace with proper French translations when possible

## Current Translation Status

### ✅ Fully Functional Modules
- **academics**: 206 keys (all translation keys working)
- **administration**: 249 keys (all translation keys working)
- **dashboard**: 11 keys (complete)
- **finance**: 52 keys (complete)
- **hr**: 91 keys (complete)
- **inventory**: 277 keys (all translation keys working)
- **library**: 85 keys (complete)
- **nutrition**: 22 keys (complete)
- **reports**: 206 keys (all translation keys working)
- **settings**: 156 keys (complete)

### Remaining Issues

#### Minor Hardcoded Strings (21 total)
- **academics**: 8 hardcoded strings (mostly common:* references)
- **administration**: 6 hardcoded strings (mostly common:* references)
- **inventory**: 3 hardcoded strings (complex template strings)
- **reports**: 2 hardcoded strings (single characters)

These remaining hardcoded strings are mostly:
1. References to common translation keys (`common:cancel`, `common:save`)
2. Complex template strings with variables
3. Single character strings that may be intentional

## PowerShell Scripts (Legacy)

The following PowerShell scripts are maintained for compatibility but are not actively used:

- `convert_imports_to_absolute.ps1`
- `fix_cross_module_imports.ps1`
- `fix_import_paths.ps1`
- `fix_import_paths_v2.ps1`
- `fix_intra_module_imports.ps1`
- `robust_absolute_imports.ps1`
- `update_module_imports.ps1`

## Page Validation Scripts

- `page_issue_analysis.ps1`
- `page_validation_check.js`
- `page_validation_check.ps1`
- `page_validation_result.json`

These scripts are used for validating page structure and imports.

## Contributing

When adding new scripts:

1. **Place in the `scripts/` directory**
2. **Use descriptive names with hyphens for Node.js scripts**
3. **Use underscores for PowerShell scripts (legacy convention)**
4. **Update this README with documentation**
5. **Consider adding NPM script shortcuts for frequently used tools**
6. **Include comprehensive error handling and user feedback**

## Future Enhancements

Potential improvements for the translation system:

1. **Automated French Translation Integration**
   - Integration with translation services
   - Batch translation of English keys to French

2. **Translation Validation**
   - Automated tests for translation completeness
   - CI/CD integration for translation checks

3. **Advanced Analysis**
   - Unused translation key detection
   - Translation key usage statistics
   - Performance impact analysis

4. **IDE Integration**
   - VSCode extension for translation key management
   - Real-time translation key validation

5. **Pluralization Support**
   - Advanced pluralization rules
   - Context-aware translations