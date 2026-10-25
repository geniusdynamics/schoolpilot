// ABOUTME: A self-signed X.509 certificate issued with node:crypto alone, so a hub can serve TLS
// ABOUTME: on a school LAN with no openssl, no CA account and no internet.
//
// The certificate is a leaf that is also its own trust anchor: a client either installs the PEM as
// a trusted root or pins the SHA-256 fingerprint the hub prints. That is the certificate story the
// deployment guide states; ACME needs a public DNS name and internet, which a school LAN has not.

import { createHash, generateKeyPairSync, sign, X509Certificate } from 'node:crypto';
import { isIP } from 'node:net';

import {
  bitString,
  boolean,
  explicit,
  implicit,
  integer,
  objectIdentifier,
  octetString,
  randomSerial,
  sequence,
  set,
  utcTime,
  utf8String,
} from './asn1';

const OID = {
  commonName: '2.5.4.3',
  organizationName: '2.5.4.10',
  ecdsaWithSha256: '1.2.840.10045.4.3.2',
  subjectKeyIdentifier: '2.5.29.14',
  keyUsage: '2.5.29.15',
  subjectAltName: '2.5.29.17',
  basicConstraints: '2.5.29.19',
  extendedKeyUsage: '2.5.29.37',
  serverAuth: '1.3.6.1.5.5.7.3.1',
} as const;

/** The longest validity browsers accept from a certificate they have not seen before. */
export const MAX_CERTIFICATE_DAYS = 397;

export interface SelfSignedCertificateRequest {
  /** The subject's common name, e.g. `schoolpilot.local`. */
  readonly commonName: string;
  /** The subject's organisation; defaults to `SchoolPilot hub`. */
  readonly organization?: string;
  /** Hostnames the certificate is valid for. The common name is always included. */
  readonly dnsNames?: readonly string[];
  /** IPv4 addresses the certificate is valid for, e.g. `127.0.0.1` and the hub's LAN address. */
  readonly ipAddresses?: readonly string[];
  /** Days of validity; clamped to `MAX_CERTIFICATE_DAYS`. Defaults to 397. */
  readonly days?: number;
  /** The issue time; defaults to now. Tests pass a fixed clock. */
  readonly now?: Date;
}

export interface IssuedCertificate {
  readonly keyPem: string;
  readonly certPem: string;
  /** The SHA-256 fingerprint in the `AA:BB:…` form `X509Certificate` reports. */
  readonly fingerprint256: string;
  /** The same fingerprint as lowercase hex with no separators, for TXT records and env files. */
  readonly sha256: string;
  readonly serialNumber: string;
  readonly notBefore: string;
  readonly notAfter: string;
  /** Every name the certificate is valid for, in `DNS:`/`IP:` form. */
  readonly subjectAlternativeNames: readonly string[];
}

/**
 * Issues a self-signed ECDSA P-256 certificate for the names given.
 *
 * The key is fresh on every call; callers that need stability persist the result. Node parses the
 * DER before returning, so a malformed encoding fails here rather than at the first handshake.
 */
