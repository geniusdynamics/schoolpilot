
import React from 'react';
import Card from '../../components/ui/Card';
import { ArchiveIcon } from '../../components/ui/icons';

const InventoryDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card title="Inventory & Procurement Dashboard">
        <div className="text-center py-12">
          <ArchiveIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Stores & Supplies Overview</h2>
          <p className="text-gray-500">
            Track school inventory, manage stock levels, handle requisitions, and streamline procurement processes.
          </p>
           <div className="mt-6">
            <span className="inline-block bg-sky-200 text-sky-800 text-sm font-semibold px-3 py-1 rounded-full">
              Key inventory metrics and summaries will appear here.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InventoryDashboardPage;
