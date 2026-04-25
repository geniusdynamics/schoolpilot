// ABOUTME: Horizontal bar chart showing conversion funnel stages
// ABOUTME: Displays stages from Pending through Withdrawn with percentages

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { FunnelStage } from '../data/types';

interface ConversionFunnelChartProps {
  data: FunnelStage[];
  title?: string;
}

const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({
  data,
  title = 'All Academic Years',
}) => {
  return (
    <div className="w-full h-[400px]">
      {title && (
        <h3 className="text-center text-sm font-semibold text-gray-600 mb-2">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 60, left: 80, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} domain={[0, 'auto']} />
          <YAxis
            dataKey="stage"
            type="category"
            tick={{ fontSize: 11, fill: '#374151' }}
            width={70}
            interval={0}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} (${props.payload.percentage}%)`,
              props.payload.stage,
            ]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
            <LabelList
              dataKey="count"
              position="right"
              formatter={(value: number, entry: any) => `${entry.percentage}% ${value}`}
              style={{ fontSize: '11px', fill: '#374151', fontWeight: 500 }}
            />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConversionFunnelChart;
