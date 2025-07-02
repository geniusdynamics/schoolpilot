// pages/settings/DatabaseSettingsPage.tsx
import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useAppData } from '../../contexts/AppDataContext';
import { CogIcon, ArchiveIcon, DeleteIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../../components/ui/icons'; // Changed TrashIcon to DeleteIcon
import { APP_MODE } from '../../contexts/config';
import { useTranslation } from 'react-i18next';

const DatabaseSettingsPage: React.FC = () => {
  const { 
    isRxDBModeActive, 
    isUsingRxDBDummyData, 
    triggerSeedRxDB, 
    triggerClearRxDB,
    initializationError 
  } = useAppData();

  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSeedDatabase = async () => {
    if (!triggerSeedRxDB) return;
    if (!window.confirm("Are you sure you want to import dummy data? This will overwrite existing data in RxDB if any.")) {
      return;
    }
    setIsSeeding(true);
    setActionMessage(null);
    try {
      await triggerSeedRxDB();
      setActionMessage({ type: 'success', text: 'Dummy data successfully imported into RxDB.' });
    } catch (error: any) {
      console.error("Error seeding RxDB:", error);
      setActionMessage({ type: 'error', text: `Failed to import dummy data: ${error.message}` });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!triggerClearRxDB) return;
    if (!window.confirm("ARE YOU SURE you want to clear ALL data from RxDB? This action cannot be undone.")) {
      return;
    }
    setIsClearing(true);
    setActionMessage(null);
    try {
      await triggerClearRxDB();
      setActionMessage({ type: 'success', text: 'All data successfully cleared from RxDB.' });
    } catch (error: any) {
      console.error("Error clearing RxDB:", error);
      setActionMessage({ type: 'error', text: `Failed to clear data: ${error.message}` });
    } finally {
      setIsClearing(false);
    }
  };

  if (APP_MODE !== 'production') {
    return (
      <Card title="Database Settings">
        <div className="p-6 text-center">
          <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Database management features are only available in 'Production' mode.</p>
          <p className="text-sm text-gray-500 mt-1">Currently in '{APP_MODE}' mode.</p>
        </div>
      </Card>
    );
  }
  
  if (initializationError) {
     return (
      <Card title="Database Settings">
        <div className="p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700">RxDB Initialization Failed</h3>
          <p className="text-red-600 mt-1">The application is currently running in fallback mode using mock data.</p>
          <p className="text-sm text-gray-500 mt-2">Error: {initializationError.message}</p>
        </div>
      </Card>
    );
  }
  
  if (!isRxDBModeActive && APP_MODE === 'production') {
     return (
      <Card title="Database Settings">
        <div className="p-6 text-center">
          <Spinner />
          <p className="text-gray-600 mt-2">Initializing RxDB service... Please wait.</p>
        </div>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card title="RxDB Database Management">
        <div className="p-6 space-y-4">
          <div className={`p-3 rounded-md text-sm ${isUsingRxDBDummyData ? 'bg-yellow-100 text-yellow-700' : (isUsingRxDBDummyData === false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}`}>
            <strong>Current Status:</strong> 
            {isUsingRxDBDummyData === null ? ' Checking...' : (isUsingRxDBDummyData ? ' RxDB is currently using imported dummy data.' : ' RxDB is using live data or is empty (not using dummy data).')}
          </div>

          <div className="space-x-4">
            <Button 
              onClick={handleSeedDatabase} 
              disabled={isSeeding || isClearing} 
              leftIcon={isSeeding ? <Spinner size="sm"/> : <ArchiveIcon className="w-5 h-5"/>}
            >
              {isSeeding ? 'Importing...' : 'Import Dummy Data to RxDB'}
            </Button>
            <Button 
              onClick={handleClearDatabase} 
              disabled={isClearing || isSeeding} 
              variant="danger"
              leftIcon={isClearing ? <Spinner size="sm"/> : <DeleteIcon className="w-5 h-5"/>}
            >
              {isClearing ? 'Clearing...' : 'Clear All RxDB Data'}
            </Button>
          </div>
          {actionMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm ${actionMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {actionMessage.text}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Note: 'Import Dummy Data' will clear existing RxDB data before populating. 'Clear All RxDB Data' is irreversible.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default DatabaseSettingsPage;
