// ABOUTME: Donut chart showing Declined vs Enrolled post-admissions status
// ABOUTME: Displays total count in center with percentage breakdown

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PostAdmissionsDonutProps {
  declined: number;
  enrolled: number;
  title?: string;
}

const COLORS = ['#D0021B', '#4ECDC4']; // Red for Declined, Cyan for Enrolled

const PostAdmissionsDonut: React.FC<PostAdmissionsDonutProps> = ({
  declined,
  enrolled,
  title = 'Post-Admissions',
}) => {
  const total = declined + enrolled;
  const data = [
    { name: 'Declined', value: declined, percentage: total > 0 ? Math.round((declined / total) * 100) : 0 },
    { name: 'Enrolled', value: enrolled, percentage: total > 0 ? Math.round((enrolled / total) * 100) : 0 },
  ];

  return (
    <div className="w-full h-[280px]">
      {title && (
        <h3 className="text-center text-sm font-semibold text-surface-muted-fg mb-2">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} (${props.payload.percentage}%)`,
              name,
            ]}
          />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-2xl font-bold fill-gray-700"
          >
            {total}
          </text>
          <Legend
            verticalAlign="bottom"
            height={20}
            iconType="circle"
            formatter={(value: string, entry: any) => (
              <span style={{ color: entry.color, fontSize: '12px' }}>
                {value} ({entry.payload.percentage}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PostAdmissionsDonut;
