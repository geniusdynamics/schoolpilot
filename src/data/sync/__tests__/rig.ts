// ABOUTME: The rig the sync tests share: a seeded server, devices that pull from it, and the
// ABOUTME: one place every temporary database is closed.

import { createTestContext, type TestContext } from '@/data/__tests__/harness';

import { HlcClock } from '../hlc';
import { DeviceNode, ServerNode } from '../node';
import type { ReplicaScope } from '../scope';

/** A database and the node over it, closed together. */
export interface OpenedNode<T> {
  readonly node: T;
  readonly context: TestContext;
  close(): Promise<void>;
}

/** How a device is built: a clock it can be pinned to, and the data it may hold. */
export interface DeviceOptions {
  readonly clock?: HlcClock;
  readonly scope?: ReplicaScope;
}

/** A server and the devices that replicate against it. */
export interface Rig {
  readonly server: ServerNode;
  readonly serverContext: TestContext;
  /** Opens an empty device; the caller closes it with the rig. */
  device(deviceId: string, options?: DeviceOptions): Promise<DeviceNode>;
  /** Opens an empty device and keeps the context, for a test that reads the database directly. */
  openedDevice(deviceId: string, options?: DeviceOptions): Promise<OpenedNode<DeviceNode>>;
  close(): Promise<void>;
}

/** Opens a server over the seeded canonical fixtures. Nothing is in its change log until `bootstrap`. */
export async function openServer(): Promise<OpenedNode<ServerNode>> {
  const context = await createTestContext();
  const node = await ServerNode.open({
    repository: context.repository,
    adapter: context.adapter,
    deviceId: 'server',
    dialect: 'sqlite',
  });

  return { node, context, close: () => context.close() };
}

/** Opens an empty device: the canonical schema, the audit table and the sync metadata, no rows. */
export async function openDevice(
  deviceId: string,
  options: DeviceOptions = {}
): Promise<OpenedNode<DeviceNode>> {
  const context = await createTestContext({ seed: false });
  const node = await DeviceNode.open({
    repository: context.repository,
    adapter: context.adapter,
    deviceId,
    dialect: 'sqlite',
    ...(options.clock !== undefined ? { clock: options.clock } : {}),
    ...(options.scope !== undefined ? { scope: options.scope } : {}),
  });

  return { node, context, close: () => context.close() };
}

/** A server and its devices, all closed together. */
export async function openRig(): Promise<Rig> {
  const server = await openServer();
  const opened: Array<{ close(): Promise<void> }> = [server];

  return {
    server: server.node,
    serverContext: server.context,
    async device(deviceId: string, options: DeviceOptions = {}): Promise<DeviceNode> {
      const device = await openDevice(deviceId, options);
      opened.push(device);
      return device.node;
    },
    openedDevice(deviceId: string, options: DeviceOptions = {}): Promise<OpenedNode<DeviceNode>> {
      return openDevice(deviceId, options).then((device) => {
        opened.push(device);
        return device;
      });
    },
    async close(): Promise<void> {
      for (const node of opened.reverse()) await node.close();
    },
  };
}

/** A clock pinned to one wall time, so two devices' order is the pinned time and the device id. */
export function pinnedClock(deviceId: string, wall = 1_800_000_000_000): HlcClock {
  return new HlcClock(deviceId, () => wall);
}
