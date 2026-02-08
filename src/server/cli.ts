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
 *   --port, -p      Port to run on (default: 3000)
 *   --data-dir, -d  Data directory (default: ./data)
 *   --host, -h      Host to bind to (default: 0.0.0.0)
 */

import { LANServer } from './LANServer';

// Parse command line arguments
function parseArgs(): { port: number; dataDir: string; host: string } {
  const args = process.argv.slice(2);
  
  let port = 3000;
  let dataDir = './data';
  let host = '0.0.0.0';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--port':
      case '-p':
        if (nextArg) {
          port = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--data-dir':
      case '-d':
        if (nextArg) {
          dataDir = nextArg;
          i++;
        }
        break;
      case '--host':
      case '-h':
        if (nextArg) {
          host = nextArg;
          i++;
        }
        break;
    }
  }

  return { port, dataDir, host };
}

async function main() {
  const { port, dataDir, host } = parseArgs();

  console.log('╔════════════════════════════════════════╗');
  console.log('║     SchoolPilot LAN Server             ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();

  const server = new LANServer({ port, dataDir, host });

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
    console.log(`  Port: ${port}`);
    console.log(`  Data Directory: ${dataDir}`);
    console.log(`  Host: ${host}`);
    console.log();
    console.log('Press Ctrl+C to stop');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
