// ABOUTME: What a plugin says it needs access to, as lines an administrator can read. The details panel used to read a field
// ABOUTME: the privileges do not have, so every plugin was reported as needing no special permissions.

import { describe, expect, it } from 'vitest';

import { describePrivileges } from '../pluginPrivileges';

describe('describePrivileges', () => {
  it('lists nothing for a plugin that declares no privileges', () => {
    expect(describePrivileges(undefined)).toEqual([]);
    expect(describePrivileges({})).toEqual([]);
  });

  it('lists the collections a plugin can read and the ones it can write', () => {
    expect(describePrivileges({ dataRead: ['students', 'classes'], dataWrite: ['invoices'] })).toEqual([
      'Reads: students, classes',
      'Writes: invoices',
    ]);
  });

  it('says nothing of an empty list of collections', () => {
    expect(describePrivileges({ dataRead: [], dataWrite: [] })).toEqual([]);
  });

  it('lists each access it asks for', () => {
    expect(
      describePrivileges({
        uiInject: true,
        menuModify: true,
        settingsAccess: true,
        networkAccess: true,
        fileSystemAccess: true,
        executeCode: true,
      })
    ).toEqual([
      'Can add to the interface',
      'Can change the menu',
      'Can use the settings',
      'Can use the network',
      'Can read and write files',
      'Can run code it brings with it',
    ]);
  });

  it('leaves out an access that is declared false', () => {
    expect(describePrivileges({ networkAccess: false, uiInject: true })).toEqual(['Can add to the interface']);
  });
});
