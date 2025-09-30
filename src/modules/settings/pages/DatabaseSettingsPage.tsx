// pages/settings/DatabaseSettingsPage.tsx
import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAppData } from '@/hooks/useAppData';
import { CogIcon, ArchiveIcon, DeleteIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '../../../components/ui/icons'; // Changed TrashIcon to DeleteIcon
import { useTranslation } from 'react-i18next';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';

const DatabaseSettingsPage: React.FC = () => {
  const { 
    isDatabaseModeActive, 
    isUsingRxDBDummyData, 
    triggerSeedRxDB: triggerSeedDatabase, 
    triggerClearRxDB: triggerClearDatabase,
    initializationError 
  } = useAppData();
  
  const { config } = useUnifiedConfig();
  const currentMode = config.dataMode === 'demo' ? 'demo' : 'production';

  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSeedDatabase = async () => {
    if (!triggerSeedDatabase) return;
    if (!window.confirm("Are you sure you want to import dummy data? This will overwrite existing data in the local database if any.")) {
      return;
    }
    setIsSeeding(true);
    setActionMessage(null);
    try {
      await triggerSeedDatabase();
      setActionMessage({ type: 'success', text: 'Dummy data successfully imported into local database.' });
    } catch (error: any) {
      console.error("Error seeding database:", error);
      setActionMessage({ type: 'error', text: `Failed to import dummy data: ${error.message}` });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!triggerClearDatabase) return;
    if (!window.confirm("ARE YOU SURE you want to clear ALL data from the local database? This action cannot be undone.")) {
      return;
    }
    setIsClearing(true);
    setActionMessage(null);
    try {
      await triggerClearDatabase();
      setActionMessage({ type: 'success', text: 'All data successfully cleared from local database.' });
    } catch (error: any) {
      console.error("Error clearing database:", error);
      setActionMessage({ type: 'error', text: `Failed to clear data: ${error.message}` });
    } finally {
      setIsClearing(false);
    }
  };

  if (currentMode !== 'production') {
    return (
      <Card title="Database Settings">
        <div className="p-6 text-center">
          <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Database management features are only available in 'Production' mode.</p>
          <p className="text-sm text-gray-500 mt-1">Currently in '{currentMode}' mode.</p>
          <p className="text-sm text-blue-600 mt-2">Switch to Production mode in Feature Settings to access database management.</p>
        </div>
      </Card>
    );
  }
  
  if (initializationError) {
     return (
      <Card title="Database Settings">
        <div className="p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700">Database Initialization Failed</h3>
          <p className="text-red-600 mt-1">The application is currently running in fallback mode using mock data.</p>
          <p className="text-sm text-gray-500 mt-2">Error: {initializationError.message}</p>
        </div>
      </Card>
    );
  }
  
  if (!isDatabaseModeActive && currentMode === 'production') {
     return (
      <Card title="Database Settings">
        <div className="p-6 text-center">
          <Spinner />
          <p className="text-gray-600 mt-2">Initializing database service... Please wait.</p>
        </div>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card title="Local Database Management">
        <div className="p-6 space-y-4">
          <div className={`p-3 rounded-md text-sm ${isUsingRxDBDummyData ? 'bg-yellow-100 text-yellow-700' : (isUsingRxDBDummyData === false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}`}>
            <strong>Current Status:</strong> 
            {isUsingRxDBDummyData === null ? ' Checking...' : (isUsingRxDBDummyData ? ' Local database is currently using imported dummy data.' : ' Local database is using live data or is empty (not using dummy data).')}
          </div>

          <div className="space-x-4">
            <Button 
              onClick={handleSeedDatabase} 
              disabled={isSeeding || isClearing} 
              leftIcon={isSeeding ? <Spinner size="sm"/> : <ArchiveIcon className="w-5 h-5"/>}
            >
              {isSeeding ? 'Importing...' : 'Import Dummy Data to Database'}
            </Button>
            <Button 
              onClick={handleClearDatabase} 
              disabled={isClearing || isSeeding} 
              variant="danger"
              leftIcon={isClearing ? <Spinner size="sm"/> : <DeleteIcon className="w-5 h-5"/>}
            >
              {isClearing ? 'Clearing...' : 'Clear All Database Data'}
            </Button>
          </div>
          {actionMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm ${actionMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {actionMessage.text}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Note: 'Import Dummy Data' will clear existing database data before populating. 'Clear All Database Data' is irreversible.
          </p>
        </div>
      </Card>

      {/* Mock Data Information */}
      <Card title="Mock Data Information">
        <div className="p-6">
          <div className="flex items-start">
            <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Mock Data Handling</h3>
              <p className="text-sm text-blue-700 mt-1">
                When the application successfully migrates from mock data to the local database, 
                the mock data is automatically handled. The system will continue working with 
                the migrated data even if mock data is removed.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                If you remove mock data, the application will continue to function normally 
                using the data stored in your local database.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DatabaseSettingsPage;