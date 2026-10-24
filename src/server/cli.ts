#!/usr/bin/env node
// ABOUTME: The hub's command line: serve the hub over TLS with an mDNS advertisement, issue or show
// ABOUTME: the LAN certificate, and discover hubs on the network without being told an address.

import { readFileSync } from 'node:fs';
import os from 'node:os';

import { CliUsageError, parseArgs, usage, type CliOptions } from './cliArgs';
import { LANServer } from './LANServer';
import { discoverHubs } from './discovery';
import { lanIpv4Addresses, mdnsHostName, mdnsLabel } from './network';
import { ensureHubCertificate, type HubCertificate } from './tls';

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof CliUsageError)) throw error;
    console.error(`hub: ${error.message}`);
    console.error();
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  switch (options.command) {
    case 'help':
      console.log(usage());
      return;
    case 'discover':
      await discover(options);
      return;
    case 'print-fingerprint':
      printCertificate(certificateFor(options));
      return;
    case 'serve':
      await serve(options);
      return;
  }
}

/** Runs the hub until it is stopped. */
async function serve(options: CliOptions): Promise<void> {
  const certificate = options.tls ? certificateFor(options) : null;

  if (!options.json) {
    console.log('SchoolPilot hub');
    console.log();
  }

  const server = new LANServer({
    port: options.port,
    dataDir: options.dataDir,
    host: options.host,
    ...(certificate ? { tls: { cert: certificate.certPem, key: certificate.keyPem } } : {}),
    discovery: {
      enabled: options.mdns,
      instanceName: mdnsLabel(options.name),
      hostName: mdnsHostName(options.name),
      port: options.mdnsPort,
    },
  });

  const stop = async (signal: string): Promise<void> => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void stop('SIGINT'));
  process.on('SIGTERM', () => void stop('SIGTERM'));

  await server.start();

  const status = server.getStatus();
  const scheme = status.protocol;
  const addresses = status.discovery?.addresses ?? lanIpv4Addresses();

  if (options.json) {
    console.log(
      JSON.stringify({
        url: server.url,
        port: status.port,
        protocol: status.protocol,
        tlsFingerprint: status.tlsFingerprint,
        certificateFile: certificate?.certFile ?? null,
        instanceName: status.discovery?.instanceName ?? null,
        hostName: status.discovery?.hostName ?? null,
        discoveryRunning: status.discovery?.running ?? false,
        addresses,
      })
    );
    return;
  }

  console.log();
  console.log(`  Open:        ${scheme}://${status.discovery?.hostName ?? 'localhost'}:${status.port}`);
  for (const address of addresses) {
    console.log(`               ${scheme}://${address}:${status.port}`);
  }
  console.log(`  Data:        ${status.databaseFile}`);
  console.log(`  Discovery:   ${status.discovery?.running ? status.discovery.hostName : 'off'}`);
  if (status.tlsFingerprint) {
    console.log(`  TLS:         ${status.tlsFingerprint}`);
    if (certificate?.certFile) console.log(`  Certificate: ${certificate.certFile}`);
  }
  console.log();
  console.log('Press Ctrl+C to stop');
}

/** Prints the hubs mDNS found. */
async function discover(options: CliOptions): Promise<void> {
  const hubs = await discoverHubs({
    timeoutMs: options.timeoutMs,
    port: options.mdnsPort,
    ...(options.discoverAddress ? { address: options.discoverAddress } : {}),
  });

  if (options.json) {
    console.log(JSON.stringify({ hubs }, null, 2));
    return;
  }

  if (hubs.length === 0) {
    console.log(`No hubs answered in ${options.timeoutMs} ms.`);
    console.log('A hub on this machine prints its address when it starts; on another machine, check');
    console.log('that port 5353 UDP is open between them.');
    return;
  }

  for (const hub of hubs) {
    console.log(`${hub.instanceName}  ${hub.url || `port ${hub.port}`}`);
    console.log(`  host:      ${hub.hostName}`);
    console.log(`  addresses: ${hub.addresses.join(', ') || 'none advertised'}`);
    console.log(`  tls:       ${hub.txt.tls === '1' ? 'on' : 'off'}`);
    if (hub.txt.fp) console.log(`  pin:       ${hub.txt.fp}`);
  }
}

/** The certificate the hub serves: the school's own, or one issued and stored here. */
function certificateFor(options: CliOptions): HubCertificate {
  if (options.tlsCert && options.tlsKey) {
    return ensureHubCertificate({
      dataDir: options.dataDir,
      provided: {
        certPem: readFileSync(options.tlsCert, 'utf8'),
        keyPem: readFileSync(options.tlsKey, 'utf8'),
      },
    });
  }

  const label = mdnsLabel(options.name);
  const machine = mdnsLabel(os.hostname());
  return ensureHubCertificate({
    dataDir: options.dataDir,
    commonName: `${label}.local`,
    // Both names a client may use: the one the hub advertises, and this machine's own.
    dnsNames: [`${label}.local`, `${machine}.local`, 'schoolpilot.local', 'localhost'],
    ipAddresses: ['127.0.0.1', ...lanIpv4Addresses()],
  });
}

/** Prints what a client needs to trust this hub. */
function printCertificate(certificate: HubCertificate): void {
  console.log(
    JSON.stringify(
      {
        fingerprint256: certificate.fingerprint256,
        sha256: certificate.sha256,
        certFile: certificate.certFile,
        keyFile: certificate.keyFile,
        fingerprintFile: certificate.fingerprintFile,
        notBefore: certificate.notBefore,
        notAfter: certificate.notAfter,
        subjectAlternativeNames: certificate.subjectAlternativeNames,
        source: certificate.source,
      },
      null,
      2
    )
  );
}

void main();
