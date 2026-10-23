// src/modules/academics/pages/EducationSystemConfigPage.tsx

import React from 'react';
import EducationSystemForm from '../components/EducationSystemForm';

export const EducationSystemConfigPageContent: React.FC<any> = ({ editingSystem, onSave, onCancel }) => {
  return (
    <div>
      <EducationSystemForm
        initialData={editingSystem}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
};
const EducationSystemConfigPage: React.FC = () => (
  <div className="space-y-3">
    <EducationSystemConfigPageContent />
  </div>
);

export default EducationSystemConfigPage;
