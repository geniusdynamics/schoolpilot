import React from 'react';
import { useTranslation } from 'react-i18next';
import ApplicationManagement from '../components/ApplicationManagement';

const ApplicationsPage: React.FC = () => {
  const { t } = useTranslation('administration');
  
  return (
    <div className="p-6">
      <ApplicationManagement />
    </div>
  );
};

export default ApplicationsPage;
