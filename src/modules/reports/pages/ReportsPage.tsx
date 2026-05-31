// ABOUTME: All Reports landing page for the Reports module.
// ABOUTME: Provides a dashboard-style overview with KPIs, charts, and report category tabs.

import React, { useState } from 'react';
import Card from '@/components/ui/Card';

const reportTabs = [
  'Dashboards', 'Bank', 'Sales', 'Purchases', 'Items', 'General', 'Fixed Assets Register', 'Approver Setup', 'Employee Expenses'
];

const kpiData = [
  { type: 'Accounts Receivable', amount: 8532465.94, previous: 8473938.46, change: '+58.5K' },
  { type: 'Cash and Bank', amount: -3024156.29, previous: -3018029.29, change: '-6.13K' },
  { type: 'Cost of Sales', amount: -39.5, previous: 0, change: '-39.5' },
  { type: 'Creditors', amount: -510821.53, previous: -520943.00, change: '+10.1K' },
  { type: 'Fixed Assets', amount: -167970.24, previous: 167988.95, change: '-18.7' },
  { type: 'Gross Margin', amount: 0, previous: 0, change: '0.0' },
  { type: 'Gross Profit', amount: 92608.99, previous: 34881.94, change: '+57.7K' },
  { type: 'Net Profit (Loss)', amount: 89789.78, previous: 34863.23, change: '+54.9K' },
];

const summaryData = [
  { label: 'Accruals', value: 0 },
  { label: 'Administration Costs', value: 1635.5 },
  { label: 'Bank', value: 6127 },
  { label: 'Bank Loans', value: 76.46 },
  { label: 'Consulting Costs', value: 0 },
  { label: 'Depreciation', value: 18.71 },
  { label: 'Direct Costs', value: 39.5 },
];

const workingCapitalTrend = [
  { month: 'February', value: 12000000 },
  { month: 'April', value: 11000000 },
  { month: 'June', value: 12000000 },
  { month: 'August', value: 10000000 },
  { month: 'October', value: 9000000 },
  { month: 'December', value: 9000000 },
];

export const ReportsPageContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(reportTabs[0]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2 mb-4">
        {(reportTabs || []).map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all ${activeTab === tab ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'bg-white text-gray-600 hover:bg-blue-50'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* KPI Table and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Table */}
        <Card className="col-span-2">
          <h2 className="text-lg font-bold mb-2">CFO</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Type</th>
                <th className="text-right py-1">Amount</th>
                <th className="text-right py-1">Previous Period</th>
                <th className="text-right py-1">Change</th>
              </tr>
            </thead>
            <tbody>
              {(kpiData || []).map((kpi, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-1">{kpi.type}</td>
                  <td className="text-right py-1">{kpi.amount.toLocaleString()}</td>
                  <td className="text-right py-1">{kpi.previous.toLocaleString()}</td>
                  <td className="text-right py-1">{kpi.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        {/* Working Capital Trend Chart (placeholder) */}
        <Card>
          <h2 className="text-lg font-bold mb-2">Working Capital Trend</h2>
          <div className="h-56 flex items-end gap-2">
            {(workingCapitalTrend || []).map((item, idx) => (
              <div key={item.month} className="flex flex-col items-center justify-end h-full">
                <div
                  className="bg-blue-400 rounded-t w-8"
                  style={{ height: `${item.value / 1500000}px`, minHeight: '20px' }}
                  title={item.value.toLocaleString()}
                ></div>
                <span className="text-xs mt-1">{item.month}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-4">
        {(summaryData || []).map((item, idx) => (
          <Card key={item.label} className="flex flex-col items-center p-3">
            <span className="text-xs text-gray-500 mb-1">{item.label}</span>
            <span className="text-lg font-bold">{item.value.toLocaleString()}</span>
          </Card>
        ))}
      </div>
    </div>
  );
};
const ReportsPage: React.FC = () => (
  <div className="space-y-6">
    <ReportsPageContent />
  </div>
);

export default ReportsPage;
