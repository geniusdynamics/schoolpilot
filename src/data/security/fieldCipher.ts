// ABOUTME: The contract the row codec uses to encrypt restricted columns, and the envelope
// ABOUTME: marker that tells a sealed value from legacy plaintext.

/** The prefix of a sealed value; a stored value without it is legacy plaintext. */
export const SEALED_PREFIX = 'enc:v1:';

/** Why restricted-data encryption refused an operation. */
export type RestrictedDataErrorCode =
  | 'key_missing'
  | 'key_invalid'
  | 'sealed_value_invalid'
  | 'encrypted_column_not_text';

/** A failure of the restricted-data encryption layer. */
export class RestrictedDataError extends Error {
  readonly code: RestrictedDataErrorCode;

  constructor(code: RestrictedDataErrorCode, message: string) {
    super(message);
    this.name = 'RestrictedDataError';
    this.code = code;
  }
}

/**
 * Seals and opens one restricted value.
 *
 * Implementations are synchronous because the row codec is synchronous: the write path cannot
 * await a cipher between validating a row and binding it to a statement. The browser has no
 * implementation; the hub supplies one and a browser repository runs without a cipher.
 */
export interface FieldCipher {
  /** Encrypts a plaintext value. A value that is already sealed is returned unchanged. */
  seal(plaintext: string): string;
  /** Decrypts a sealed value. A value that is not sealed is returned unchanged. */
  open(sealed: string): string;
  /** True when the value carries the sealed envelope. */
  isSealed(value: string): boolean;
}
