// ABOUTME: Compatibility tests for the plug-in SDK: semver-range matching of a plug-in's declared SDK
// ABOUTME: support against the running core, including the same-major, higher-minor and higher-major edges.

import { describe, expect, it } from 'vitest';

import { isCompatible, SDK_VERSION } from '../index';

describe('isCompatible', () => {
  it('accepts a plug-in built for the running SDK version', () => {
    expect(isCompatible({ sdkVersion: '^1.0.0' }, '1.0.0')).toBe(true);
    expect(isCompatible({ sdkVersion: '^1.0.0' }, SDK_VERSION)).toBe(true);
  });

  it('accepts a core with a higher minor version inside the same major', () => {
    expect(isCompatible({ sdkVersion: '^1.0.0' }, '1.1.0')).toBe(true);
    expect(isCompatible({ sdkVersion: '^1.0.0' }, '1.12.3')).toBe(true);
    expect(isCompatible({ sdkVersion: '>=1.0.0 <2.0.0' }, '1.9.9')).toBe(true);
  });

  it('refuses a core with a higher major version', () => {
    expect(isCompatible({ sdkVersion: '^1.0.0' }, '2.0.0')).toBe(false);
    expect(isCompatible({ sdkVersion: '>=1.0.0 <2.0.0' }, '2.0.0')).toBe(false);
  });

  it('refuses a core older than the range allows', () => {
    expect(isCompatible({ sdkVersion: '^1.0.0' }, '0.9.0')).toBe(false);
    expect(isCompatible({ sdkVersion: '^2.0.0' }, '1.5.0')).toBe(false);
  });

  it('treats an exact pin as a range of one version', () => {
    expect(isCompatible({ sdkVersion: '1.0.0' }, '1.0.0')).toBe(true);
    expect(isCompatible({ sdkVersion: '1.0.0' }, '1.0.1')).toBe(false);
  });

  it('refuses a manifest that declares no SDK range', () => {
    expect(isCompatible({}, '1.0.0')).toBe(false);
  });

  it('refuses a range that cannot be parsed', () => {
    expect(isCompatible({ sdkVersion: 'one-dot-oh' }, '1.0.0')).toBe(false);
    expect(isCompatible({ sdkVersion: '1.0.0.0' }, '1.0.0')).toBe(false);
  });

  it('refuses a core version that cannot be parsed', () => {
    expect(isCompatible({ sdkVersion: '^1.0.0' }, 'latest')).toBe(false);
  });

  it('defaults the core version to the running SDK', () => {
    expect(isCompatible({ sdkVersion: '^1.0.0' })).toBe(true);
    expect(isCompatible({ sdkVersion: '^2.0.0' })).toBe(false);
  });
});
