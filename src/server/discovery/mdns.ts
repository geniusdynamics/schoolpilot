// ABOUTME: The hub's mDNS advertisement and the client-side browse that finds it: one responder on
// ABOUTME: 224.0.0.251:5353 answering `_schoolpilot._tcp.local`, and a query that reads it back.
//
// A client that speaks mDNS finds the hub by service type and never needs an address typed in. The
// advertisement also carries the TLS fingerprint in its TXT record, so a client that trusts nothing
// yet can pin the certificate it is about to be offered.

import dgram from 'node:dgram';

import {
  decodeDnsMessage,
  DNS_TYPE,
  encodeDnsMessage,
  type DnsMessage,
  type DnsQuestion,
  type DnsRecord,
} from './dns';
import { mdnsHostName } from '../network';

/** The service type every SchoolPilot hub answers to. */
export const SCHOOLPILOT_SERVICE = '_schoolpilot._tcp.local';

/** The mDNS multicast group and port (RFC 6762). */
export const MDNS_ADDRESS = '224.0.0.251';
export const MDNS_PORT = 5353;

/** The record lifetime a hub advertises; RFC 6762 §10 recommends 120 seconds for a service. */
export const ADVERTISEMENT_TTL_SECONDS = 120;

/** The protocol version in the TXT record; bumped when a client's expectations change. */
export const HUB_PROTOCOL_VERSION = 1;

export interface HubAdvertisement {
  /** The instance label, e.g. `stmarys`, which becomes `stmarys._schoolpilot._tcp.local`. */
  readonly instanceName: string;
  /** The host label, e.g. `stmarys.local`; the A records answer for it. */
  readonly hostName: string;
  readonly port: number;
  readonly addresses: readonly string[];
  /** Extra TXT entries; the hub's own (`ver`, `path`, `tls`, `fp`) are added to these. */
  readonly txt?: Readonly<Record<string, string>>;
  readonly ttl?: number;
}

export interface MdnsAdvertiserOptions {
  /** The UDP port to answer on; 5353 unless a test needs its own. */
  readonly port?: number;
  readonly multicastAddress?: string;
  /** Called with a human-readable reason when the advertisement is unavailable. */
  readonly onError?: (message: string) => void;
}

export interface DiscoveredHub {
  readonly instanceName: string;
  readonly hostName: string;
  readonly port: number;
  readonly addresses: readonly string[];
  readonly txt: Readonly<Record<string, string>>;
  /** The URL a client should open, https when the advertisement says TLS is on. */
  readonly url: string;
}

export interface DiscoveryOptions {
  readonly timeoutMs?: number;
  readonly port?: number;
  /** Query one address directly instead of the multicast group; a test uses 127.0.0.1. */
  readonly address?: string;
  /** The local port to send from; 0 lets the operating system choose. */
  readonly sourcePort?: number;
}

/**
 * Advertises one hub over mDNS.
 *
 * The responder answers service and host queries, announces itself when it starts and says goodbye
 * when it stops. A hub whose port is already taken by another responder (Windows runs one) still
 * serves its clients: `start()` reports the failure and the hub keeps running.
 */
export class MdnsAdvertiser {
  private socket: dgram.Socket | null = null;
  private readonly timeouts: NodeJS.Timeout[] = [];
  private refresh: NodeJS.Timeout | null = null;
  private failure: string | null = null;

  constructor(
    private readonly advertisement: HubAdvertisement,
    private readonly options: MdnsAdvertiserOptions = {}
  ) {}

  get running(): boolean {
    return this.socket !== null;
  }

  /** Why the advertisement is not running, or null when it is. */
  get error(): string | null {
    return this.failure;
  }

  get port(): number {
    return this.options.port ?? MDNS_PORT;
  }

  /** Binds the responder and announces. False means the advertisement is unavailable. */
  async start(): Promise<boolean> {
    if (this.socket) return true;

    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    socket.on('message', (message, remote) => {
      try {
        const reply = this.replyTo(message, remote.port);
        if (reply) socket.send(reply, remote.port, remote.address);
      } catch (error) {
        this.options.onError?.(`the hub could not answer an mDNS query: ${describe(error)}`);
      }
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => reject(error);
        socket.once('error', onError);
        socket.bind({ port: this.port, address: '0.0.0.0', exclusive: false }, () => {
          socket.off('error', onError);
          resolve();
        });
      });
      // Joining is best-effort: a machine with no multicast route can still answer unicast queries.
      try {
        socket.addMembership(this.options.multicastAddress ?? MDNS_ADDRESS);
      } catch (error) {
        this.options.onError?.(`the hub could not join the mDNS group: ${describe(error)}`);
      }
      socket.setMulticastTTL(255);
      socket.setMulticastLoopback(true);
    } catch (error) {
      socket.close();
      this.failure = describe(error);
      this.options.onError?.(
        `mDNS discovery is off: port ${this.port} is not available (${this.failure})`
      );
      return false;
    }

    this.socket = socket;
    this.failure = null;

