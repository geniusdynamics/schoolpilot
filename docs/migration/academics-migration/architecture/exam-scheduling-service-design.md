# ExamScheduling Micro-Service Design with Timetable Conflict Detection

**Date**: January 26, 2025  
**Phase**: 5 - Architecture Design for Missing Capabilities  
**Dependencies**: Phase 3 mapping results  
**Status**: Design Complete ✅

## 1. Executive Summary

This document outlines the architecture for the **ExamScheduling** micro-service, built to manage exam timetabling and conflict detection within the broader educational system.

## 2. Micro-Service Architecture

### 2.1 Service Overview

The **ExamScheduling** micro-service will:
- Facilitate exam timetable creation and modification.
- Detect conflicts such as double-booking and overlapping schedules.
- Integrate existing timetable periods.
- Provide resource allocation for exam rooms and invigilators.

### 2.2 Core Components

- **ExamScheduleManager**: Manages the lifecycle of exam schedules, including CRUD operations.
- **ConflictDetectionEngine**: Ensures no conflicts in scheduling.
- **TimetableIntegration**: Leverages existing timetable periods for scheduling.

## 3. Component Breakdown

### 3.1 ExamScheduleManager

```typescript
interface ExamSchedule {
  id: string;
  exam_id: string;
  period_id: number;
  class_stream_id: number;
  invigilator_id: string;
  room_number: string;
  created_at: string;
  updated_at: string;
}

class ExamScheduleManager {
  create(schedule: ExamSchedule): Promise<ExamSchedule>;
  update(id: string, schedule: Partial<ExamSchedule>): Promise<ExamSchedule>;
  delete(id: string): Promise<void>;
  listByClassStream(class_stream_id: number): Promise<ExamSchedule[]>;
}
```

### 3.2 ConflictDetectionEngine

```typescript
class ConflictDetectionEngine {
  detect(schedule: ExamSchedule): Promise<string[]> {
    const conflicts = [];
    // Logic for detecting conflicts such as room or invigilator double-booking
    return Promise.resolve(conflicts);
  }
}
```

### 3.3 TimetableIntegration

```typescript
class TimetableIntegration {
  static getAvailablePeriods(class_stream_id: number, date: string): Promise<number[]> {
    // Logic for fetching available periods
    return Promise.resolve([]);
  }
}
```

## 4. Data Flow and Integration

### 4.1 Data Flows
- **Schedule Creation**: Starts with configuring a schedule using **ExamScheduleManager**.
- **Conflict Detection**: Conflicts checked against current schedules.
- **Timetable Integration**: Leverage existing **TimetablePeriodDefs**.

### 4.2 Integration with Existing Systems
Data points from the `academics` module such as existing timetable periods will be integrated to ensure accurate scheduling.

## 5. Example Workflow

1. Teacher or Admin enters scheduling request via UI.
2. **ExamScheduleManager** generates schedule.
3. **ConflictDetectionEngine** is invoked automatically.
4. Warnings or rejections for conflicts are returned.
5. Upon successful schedule, resources assigned for rooms and invigilators.

## 6. Configuration & UI Components

```typescript
// UX/UI
const ScheduleExamPage = () => {
  // Interface for creating and managing schedules.
};
```

## 7. Challenges and Considerations

- Handling peak exam season loads.
- Robust logging and reporting.

This service ensures careful management of exam scheduling and reduces manual oversight.

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

