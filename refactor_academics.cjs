const fs = require('fs');

const file = '/workspace/src/contexts/AppDataContext.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import {\n  createAppDataLoadingState,\n  normalizeAppDataCollections\n} from './appData/appDataCollections';",
  "import {\n  createAppDataLoadingState,\n  normalizeAppDataCollections\n} from './appData/appDataCollections';\nimport { useAcademicsOperations } from './appData/useAcademicsOperations';"
);

// Remove getNormalizedData to deleteTimetableEntry (lines ~800 to 1180)
// It's safer to use regex to strip out these methods since they are now in the hook

const startPattern = /  const getNormalizedData = useCallback\(\(\) => normalizeAppDataCollections\(data\), \[data\]\);\n/;
const endPattern = /  const contextValue = useMemo\(\(\) => \{/;

const matchStart = code.match(startPattern);
const matchEnd = code.match(endPattern);

if (matchStart && matchEnd) {
  const startIndex = matchStart.index;
  const endIndex = matchEnd.index;
  
  const before = code.substring(0, startIndex);
  const after = code.substring(endIndex);
  
  // Inject the hook call
  const hookCall = `
  const {
    getTimetablePeriodDefs,
    getTimetableEntries,
    getStudentAttendanceByFilters,
    saveStudentAttendance,
    addExamSession,
    updateExamSession,
    deleteExamSession,
    addExamPaperSetting,
    updateExamPaperSetting,
    deleteExamPaperSetting,
    saveStudentExamResult,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry
  } = useAcademicsOperations(dbManager, data);

`;

  code = before + hookCall + after;
  fs.writeFileSync(file, code);
  console.log('Academics methods removed from AppDataContext');
} else {
  console.log('Could not find patterns to remove academics methods');
}

