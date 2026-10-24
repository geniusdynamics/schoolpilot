// ABOUTME: The hub CLI's flags proved where they are read: defaults, the TLS and discovery
// ABOUTME: switches, the operator subcommands, and the usage mistakes that must not start a hub.

import { describe, expect, it } from 'vitest';

import { CliUsageError, parseArgs, usage } from '@/server/cliArgs';

describe('hub arguments', () => {
  it('serves with TLS and discovery on by default', () => {
    const options = parseArgs([], 'DESKTOP-ABC');

    expect(options).toMatchObject({
      command: 'serve',
      port: 3000,
      dataDir: './data',
      host: '0.0.0.0',
      tls: true,
      tlsCert: null,
      tlsKey: null,
      mdns: true,
      name: 'DESKTOP-ABC',
      mdnsPort: 5353,
      timeoutMs: 3000,
      json: false,
    });
  });

  it('takes the listen options in both spellings', () => {
    expect(parseArgs(['--port', '8443', '--data-dir', '/var/lib/schoolpilot', '--host', '192.168.1.5']))
      .toMatchObject({ port: 8443, dataDir: '/var/lib/schoolpilot', host: '192.168.1.5' });
    expect(parseArgs(['-p', '9443', '-d', './hub', '-h', '127.0.0.1'])).toMatchObject({
      port: 9443,
      dataDir: './hub',
      host: '127.0.0.1',
    });
  });

  it('serves plain HTTP only when it is asked to', () => {
    expect(parseArgs(['--no-tls']).tls).toBe(false);
    expect(parseArgs(['--no-mdns']).mdns).toBe(false);
    expect(parseArgs(['--name', 'St Marys']).name).toBe('St Marys');
  });

  it('serves a certificate the school brought', () => {
    const options = parseArgs(['--tls-cert', '/etc/ssl/hub.pem', '--tls-key', '/etc/ssl/hub.key']);
    expect(options).toMatchObject({ tls: true, tlsCert: '/etc/ssl/hub.pem', tlsKey: '/etc/ssl/hub.key' });
  });

  it('refuses half a certificate pair', () => {
    expect(() => parseArgs(['--tls-cert', '/etc/ssl/hub.pem'])).toThrow(/must be given together/);
  });

  it('reads the discover subcommand and its options', () => {
    expect(parseArgs(['--discover', '--timeout', '1500', '--address', '192.168.1.20', '--json'])).toMatchObject({
      command: 'discover',
      timeoutMs: 1500,
      discoverAddress: '192.168.1.20',
      json: true,
    });
  });

  it('reads the fingerprint subcommand and help', () => {
    expect(parseArgs(['--print-fingerprint']).command).toBe('print-fingerprint');
    expect(parseArgs(['--help']).command).toBe('help');
  });

  it('reads the backup and restore flags', () => {
    expect(
      parseArgs([
        '--backup-dir',
        '/var/backups',
        '--backup-key-file',
        '/etc/schoolpilot/backup.key',
        '--backup-passphrase',
        'secret',
        '--daily-at',
        '21:30',
        '--restore-from',
        './archive.spbk',
        '--restore-to',
        './recovered',
      ])
    ).toMatchObject({
      backupDir: '/var/backups',
      backupKeyFile: '/etc/schoolpilot/backup.key',
      backupPassphrase: 'secret',
      dailyAt: '21:30',
      backups: true,
      restoreFrom: './archive.spbk',
      restoreTo: './recovered',
    });
  });

  it('runs backups by default and turns them off on request', () => {
    expect(parseArgs([], 'DESKTOP-ABC')).toMatchObject({
      backups: true,
      backupDir: null,
      backupKeyFile: null,
      backupPassphrase: null,
      dailyAt: null,
      restoreFrom: null,
      restoreTo: null,
    });
    expect(parseArgs(['--no-backups']).backups).toBe(false);
  });

  it('refuses a value it cannot use, naming the flag', () => {
    expect(() => parseArgs(['--port', 'http'])).toThrow(CliUsageError);
    expect(() => parseArgs(['--port', 'http'])).toThrow(/--port needs an integer/);
    expect(() => parseArgs(['--port', '70000'])).toThrow(/between 0 and 65535/);
    expect(() => parseArgs(['--mdns-port', '0'])).toThrow(/between 1 and 65535/);
    expect(() => parseArgs(['--timeout', '10'])).toThrow(/at least 100 ms/);
    expect(() => parseArgs(['--data-dir'])).toThrow(/--data-dir needs a value/);
    expect(() => parseArgs(['--frobnicate'])).toThrow(/unknown argument/);
  });

  it('documents every flag it accepts', () => {
    const text = usage();
    for (const flag of [
      '--port',
      '--data-dir',
      '--host',
      '--tls',
      '--mdns',
      '--name',
      '--discover',
      '--timeout',
      '--json',
      '--print-fingerprint',
      '--restricted-key-file',
      '--backup-dir',
      '--backup-key-file',
      '--backup-passphrase',
      '--daily-at',
      '--no-backups',
      '--restore-from',
      '--restore-to',
    ]) {
      expect(text).toContain(flag);
    }
  });
});
