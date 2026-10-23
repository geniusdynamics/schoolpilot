// ABOUTME: Inventory Status Report Page wrapper for routing
// ABOUTME: Provides routing access to the InventoryStatusReport component

import React from 'react';
import InventoryStatusReport from '../library/InventoryStatusReport';

export const InventoryStatusReportPageContent: React.FC = () => {
  return <InventoryStatusReport />;
};
const InventoryStatusReportPage: React.FC = () => (
  <div className="space-y-3">
    <InventoryStatusReportPageContent />
  </div>
);

export default InventoryStatusReportPage;
