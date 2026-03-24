// ABOUTME: Database & Backend Administration page
import React, { useState } from 'react';
import BreadcrumbNavigation from '../../../components/BreadcrumbNavigation';
import ConnectionManager from '../components/database-admin/ConnectionManager';
import SchemaVersionControl from '../components/database-admin/SchemaVersionControl';
import PerformancePanel from '../components/database-admin/PerformancePanel';
import QuotaRetentionPanel from '../components/database-admin/QuotaRetentionPanel';

const DatabaseAdminPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <BreadcrumbNavigation />
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Database & Backend Administration
        </h1>
        <p className="text-gray-600">
          Manage backend engines, connections, performance tuning, and schema versions.
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-10 space-y-6">
        <ConnectionManager />
        <SchemaVersionControl />
        <PerformancePanel />
        <QuotaRetentionPanel />
      </div>
    </div>
  );
};

export default DatabaseAdminPage;