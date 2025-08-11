// src/modules/academics/services/AuditTrailService.ts

import { ResultApprovalEntity, AuditLog } from '../data/types';

export class AuditTrailService {
  static getAuditTrail(entity: ResultApprovalEntity): AuditLog[] {
    return entity.audit_trail;
  }
}

