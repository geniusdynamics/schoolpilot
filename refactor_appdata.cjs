const fs = require('fs');

const file = '/workspace/src/contexts/AppDataContext.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add imports for DomainContexts
code = code.replace(
  "import { ValidationProvider, useValidationContext } from './appData/ValidationContext';",
  "import { ValidationProvider, useValidationContext } from './appData/ValidationContext';\nimport { useCoreDomain, useAcademicsDomain, useHRDomain, useFinanceDomain, useInventoryDomain, useSharedDomain } from './appData/domainContexts';"
);

// 2. Remove useState for data
code = code.replace(
  "const [data, setData] = useState<Record<string, any[]>>({});\n",
  ""
);

// 3. Inside AppDataProvider, consume Domain Contexts
code = code.replace(
  "const [isOnline, setIsOnline] = useState(navigator.onLine);",
  "const [isOnline, setIsOnline] = useState(navigator.onLine);\n\n  // Consume Domain Contexts\n  const coreDomain = useCoreDomain();\n  const academicsDomain = useAcademicsDomain();\n  const hrDomain = useHRDomain();\n  const financeDomain = useFinanceDomain();\n  const inventoryDomain = useInventoryDomain();\n  const sharedDomain = useSharedDomain();\n\n  // Reconstruct the legacy data object for internal operations if needed\n  const data = useMemo(() => ({\n    ...coreDomain,\n    ...academicsDomain,\n    ...hrDomain,\n    ...financeDomain,\n    ...inventoryDomain,\n    ...sharedDomain\n  }), [coreDomain, academicsDomain, hrDomain, financeDomain, inventoryDomain, sharedDomain]);\n"
);

// 4. Remove loadAllCollections completely
code = code.replace(/  \/\/ Load data from all collections[\s\S]*?setData\(loadedData\);\n    \} catch \(err\) \{\n      console\.error\('Failed to load collections:', err\);\n    \}\n  \}, \[dbManager\]\);\n/, "");

// Replace other calls to loadAllCollections() with dispatching appDataChanged
code = code.replace(/await loadAllCollections\(\);/g, "window.dispatchEvent(new CustomEvent('appDataChanged'));");
code = code.replace(/loadAllCollections\(\)\.catch\(\(err\) => \{[\s\S]*?\}\);/g, "window.dispatchEvent(new CustomEvent('appDataChanged'));");

// For refreshData:
code = code.replace(/const refreshData = useCallback\(async \(\) => \{[\s\S]*?\}\}, \[loadAllCollections, toast\]\);/, 
  "const refreshData = useCallback(async () => {\n    try {\n      window.dispatchEvent(new CustomEvent('appDataChanged'));\n      toast.showSuccess('Data refreshed successfully');\n    } catch (err) {\n      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';\n      toast.showError(errorMessage);\n      throw err;\n    }\n  }, [toast]);"
);

// For loadPromise = loadAllCollections() -> window.dispatchEvent
code = code.replace(/const loadPromise = loadAllCollections\(\);/g, "window.dispatchEvent(new CustomEvent('appDataChanged'));\n        const loadPromise = Promise.resolve();");

// For the last useEffect that listens to appDataChanged and calls loadAllCollections - remove it entirely
code = code.replace(/  \/\/ Listen for data changed events from decoupled providers[\s\S]*?  \}, \[loadAllCollections\]\);\n/, "");

// Remove loadAllCollections from dependency arrays
code = code.replace(/, loadAllCollections/g, "");
code = code.replace(/loadAllCollections, /g, "");

fs.writeFileSync(file, code);
console.log('Refactored AppDataContext.tsx successfully');
