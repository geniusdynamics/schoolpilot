// ABOUTME: LAN discovery proved on the wire: the DNS codec round-trips, a hub's mDNS responder
// ABOUTME: answers a query with its service, host, port and TLS fingerprint, and the browse reads it.

import dgram from 'node:dgram';

import { afterEach, describe, expect, it } from 'vitest';

import {
  advertisementFor,
  decodeDnsMessage,
  DNS_TYPE,
  encodeDnsMessage,
  encodeDnsName,
  MdnsAdvertiser,
  SCHOOLPILOT_SERVICE,
} from '@/server/discovery';
import { mdnsHostName, mdnsLabel } from '@/server/network';

const running: MdnsAdvertiser[] = [];

afterEach(async () => {
  while (running.length > 0) await running.pop()?.stop();
});

/** An advertiser on a port of its own, so the test never fights the machine's own responder. */
async function advertise(overrides: Partial<Parameters<typeof advertisementFor>[0]> = {}): Promise<{
  advertiser: MdnsAdvertiser;
  port: number;
}> {
  const advertisement = advertisementFor({
    instanceName: 'stmarys',
    hostName: 'stmarys.local',
    port: 8443,
    addresses: ['192.168.1.20'],
    tls: true,
    fingerprint: 'ab'.repeat(32),
    ...overrides,
  });

  const advertiser = new MdnsAdvertiser(advertisement, { port: await freeUdpPort() });
  const started = await advertiser.start();
  expect(started).toBe(true);
  running.push(advertiser);
  return { advertiser, port: advertiser.port };
}

/** Asks the advertiser directly, the way a legacy unicast client does. */
async function query(port: number, name: string, type: number): Promise<Buffer> {
  const socket = dgram.createSocket('udp4');
  const message = encodeDnsMessage({
    id: 7,
    response: false,
    authoritative: false,
    questions: [{ name, type }],
    answers: [],
    additionals: [],
  });

  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('the hub did not answer')), 2000);
      socket.on('message', (answer) => {
        clearTimeout(timer);
        resolve(answer);
      });
      socket.send(message, port, '127.0.0.1', (error) => {
        if (error) reject(error);
      });
    });
  } finally {
    socket.close();
  }
}

describe('the DNS codec', () => {
  it('round-trips every record a hub advertises', () => {
    const encoded = encodeDnsMessage({
      id: 0,
      response: true,
      authoritative: true,
      questions: [{ name: SCHOOLPILOT_SERVICE, type: DNS_TYPE.PTR, unicastResponse: true }],
      answers: [
        { name: SCHOOLPILOT_SERVICE, ttl: 120, data: { type: DNS_TYPE.PTR, target: `stmarys.${SCHOOLPILOT_SERVICE}` } },
        {
          name: `stmarys.${SCHOOLPILOT_SERVICE}`,
          ttl: 120,
          data: { type: DNS_TYPE.SRV, priority: 0, weight: 0, port: 8443, target: 'stmarys.local' },
        },
        {
          name: `stmarys.${SCHOOLPILOT_SERVICE}`,
          ttl: 120,
          data: { type: DNS_TYPE.TXT, entries: ['ver=1', 'tls=1', 'path=/'] },
        },
      ],
      additionals: [{ name: 'stmarys.local', ttl: 120, data: { type: DNS_TYPE.A, address: '192.168.1.20' } }],
    });

    const decoded = decodeDnsMessage(encoded);
    expect(decoded.response).toBe(true);
    expect(decoded.questions[0]?.unicastResponse).toBe(true);
    expect(decoded.answers[1]?.data).toEqual({
      type: DNS_TYPE.SRV,
      priority: 0,
      weight: 0,
      port: 8443,
      target: 'stmarys.local',
    });
    expect(decoded.answers[2]?.data).toEqual({
      type: DNS_TYPE.TXT,
      entries: ['ver=1', 'tls=1', 'path=/'],
    });
    expect(decoded.additionals[0]?.data).toEqual({ type: DNS_TYPE.A, address: '192.168.1.20' });
  });

  it('follows a compression pointer, because other responders compress', () => {
    // header + `stmarys._schoolpilot._tcp.local` then a PTR whose target is a pointer to offset 12.
    const name = encodeDnsName(`stmarys.${SCHOOLPILOT_SERVICE}`);
    const header = Buffer.alloc(12);
    header.writeUInt16BE(0x8400, 2);
    header.writeUInt16BE(1, 6);
    const recordHeader = Buffer.alloc(10);
    recordHeader.writeUInt16BE(DNS_TYPE.PTR, 0);
    recordHeader.writeUInt16BE(1, 2);
    recordHeader.writeUInt32BE(120, 4);
    recordHeader.writeUInt16BE(2, 8);

    const message = Buffer.concat([header, name, recordHeader, Buffer.from([0xc0, 0x0c])]);
    const decoded = decodeDnsMessage(message);

    expect(decoded.answers[0]?.data).toEqual({
      type: DNS_TYPE.PTR,
      target: `stmarys.${SCHOOLPILOT_SERVICE}`,
    });
  });

  it('refuses a truncated message instead of guessing', () => {
    expect(() => decodeDnsMessage(Buffer.from([0x00, 0x01]))).toThrow(/shorter than a DNS header/);
  });
});

