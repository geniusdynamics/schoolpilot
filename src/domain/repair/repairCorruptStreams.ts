// ABOUTME: Repair tool for corrupt class streams (SO-06): streams stored without a name or class_id.
// ABOUTME: Plans which students must be reassigned, then reassigns them before deleting each corrupt stream.

export interface StreamRecord {
  id: string;
  name?: string | null;
  class_id?: string | null;
  [key: string]: unknown;
}

export interface StudentStreamRecord {
  id: string;
  current_class_stream_id?: string | null;
  class_stream_id?: string | null;
  [key: string]: unknown;
}

export interface CorruptStreamEntry {
  stream: StreamRecord;
  /** Students still assigned to this stream; they must be moved before it can be deleted. */
  studentIds: string[];
}

export interface CorruptStreamRepairPlan {
  corrupt: CorruptStreamEntry[];
  /** Streams with both a name and a class, usable as reassignment targets. */
  validTargets: StreamRecord[];
  studentsToReassign: number;
}

export interface CorruptStreamRepairDeps {
  updateStudent: (studentId: string, patch: { current_class_stream_id: string }) => Promise<unknown>;
  deleteStream: (streamId: string) => Promise<unknown>;
}

export interface CorruptStreamRepairResult {
  deleted: string[];
  reassigned: number;
  /** Corrupt streams left in place because their students had no valid reassignment target. */
  skipped: string[];
}

const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || String(value).trim() === '';

/** A stream is corrupt when it has no usable name or is not attached to a class. */
export function isCorruptStream(stream: Partial<StreamRecord>): boolean {
  return isBlank(stream.name) || isBlank(stream.class_id);
}

const studentStreamId = (student: StudentStreamRecord): string | null => {
  const raw = student.current_class_stream_id ?? student.class_stream_id;
  return isBlank(raw) ? null : String(raw);
};

/** Lists corrupt streams with the students assigned to each, and the valid streams they can move to. */
export function planCorruptStreamRepair(
  streams: StreamRecord[],
  students: StudentStreamRecord[],
): CorruptStreamRepairPlan {
  const corrupt = streams
    .filter(isCorruptStream)
    .map(stream => ({
      stream,
      studentIds: students
        .filter(student => studentStreamId(student) === String(stream.id))
        .map(student => String(student.id)),
    }));
  const validTargets = streams.filter(stream => !isCorruptStream(stream));
  const studentsToReassign = corrupt.reduce((sum, entry) => sum + entry.studentIds.length, 0);
  return { corrupt, validTargets, studentsToReassign };
}

/**
 * Executes a repair plan. `reassignments` maps a corrupt stream id to the valid stream its students move to.
 * A corrupt stream that still has students and no valid target is skipped, never deleted.
 */
export async function applyCorruptStreamRepair(
  plan: CorruptStreamRepairPlan,
  reassignments: Record<string, string | undefined>,
  deps: CorruptStreamRepairDeps,
): Promise<CorruptStreamRepairResult> {
  const validIds = new Set(plan.validTargets.map(stream => String(stream.id)));
  const result: CorruptStreamRepairResult = { deleted: [], reassigned: 0, skipped: [] };

  for (const entry of plan.corrupt) {
    const streamId = String(entry.stream.id);
    if (entry.studentIds.length > 0) {
      const target = reassignments[streamId];
      if (!target || !validIds.has(target)) {
        result.skipped.push(streamId);
        continue;
      }
      for (const studentId of entry.studentIds) {
        await deps.updateStudent(studentId, { current_class_stream_id: target });
        result.reassigned += 1;
      }
    }
    await deps.deleteStream(streamId);
    result.deleted.push(streamId);
  }

  return result;
}
