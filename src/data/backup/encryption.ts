// ABOUTME: Passphrase encryption of a whole backup archive: PBKDF2-SHA256 derives an AES-256-GCM key,
// ABOUTME: and a plaintext outer header records the parameters so the file can be opened years later.

/** The first bytes of an encrypted backup: "SchoolPilot Web Backup, ENCrypted, version 1". */
export const ENCRYPTED_MAGIC = 'SPWBENC1';
/** OWASP's 2023 floor for PBKDF2-HMAC-SHA256; the header records the count actually used. */
export const PBKDF2_ITERATIONS = 600_000;
/** A passphrase shorter than this is refused before anything is derived from it. */
export const MIN_PASSPHRASE_LENGTH = 8;

const SALT_BYTES = 16;
const IV_BYTES = 12;
const PREFIX_BYTES = ENCRYPTED_MAGIC.length + 4;

/** The plaintext header in front of the ciphertext. Authenticated, so it cannot be altered unnoticed. */
export interface EncryptedBackupHeader {
  readonly format: 'schoolpilot-browser-backup';
  readonly encryption: 'AES-256-GCM';
  readonly kdf: 'PBKDF2-SHA256';
  readonly iterations: number;
  /** Base64 of the random 16-byte salt. */
  readonly salt: string;
  /** Base64 of the random 12-byte GCM nonce. */
  readonly iv: string;
}

/** The passphrase does not open the file (or the file was altered after it was written). */
export class BackupPassphraseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupPassphraseError';
  }
}

/** The bytes are not an encrypted backup this build can read. */
export class EncryptedBackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptedBackupFormatError';
  }
}

function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle;
  if (!api) {
    throw new Error('This browser does not offer WebCrypto, so a backup cannot be encrypted or opened here');
  }
  return api;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await subtle().importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** True when the bytes start with the encrypted-backup marker. */
export function isEncryptedBackup(bytes: Uint8Array): boolean {
  if (bytes.length < ENCRYPTED_MAGIC.length) return false;
  return new TextDecoder().decode(bytes.subarray(0, ENCRYPTED_MAGIC.length)) === ENCRYPTED_MAGIC;
}

/** Read the plaintext header and where the ciphertext starts; validates every recorded parameter. */
export function readEncryptedHeader(bytes: Uint8Array): {
  header: EncryptedBackupHeader;
  headerEnd: number;
} {
  if (!isEncryptedBackup(bytes) || bytes.length < PREFIX_BYTES) {
    throw new EncryptedBackupFormatError('The file is not an encrypted SchoolPilot backup');
  }
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    ENCRYPTED_MAGIC.length,
    true
  );
  const headerEnd = PREFIX_BYTES + length;
  if (length === 0 || headerEnd > bytes.length) {
    throw new EncryptedBackupFormatError('The encrypted backup header is damaged');
  }

  let parsed: Partial<EncryptedBackupHeader>;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(PREFIX_BYTES, headerEnd)));
  } catch {
    throw new EncryptedBackupFormatError('The encrypted backup header is not readable');
  }
  if (
    parsed.format !== 'schoolpilot-browser-backup' ||
    parsed.encryption !== 'AES-256-GCM' ||
    parsed.kdf !== 'PBKDF2-SHA256' ||
    typeof parsed.iterations !== 'number' ||
    !Number.isInteger(parsed.iterations) ||
    parsed.iterations < 1 ||
    typeof parsed.salt !== 'string' ||
    typeof parsed.iv !== 'string'
  ) {
    throw new EncryptedBackupFormatError(
      'The encrypted backup uses parameters this build does not know; it may come from a newer version'
    );
  }
  return { header: parsed as EncryptedBackupHeader, headerEnd };
}

/**
 * Encrypt a whole archive under a passphrase.
 *
 * The header (magic, length and the JSON parameters) is passed to AES-GCM as additional
 * authenticated data: lowering the iteration count or swapping the salt in a stored file makes
 * decryption fail instead of quietly weakening it.
 */
export async function encryptBackup(
  plaintext: Uint8Array,
  passphrase: string,
  options: { readonly iterations?: number } = {}
): Promise<Uint8Array> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new BackupPassphraseError(`A backup passphrase needs at least ${MIN_PASSPHRASE_LENGTH} characters`);
  }
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const header: EncryptedBackupHeader = {
    format: 'schoolpilot-browser-backup',
    encryption: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: options.iterations ?? PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
  };

  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const prefix = new Uint8Array(PREFIX_BYTES + headerBytes.length);
  prefix.set(new TextEncoder().encode(ENCRYPTED_MAGIC), 0);
  new DataView(prefix.buffer).setUint32(ENCRYPTED_MAGIC.length, headerBytes.length, true);
  prefix.set(headerBytes, PREFIX_BYTES);

  const key = await deriveKey(passphrase, salt, header.iterations);
  const ciphertext = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: prefix }, key, plaintext)
  );

  const out = new Uint8Array(prefix.length + ciphertext.length);
  out.set(prefix, 0);
  out.set(ciphertext, prefix.length);
  return out;
}

/** Decrypt an encrypted backup; a wrong passphrase or an altered file is a BackupPassphraseError. */
export async function decryptBackup(bytes: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const { header, headerEnd } = readEncryptedHeader(bytes);
  const salt = fromBase64(header.salt);
  const iv = fromBase64(header.iv);
  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES) {
    throw new EncryptedBackupFormatError('The encrypted backup header records a salt or nonce of the wrong size');
  }

  const key = await deriveKey(passphrase, salt, header.iterations);
  try {
    return new Uint8Array(
      await subtle().decrypt(
        { name: 'AES-GCM', iv, additionalData: bytes.subarray(0, headerEnd) },
        key,
        bytes.subarray(headerEnd)
      )
    );
  } catch {
    // GCM cannot tell a wrong key from altered bytes; both mean the file does not open.
    throw new BackupPassphraseError(
      'The passphrase does not open this backup, or the file was changed after it was written'
    );
  }
}
