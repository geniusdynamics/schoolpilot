// src/modules/academics/components/AuditTrailViewer.tsx

import React from 'react';
import { AuditLog } from '../data/types';

interface AuditTrailViewerProps {
  auditTrail: AuditLog[];
}

const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({ auditTrail }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold">Audit Trail</h3>
      <ul>
        {auditTrail.map((log, index) => (
          <li key={index}>
            {log.timestamp}: {log.action} by {log.user_id} (from {log.previous_state} to {log.new_state})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AuditTrailViewer;

