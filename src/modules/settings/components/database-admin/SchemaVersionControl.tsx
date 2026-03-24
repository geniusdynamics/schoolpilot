import React from 'react';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';
import { useToastHelpers } from '../../../../hooks/useToast';
import { autoFixDatabaseConfig, migrateDatabaseConfig } from '../../../../config/unifiedConfig';

const SchemaVersionControl: React.FC = () => {
  const { showSuccess, showError } = useToastHelpers();
  const { config } = useUnifiedConfig();

  const handleAutoFix = () => {
    try {
      const result = autoFixDatabaseConfig();
      if (result.success) {
        showSuccess(`Auto-fixed ${result.changes.length} issues`);
      } else {
        showError('Auto-fix failed to resolve all issues');
      }
    } catch (error: any) {
      showError(`Auto-fix failed: ${error.message}`);
    }
  };

  const handleMigrate = () => {
    try {
      const result = migrateDatabaseConfig();
      if (result.success) {
        if (result.appliedMigrations.length > 0) {
          showSuccess(`Applied ${result.appliedMigrations.length} migrations`);
        } else {
          showSuccess('Configuration is already up to date');
        }
      } else {
        showError('Migration failed');
      }
    } catch (error: any) {
      showError(`Migration failed: ${error.message}`);
    }
  };

  return (
    <Card title="Schema Version Control" className="shadow-sm mt-6">
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600">Manage database schema migrations and configuration consistency.</p>
        
        <div className="flex items-center space-x-4">
          <Button variant="primary" onClick={handleMigrate}>
            Run Migrations
          </Button>
          <Button variant="secondary" onClick={handleAutoFix}>
            Auto-Fix Configuration
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SchemaVersionControl;