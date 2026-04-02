const fs = require('fs');
const file = '/workspace/src/contexts/AppDataContext.tsx';
let code = fs.readFileSync(file, 'utf8');

// replace everything from `  // Create context value` down to `  // Loading state`
const startMarker = '  // Create context value';
const endMarker = '  // Loading state';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex > -1 && endIndex > -1) {
  const before = code.substring(0, startIndex);
  const after = code.substring(endIndex);
  
  const newBlock = `  // Create context value
  const contextValue = useMemo(() => {
    const normalizedData = normalizeAppDataCollections(data);
    const loadingState = createAppDataLoadingState(isLoading);

    return {
      ...normalizedData,
      isInitialized,
      loading: loadingState,
      error,
      isDatabaseModeActive: isInitialized && !isLoading && !error,
      isOnline,
      appVersion: '1.0.0',
      deploymentMode: dbManager.getDeploymentMode(),
      providerType: dbManager.getProviderType(),
      backendAvailable: networkState?.backendAvailable || false,
      connectionQuality: networkState?.connectionQuality || 'offline',
      networkState,
      syncStatus,
      refreshData,
      getCollectionStats,
      forceSync,
      pauseSync,
      resumeSync,
      cancelSync,
      getSyncSettings,
      updateSyncSettings,
      refreshCollection,
      refreshDataWithProgress,
      cleanupOldData,
      getProviderCapabilities,
      currentDataMode,
      dataSourceDescription,
      getDataSourceConfig,
      updateDataStrategy,
      saveStudentAttendance,
      getStudentAttendanceByFilters,
      addExamSession,
      updateExamSession,
      deleteExamSession,
      addExamPaperSetting,
      updateExamPaperSetting,
      deleteExamPaperSetting,
      saveStudentExamResult,
      getTimetablePeriodDefs,
      getTimetableEntries,
      addTimetableEntry,
      updateTimetableEntry,
      deleteTimetableEntry
    };
  }, [
    data,
    isInitialized,
    isLoading,
    error,
    isOnline,
    dbManager,
    networkState,
    syncStatus,
    refreshData,
    getCollectionStats,
    forceSync,
    pauseSync,
    resumeSync,
    cancelSync,
    getSyncSettings,
    updateSyncSettings,
    refreshCollection,
    refreshDataWithProgress,
    cleanupOldData,
    getProviderCapabilities,
    currentDataMode,
    dataSourceDescription,
    getDataSourceConfig,
    updateDataStrategy,
    saveStudentAttendance,
    getStudentAttendanceByFilters,
    addExamSession,
    updateExamSession,
    deleteExamSession,
    addExamPaperSetting,
    updateExamPaperSetting,
    deleteExamPaperSetting,
    saveStudentExamResult,
    getTimetablePeriodDefs,
    getTimetableEntries,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry
  ]);

`;
  
  fs.writeFileSync(file, before + newBlock + after);
  console.log('Successfully replaced contextValue block');
}
