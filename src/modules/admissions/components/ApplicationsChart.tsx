// ABOUTME: Bar chart showing application trends over time
// ABOUTME: Uses yellow/gold color scheme per design reference

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyDataPoint } from '../data/types';

interface ApplicationsChartProps {
  data: MonthlyDataPoint[];
  title?: string;
}

const ApplicationsChart: React.FC<ApplicationsChartProps> = ({
  data,
  title = 'Applications',
}) => {
  return (
    <div className="w-full h-[280px]">
      {title && (
        <h3 className="text-center text-sm font-semibold text-primary-600 mb-2">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#6B7280' }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={50}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          />
          <Bar
            dataKey="applications"
            name="Applicants"
            fill="#F5A623"
            radius={[2, 2, 0, 0]}
            maxBarSize={25}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center items-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[#F5A623]" />
          <span className="text-xs text-surface-muted-fg">Applicants</span>
        </div>
      </div>
    </div>
  );
};

export default ApplicationsChart;
