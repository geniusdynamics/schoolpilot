// ABOUTME: The hub CLI's argument parser, separated from the CLI so every flag has a test: the
// ABOUTME: listen options, the TLS and discovery switches, and the two operator subcommands.

import os from 'node:os';

/** What the CLI was asked to do. */
export type CliCommand = 'serve' | 'discover' | 'print-fingerprint' | 'help';

export interface CliOptions {
  readonly command: CliCommand;
  readonly port: number;
  readonly dataDir: string;
  readonly host: string;
  /** Whether the hub serves TLS; on by default, because a LAN is not a trusted network. */
  readonly tls: boolean;
  /** A certificate the school brought instead of one issued here. */
  readonly tlsCert: string | null;
  readonly tlsKey: string | null;
  /** The file the restricted-data key is read from; null means `<dataDir>/keys/restricted-data.key`. */
  readonly restrictedKeyFile: string | null;
  /** Where archives go; null means `<dataDir>/backups`. */
  readonly backupDir: string | null;
  /** A file holding the backup passphrase; null means the environment variable. */
  readonly backupKeyFile: string | null;
  /** The backup passphrase itself; null means `SCHOOLPILOT_BACKUP_PASSPHRASE`. */
  readonly backupPassphrase: string | null;
  /** The daily backup time in UTC, `HH:MM`; null means `02:00`. */
  readonly dailyAt: string | null;
  /** Whether the automatic backup and its endpoints run; on by default. */
  readonly backups: boolean;
  /** An archive to restore before the hub opens its database; null means no restore. */
  readonly restoreFrom: string | null;
  /** Where a restore writes `schoolpilot.db`; null means the data directory. */
  readonly restoreTo: string | null;
  /** Whether to publish the hub over mDNS; on by default. */
  readonly mdns: boolean;
  /** The mDNS instance label; defaults to the machine's name. */
  readonly name: string;
  readonly mdnsPort: number;
  /** Where `discover` sends its query; null means the multicast group. */
  readonly discoverAddress: string | null;
  readonly timeoutMs: number;
  readonly json: boolean;
}

/** A usage mistake: the message is what the operator is told to fix. */
export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

const DEFAULT_PORT = 3000;
const DEFAULT_DATA_DIR = './data';
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_MDNS_PORT = 5353;
const DEFAULT_DISCOVERY_TIMEOUT_MS = 3000;

/**
 * Parses the hub's arguments.
 *
 * `-h` is the host, not help, because that is what this CLI has always meant by it; `--help` is the
 * usage text.
 */
