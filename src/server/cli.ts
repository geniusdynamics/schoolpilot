#!/usr/bin/env node
/**
 * LAN Server CLI
 *
 * Command-line interface for starting the LAN server.
 *
 * Usage:
 *   npx tsx src/server/cli.ts [options]
 *
 * Options:
 *   --port, -p            Port to run on (default: 3000)
 *   --data-dir, -d        Data directory (default: ./data)
 *   --host, -h            Host to bind to (default: 0.0.0.0)
 *   --database-file       A different SQLite file (default: <data-dir>/schoolpilot.db)
 *   --backup-dir          Where archives go (default: <data-dir>/backups)
 *   --backup-key-file     A file holding the backup passphrase
 *   --backup-passphrase   The backup passphrase (prefer the environment variable)
 *   --daily-at            Daily backup time in UTC, HH:MM (default: 02:00)
 *   --no-backups          Turn the backup service and its endpoints off
 *   --restore-from        Restore this archive before the hub opens its database
 *   --restore-to          Where a restore writes schoolpilot.db (default: the data directory)
 *
 * The passphrase is also read from SCHOOLPILOT_BACKUP_PASSPHRASE, which keeps it out of the
 * process list. A key file must live outside the backup directory.
 */

import { LANServer, type LANServerBackupConfig } from './LANServer';

interface CliOptions {
  port: number;
  dataDir: string;
  host: string;
  databaseFile?: string;
  backupDir?: string;
  keyFile?: string;
  passphrase?: string;
  dailyAt?: string;
  backups: boolean;
  restoreFrom?: string;
  restoreTo?: string;
}

// Parse command line arguments
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  const options: CliOptions = {
    port: 3000,
    dataDir: './data',
    host: '0.0.0.0',
    backups: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--port':
      case '-p':
        if (nextArg) {
          options.port = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--data-dir':
      case '-d':
        if (nextArg) {
          options.dataDir = nextArg;
          i++;
        }
        break;
      case '--host':
      case '-h':
        if (nextArg) {
          options.host = nextArg;
          i++;
        }
        break;
      case '--database-file':
        if (nextArg) {
          options.databaseFile = nextArg;
          i++;
        }
        break;
      case '--backup-dir':
        if (nextArg) {
          options.backupDir = nextArg;
          i++;
        }
        break;
      case '--backup-key-file':
        if (nextArg) {
          options.keyFile = nextArg;
          i++;
        }
        break;
      case '--backup-passphrase':
        if (nextArg) {
          options.passphrase = nextArg;
          i++;
        }
        break;
      case '--daily-at':
        if (nextArg) {
          options.dailyAt = nextArg;
          i++;
        }
        break;
      case '--no-backups':
        options.backups = false;
        break;
      case '--restore-from':
        if (nextArg) {
          options.restoreFrom = nextArg;
          i++;
        }
        break;
      case '--restore-to':
        if (nextArg) {
          options.restoreTo = nextArg;
          i++;
        }
        break;
    }
  }

  return options;
}

/** The backup section of the hub config the CLI flags describe. */
function backupConfigOf(options: CliOptions): LANServerBackupConfig | false {
  if (!options.backups) return false;
  return {
    ...(options.backupDir !== undefined ? { directory: options.backupDir } : {}),
    ...(options.keyFile !== undefined ? { keyFile: options.keyFile } : {}),
    ...(options.passphrase !== undefined ? { passphrase: options.passphrase } : {}),
    ...(options.dailyAt !== undefined ? { dailyAt: options.dailyAt } : {}),
  };
}

async function main() {
  const options = parseArgs();

  console.log('╔════════════════════════════════════════╗');
  console.log('║     SchoolPilot LAN Server             ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();

  const server = new LANServer({
    port: options.port,
    dataDir: options.dataDir,
    host: options.host,
    backup: backupConfigOf(options),
    ...(options.databaseFile !== undefined ? { databaseFile: options.databaseFile } : {}),
    ...(options.restoreFrom !== undefined
      ? {
          restore: {
            from: options.restoreFrom,
            ...(options.restoreTo !== undefined ? { to: options.restoreTo } : {}),
          },
        }
      : {}),
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
    console.log();
    console.log(`Server Configuration:`);
    console.log(`  Port: ${server.address?.port ?? options.port}`);
    console.log(`  Data Directory: ${options.dataDir}`);
    console.log(`  Host: ${options.host}`);
    console.log(`  Database: ${server.databaseFile}`);
    console.log(`  Backups: ${options.backups ? 'enabled' : 'disabled'}`);
    console.log();
    console.log('Press Ctrl+C to stop');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
