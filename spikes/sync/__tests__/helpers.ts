// ABOUTME: The rig the canonical candidate's tests share: a seeded server, empty devices that
// ABOUTME: pull from it, and the one place the temporary databases are closed.

import { createTestContext, type TestContext } from '@/data/__tests__/harness';
import { HlcClock } from '../src/hlc';
import { DeviceNode, ServerNode } from '../src/canonicalSync';
import { openPostgresContext } from '../src/postgres';

/** A database and the node over it, closed together. */
export interface Replica {
  readonly node: DeviceNode | ServerNode;
  readonly context: TestContext;
  close(): Promise<void>;
}

/** The backend the canonical candidate is measured on. The device is always SQLite. */
export type Backend = 'sqlite' | 'postgres';

/** A server and the devices that replicate against it. */
export interface Rig {
  readonly server: ServerNode;
  readonly serverContext: TestContext;
  device(deviceId: string, clock?: HlcClock): Promise<DeviceNode>;
  close(): Promise<void>;
}

/** Opens a seeded server on the chosen backend. */
export async function openServer(backend: Backend = 'sqlite'): Promise<{
  node: ServerNode;
  context: TestContext;
  close(): Promise<void>;
}> {
  const context =
    backend === 'postgres' ? await openPostgresContext(true) : await createTestContext();
  const node = await ServerNode.open({
    repository: context.repository,
    adapter: context.adapter,
    deviceId: 'server',
    dialect: backend === 'postgres' ? 'postgres' : 'sqlite',
  });

  return {
    node,
    context,
    close: async () => {
      await context.close();
    },
  };
}

/** Opens an empty device: the canonical schema and the audit table, no rows. */
export async function openDevice(
  deviceId: string,
  clock?: HlcClock
): Promise<{ node: DeviceNode; context: TestContext; close(): Promise<void> }> {
  const context = await createTestContext({ seed: false });
  const node = await DeviceNode.open({
    repository: context.repository,
    adapter: context.adapter,
    deviceId,
    dialect: 'sqlite',
    clock,
  });

  return {
    node,
    context,
    close: async () => {
      await context.close();
    },
  };
}

/** A server and its devices, all closed together. */
export async function openRig(backend: Backend = 'sqlite'): Promise<Rig> {
  const server = await openServer(backend);
  const devices: Array<{ close(): Promise<void> }> = [];

  return {
    server: server.node,
    serverContext: server.context,
    async device(deviceId: string, clock?: HlcClock): Promise<DeviceNode> {
      const opened = await openDevice(deviceId, clock);
      devices.push(opened);
      return opened.node;
    },
    async close(): Promise<void> {
      for (const device of devices.reverse()) await device.close();
      await server.close();
    },
  };
}

/** A clock pinned to one wall time, so two devices' order is the device id and nothing else. */
export function pinnedClock(deviceId: string, wall = 1_800_000_000_000): HlcClock {
  return new HlcClock(deviceId, () => wall);
}
