// ABOUTME: Conversion statistics table showing Pre and Post decision breakdown
// ABOUTME: Displays counts and percentages for each admission stage

import React from 'react';
import type { FunnelStage } from '../data/types';

interface ConversionTableProps {
  funnel: FunnelStage[];
  postAdmissions: {
    declined: number;
    enrolled: number;
    total: number;
  };
}

const ConversionTable: React.FC<ConversionTableProps> = ({
  funnel,
  postAdmissions,
}) => {
  // Separate pre-decision and post-decision stages
  const preDecisionStages = funnel.filter(
    stage => ['Pending', 'Applied'].includes(stage.stage)
  );
  const postDecisionStages = funnel.filter(
    stage => ['Admitted', 'Wait-listed', 'Declined', 'Enrolled', 'Graduated', 'Withdrawn'].includes(stage.stage)
  );

  const baseCount = preDecisionStages.find(s => s.stage === 'Pending')?.count || 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700 w-1/3">Status</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 w-1/3">Count</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 w-1/3">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {/* Pre-Decision Section */}
          <tr className="bg-gray-50">
            <td colSpan={3} className="py-2 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Pre-Decision
            </td>
          </tr>
          {preDecisionStages.map((stage, index) => (
            <tr key={stage.stage} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-gray-700">{stage.stage}</td>
              <td className="py-3 px-4 text-center text-blue-600 font-medium">
                {stage.count}
              </td>
              <td className="py-3 px-4 text-center text-gray-600">
                {stage.percentage}%
              </td>
            </tr>
          ))}

          {/* Post-Decision Section */}
          <tr className="bg-gray-50">
            <td colSpan={3} className="py-2 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Post-Decision
            </td>
          </tr>
          {postDecisionStages.map((stage) => (
            <tr key={stage.stage} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-gray-700">{stage.stage}</td>
              <td className="py-3 px-4 text-center text-blue-600 font-medium">
                {stage.count}
              </td>
              <td className="py-3 px-4 text-center text-gray-600">
                {stage.percentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConversionTable;
