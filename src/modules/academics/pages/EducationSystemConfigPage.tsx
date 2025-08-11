// src/modules/academics/pages/EducationSystemConfigPage.tsx

import React from 'react';
import EducationSystemForm from '../components/EducationSystemForm';

const EducationSystemConfigPage: React.FC<any> = ({ editingSystem, onSave, onCancel }) => {
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

export default EducationSystemConfigPage;

