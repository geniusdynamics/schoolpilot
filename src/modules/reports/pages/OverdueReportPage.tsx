// ABOUTME: Overdue Report Page wrapper for routing
// ABOUTME: Provides routing access to the OverdueReport component

import React from 'react';
import OverdueReport from '../library/OverdueReport';

export const OverdueReportPageContent: React.FC = () => {
  return <OverdueReport />;
};
const OverdueReportPage: React.FC = () => (
  <div className="space-y-3">
    <OverdueReportPageContent />
  </div>
);

export default OverdueReportPage;
