// src/modules/academics/services/ResultApprovalStateMachine.ts

import { ResultApprovalEntity, ResultState, AuditLog } from '../data/types';

export class ResultApprovalStateMachine {
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

import { GradingEngineService } from './GradingEngineService';

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

    if (newState === ResultState.APPROVED) {
      const educationSystem = {}; // Placeholder for the actual education system
      const gradingEngine = new GradingEngineService(educationSystem as any);
      gradingEngine.calculateGrades(this.entity.result as any);
    }
  }
}

