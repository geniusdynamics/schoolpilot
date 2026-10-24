// ABOUTME: The encrypted backup archive: a magic prefix, a length-prefixed authenticated JSON
// ABOUTME: header, AES-256-GCM ciphertext and its tag, with the header bound in as additional data.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { BackupError } from './errors';
import { deriveArchiveKey, type BackupSecret } from './key';
import type { BackupHeader } from './types';

/** The five bytes every archive starts with. */
export const ARCHIVE_MAGIC = Buffer.from('SPBK1', 'ascii');

/** The uint32BE header length that follows the magic. */
export const HEADER_LENGTH_BYTES = 4;

/** The AES-GCM authentication tag length. */
export const AUTH_TAG_BYTES = 16;

/** A header larger than this is refused before any allocation is made from its length field. */
export const MAX_HEADER_BYTES = 1024 * 1024;

/** The parts an archive is built and read from. */
export interface ArchiveParts {
  readonly header: BackupHeader;
  readonly headerBytes: Buffer;
  readonly plaintext: Buffer;
}

/** Encrypts one plaintext SQLite file into archive bytes. */
export function encodeArchive(
  header: BackupHeader,
  plaintext: Buffer,
  secret: BackupSecret
): Buffer {
  if (header.encryption.keyId !== secret.keyId) {
    throw new BackupError(
      'key_invalid',
      'the archive header names a different backup key; refusing to encrypt with this one'
    );
  }

  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  if (headerBytes.length > MAX_HEADER_BYTES) {
    throw new BackupError('archive_invalid', 'the archive header is too large');
  }

  const salt = Buffer.from(header.encryption.salt, 'base64');
  const iv = Buffer.from(header.encryption.iv, 'base64');
  const key = deriveArchiveKey(secret.secret, salt);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(headerBytes);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const length = Buffer.alloc(HEADER_LENGTH_BYTES);
  length.writeUInt32BE(headerBytes.length, 0);

  return Buffer.concat([ARCHIVE_MAGIC, length, headerBytes, ciphertext, tag]);
}

/**
 * Reads the header without decrypting.
 *
 * Listing a directory must not need the key; the header is authenticated as additional data
 * when the archive is actually decrypted, so a header read this way never vouches for content.
 */
export function readArchiveHeader(bytes: Buffer): BackupHeader {
  const parsed = parseArchive(bytes);
  return parsed.header;
}

/** Decrypts an archive and authenticates both its header and its ciphertext. */
export function decodeArchive(bytes: Buffer, secret: BackupSecret): ArchiveParts {
  const { header, headerBytes, ciphertext, tag } = parseArchive(bytes);

  if (header.encryption.keyId !== secret.keyId) {
    throw new BackupError(
      'wrong_key',
      `the backup was sealed with key ${header.encryption.keyId}; this hub holds ${secret.keyId}`
    );
  }

  const salt = Buffer.from(header.encryption.salt, 'base64');
  const iv = Buffer.from(header.encryption.iv, 'base64');
  const key = deriveArchiveKey(secret.secret, salt);

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(headerBytes);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return { header, headerBytes, plaintext };
  } catch (error) {
    throw new BackupError(
      'archive_corrupt',
      'the backup could not be authenticated: the key is right but the archive was altered',
      { cause: error }
    );
  }
}

/** A fresh salt and IV for one archive. */
export function newArchiveNonce(): { salt: string; iv: string } {
  return {
    salt: randomBytes(16).toString('base64'),
    iv: randomBytes(12).toString('base64'),
  };
}

interface ParsedArchive {
  readonly header: BackupHeader;
  readonly headerBytes: Buffer;
  readonly ciphertext: Buffer;
  readonly tag: Buffer;
}

