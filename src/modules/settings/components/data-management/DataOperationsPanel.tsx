import React, { useState } from 'react';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { useAppData } from '../../../../hooks/useAppData';
import { useToastHelpers } from '../../../../hooks/useToast';

const DataOperationsPanel: React.FC = () => {
  const { triggerSeedRxDB, triggerClearRxDB } = useAppData();
  const { showSuccess, showError } = useToastHelpers();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSeedDatabase = async () => {
    if (!triggerSeedRxDB) return;
    if (!window.confirm("Are you sure you want to import dummy data? This will overwrite existing data in the local database if any.")) return;
    
    setIsSeeding(true);
    try {
      await triggerSeedRxDB();
      showSuccess('Dummy data successfully imported into local database.');
    } catch (error: any) {
      showError(`Failed to import dummy data: ${error.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!triggerClearRxDB) return;
    if (!window.confirm("ARE YOU SURE you want to clear ALL data from the local database? This action cannot be undone.")) return;
    
    setIsClearing(true);
    try {
      await triggerClearRxDB();
      showSuccess('All data successfully cleared from local database.');
    } catch (error: any) {
      showError(`Failed to clear data: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card title="Data Operations & Mock Data" className="shadow-sm mt-6">
      <div className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Inject Demo Data</h4>
            <p className="text-sm text-gray-500 mb-4">Populate the database with sample data for testing purposes.</p>
            <Button 
              variant="primary" 
              onClick={handleSeedDatabase}
              disabled={isSeeding || !triggerSeedRxDB}
            >
              {isSeeding ? 'Injecting...' : 'Inject Demo Data'}
            </Button>
          </div>
          
          <div className="flex-1 p-4 border border-red-200 rounded-lg bg-red-50">
            <h4 className="font-medium text-red-900 mb-2">Purge Database</h4>
            <p className="text-sm text-red-700 mb-4">Permanently delete all local data. Sync will download fresh data if online.</p>
            <Button 
              variant="danger" 
              onClick={handleClearDatabase}
              disabled={isClearing || !triggerClearRxDB}
            >
              {isClearing ? 'Purging...' : 'Clear All Data'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DataOperationsPanel;