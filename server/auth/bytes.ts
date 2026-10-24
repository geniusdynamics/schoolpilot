// ABOUTME: A copy of a byte view that TypeScript can prove sits on a plain ArrayBuffer, so the
// ABOUTME: node:crypto and node:fs overloads accept it under the installed typings.

/**
 * Copies a Buffer into a freshly allocated `Uint8Array`.
 *
 * `Buffer` is a `Uint8Array` over an `ArrayBufferLike`, and its `slice` keeps that general
 * buffer, which the Node type definitions and the TypeScript 5.7 library types no longer accept
 * where an `ArrayBufferView` is expected. A copy costs a few dozen bytes — every caller here
 * handles a key, a salt, a digest or a short ciphertext — and removes the mismatch without
 * casting the value's type away.
 */
export function bytes(value: Buffer): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy;
}
