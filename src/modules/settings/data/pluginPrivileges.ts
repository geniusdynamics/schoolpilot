// ABOUTME: What a plugin says it needs access to, as lines an administrator can read: the collections it reads and writes,
// ABOUTME: and each kind of access it asks for. It reports what the manifest declares; it does not enforce anything.

import type { PluginPrivileges } from '@/plugins/types';

const ACCESS_LINES: ReadonlyArray<readonly [keyof PluginPrivileges, string]> = [
  ['uiInject', 'Can add to the interface'],
  ['menuModify', 'Can change the menu'],
  ['settingsAccess', 'Can use the settings'],
  ['networkAccess', 'Can use the network'],
  ['fileSystemAccess', 'Can read and write files'],
  ['executeCode', 'Can run code it brings with it'],
];

export function describePrivileges(privileges: Partial<PluginPrivileges> | undefined): string[] {
  if (!privileges) return [];

  const lines: string[] = [];
  if (privileges.dataRead && privileges.dataRead.length > 0) lines.push(`Reads: ${privileges.dataRead.join(', ')}`);
  if (privileges.dataWrite && privileges.dataWrite.length > 0) lines.push(`Writes: ${privileges.dataWrite.join(', ')}`);
  for (const [key, line] of ACCESS_LINES) {
    if (privileges[key] === true) lines.push(line);
  }
  return lines;
}
