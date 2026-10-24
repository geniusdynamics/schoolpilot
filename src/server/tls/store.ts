// ABOUTME: The hub's TLS material on disk: the certificate it serves, the fingerprint clients pin
// ABOUTME: and the renewal rule that keeps a long-lived hub from serving an expired certificate.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';

import { createSelfSignedCertificate, MAX_CERTIFICATE_DAYS } from './selfSigned';

/** How long before expiry a hub issues itself a new certificate. */
export const DEFAULT_RENEW_BEFORE_DAYS = 30;

export interface HubCertificate {
  readonly keyPem: string;
  readonly certPem: string;
  readonly fingerprint256: string;
  readonly sha256: string;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly subjectAlternativeNames: readonly string[];
  /** Where the material came from: issued here, reissued here, or supplied by the operator. */
  readonly source: 'generated' | 'renewed' | 'provided';
  readonly certFile: string | null;
  readonly keyFile: string | null;
  readonly fingerprintFile: string | null;
}

export interface EnsureHubCertificateOptions {
  /** The directory the hub keeps its database in; the certificate lives in `<dataDir>/tls`. */
  readonly dataDir: string;
  /** The subject common name; defaults to `schoolpilot.local`. */
  readonly commonName?: string;
  readonly dnsNames?: readonly string[];
  readonly ipAddresses?: readonly string[];
  /** A certificate the operator brought: PEM contents, used as-is and never written to disk. */
  readonly provided?: { readonly certPem: string; readonly keyPem: string };
  readonly days?: number;
  readonly renewBeforeDays?: number;
  /** Issue a new certificate even when the stored one is still valid. */
  readonly force?: boolean;
  readonly now?: Date;
}

/** The paths the hub's TLS material lives at. */
export function certificatePaths(dataDir: string): {
  directory: string;
  keyFile: string;
  certFile: string;
  fingerprintFile: string;
} {
  const directory = path.join(dataDir, 'tls');
  return {
    directory,
    keyFile: path.join(directory, 'hub-key.pem'),
    certFile: path.join(directory, 'hub-cert.pem'),
    fingerprintFile: path.join(directory, 'hub-fingerprint.txt'),
  };
}

/**
 * The certificate the hub should serve.
 *
 * An operator-supplied certificate is used exactly as given. Otherwise the stored pair is reused
 * while it is valid for at least `renewBeforeDays`, and reissued when it is not — a reissue changes
 * the fingerprint, so every client that pinned the old one has to pin again, which is why renewal
 * happens on a 397-day cycle rather than on every restart.
 */
export function ensureHubCertificate(options: EnsureHubCertificateOptions): HubCertificate {
  const now = options.now ?? new Date();

  if (options.provided) {
    return describe(options.provided, 'provided');
  }

  const paths = certificatePaths(options.dataDir);
  const stored = options.force === true ? null : readStored(paths.certFile, paths.keyFile, now);

  if (stored && validFor(stored, options.renewBeforeDays ?? DEFAULT_RENEW_BEFORE_DAYS, now)) {
    return { ...describe(stored, 'generated'), certFile: paths.certFile, keyFile: paths.keyFile, fingerprintFile: paths.fingerprintFile };
  }

  const issued = createSelfSignedCertificate({
    commonName: options.commonName ?? 'schoolpilot.local',
    dnsNames: options.dnsNames ?? [],
    ipAddresses: options.ipAddresses ?? [],
    days: options.days ?? MAX_CERTIFICATE_DAYS,
    now,
  });

  mkdirSync(paths.directory, { recursive: true });
  writeFileSync(paths.keyFile, issued.keyPem, { mode: 0o600 });
  writeFileSync(paths.certFile, issued.certPem, { mode: 0o644 });
  writeFileSync(paths.fingerprintFile, `${issued.sha256}\n`, { mode: 0o644 });

  return {
    ...issued,
    source: stored ? 'renewed' : 'generated',
    certFile: paths.certFile,
    keyFile: paths.keyFile,
    fingerprintFile: paths.fingerprintFile,
  };
}

/** The stored certificate, or null when the hub has none yet or it does not parse. */
export function readHubCertificate(dataDir: string): HubCertificate | null {
  const paths = certificatePaths(dataDir);
  const stored = readStored(paths.certFile, paths.keyFile, new Date());
  if (!stored) return null;
  return { ...describe(stored, 'generated'), certFile: paths.certFile, keyFile: paths.keyFile, fingerprintFile: paths.fingerprintFile };
}

/** The SHA-256 fingerprint of a PEM certificate, in the `AA:BB:…` form. */
export function fingerprintOf(certPem: string): string {
  return new X509Certificate(certPem).fingerprint256;
}

function readStored(
  certFile: string,
  keyFile: string,
  now: Date
): { certPem: string; keyPem: string } | null {
  if (!existsSync(certFile) || !existsSync(keyFile)) return null;
  const certPem = readFileSync(certFile, 'utf8');
  const keyPem = readFileSync(keyFile, 'utf8');

  try {
    const certificate = new X509Certificate(certPem);
    if (new Date(certificate.validTo) <= now) return null;
    return { certPem, keyPem };
  } catch {
    return null;
  }
}

function validFor(
  material: { certPem: string },
  renewBeforeDays: number,
  now: Date
): boolean {
  const validTo = new Date(new X509Certificate(material.certPem).validTo).getTime();
  return validTo - now.getTime() > renewBeforeDays * 24 * 60 * 60 * 1000;
}

function describe(
  material: { certPem: string; keyPem: string },
  source: HubCertificate['source']
): HubCertificate {
  const certificate = new X509Certificate(material.certPem);
  return {
    keyPem: material.keyPem,
    certPem: material.certPem,
    fingerprint256: certificate.fingerprint256,
    sha256: certificate.fingerprint256.replace(/:/g, '').toLowerCase(),
    notBefore: new Date(certificate.validFrom).toISOString(),
    notAfter: new Date(certificate.validTo).toISOString(),
    subjectAlternativeNames: (certificate.subjectAltName ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
    source,
    certFile: null,
    keyFile: null,
    fingerprintFile: null,
  };
}