export function createSelfSignedCertificate(
  request: SelfSignedCertificateRequest
): IssuedCertificate {
  const now = request.now ?? new Date();
  const days = Math.min(request.days ?? MAX_CERTIFICATE_DAYS, MAX_CERTIFICATE_DAYS);
  if (!Number.isFinite(days) || days <= 0) {
    throw new RangeError(`a certificate needs a positive number of days, received ${days}`);
  }

  const dnsNames = unique([request.commonName, ...(request.dnsNames ?? [])]);
  const ipAddresses = unique(request.ipAddresses ?? []);
  for (const address of ipAddresses) {
    if (isIP(address) !== 4) {
      throw new RangeError(`"${address}" is not an IPv4 address this issuer can put in a SAN`);
    }
  }

  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const spki = publicKey.export({ type: 'spki', format: 'der' });

  const notBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const notAfter = new Date(notBefore.getTime() + days * 24 * 60 * 60 * 1000);
  const serial = randomSerial(16);
  const subject = name(request.commonName, request.organization ?? 'SchoolPilot hub');

  const extensions = sequence(
    extension(OID.basicConstraints, true, sequence()),
    // digitalSignature is bit 0 of the key-usage bit string.
    extension(OID.keyUsage, true, bitString(Buffer.from([0x80]), 7)),
    extension(OID.extendedKeyUsage, false, sequence(objectIdentifier(OID.serverAuth))),
    extension(
      OID.subjectAltName,
      false,
      sequence(
        ...dnsNames.map((name) => implicit(2, Buffer.from(name, 'ascii'))),
        ...ipAddresses.map((address) => implicit(7, ipv4(address)))
      )
    ),
    extension(OID.subjectKeyIdentifier, false, octetString(subjectKeyIdentifier(spki)))
  );

  const tbsCertificate = sequence(
    explicit(0, integer(2)),
    integer(serial),
    sequence(objectIdentifier(OID.ecdsaWithSha256)),
    subject,
    sequence(utcTime(notBefore), utcTime(notAfter)),
    subject,
    spki,
    explicit(3, extensions)
  );

  const signature = sign('sha256', tbsCertificate, { key: privateKey, dsaEncoding: 'der' });
  const certPem = derToPem(
    sequence(tbsCertificate, sequence(objectIdentifier(OID.ecdsaWithSha256)), bitString(signature))
  );

  const parsed = new X509Certificate(certPem);
  if (!parsed.checkPrivateKey(privateKey)) {
    throw new Error('the issued certificate does not match its private key');
  }

  return {
    keyPem,
    certPem,
    fingerprint256: parsed.fingerprint256,
    sha256: parsed.fingerprint256.replace(/:/g, '').toLowerCase(),
    serialNumber: parsed.serialNumber,
    notBefore: new Date(parsed.validFrom).toISOString(),
    notAfter: new Date(parsed.validTo).toISOString(),
    subjectAlternativeNames: [
      ...dnsNames.map((name) => `DNS:${name}`),
      ...ipAddresses.map((address) => `IP:${address}`),
    ],
  };
}

/** An X.509 Name with a common name and an organisation. */
function name(commonName: string, organization: string): Buffer {
  return sequence(
    set(sequence(objectIdentifier(OID.commonName), utf8String(commonName))),
    set(sequence(objectIdentifier(OID.organizationName), utf8String(organization)))
  );
}

/** Extension ::= SEQUENCE { extnID, critical BOOLEAN DEFAULT FALSE, extnValue OCTET STRING }. */
function extension(oid: string, critical: boolean, value: Buffer): Buffer {
  return critical
    ? sequence(objectIdentifier(oid), boolean(true), octetString(value))
    : sequence(objectIdentifier(oid), octetString(value));
}

/**
 * The SHA-1 of the subjectPublicKey BIT STRING, as RFC 5280 §4.2.1.2 defines the key identifier.
 *
 * The walk is deliberate: the identifier hashes the key bits alone, not the whole SPKI wrapper.
 */
function subjectKeyIdentifier(spki: Buffer): Buffer {
  let offset = 0;
  const readTag = (): number => spki[offset++] ?? 0;
  const readLength = (): number => {
    const first = spki[offset++] ?? 0;
    if ((first & 0x80) === 0) return first;
    const count = first & 0x7f;
    let length = 0;
    for (let index = 0; index < count; index += 1) {
      length = length * 256 + (spki[offset++] ?? 0);
    }
    return length;
  };

  if (readTag() !== 0x30) throw new Error('the public key is not a DER sequence');
  readLength();
  if (readTag() !== 0x30) throw new Error('the public key carries no algorithm sequence');
  // Read the length into a local first: `offset += readLength()` adds to the offset as it stood
  // *before* the call advanced it, which lands one byte short.
  const algorithmLength = readLength();
  offset += algorithmLength;
  if (readTag() !== 0x03) throw new Error('the public key carries no bit string');
  const bitStringLength = readLength();
  offset += 1; // the unused-bits octet
  const keyBits = spki.subarray(offset, offset + bitStringLength - 1);
  return createHash('sha1').update(keyBits).digest();
}

function ipv4(address: string): Buffer {
  return Buffer.from(address.split('.').map((part) => Number(part)));
}

function derToPem(der: Buffer): string {
  const base64 = der.toString('base64').replace(/(.{64})/g, '$1\n').replace(/\n$/, '');
  return `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----\n`;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
