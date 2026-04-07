import React from 'react';
import { useTranslation } from 'react-i18next';
import PreNAsMarksManagement from '@/components/PreNAsMarksManagement';

const PreNAsMarksPage: React.FC = () => {
  const { t } = useTranslation('administration');
  
  return (
    <div className="p-6">
      <PreNAsMarksManagement />
    </div>
  );
};

export default PreNAsMarksPage;
