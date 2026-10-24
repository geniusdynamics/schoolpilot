// ABOUTME: The hub's view of its own network identity: the LAN addresses clients can reach it on
// ABOUTME: and the mDNS name it advertises them under.

import { networkInterfaces } from 'node:os';

/** Every non-internal IPv4 address of this machine, in interface order. */
export function lanIpv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      addresses.push(entry.address);
    }
  }
  return [...new Set(addresses)];
}

/**
 * A name an mDNS host record can carry: lower case, letters, digits and hyphens, no dots.
 *
 * A machine called `DESKTOP-ABC` is advertised as `desktop-abc`, because an mDNS host name is one
 * label and a client resolves it as `<label>.local`.
 */
export function mdnsLabel(value: string): string {
  const label = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
  return label.length > 0 ? label : 'schoolpilot';
}

/** The `<label>.local` host name a client resolves without being told an address. */
export function mdnsHostName(value: string): string {
  return `${mdnsLabel(value)}.local`;
}
