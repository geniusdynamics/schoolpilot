import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { BarChartData } from '../../types'; // Changed from ChartData to BarChartData

interface BarChartProps {
  data: BarChartData[]; // Expecting { name: string, uv?: number, pv?: number ... }
  barColor?: string;
  title?: string;
  xAxisKey?: string; // Default 'name'
  // barDataKey is simplified here; for multiple bars, you'd map over an array of keys
  barDataKey?: string; // Example: 'uv' or 'pv'
  layout?: 'horizontal' | 'vertical';
  showLabelList?: boolean;
}

const HorizontalBarChart: React.FC<BarChartProps> = ({
  data,
  barColor = '#4A90E2',
  title,
  xAxisKey = "name",
  barDataKey = "uv", // Default to 'uv' if using BarChartData structure
  layout = "horizontal",
  showLabelList = false,
}) => {
  const yAxisWidth = Math.max(...data.map(d => d.name.length)) * 6 + 20; // Estimate Y-axis width

  return (
    <div style={{ width: '100%', height: 300 }}>
      {title && <h3 className="text-center text-md font-semibold text-gray-700 mb-2">{title}</h3>}
      <ResponsiveContainer>
        <RechartsBarChart 
            data={data} 
            layout={layout}
            margin={{ top: 5, right: 30, left: yAxisWidth > 100 ? yAxisWidth - 100 : 20 , bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {layout === 'horizontal' ? (
            <>
              <XAxis type="number" />
              <YAxis dataKey={xAxisKey} type="category" width={yAxisWidth} interval={0} />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} />
              <YAxis type="number" />
            </>
          )}
          <Tooltip />
          <Legend />
          <Bar dataKey={barDataKey} fill={barColor} name={barDataKey.charAt(0).toUpperCase() + barDataKey.slice(1)}>
            {showLabelList && <LabelList dataKey={barDataKey} position="right" />}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HorizontalBarChart;