describe("a hub's mDNS advertisement", () => {
  it('answers a service query with its instance, host, port, addresses and fingerprint', async () => {
    const { port } = await advertise();
    const answer = decodeDnsMessage(await query(port, SCHOOLPILOT_SERVICE, DNS_TYPE.PTR));

    const records = [...answer.answers, ...answer.additionals];
    expect(answer.response).toBe(true);
    expect(answer.id).toBe(7); // a legacy unicast query gets its id back
    expect(records.some((record) => record.data.type === DNS_TYPE.PTR)).toBe(true);

    const srv = records.find((record) => record.data.type === DNS_TYPE.SRV);
    expect(srv?.name).toBe(`stmarys.${SCHOOLPILOT_SERVICE}`);
    expect(srv?.data).toMatchObject({ port: 8443, target: 'stmarys.local' });

    const txt = records.find((record) => record.data.type === DNS_TYPE.TXT);
    expect(txt?.data).toEqual({
      type: DNS_TYPE.TXT,
      entries: expect.arrayContaining(['ver=1', 'tls=1', 'path=/', `fp=${'ab'.repeat(32)}`]),
    });

    const address = records.find((record) => record.data.type === DNS_TYPE.A);
    expect(address?.name).toBe('stmarys.local');
    expect(address?.data).toEqual({ type: DNS_TYPE.A, address: '192.168.1.20' });
  });

  it('answers a host query with the address, so a client can connect', async () => {
    const { port } = await advertise();
    const answer = decodeDnsMessage(await query(port, 'stmarys.local', DNS_TYPE.A));
    expect(answer.answers.map((record) => record.data)).toEqual([
      { type: DNS_TYPE.A, address: '192.168.1.20' },
    ]);
  });

  it('stays silent about another service', async () => {
    const { port } = await advertise();
    await expect(query(port, '_other._tcp.local', DNS_TYPE.PTR)).rejects.toThrow(/did not answer/);
  });

  it('publishes a zero lifetime when it says goodbye, and stops answering', async () => {
    const { advertiser } = await advertise();
    // The goodbye is the same record set with a zero lifetime; the send itself goes to the
    // multicast group, which a test on a machine without a multicast route cannot observe.
    expect(advertiser.records(0).answers.every((record) => record.ttl === 0)).toBe(true);
    expect(advertiser.records().answers.every((record) => record.ttl > 0)).toBe(true);

    await advertiser.stop();
    expect(advertiser.running).toBe(false);
    expect(advertiser.error).toBeNull();
  });
});

describe('naming', () => {
  it('turns a machine name into one mDNS label', () => {
    expect(mdnsLabel('DESKTOP-ABC')).toBe('desktop-abc');
    expect(mdnsLabel("St. Mary's School")).toBe('st-mary-s-school');
    expect(mdnsLabel('---')).toBe('schoolpilot');
    expect(mdnsHostName('St Marys')).toBe('st-marys.local');
  });
});

async function freeUdpPort(): Promise<number> {
  const socket = dgram.createSocket('udp4');
  const port = await new Promise<number>((resolve, reject) => {
    socket.once('error', reject);
    socket.bind(0, '0.0.0.0', () => {
      const address = socket.address();
      resolve(typeof address === 'string' ? 0 : address.port);
    });
  });
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  return port;
}
