// ABOUTME: Test component to verify mock data path is working correctly
// ABOUTME: Displays the actual data from useAppData to confirm test markers are present

import React from 'react';
import { useAppData } from '@/contexts/AppDataContext';

const MockDataTest: React.FC = () => {
  const { data, loading, error } = useAppData();

  if (loading) {
    return <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">Loading data...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 border border-red-400 rounded">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 bg-blue-100 border border-blue-400 rounded">
      <h3 className="font-bold text-lg mb-2">🧪 Mock Data Test Results</h3>
      <div className="space-y-2">
        <div><strong>Academic:</strong> {JSON.stringify(data?.academic || 'No data')}</div>
        <div><strong>Administration:</strong> {JSON.stringify(data?.administration || 'No data')}</div>
        <div><strong>Finance:</strong> {JSON.stringify(data?.finance || 'No data')}</div>
        <div><strong>Inventory:</strong> {JSON.stringify(data?.inventory || 'No data')}</div>
        <div><strong>Library:</strong> {JSON.stringify(data?.library || 'No data')}</div>
        <div><strong>Nutrition:</strong> {JSON.stringify(data?.nutrition || 'No data')}</div>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        If you see test markers (🧪 MOCK DATA TEST), the mock data path is working correctly!
      </div>
    </div>
  );
};

export default MockDataTest;