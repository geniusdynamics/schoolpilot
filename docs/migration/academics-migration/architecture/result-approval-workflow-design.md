# ResultApprovalWorkflow Design with State Machine and Audit Trail

**Date**: January 26, 2025  
**Phase**: 5 - Architecture Design for Missing Capabilities  
**Dependencies**: Phase 3 mapping results  
**Status**: Design Complete ✅

## 1. Executive Summary

This document outlines the architecture for the **ResultApprovalWorkflow**, utilizing a state machine to manage result approval processes, with a detailed audit trail for compliance and accountability.

## 2. Core Architecture

### 2.1 Workflow States

```typescript
enum ResultState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  REVIEWED = 'Reviewed',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PUBLISHED = 'Published'
}
```

### 2.2 ResultApprovalEntity

```typescript
interface ResultApprovalEntity {
  id: string;
  result_id: string;
  state: ResultState;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  audit_trail: AuditLog[];
}

interface AuditLog {
  timestamp: string;
  user_id: string;
  action: string;
  previous_state: ResultState;
  new_state: ResultState;
}
```

## 3. Workflow Management

### 3.1 State Machine Implementation

```typescript
class ResultApprovalStateMachine {
  private currentState: ResultState;
  private entity: ResultApprovalEntity;

  constructor(entity: ResultApprovalEntity) {
    this.entity = entity;
    this.currentState = entity.state;
  }

  transition(newState: ResultState, userId: string): boolean {
    if (this.canTransition(newState)) {
      this.updateState(newState, userId);
      this.logAuditTrail(userId, newState);
      return true;
    }
    return false;
  }

  private canTransition(newState: ResultState): boolean {
    const validTransitions: Record<ResultState, ResultState[]> = {
      [ResultState.DRAFT]: [ResultState.SUBMITTED],
      [ResultState.SUBMITTED]: [ResultState.REVIEWED, ResultState.REJECTED],
      [ResultState.REVIEWED]: [ResultState.APPROVED, ResultState.REJECTED],
      [ResultState.APPROVED]: [ResultState.PUBLISHED],
      [ResultState.REJECTED]: [ResultState.DRAFT],
      [ResultState.PUBLISHED]: [],
    };
    return validTransitions[this.currentState].includes(newState);
  }

  private updateState(newState: ResultState, userId: string) {
    this.currentState = newState;
    this.entity.updated_at = new Date().toISOString();
    this.entity.updated_by = userId;
  }

  private logAuditTrail(userId: string, newState: ResultState) {
    const log: AuditLog = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      action: `Transitioned to ${newState}`,
      previous_state: this.entity.state,
      new_state: newState
    };
    this.entity.audit_trail.push(log);
    this.entity.state = newState;
  }
}
```

## 4. Integration with Existing Systems

### 4.1 Data Flow

1. **Result Submission**: Initiate workflow with draft state.
2. **State Transitions**: Allow users to transition states within permitted paths.
3. **Audit Logging**: Automatic on each state transition for transparency.

### 4.2 Integration Points
- Embed workflow within `StudentExamResults` to guide approval process.

## 5. Challenges and Considerations

- Managing complex approvals across departments.
- Handling disputes with role-based transitions.

This architecture provides a structured and auditable approach to approving academic results, supporting compliance and transparency.

<citations>
<document>
<document_type>RULE</document_type>
<document_id>8viBk1SCnMHtLO8Bx9ECg1</document_id>
</document>
<document>
<document_type>WARP_DRIVE_NOTEBOOK</document_type>
<document_id>IPIWz5VARmcBVOWCOjN9NE</document_id>
</document>
</citations>

