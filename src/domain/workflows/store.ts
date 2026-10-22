// ABOUTME: The synchronous store ports of the workflow engine: the memory store a test and a
// ABOUTME: one-off session use, the browser-storage store a page uses, and the definition stores
// ABOUTME: a school keeps its own workflows in.

import type {
  WorkflowDefinition,
  WorkflowDefinitionStore,
  WorkflowRecordState,
  WorkflowStore,
  WorkflowTransitionEntry,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecordState(value: unknown): value is WorkflowRecordState {
  return (
    isRecord(value) &&
    typeof value.record_key === 'string' &&
    typeof value.workflow_key === 'string' &&
    typeof value.state === 'string'
  );
}

function isTransitionEntry(value: unknown): value is WorkflowTransitionEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.record_key === 'string' &&
    typeof value.to === 'string' &&
    typeof value.transition === 'string'
  );
}

/** A store that lives only as long as the process. */
export function createMemoryWorkflowStore(): WorkflowStore {
  const records = new Map<string, WorkflowRecordState>();
  let audit: WorkflowTransitionEntry[] = [];
  return {
    read: (recordKey) => records.get(recordKey) ?? null,
    write: (record) => {
      records.set(record.record_key, record);
    },
    readAudit: (recordKey) =>
      recordKey === undefined ? [...audit] : audit.filter((entry) => entry.record_key === recordKey),
    appendAudit: (entry) => {
      audit = [...audit, entry];
    },
    clear: () => {
      records.clear();
      audit = [];
    },
  };
}

/** A store kept in browser storage, keyed apart for the records and the audit trail. */
export function createStorageWorkflowStore(
  recordsKey: string,
  auditKey: string,
  storage?: Storage | null
): WorkflowStore {
  const resolve = (): Storage | null => {
    if (storage !== undefined) return storage;
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  };

  const readJson = (key: string): unknown => {
    const target = resolve();
    if (!target) return null;
    try {
      const raw = target.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const writeJson = (key: string, value: unknown): void => {
    const target = resolve();
    if (!target) return;
    try {
      target.setItem(key, JSON.stringify(value));
    } catch {
      // A blocked store must not break the page; the caller keeps working from memory.
    }
  };

  const readRecords = (): WorkflowRecordState[] => {
    const parsed = readJson(recordsKey);
    return Array.isArray(parsed) ? parsed.filter(isRecordState) : [];
  };

  const readEntries = (): WorkflowTransitionEntry[] => {
    const parsed = readJson(auditKey);
    return Array.isArray(parsed) ? parsed.filter(isTransitionEntry) : [];
  };

  return {
    read: (recordKey) => readRecords().find((record) => record.record_key === recordKey) ?? null,
    write: (record) => {
      const kept = readRecords().filter((candidate) => candidate.record_key !== record.record_key);
      writeJson(recordsKey, [...kept, record]);
    },
    readAudit: (recordKey) => {
      const entries = readEntries();
      return recordKey === undefined
        ? entries
        : entries.filter((entry) => entry.record_key === recordKey);
    },
    appendAudit: (entry) => writeJson(auditKey, [...readEntries(), entry]),
    clear: () => {
      writeJson(recordsKey, []);
      writeJson(auditKey, []);
    },
  };
}

/** A definition store that lives only as long as the process. */
export function createMemoryDefinitionStore(
  initial: readonly WorkflowDefinition[] = []
): WorkflowDefinitionStore {
  const definitions = new Map(initial.map((definition) => [definition.key, definition] as const));
  return {
    readAll: () => [...definitions.values()],
    read: (key) => definitions.get(key) ?? null,
    write: (definition) => {
      definitions.set(definition.key, definition);
    },
    remove: (key) => {
      definitions.delete(key);
    },
  };
}

/** A definition store kept in browser storage. */
export function createStorageDefinitionStore(
  key: string,
  storage?: Storage | null
): WorkflowDefinitionStore {
  const resolve = (): Storage | null => {
    if (storage !== undefined) return storage;
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  };

  const readAll = (): WorkflowDefinition[] => {
    const target = resolve();
    if (!target) return [];
    try {
      const raw = target.getItem(key);
      const parsed: unknown = raw === null ? null : JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter(
            (value): value is WorkflowDefinition =>
              isRecord(value) && typeof value.key === 'string' && Array.isArray(value.states)
          )
        : [];
    } catch {
      return [];
    }
  };

  const writeAll = (definitions: readonly WorkflowDefinition[]): void => {
    const target = resolve();
    if (!target) return;
    try {
      target.setItem(key, JSON.stringify(definitions));
    } catch {
      // A blocked store must not break the page.
    }
  };

  return {
    readAll,
    read: (definitionKey) => readAll().find((entry) => entry.key === definitionKey) ?? null,
    write: (definition) => {
      writeAll([...readAll().filter((entry) => entry.key !== definition.key), definition]);
    },
    remove: (definitionKey) => {
      writeAll(readAll().filter((entry) => entry.key !== definitionKey));
    },
  };
}
