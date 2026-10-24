// ABOUTME: The hub's LAN certificate proved as a client meets it: issued from node:crypto alone,
// ABOUTME: stored once and reused, renewed before expiry, and pinned by fingerprint over a handshake.

import { createServer as createHttpsServer, get as httpsGet } from 'node:https';
import { X509Certificate } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TLSSocket } from 'node:tls';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  certificatePaths,
  createSelfSignedCertificate,
  ensureHubCertificate,
  readHubCertificate,
} from '@/server/tls';

let workDir: string;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-tls-'));
});

afterAll(async () => {
  await fs.promises.rm(workDir, { recursive: true, force: true });
});

describe('a self-signed certificate', () => {
  it('is valid for the names it was asked for', () => {
    const issued = createSelfSignedCertificate({
      commonName: 'schoolpilot.local',
      dnsNames: ['stmarys.local', 'localhost'],
      ipAddresses: ['127.0.0.1', '192.168.1.20'],
    });

    expect(issued.subjectAlternativeNames).toEqual([
      'DNS:schoolpilot.local',
      'DNS:stmarys.local',
      'DNS:localhost',
      'IP:127.0.0.1',
      'IP:192.168.1.20',
    ]);

    const parsed = new X509Certificate(issued.certPem);
    expect(parsed.subjectAltName).toContain('DNS:stmarys.local');
    expect(parsed.subjectAltName).toContain('IP Address:192.168.1.20');
    expect(parsed.ca).toBe(false);
  });

  it('reports a fingerprint of the certificate it actually issued', () => {
    const issued = createSelfSignedCertificate({ commonName: 'schoolpilot.local' });
    const parsed = new X509Certificate(issued.certPem);
    expect(issued.fingerprint256).toBe(parsed.fingerprint256);
    expect(issued.sha256).toBe(parsed.fingerprint256.replace(/:/g, '').toLowerCase());
    expect(issued.sha256).toHaveLength(64);
  });

  it('never outlives the 397 days browsers accept', () => {
    const issued = createSelfSignedCertificate({ commonName: 'schoolpilot.local', days: 3650 });
    const days =
      (new Date(issued.notAfter).getTime() - new Date(issued.notBefore).getTime()) / 86_400_000;
    expect(days).toBeLessThanOrEqual(397);
  });

  it('refuses an IPv6 address it cannot encode, rather than writing a wrong one', () => {
    expect(() =>
      createSelfSignedCertificate({ commonName: 'schoolpilot.local', ipAddresses: ['::1'] })
    ).toThrow(/not an IPv4 address/);
  });
});

describe('the stored certificate', () => {
  it('is written once and reused on the next start', () => {
    const dataDir = path.join(workDir, 'reuse');
    const first = ensureHubCertificate({
      dataDir,
      commonName: 'stmarys.local',
      dnsNames: ['stmarys.local'],
      ipAddresses: ['127.0.0.1'],
    });
    const second = ensureHubCertificate({ dataDir, commonName: 'stmarys.local' });

    expect(first.source).toBe('generated');
    expect(second.fingerprint256).toBe(first.fingerprint256);
    expect(second.certFile).toBe(certificatePaths(dataDir).certFile);
    expect(fs.readFileSync(certificatePaths(dataDir).fingerprintFile, 'utf8').trim()).toBe(
      first.sha256
    );
    expect(readHubCertificate(dataDir)?.fingerprint256).toBe(first.fingerprint256);
  });

  it('reissues before it expires, because a client would otherwise be refused', () => {
    const dataDir = path.join(workDir, 'renew');
    const first = ensureHubCertificate({
      dataDir,
      commonName: 'stmarys.local',
      days: 10,
      ipAddresses: ['127.0.0.1'],
    });

    const renewed = ensureHubCertificate({ dataDir, commonName: 'stmarys.local', days: 397 });
    expect(renewed.source).toBe('renewed');
    expect(renewed.fingerprint256).not.toBe(first.fingerprint256);
    expect(new Date(renewed.notAfter).getTime()).toBeGreaterThan(Date.now() + 300 * 86_400_000);
  });

  it('uses a certificate the school brought and leaves it on disk alone', () => {
    const provided = createSelfSignedCertificate({
      commonName: 'hub.school.example',
      dnsNames: ['hub.school.example'],
    });
    const dataDir = path.join(workDir, 'provided');

    const hub = ensureHubCertificate({
      dataDir,
      provided: { certPem: provided.certPem, keyPem: provided.keyPem },
    });

    expect(hub.source).toBe('provided');
    expect(hub.fingerprint256).toBe(provided.fingerprint256);
    expect(hub.certFile).toBeNull();
    expect(fs.existsSync(certificatePaths(dataDir).certFile)).toBe(false);
  });

  it('keeps the private key readable only by its owner', () => {
    if (process.platform === 'win32') return; // Windows has no POSIX mode bits to assert.
    const dataDir = path.join(workDir, 'modes');
    ensureHubCertificate({ dataDir, commonName: 'stmarys.local' });
    const mode = fs.statSync(certificatePaths(dataDir).keyFile).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe('the hub over TLS', () => {
  it('completes a handshake a client can verify and pin', async () => {
    const issued = createSelfSignedCertificate({
      commonName: 'stmarys.local',
      dnsNames: ['stmarys.local'],
      ipAddresses: ['127.0.0.1'],
    });

    const server = createHttpsServer({ cert: issued.certPem, key: issued.keyPem }, (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('the test server has no port');

    try {
      const answer = await new Promise<{ status: number; fingerprint: string; body: string }>(
        (resolve, reject) => {
          // `ca` is the pin: the certificate is the only one this client accepts, and the host name
          // is checked against the SAN the way a browser checks it.
          const request = httpsGet(
            { host: '127.0.0.1', port: address.port, path: '/health', servername: 'stmarys.local', ca: issued.certPem },
            (res) => {
              // Read the peer certificate now: the socket is released by the time the body ends.
              const fingerprint = (res.socket as TLSSocket).getPeerCertificate().fingerprint256;
              let body = '';
              res.on('data', (chunk: Buffer) => (body += chunk.toString()));
              res.on('end', () => {
                resolve({ status: res.statusCode ?? 0, fingerprint, body });
              });
            }
          );
          request.on('error', reject);
          request.end();
        }
      );

      expect(answer.status).toBe(200);
      expect(answer.body).toBe('{"ok":true}');
      expect(answer.fingerprint).toBe(issued.fingerprint256);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('is refused by a client that does not trust it, which is why the fingerprint is published', async () => {
    const issued = createSelfSignedCertificate({ commonName: 'stmarys.local' });
    const server = createHttpsServer({ cert: issued.certPem, key: issued.keyPem }, (_req, res) => {
      res.writeHead(200);
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('the test server has no port');

    try {
      const failure = await new Promise<string>((resolve) => {
        const request = httpsGet(
          { host: '127.0.0.1', port: address.port, path: '/health' },
          () => resolve('unexpectedly accepted')
        );
        request.on('error', (error: Error) => resolve(error.message));
        request.end();
      });
      expect(failure).toMatch(/self-signed certificate|unable to verify/i);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