    // RFC 6762 §8.3: announce more than once, because one lost datagram loses the hub.
    this.announce();
    this.timeouts.push(setTimeout(() => this.announce(), 1000));
    // Refresh the caches at half the TTL, the interval a responder is expected to re-announce at.
    this.refresh = setInterval(
      () => this.announce(),
      (this.advertisement.ttl ?? ADVERTISEMENT_TTL_SECONDS) * 500
    );
    this.refresh.unref();

    return true;
  }

  /** Says goodbye (TTL 0) and closes the socket. Idempotent. */
  async stop(): Promise<void> {
    for (const timeout of this.timeouts) clearTimeout(timeout);
    this.timeouts.length = 0;
    if (this.refresh) clearInterval(this.refresh);
    this.refresh = null;

    const socket = this.socket;
    this.socket = null;
    if (!socket) return;

    const goodbye = encodeDnsMessage({
      id: 0,
      response: true,
      authoritative: true,
      questions: [],
      answers: this.records(0).answers,
      additionals: [],
    });
    await new Promise<void>((resolve) => {
      socket.send(goodbye, this.port, this.options.multicastAddress ?? MDNS_ADDRESS, () => resolve());
    });
    await new Promise<void>((resolve) => socket.close(() => resolve()));
  }

  /** The message that answers one query, or null when the query asks nothing of this hub. */
  replyTo(message: Buffer, sourcePort: number): Buffer | null {
    const query = decodeDnsMessage(message);
    if (query.response || query.questions.length === 0) return null;

    const advertisement = this.records();
    const candidates = [...advertisement.answers, ...advertisement.additionals];
    const answers = query.questions.flatMap((question) => match(candidates, question));
    if (answers.length === 0) return null;

    // A client that asked for the service also needs the instance's SRV and TXT to reach it, and a
    // client that asked for the instance needs the host's address. Both go in the additional
    // section, the way a DNS-SD responder answers (RFC 6763 §12).
    const instances = new Set(
      answers.flatMap((record) =>
        record.data.type === DNS_TYPE.PTR ? [record.data.target.toLowerCase()] : [record.name.toLowerCase()]
      )
    );
    const service = advertisement.answers.filter(
      (record) =>
        instances.has(record.name.toLowerCase()) &&
        (record.data.type === DNS_TYPE.SRV || record.data.type === DNS_TYPE.TXT)
    );
    const hosts = new Set(
      service.flatMap((record) =>
        record.data.type === DNS_TYPE.SRV ? [record.data.target.toLowerCase()] : []
      )
    );
    const additionals = unique([
      ...service,
      ...advertisement.additionals.filter((record) => hosts.has(record.name.toLowerCase())),
    ]);

    // A query from a port other than 5353 is a legacy unicast query: echo its id and answer it alone.
    const legacy = sourcePort !== this.port;
    return encodeDnsMessage({
      id: legacy ? query.id : 0,
      response: true,
      authoritative: true,
      questions: [],
      answers,
      additionals,
    });
  }

  /** The records this hub advertises: PTR, SRV, TXT and one A per address. */
  records(ttl = this.advertisement.ttl ?? ADVERTISEMENT_TTL_SECONDS): {
    answers: DnsRecord[];
    additionals: DnsRecord[];
  } {
    const instance = `${this.advertisement.instanceName}.${SCHOOLPILOT_SERVICE}`;
    const txt = Object.entries({
      ver: String(HUB_PROTOCOL_VERSION),
      path: '/',
      tls: this.advertisement.txt?.tls ?? '0',
      name: this.advertisement.instanceName,
      ...this.advertisement.txt,
    }).map(([key, value]) => `${key}=${value}`);

    return {
      answers: [
        { name: SCHOOLPILOT_SERVICE, ttl, data: { type: DNS_TYPE.PTR, target: instance } },
        {
          name: instance,
          ttl,
          data: {
            type: DNS_TYPE.SRV,
            priority: 0,
            weight: 0,
            port: this.advertisement.port,
            target: this.advertisement.hostName,
          },
        },
        { name: instance, ttl, data: { type: DNS_TYPE.TXT, entries: txt } },
      ],
      additionals: this.advertisement.addresses.map((address) => ({
        name: this.advertisement.hostName,
        ttl,
        data: { type: DNS_TYPE.A, address },
      })),
    };
  }

  private announce(): void {
    const socket = this.socket;
    if (!socket) return;
    const { answers, additionals } = this.records();
    const message = encodeDnsMessage({
      id: 0,
      response: true,
      authoritative: true,
      questions: [],
      answers,
      additionals,
    });
    socket.send(message, this.port, this.options.multicastAddress ?? MDNS_ADDRESS, () => undefined);
  }
}

/**
 * Browsing for hubs.
 *
 * With no `address` this queries the multicast group; with one it queries that address directly,
 * which is what a test and the install smoke test do so the result does not depend on the machine's
 * multicast route.
 */
