import React, { useState, useRef } from 'react';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { useToastHelpers } from '../../../../hooks/useToast';
import { getDatabaseManager } from '../../../../services/database/ProviderSelector';

const ImportExportWizard: React.FC = () => {
  const { showSuccess, showError } = useToastHelpers();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFileUrl, setBackupFileUrl] = useState<string | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBackup = async () => {
    if (!window.confirm("Are you sure you want to export the database?")) return;
    
    setIsBackingUp(true);
    setBackupFileUrl(null);
    setBackupFileName(null);
    
    try {
      const databaseManager = getDatabaseManager();
      const backupData = await databaseManager.backup();
      
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fileName = `schoolpilot_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      setBackupFileUrl(url);
      setBackupFileName(fileName);
      showSuccess('Backup created successfully! Click download to save.');
    } catch (error: any) {
      console.error("Error creating backup:", error);
      showError(`Failed to create backup: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackup = () => {
    if (!backupFileUrl || !backupFileName) return;
    const link = document.createElement('a');
    link.href = backupFileUrl;
    link.download = backupFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(backupFileUrl);
    setBackupFileUrl(null);
    setBackupFileName(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Are you sure you want to import data from ${file.name}? This will overwrite existing data and cannot be undone.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const databaseManager = getDatabaseManager();
      await databaseManager.restore(text);
      showSuccess('Database restored successfully.');
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      showError(`Failed to restore backup: ${error.message}`);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card title="Import & Export" className="shadow-sm mt-6">
      <div className="p-4 space-y-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Export Data (Backup)</h4>
          <p className="text-sm text-gray-500 mb-4">Export your entire local database to a JSON file for backup or migration.</p>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="primary" 
              onClick={handleCreateBackup}
              disabled={isBackingUp || isRestoring}
            >
              {isBackingUp ? 'Generating...' : 'Generate Export'}
            </Button>
            
            {backupFileUrl && (
              <Button 
                variant="secondary" 
                onClick={handleDownloadBackup}
              >
                Download File
              </Button>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Import Data (Restore)</h4>
          <p className="text-sm text-gray-500 mb-4">Upload a previously exported JSON backup to restore your data. <strong>Warning: This replaces current data.</strong></p>
          <div className="flex items-center space-x-4">
            <input 
              type="file" 
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isBackingUp || isRestoring}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
            {isRestoring && <span className="text-sm text-blue-600">Restoring...</span>}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ImportExportWizard;