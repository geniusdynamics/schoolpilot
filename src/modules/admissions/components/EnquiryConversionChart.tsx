// ABOUTME: Bar chart displaying monthly enquiries vs conversions
// ABOUTME: Uses orange for enquiries and blue for conversions per design reference

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyDataPoint } from '../data/types';

interface EnquiryConversionChartProps {
  data: MonthlyDataPoint[];
  title?: string;
}

const EnquiryConversionChart: React.FC<EnquiryConversionChartProps> = ({
  data,
  title = 'Enquiry & Conversion',
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
          <Legend
            verticalAlign="bottom"
            height={20}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
          <Bar
            dataKey="enquiries"
            name="Enquiry"
            fill="#F5A623"
            radius={[2, 2, 0, 0]}
            maxBarSize={30}
          />
          <Bar
            dataKey="conversions"
            name="Conversion"
            fill="#4A90E2"
            radius={[2, 2, 0, 0]}
            maxBarSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EnquiryConversionChart;
