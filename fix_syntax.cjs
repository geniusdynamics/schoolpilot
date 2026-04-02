const fs = require('fs');
const file = '/workspace/src/contexts/AppDataContext.tsx';
let code = fs.readFileSync(file, 'utf8');

// I will replace the end of contextValue to be perfectly clean
const target = `    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry
    };
  }, [`;

const replacement = `    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry
    };
  }, [`;

// Wait, let's just use regex to replace the whole useMemo ending
code = code.replace(/    deleteTimetableEntry\n    \};\n  \}, \[\s+data,[\s\S]*?config\.environment,\n  \]\);/m, 
  `    deleteTimetableEntry\n  };\n}, [\n  data,\n  isInitialized,\n  isLoading,\n  error,\n  isOnline,\n  networkState,\n  syncStatus,\n  refreshData,\n  getCollectionStats,\n  forceSync,\n  pauseSync,\n  resumeSync,\n  cancelSync,\n  getSyncSettings,\n  updateSyncSettings,\n  refreshCollection,\n  refreshDataWithProgress,\n  cleanupOldData,\n  getProviderCapabilities,\n  currentDataMode,\n  dataSourceDescription,\n  getDataSourceConfig,\n  updateDataStrategy,\n  saveStudentAttendance,\n  getStudentAttendanceByFilters,\n  addExamSession,\n  updateExamSession,\n  deleteExamSession,\n  addExamPaperSetting,\n  updateExamPaperSetting,\n  deleteExamPaperSetting,\n  saveStudentExamResult,\n  getTimetablePeriodDefs,\n  getTimetableEntries,\n  addTimetableEntry,\n  updateTimetableEntry,\n  deleteTimetableEntry\n]);`
);

fs.writeFileSync(file, code);
