/**
 * FieldLevelEncryption - Encrypts sensitive fields in database documents
 *
 * Provides transparent encryption/decryption of specific fields before storage
 * and after retrieval. Uses Web Crypto API for AES-GCM encryption.
 *
 * Requirements: 8.3 (Field-Level Encryption)
 */

export interface EncryptionConfig {
  /**
   * Fields to encrypt (supports dot notation for nested fields)
   */
  encryptedFields: string[];

  /**
   * Encryption key (base64-encoded 256-bit key for AES-GCM)
   * In production, derive from a key management service
   */
  encryptionKey: string;

  /**
   * Key derivation: 'raw' (use key directly) or 'pbkdf2' (derive from password)
   */
  keyMode: 'raw' | 'pbkdf2';

  /**
   * PBKDF2 salt (required when keyMode is 'pbkdf2')
   */
  salt?: string;

  /**
   * PBKDF2 iterations (default: 100,000)
   */
  iterations?: number;
}

export interface EncryptedValue {
  /**
   * Marker to identify encrypted values
   */
  __encrypted: true;

  /**
   * Base64-encoded ciphertext (IV + ciphertext + auth tag)
   */
  ciphertext: string;

  /**
   * Algorithm used for encryption
   */
  algorithm: 'AES-GCM';

  /**
   * Schema version for key rotation support
   */
  version: number;
}

const CURRENT_SCHEMA_VERSION = 1;
const ALGORITHM = { name: 'AES-GCM', length: 256 };

/**
 * FieldLevelEncryption - Encrypts and decrypts specific fields
 */
export class FieldLevelEncryption {
  private cryptoKey: CryptoKey | null = null;
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig) {
    this.config = config;
  }

  /**
   * Initialize the encryption key
   */
  async initialize(): Promise<void> {
    if (this.config.keyMode === 'raw') {
      const keyData = this.base64ToArrayBuffer(this.config.encryptionKey);
      this.cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        ALGORITHM,
        false,
        ['encrypt', 'decrypt'],
      );
    } else {
      // PBKDF2 key derivation
      const password = this.config.encryptionKey;
      const salt = this.config.salt || 'default-salt-change-in-production';
      const iterations = this.config.iterations ?? 100_000;

      const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
      );

      this.cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode(salt),
          iterations,
          hash: 'SHA-256',
        },
        passwordKey,
        ALGORITHM,
        false,
        ['encrypt', 'decrypt'],
      );
    }
  }

  /**
   * Encrypt specified fields in a document
   */
  async encryptDocument(doc: Record<string, any>): Promise<Record<string, any>> {
    if (!this.cryptoKey) {
      throw new Error('FieldLevelEncryption not initialized. Call initialize() first.');
    }

    const encrypted = { ...doc };

    for (const field of this.config.encryptedFields) {
      const value = this.getNestedValue(doc, field);
      if (value !== undefined && value !== null) {
        const encryptedValue = await this.encryptValue(value);
        this.setNestedValue(encrypted, field, encryptedValue);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt specified fields in a document
   */
  async decryptDocument(doc: Record<string, any>): Promise<Record<string, any>> {
    if (!this.cryptoKey) {
      throw new Error('FieldLevelEncryption not initialized. Call initialize() first.');
    }

    const decrypted = { ...doc };

    for (const field of this.config.encryptedFields) {
      const value = this.getNestedValue(doc, field);
      if (this.isEncryptedValue(value)) {
        const decryptedValue = await this.decryptValue(value);
        this.setNestedValue(decrypted, field, decryptedValue);
      }
    }

    return decrypted;
  }

  /**
   * Encrypt a single value
   */
  async encryptValue(value: any): Promise<EncryptedValue> {
    if (!this.cryptoKey) {
      throw new Error('FieldLevelEncryption not initialized');
    }

    // Serialize value to JSON
    const plaintext = JSON.stringify(value);
    const encoded = new TextEncoder().encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      encoded,
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return {
      __encrypted: true,
      ciphertext: this.arrayBufferToBase64(combined.buffer),
      algorithm: 'AES-GCM',
      version: CURRENT_SCHEMA_VERSION,
    };
  }

  /**
   * Decrypt a single encrypted value
   */
  async decryptValue(encrypted: EncryptedValue): Promise<any> {
    if (!this.cryptoKey) {
      throw new Error('FieldLevelEncryption not initialized');
    }

    if (!this.isEncryptedValue(encrypted)) {
      return encrypted;
    }

    // Decode and split IV + ciphertext
    const combined = this.base64ToArrayBuffer(encrypted.ciphertext);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      this.cryptoKey,
      ciphertext,
    );

    // Parse JSON
    const plaintext = new TextDecoder().decode(decrypted);
    return JSON.parse(plaintext);
  }

  /**
   * Check if a value is encrypted
   */
  isEncryptedValue(value: any): value is EncryptedValue {
    return (
      value !== null &&
      typeof value === 'object' &&
      '__encrypted' in value &&
      value.__encrypted === true
    );
  }

  /**
   * Get the list of encrypted fields
   */
  getEncryptedFields(): string[] {
    return [...this.config.encryptedFields];
  }

  /**
   * Check if a field is encrypted
   */
  isFieldEncrypted(field: string): boolean {
    return this.config.encryptedFields.includes(field);
  }

  /**
   * Utility: Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Utility: Set nested value in object using dot notation
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current: any = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Utility: ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Factory function to create a FieldLevelEncryption instance
 */
export async function createFieldLevelEncryption(
  config: EncryptionConfig,
): Promise<FieldLevelEncryption> {
  const fle = new FieldLevelEncryption(config);
  await fle.initialize();
  return fle;
}
