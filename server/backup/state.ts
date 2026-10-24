// ABOUTME: The backup service's small state file: when the last automatic, manual, restore and
// ABOUTME: drill ran, the last failure, written atomically so a crash cannot leave half a file.

import fs from 'node:fs';
import path from 'node:path';

import type { BackupState } from './types';

/**
 * Reads the state file.
 *
 * An absent, unreadable or malformed file reads as empty state: the archives are the source of
 * truth for what exists, and losing this bookkeeping must not stop a hub from taking the next
 * backup. An unreadable file is reported by the caller through the status, not thrown here.
 */
export async function readBackupState(file: string): Promise<BackupState> {
  let text: string;
  try {
    text = await fs.promises.readFile(file, 'utf8');
  } catch {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as BackupState;
  } catch {
    return {};
  }
}

/** Writes the state file through a temporary sibling and a rename. */
export async function writeBackupState(file: string, state: BackupState): Promise<void> {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await fs.promises.rename(temporary, file);
}