export async function discoverHubs(options: DiscoveryOptions = {}): Promise<DiscoveredHub[]> {
  const timeoutMs = options.timeoutMs ?? 3000;
  const port = options.port ?? MDNS_PORT;
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const hubs = new Map<string, DiscoveredHub>();

  const query = encodeDnsMessage({
    id: 0,
    response: false,
    authoritative: false,
    questions: [{ name: SCHOOLPILOT_SERVICE, type: DNS_TYPE.PTR, unicastResponse: true }],
    answers: [],
    additionals: [],
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      socket.once('error', onError);
      socket.bind({ port: options.sourcePort ?? 0, address: '0.0.0.0' }, () => {
        socket.off('error', onError);
        resolve();
      });
    });

    socket.on('message', (message) => {
      try {
        absorb(hubs, decodeDnsMessage(message));
      } catch {
        // A malformed datagram from another responder is not this client's problem.
      }
    });

    await new Promise<void>((resolve) => {
      socket.send(query, port, options.address ?? MDNS_ADDRESS, () => resolve());
    });

    await new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  } finally {
    await new Promise<void>((resolve) => socket.close(() => resolve()));
  }

  return [...hubs.values()].sort((left, right) =>
    left.instanceName.localeCompare(right.instanceName)
  );
}

/** Folds one response into the hubs found so far. */
function absorb(hubs: Map<string, DiscoveredHub>, message: DnsMessage): void {
  const records = [...message.answers, ...message.additionals];

  // Service records name their instance directly; an address record only names a host, so addresses
  // are attributed in a second pass once every SRV in the message has been read.
  for (const record of records) {
    if (record.data.type === DNS_TYPE.A) continue;
    const instance = instanceOf(record);
    if (!instance) continue;

    const existing = hubs.get(instance) ?? {
      instanceName: instance.split('.')[0] ?? instance,
      hostName: '',
      port: 0,
      addresses: [],
      txt: {},
      url: '',
    };
    hubs.set(instance, merge(existing, record));
  }

  for (const record of records) {
    if (record.data.type !== DNS_TYPE.A) continue;
    const host = record.name.toLowerCase();
    for (const [instance, hub] of hubs) {
      if (hub.hostName.toLowerCase() !== host) continue;
      hubs.set(instance, merge(hub, record));
    }
  }
}

/** The instance a record belongs to, when it belongs to this service type. */
function instanceOf(record: DnsRecord): string | null {
  const data = record.data;
  if (data.type === DNS_TYPE.PTR && record.name.toLowerCase() === SCHOOLPILOT_SERVICE) {
    return data.target;
  }
  if (record.name.toLowerCase().endsWith(`.${SCHOOLPILOT_SERVICE}`)) return record.name;
  return null;
}

function merge(hub: DiscoveredHub, record: DnsRecord): DiscoveredHub {
  const data = record.data;
  switch (data.type) {
    case DNS_TYPE.SRV: {
      const merged = { ...hub, hostName: data.target, port: data.port };
      return { ...merged, url: urlFor(merged) };
    }
    case DNS_TYPE.TXT: {
      const txt = { ...hub.txt };
      for (const entry of data.entries) {
        const separator = entry.indexOf('=');
        if (separator > 0) txt[entry.slice(0, separator)] = entry.slice(separator + 1);
      }
      const merged = { ...hub, txt };
      return { ...merged, url: urlFor(merged) };
    }
    case DNS_TYPE.A: {
      const merged = {
        ...hub,
        addresses: hub.addresses.includes(data.address)
          ? hub.addresses
          : [...hub.addresses, data.address],
      };
      return { ...merged, url: urlFor(merged) };
    }
    default:
      return hub;
  }
}

function urlFor(hub: DiscoveredHub): string {
  if (!hub.hostName || hub.port === 0) return '';
  const scheme = hub.txt.tls === '1' ? 'https' : 'http';
  const path = hub.txt.path && hub.txt.path !== '/' ? hub.txt.path : '';
  return `${scheme}://${hub.hostName}:${hub.port}${path}`;
}

function match(records: readonly DnsRecord[], question: DnsQuestion): DnsRecord[] {
  const name = question.name.toLowerCase();
  return records.filter((record) => {
    if (record.name.toLowerCase() !== name) return false;
    return question.type === DNS_TYPE.ANY || record.data.type === question.type;
  });
}

/** The advertisement a hub with this identity publishes. */
export function advertisementFor(options: {
  instanceName: string;
  hostName?: string;
  port: number;
  addresses: readonly string[];
  tls: boolean;
  fingerprint?: string;
}): HubAdvertisement {
  return {
    instanceName: options.instanceName,
    hostName: options.hostName ?? mdnsHostName(options.instanceName),
    port: options.port,
    addresses: options.addresses,
    txt: {
      tls: options.tls ? '1' : '0',
      ...(options.fingerprint ? { fp: options.fingerprint } : {}),
    },
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Drops records repeated between the answer and additional sections. */
function unique(records: readonly DnsRecord[]): DnsRecord[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.name}|${record.data.type}|${JSON.stringify(record.data)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
