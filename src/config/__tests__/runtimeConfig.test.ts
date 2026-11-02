// ABOUTME: The runtime settings a deployment publishes: each value is read defensively, and a
// ABOUTME: malformed one falls back to the build-time setting instead of breaking the boot.

import { afterEach, describe, expect, it } from 'vitest';

import {
  runtimeAllowsTemporaryDatabase,
  runtimeAppVersion,
  runtimeBugsinkDsn,
  runtimeConfig,
  runtimeDeploymentMode,
} from '../runtimeConfig';

const publish = (value: unknown): void => {
  Object.defineProperty(window, '__SCHOOLPILOT_CONFIG__', { configurable: true, value });
};

afterEach(() => {
  publish(undefined);
});

describe('the runtime settings', () => {
  it('are empty when the deployment published nothing', () => {
    publish(undefined);
    expect(runtimeConfig()).toEqual({});
    expect(runtimeDeploymentMode()).toBeUndefined();
    expect(runtimeAllowsTemporaryDatabase()).toBeUndefined();
  });

  it('read the four settings a deployment may set', () => {
    publish({
      deploymentMode: 'demo',
      allowTemporaryDatabase: true,
      bugsinkDsn: 'https://key@example.test/1',
      appVersion: '2.0.0',
    });
    expect(runtimeConfig()).toEqual({
      deploymentMode: 'demo',
      allowTemporaryDatabase: true,
      bugsinkDsn: 'https://key@example.test/1',
      appVersion: '2.0.0',
    });
  });

  it('ignore a value of the wrong shape rather than failing the boot', () => {
    publish({ deploymentMode: 'kiosk', allowTemporaryDatabase: 'yes', bugsinkDsn: 42, appVersion: {} });
    expect(runtimeConfig()).toEqual({});
    expect(runtimeDeploymentMode()).toBeUndefined();
  });

  it('fall back to the build-time value when the deployment sets nothing', () => {
    publish({});
    expect(runtimeBugsinkDsn('https://built@example.test/1')).toBe('https://built@example.test/1');
    expect(runtimeAppVersion('1.2.3')).toBe('1.2.3');
    expect(runtimeAppVersion(undefined)).toBe('1.0.0');
  });

  it('let the deployment override the build-time value', () => {
    publish({ bugsinkDsn: 'https://runtime@example.test/1', appVersion: '9.0.0' });
    expect(runtimeBugsinkDsn('https://built@example.test/1')).toBe('https://runtime@example.test/1');
    expect(runtimeAppVersion('1.2.3')).toBe('9.0.0');
  });

  it('accept the boolean as a string, because an environment cannot carry a boolean', () => {
    publish({ allowTemporaryDatabase: 'false' });
    expect(runtimeAllowsTemporaryDatabase()).toBe(false);
    publish({ allowTemporaryDatabase: 'true' });
    expect(runtimeAllowsTemporaryDatabase()).toBe(true);
  });
});
