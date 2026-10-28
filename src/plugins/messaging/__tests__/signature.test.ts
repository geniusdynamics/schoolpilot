// ABOUTME: Tests for the pure-TypeScript HMAC helpers the webhook checks use, against the published
// ABOUTME: RFC 4231 (HMAC-SHA-256) and RFC 2202 (HMAC-SHA-1) vectors, plus the constant-time compare.

import { describe, expect, it } from 'vitest';

import { hmacSha1Base64, hmacSha1Hex, hmacSha256Hex, timingSafeEqual } from '../signature';

/** A key of `length` bytes, each `value`. */
function bytes(value: number, length: number): Uint8Array {
  return new Uint8Array(length).fill(value);
}

describe('HMAC-SHA-256', () => {
  it('matches RFC 4231 test case 1', () => {
    expect(hmacSha256Hex(bytes(0x0b, 20), 'Hi There')).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7'
    );
  });

  it('matches RFC 4231 test case 2', () => {
    expect(hmacSha256Hex('Jefe', 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843'
    );
  });

  it('hashes the key when it is longer than the block size', () => {
    expect(hmacSha256Hex(bytes(0xaa, 131), 'Test Using Larger Than Block-Size Key - Hash Key First')).toBe(
      '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54'
    );
  });
});

describe('HMAC-SHA-1', () => {
  it('matches RFC 2202 test case 1', () => {
    expect(hmacSha1Hex(bytes(0x0b, 20), 'Hi There')).toBe('b617318655057264e28bc0b6fb378c8ef146be00');
  });

  it('matches RFC 2202 test case 2 and encodes it as base64', () => {
    expect(hmacSha1Base64('Jefe', 'what do ya want for nothing?')).toBe('7/zfauXrL6LSdBbV8YTfnCWafHk=');
  });

  it('hashes the key when it is longer than the block size', () => {
    expect(hmacSha1Hex(bytes(0xaa, 80), 'Test Using Larger Than Block-Size Key - Hash Key First')).toBe(
      'aa4ae5e15272d00e95705637ce8a3b55ed402112'
    );
  });
});

describe('constant-time comparison', () => {
  it('accepts equal strings and refuses a same-length difference', () => {
    expect(timingSafeEqual('sha256=abc', 'sha256=abc')).toBe(true);
    expect(timingSafeEqual('sha256=abc', 'sha256=abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });
});
