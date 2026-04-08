import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  bgColor = '#e5e7eb',
  label,
  sublabel,
  className = '',
  showPercentage = true,
  animated = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  const getColor = (value: number) => {
    if (value >= 80) return '#10b981'; // emerald-500
    if (value >= 60) return '#3b82f6'; // blue-500
    if (value >= 40) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const activeColor = color || getColor(progress);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: animated ? 'stroke-dashoffset 1s ease-in-out' : undefined,
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage && (
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(progress)}%
            </span>
          )}
          {label && (
            <span className="text-xs text-gray-500 mt-0.5">{label}</span>
          )}
        </div>
      </div>
      
      {sublabel && (
        <p className="mt-2 text-sm text-gray-600 text-center">{sublabel}</p>
      )}
    </div>
  );
};

export default ProgressRing;