function parseArchive(bytes: Buffer): ParsedArchive {
  const minimum = ARCHIVE_MAGIC.length + HEADER_LENGTH_BYTES + AUTH_TAG_BYTES;
  if (bytes.length < minimum) {
    throw new BackupError('archive_invalid', 'the file is too short to be a SchoolPilot backup');
  }
  if (!bytes.subarray(0, ARCHIVE_MAGIC.length).equals(ARCHIVE_MAGIC)) {
    throw new BackupError('archive_invalid', 'the file does not start with the SchoolPilot backup magic');
  }

  const headerLength = bytes.readUInt32BE(ARCHIVE_MAGIC.length);
  if (headerLength === 0 || headerLength > MAX_HEADER_BYTES) {
    throw new BackupError('archive_invalid', `the archive header length ${headerLength} is out of range`);
  }

  const headerStart = ARCHIVE_MAGIC.length + HEADER_LENGTH_BYTES;
  const headerEnd = headerStart + headerLength;
  const tagStart = bytes.length - AUTH_TAG_BYTES;
  if (headerEnd > tagStart) {
    throw new BackupError('archive_invalid', 'the archive header runs past the ciphertext');
  }

  const headerBytes = bytes.subarray(headerStart, headerEnd);

  return {
    header: parseHeaderBytes(headerBytes),
    headerBytes,
    ciphertext: bytes.subarray(headerEnd, tagStart),
    tag: bytes.subarray(tagStart),
  };
}

/** Parses and validates header bytes that were read on their own, without the ciphertext. */
export function parseHeaderBytes(headerBytes: Buffer): BackupHeader {
  let parsed: unknown;
  try {
    parsed = JSON.parse(headerBytes.toString('utf8'));
  } catch (error) {
    throw new BackupError('archive_invalid', 'the archive header is not valid JSON', { cause: error });
  }
  return requireHeader(parsed);
}

function requireHeader(value: unknown): BackupHeader {
  const header = asObject(value, 'header');
  if (header.format !== 'schoolpilot-backup' || header.version !== 1) {
    throw new BackupError('archive_invalid', 'the archive header is not a version 1 SchoolPilot backup');
  }

  const encryption = asObject(header.encryption, 'encryption');
  if (encryption.algorithm !== 'aes-256-gcm' || encryption.kdf !== 'scrypt') {
    throw new BackupError('archive_invalid', 'the archive uses an unsupported cipher or key derivation');
  }

  const content = asObject(header.content, 'content');
  const source = asObject(header.source, 'source');

  const id = asString(header.id, 'id');
  const createdAt = asString(header.createdAt, 'createdAt');
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new BackupError('archive_invalid', 'the archive createdAt is not a date');
  }

  const kind = asString(header.kind, 'kind');
  if (kind !== 'automatic' && kind !== 'manual' && kind !== 'pre_restore') {
    throw new BackupError('archive_invalid', `the archive kind ${kind} is not one the hub writes`);
  }

  return {
    format: 'schoolpilot-backup',
    version: 1,
    id,
    kind,
    createdAt,
    application: 'schoolpilot',
    source: { database: asString(source.database, 'source.database') },
    encryption: {
      algorithm: 'aes-256-gcm',
      kdf: 'scrypt',
      salt: asString(encryption.salt, 'encryption.salt'),
      iv: asString(encryption.iv, 'encryption.iv'),
      keyId: asString(encryption.keyId, 'encryption.keyId'),
    },
    content: {
      digest: asString(content.digest, 'content.digest'),
      rows: asNumber(content.rows, 'content.rows'),
      plainBytes: asNumber(content.plainBytes, 'content.plainBytes'),
      tables: Array.isArray(content.tables) ? content.tables.map(requireTableDigest) : [],
    },
  };
}

function requireTableDigest(value: unknown) {
  const table = asObject(value, 'content.tables[]');
  const entity = table.entity;
  return {
    table: asString(table.table, 'content.tables[].table'),
    entity: entity === null || entity === undefined ? null : asString(entity, 'content.tables[].entity'),
    rows: asNumber(table.rows, 'content.tables[].rows'),
    digest: asString(table.digest, 'content.tables[].digest'),
  };
}

function asObject(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BackupError('archive_invalid', `the archive ${name} is not a JSON object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BackupError('archive_invalid', `the archive ${name} is not a non-empty string`);
  }
  return value;
}

function asNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BackupError('archive_invalid', `the archive ${name} is not a non-negative number`);
  }
  return value;
}
