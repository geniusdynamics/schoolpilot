// ABOUTME: Skeleton loading component for DataGrid and other data display components
// ABOUTME: Provides smooth loading states with shimmer animations

import React from 'react';

interface SkeletonLoaderProps {
  rows?: number;
  columns?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-3">
        {/* Header skeleton */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <div key={`header-${index}`} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
        
        {/* Row skeletons */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="h-4 bg-surface-accent rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonLoader;