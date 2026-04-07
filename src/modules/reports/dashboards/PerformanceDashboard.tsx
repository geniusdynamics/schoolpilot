// src/modules/reports/dashboards/PerformanceDashboard.tsx

import React from 'react';
import AcademicCharts from '@/components/AcademicCharts';

const PerformanceDashboard: React.FC = () => {
  const data = [
    { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
    { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold">Performance Dashboard</h2>
      <AcademicCharts data={data} />
    </div>
  );
};

export default PerformanceDashboard;

