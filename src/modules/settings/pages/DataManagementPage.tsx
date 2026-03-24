// ABOUTME: Data Management & Sync settings page
import React from 'react';
import BreadcrumbNavigation from '../../../components/BreadcrumbNavigation';
import ModeSelector from '../components/data-management/ModeSelector';
import SyncRulesEditor from '../components/data-management/SyncRulesEditor';
import DataOperationsPanel from '../components/data-management/DataOperationsPanel';
import ImportExportWizard from '../components/data-management/ImportExportWizard';

const DataManagementPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <BreadcrumbNavigation />
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Data Management & Sync
        </h1>
        <p className="text-gray-600">
          Configure synchronization behavior, offline capabilities, and manage data imports/exports.
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-10 space-y-6">
        <ModeSelector />
        <SyncRulesEditor />
        <DataOperationsPanel />
        <ImportExportWizard />
      </div>
    </div>
  );
};

export default DataManagementPage;