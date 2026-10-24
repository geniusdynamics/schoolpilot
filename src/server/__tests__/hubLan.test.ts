// ABOUTME: The hub as a client meets it on a LAN: HTTPS with a pinned certificate, the well-known
// ABOUTME: descriptor, and an mDNS advertisement that a browse finds without being told an address.

import fs from 'node:fs';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import dgram from 'node:dgram';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { LANServer } from '@/server/LANServer';
import { discoverHubs, SCHOOLPILOT_SERVICE } from '@/server/discovery';
import { ensureHubCertificate, type HubCertificate } from '@/server/tls';

let workDir: string;
let hub: LANServer;
let certificate: HubCertificate;
let port: number;
let mdnsPort: number;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-lan-'));
  certificate = ensureHubCertificate({
    dataDir: path.join(workDir, 'data'),
    commonName: 'testhub.local',
    dnsNames: ['testhub.local'],
    ipAddresses: ['127.0.0.1'],
  });
  mdnsPort = await freeUdpPort();

  hub = new LANServer({
    dataDir: path.join(workDir, 'data'),
    port: 0,
    host: '127.0.0.1',
    tls: { cert: certificate.certPem, key: certificate.keyPem },
    discovery: {
      enabled: true,
      instanceName: 'testhub',
      hostName: 'testhub.local',
      port: mdnsPort,
      addresses: ['127.0.0.1'],
    },
  });
  await hub.start();
  port = hub.getStatus().port;
});

afterAll(async () => {
  await hub.stop();
  await fs.promises.rm(workDir, { recursive: true, force: true });
});

describe('the hub on a LAN', () => {
  it('serves its status over TLS to a client that pins the certificate', async () => {
    const answer = await getJson(`https://testhub.local:${port}/health`, certificate.certPem);

    expect(answer.status).toBe(200);
    expect(answer.fingerprint).toBe(certificate.fingerprint256);
    expect(answer.body).toMatchObject({
      running: true,
      protocol: 'https',
      tlsFingerprint: certificate.fingerprint256,
      discovery: {
        service: SCHOOLPILOT_SERVICE,
        instanceName: 'testhub',
        hostName: 'testhub.local',
        running: true,
      },
    });
  });

  it('says what it is at the well-known address a client found it by', async () => {
    const answer = await getJson(
      `https://testhub.local:${port}/.well-known/schoolpilot-hub`,
      certificate.certPem
    );

    expect(answer.body).toMatchObject({
      service: SCHOOLPILOT_SERVICE,
      protocolVersion: 1,
      protocol: 'https',
      instanceName: 'testhub',
      hostName: 'testhub.local',
      tlsFingerprint: certificate.fingerprint256,
    });
  });

  it('is found by a browse that was told no address, only the service type', async () => {
    const hubs = await discoverHubs({ address: '127.0.0.1', port: mdnsPort, timeoutMs: 1500 });
    const found = hubs.find((entry) => entry.instanceName === 'testhub');

    expect(found).toBeDefined();
    expect(found?.hostName).toBe('testhub.local');
    expect(found?.port).toBe(port);
    expect(found?.addresses).toEqual(['127.0.0.1']);
    expect(found?.url).toBe(`https://testhub.local:${port}`);
    expect(found?.txt.tls).toBe('1');
    expect(found?.txt.fp).toBe(certificate.sha256);
  });

  it('reports the URL a staff member types', () => {
    expect(hub.url).toBe(`https://testhub.local:${port}`);
  });

  it('serves plain HTTP and advertises nothing when it was not asked to', async () => {
    const bare = new LANServer({ dataDir: path.join(workDir, 'bare'), port: 0, host: '127.0.0.1' });
    await bare.start();
    try {
      const status = bare.getStatus();
      expect(status.protocol).toBe('http');
      expect(status.tlsFingerprint).toBeNull();
      expect(status.discovery).toBeNull();

      const answer = await new Promise<{ status: number }>((resolve, reject) => {
        const request = httpGet(`http://127.0.0.1:${status.port}/health`, (res) => {
          res.resume();
          resolve({ status: res.statusCode ?? 0 });
        });
        request.on('error', reject);
      });
      expect(answer.status).toBe(200);
    } finally {
      await bare.stop();
    }
  });
});

/** Reads JSON over TLS, pinning the certificate the way a client that was given the PEM does. */
async function getJson(
  url: string,
  ca: string
): Promise<{ status: number; body: Record<string, unknown>; fingerprint: string }> {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const request = httpsGet(
      {
        // Connect to the loopback address but present and verify the advertised name, which is what
        // a client on the LAN does once mDNS has resolved it.
        host: '127.0.0.1',
        port: Number(target.port),
        path: target.pathname,
        servername: target.hostname,
        ca,
      },
      (res) => {
        // Read the peer certificate now: the socket is released by the time the body ends.
        const fingerprint = (res.socket as import('node:tls').TLSSocket)
          .getPeerCertificate()
          .fingerprint256;
        let text = '';
        res.on('data', (chunk: Buffer) => (text += chunk.toString()));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: JSON.parse(text) as Record<string, unknown>,
            fingerprint,
          });
        });
      }
    );
    request.on('error', reject);
    request.end();
  });
}

async function freeUdpPort(): Promise<number> {
  const socket = dgram.createSocket('udp4');
  const port = await new Promise<number>((resolve, reject) => {
    socket.once('error', reject);
    socket.bind(0, '0.0.0.0', () => {
      const address = socket.address();
      resolve(typeof address === 'string' ? 0 : address.port);
    });
  });
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  return port;
}
