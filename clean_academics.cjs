const fs = require('fs');

const file = '/workspace/src/contexts/AppDataContext.tsx';
let code = fs.readFileSync(file, 'utf8');

// Find the start of the academics methods
const startStr = "const getTimetablePeriodDefs = useCallback(";
const endStr = "  const deleteTimetableEntry = useCallback(async (entryId: string) => {\n";

const startIndex = code.indexOf(startStr);
const endIndexSearch = code.indexOf(endStr);

if (startIndex > -1 && endIndexSearch > -1) {
  // Find the end of deleteTimetableEntry
  const endBlock = "  }, [dbManager]);";
  const endBlockIndex = code.indexOf(endBlock, endIndexSearch);
  
  if (endBlockIndex > -1) {
    const finalEndIndex = endBlockIndex + endBlock.length + 1;
    
    const before = code.substring(0, startIndex);
    const after = code.substring(finalEndIndex);
    
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
    
    // Make sure useAcademicsOperations is imported
    if (!code.includes('useAcademicsOperations')) {
      code = code.replace(
        "import { useValidationContext } from './appData/ValidationContext';",
        "import { useValidationContext } from './appData/ValidationContext';\nimport { useAcademicsOperations } from './appData/useAcademicsOperations';"
      );
    }
    
    fs.writeFileSync(file, code);
    console.log('Cleaned up academics methods');
  } else {
    console.log('Could not find end of deleteTimetableEntry');
  }
} else {
  console.log('Could not find start/end strings', {startIndex, endIndexSearch});
}
