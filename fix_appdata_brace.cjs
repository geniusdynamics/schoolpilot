const fs = require('fs');
const file = '/workspace/src/contexts/AppDataContext.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "    deleteTimetableEntry,\n    config.environment,\n  ]); // Removed toast from dependencies",
  "    deleteTimetableEntry,\n    config.environment,\n    };\n  }, [\n    data,\n    isInitialized,\n    isLoading,\n    error,\n    isOnline,\n    networkState,\n    syncStatus,\n    refreshData,\n    getCollectionStats,\n    forceSync,\n    pauseSync,\n    resumeSync,\n    cancelSync,\n    getSyncSettings,\n    updateSyncSettings,\n    refreshCollection,\n    refreshDataWithProgress,\n    cleanupOldData,\n    getProviderCapabilities,\n    currentDataMode,\n    dataSourceDescription,\n    getDataSourceConfig,\n    updateDataStrategy,\n    saveStudentAttendance,\n    getStudentAttendanceByFilters,\n    addExamSession,\n    updateExamSession,\n    deleteExamSession,\n    addExamPaperSetting,\n    updateExamPaperSetting,\n    deleteExamPaperSetting,\n    saveStudentExamResult,\n    getTimetablePeriodDefs,\n    getTimetableEntries,\n    addTimetableEntry,\n    updateTimetableEntry,\n    deleteTimetableEntry,\n    config.environment,\n  ]); // Removed toast from dependencies"
);

fs.writeFileSync(file, code);