export function parseArgs(argv: readonly string[], machineName: string = os.hostname()): CliOptions {
  let command: CliCommand = 'serve';
  let port = DEFAULT_PORT;
  let dataDir = DEFAULT_DATA_DIR;
  let host = DEFAULT_HOST;
  let tls = true;
  let tlsCert: string | null = null;
  let tlsKey: string | null = null;
  let restrictedKeyFile: string | null = null;
  let backupDir: string | null = null;
  let backupKeyFile: string | null = null;
  let backupPassphrase: string | null = null;
  let dailyAt: string | null = null;
  let backups = true;
  let restoreFrom: string | null = null;
  let restoreTo: string | null = null;
  let mdns = true;
  let name = machineName;
  let mdnsPort = DEFAULT_MDNS_PORT;
  let discoverAddress: string | null = null;
  let timeoutMs = DEFAULT_DISCOVERY_TIMEOUT_MS;
  let json = false;

  const next = (index: number, flag: string): string => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new CliUsageError(`${flag} needs a value`);
    }
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index] ?? '';
    switch (flag) {
      case '--port':
      case '-p':
        port = integer(next(index, flag), flag);
        index += 1;
        break;
      case '--data-dir':
      case '-d':
        dataDir = next(index, flag);
        index += 1;
        break;
      case '--host':
      case '-h':
        host = next(index, flag);
        index += 1;
        break;
      case '--tls':
        tls = true;
        break;
      case '--no-tls':
        tls = false;
        break;
      case '--tls-cert':
        tlsCert = next(index, flag);
        tls = true;
        index += 1;
        break;
      case '--tls-key':
        tlsKey = next(index, flag);
        tls = true;
        index += 1;
        break;
      case '--restricted-key-file':
        restrictedKeyFile = next(index, flag);
        index += 1;
        break;
      case '--backup-dir':
        backupDir = next(index, flag);
        index += 1;
        break;
      case '--backup-key-file':
        backupKeyFile = next(index, flag);
        index += 1;
        break;
      case '--backup-passphrase':
        backupPassphrase = next(index, flag);
        index += 1;
        break;
      case '--daily-at':
        dailyAt = next(index, flag);
        index += 1;
        break;
      case '--no-backups':
        backups = false;
        break;
      case '--restore-from':
        restoreFrom = next(index, flag);
        index += 1;
        break;
      case '--restore-to':
        restoreTo = next(index, flag);
        index += 1;
        break;
      case '--mdns':
        mdns = true;
        break;
      case '--no-mdns':
        mdns = false;
        break;
      case '--name':
        name = next(index, flag);
        index += 1;
        break;
      case '--mdns-port':
        mdnsPort = integer(next(index, flag), flag);
        index += 1;
        break;
      case '--address':
        discoverAddress = next(index, flag);
        index += 1;
        break;
      case '--timeout':
        timeoutMs = integer(next(index, flag), flag);
        index += 1;
        break;
      case '--json':
        json = true;
        break;
      case '--discover':
        command = 'discover';
        break;
      case '--print-fingerprint':
        command = 'print-fingerprint';
        break;
      case '--help':
        command = 'help';
        break;
      default:
        throw new CliUsageError(`unknown argument "${flag}"`);
    }
  }

  if ((tlsCert === null) !== (tlsKey === null)) {
    throw new CliUsageError('--tls-cert and --tls-key must be given together');
  }
  if (port < 0 || port > 65535) throw new CliUsageError('--port must be between 0 and 65535');
  if (mdnsPort < 1 || mdnsPort > 65535) {
    throw new CliUsageError('--mdns-port must be between 1 and 65535');
  }
  if (timeoutMs < 100) throw new CliUsageError('--timeout must be at least 100 ms');

  return {
    command,
    port,
    dataDir,
    host,
    tls,
    tlsCert,
    tlsKey,
    restrictedKeyFile,
    backupDir,
    backupKeyFile,
    backupPassphrase,
    dailyAt,
    backups,
    restoreFrom,
    restoreTo,
    mdns,
    name,
    mdnsPort,
    discoverAddress,
    timeoutMs,
    json,
  };
}

/** The usage text the CLI prints for `--help` and after a usage mistake. */
export function usage(): string {
  return [
    'SchoolPilot hub',
    '',
    'Usage:',
    '  tsx src/server/cli.ts [options]                 serve the hub',
    '  tsx src/server/cli.ts --discover [options]      find hubs on this LAN',
    '  tsx src/server/cli.ts --print-fingerprint       issue or show the TLS certificate',
    '',
    'Serve options:',
    '  -p, --port <n>        port to listen on (default 3000)',
    '  -d, --data-dir <dir>  database and TLS material (default ./data)',
    '  -h, --host <addr>     address to bind (default 0.0.0.0)',
    '      --tls             serve HTTPS with the stored certificate (default)',
    '      --no-tls          serve plain HTTP; only for a loopback development box',
    '      --tls-cert <file> --tls-key <file>   serve a certificate the school brought',
    '      --restricted-key-file <file>   read the restricted-data key from this file',
    '      --backup-dir <dir>   where encrypted archives go (default <data-dir>/backups)',
    '      --backup-key-file <file>   a file holding the backup passphrase',
    '      --backup-passphrase <text>   the backup passphrase (prefer the environment variable)',
    '      --daily-at <HH:MM>   daily backup time in UTC (default 02:00)',
    '      --no-backups      turn the automatic backup and its endpoints off',
    '      --restore-from <file>   restore this archive before opening the database',
    '      --restore-to <dir>   where a restore writes schoolpilot.db (default the data directory)',
    '      --mdns            advertise over mDNS (default)',
    '      --no-mdns         do not advertise',
    '      --name <label>    mDNS name, resolvable as <label>.local (default: this machine)',
    '      --mdns-port <n>   mDNS UDP port (default 5353)',
    '      --json            print one JSON line describing the running hub',
    '',
    'Discover options:',
    '      --address <addr>  query one address instead of the multicast group',
    '      --timeout <ms>    how long to listen (default 3000)',
    '      --json            machine-readable output',
  ].join('\n');
}

function integer(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new CliUsageError(`${flag} needs an integer, received "${value}"`);
  return parsed;
}
