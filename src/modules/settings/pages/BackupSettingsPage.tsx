// pages/settings/BackupSettingsPage.tsx
import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAppData } from '@/hooks/useAppData';
import { DownloadIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import { useTranslation } from 'react-i18next';
import { getDatabaseManager } from '@/services/database/ProviderSelector';

const BackupSettingsPage: React.FC = () => {
  const { initializationError } = useAppData();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [backupFileUrl, setBackupFileUrl] = useState<string | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);

  const handleCreateBackup = async () => {
    if (!window.confirm("Are you sure you want to create a backup of the database?")) {
      return;
    }
    
    setIsBackingUp(true);
    setBackupMessage(null);
    setBackupFileUrl(null);
    setBackupFileName(null);
    
    try {
      // Get the database manager instance
      const databaseManager = getDatabaseManager();
      
      // Create backup
      const backupData = await databaseManager.backup();
      
      // Create a Blob with the backup data
      const blob = new Blob([backupData], { type: 'application/json' });
      
      // Create a download URL
      const url = URL.createObjectURL(blob);
      const fileName = `schoolpilot_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      // Set state for download
      setBackupFileUrl(url);
      setBackupFileName(fileName);
      setBackupMessage({ type: 'success', text: 'Backup created successfully! Click the download button to save the file.' });
    } catch (error: any) {
      console.error("Error creating backup:", error);
      setBackupMessage({ type: 'error', text: `Failed to create backup: ${error.message}` });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackup = () => {
    if (!backupFileUrl || !backupFileName) return;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = backupFileUrl;
    link.download = backupFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    URL.revokeObjectURL(backupFileUrl);
    setBackupFileUrl(null);
    setBackupFileName(null);
  };

  if (initializationError) {
     return (
      <Card title="Backup Settings">
        <div className="p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700">Database Initialization Failed</h3>
          <p className="text-red-600 mt-1">The application is currently running in fallback mode using mock data.</p>
          <p className="text-sm text-gray-500 mt-2">Error: {initializationError.message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Database Backup">
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700">
            <strong>Important:</strong> Creating a backup will export all data from the local database to a JSON file. 
            This file can be used to restore your data in case of corruption or migration.
          </div>

          <div className="space-x-4">
            <Button 
              onClick={handleCreateBackup} 
              disabled={isBackingUp} 
              leftIcon={isBackingUp ? <Spinner size="sm"/> : <DownloadIcon className="w-5 h-5"/>}
            >
              {isBackingUp ? 'Creating Backup...' : 'Create Database Backup'}
            </Button>
            
            {backupFileUrl && backupFileName && (
              <Button 
                onClick={handleDownloadBackup} 
                variant="success"
                leftIcon={<DownloadIcon className="w-5 h-5"/>}
              >
                Download Backup File
              </Button>
            )}
          </div>
          
          {backupMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm ${backupMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {backupMessage.text}
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">Backup Instructions</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>Click "Create Database Backup" to generate a backup file</li>
              <li>After creation, click "Download Backup File" to save it to your computer</li>
              <li>Store backup files in a secure location</li>
              <li>Regular backups are recommended for data safety</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BackupSettingsPage;