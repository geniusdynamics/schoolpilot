import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartData } from '../../types'; 

interface DonutChartProps {
  data: ChartData[];
  colors?: string[];
  title?: string; 
  dataKey?: string; 
  nameKey?: string; 
  innerRadius?: number | string;
  outerRadius?: number | string;
  centerText?: () => React.ReactNode;
}

const DEFAULT_COLORS = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#BD10E0', '#9013FE'];

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  colors = DEFAULT_COLORS,
  title,
  dataKey = "value",
  nameKey = "name",
  innerRadius = "60%",
  outerRadius = "80%",
  centerText,
}) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
      {title && <h3 className="text-center text-md font-semibold text-surface-foreground mb-2">{title}</h3>}
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            fill="#8884d8"
            paddingAngle={data.length > 1 ? 2 : 0} // No padding if single item
            dataKey={dataKey}
            nameKey={nameKey}
            label={data.length > 1 ? (entry) => `${entry.name} (${entry.value})` : undefined}
            labelLine={data.length > 1}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          {centerText && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-current text-surface-foreground">
              {centerText()}
            </text>
          )}
          <Tooltip />
          {data.length > 1 && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DonutChart;