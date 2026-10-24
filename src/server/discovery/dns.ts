// ABOUTME: The slice of DNS wire format mDNS needs: name encoding with compression decoding, the
// ABOUTME: four record types a hub advertises, and a message encoder and decoder for both sides.
//
// mDNS is DNS on 224.0.0.251:5353 with different defaults (RFC 6762), so there is no separate
// protocol here — only the record types a service advertisement uses and the rule that names inside
// mDNS record data are written out in full rather than compressed (RFC 6762 §18.14).

export const DNS_TYPE = {
  A: 1,
  PTR: 12,
  TXT: 16,
  AAAA: 28,
  SRV: 33,
  ANY: 255,
} as const;

export const DNS_CLASS = {
  IN: 1,
  ANY: 255,
} as const;

/** The class bit that asks for a unicast reply (RFC 6762 §5.4). */
const UNICAST_RESPONSE_BIT = 0x8000;

const FLAG_RESPONSE = 0x8000;
const FLAG_AUTHORITATIVE = 0x0400;

export interface DnsQuestion {
  readonly name: string;
  readonly type: number;
  /** True when the question carried the unicast-response bit. */
  readonly unicastResponse?: boolean;
}

export type DnsRecordData =
  | { readonly type: typeof DNS_TYPE.A; readonly address: string }
  | { readonly type: typeof DNS_TYPE.PTR; readonly target: string }
  | { readonly type: typeof DNS_TYPE.TXT; readonly entries: readonly string[] }
  | {
      readonly type: typeof DNS_TYPE.SRV;
      readonly priority: number;
      readonly weight: number;
      readonly port: number;
      readonly target: string;
    };

export interface DnsRecord {
  readonly name: string;
  readonly ttl: number;
  readonly data: DnsRecordData;
}

export interface DnsMessage {
  readonly id: number;
  readonly response: boolean;
  readonly authoritative: boolean;
  readonly questions: readonly DnsQuestion[];
  readonly answers: readonly DnsRecord[];
  readonly additionals: readonly DnsRecord[];
}

export class DnsFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DnsFormatError';
  }
}

/** Encodes a dotted name as a sequence of length-prefixed labels and a root. */
export function encodeDnsName(name: string): Buffer {
  const labels = name.replace(/\.$/, '').split('.');
  const parts: Buffer[] = [];
  for (const label of labels) {
    if (label.length === 0) continue;
    const bytes = Buffer.from(label, 'utf8');
    if (bytes.length > 63) throw new DnsFormatError(`the label "${label}" is longer than 63 bytes`);
    parts.push(Buffer.from([bytes.length]), bytes);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

/** Decodes a name at `offset`, following compression pointers, and reports where the name ended. */
export function decodeDnsName(buffer: Buffer, offset: number): { name: string; offset: number } {
  const labels: string[] = [];
  let cursor = offset;
  let end = -1;
  let hops = 0;

  for (;;) {
    if (cursor >= buffer.length) throw new DnsFormatError('a name runs past the end of the message');
    const length = buffer[cursor] ?? 0;

    if ((length & 0xc0) === 0xc0) {
      const pointer = ((length & 0x3f) << 8) | (buffer[cursor + 1] ?? 0);
      if (end === -1) end = cursor + 2;
      hops += 1;
      if (hops > 16) throw new DnsFormatError('a name points at itself');
      cursor = pointer;
      continue;
    }

    cursor += 1;
    if (length === 0) break;
    labels.push(buffer.subarray(cursor, cursor + length).toString('utf8'));
    cursor += length;
  }

  return { name: labels.join('.'), offset: end === -1 ? cursor : end };
}

/** Encodes a whole message: header, questions, answers and additionals. */
export function encodeDnsMessage(message: DnsMessage): Buffer {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(message.id & 0xffff, 0);
  let flags = 0;
  if (message.response) flags |= FLAG_RESPONSE;
  if (message.authoritative) flags |= FLAG_AUTHORITATIVE;
  header.writeUInt16BE(flags, 2);
  header.writeUInt16BE(message.questions.length, 4);
  header.writeUInt16BE(message.answers.length, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(message.additionals.length, 10);

  const parts: Buffer[] = [header];
  for (const question of message.questions) {
    const type = Buffer.alloc(4);
    type.writeUInt16BE(question.type, 0);
    type.writeUInt16BE(
      DNS_CLASS.IN | (question.unicastResponse === true ? UNICAST_RESPONSE_BIT : 0),
      2
    );
    parts.push(encodeDnsName(question.name), type);
  }
  for (const record of [...message.answers, ...message.additionals]) {
    parts.push(encodeDnsRecord(record));
  }
  return Buffer.concat(parts);
}

/** Decodes a message, refusing one that is truncated or malformed. */
export function decodeDnsMessage(buffer: Buffer): DnsMessage {
  if (buffer.length < 12) throw new DnsFormatError('the message is shorter than a DNS header');

  const id = buffer.readUInt16BE(0);
  const flags = buffer.readUInt16BE(2);
  const questionCount = buffer.readUInt16BE(4);
  const answerCount = buffer.readUInt16BE(6);
  const authorityCount = buffer.readUInt16BE(8);
  const additionalCount = buffer.readUInt16BE(10);

  let offset = 12;
  const questions: DnsQuestion[] = [];
  for (let index = 0; index < questionCount; index += 1) {
    const decoded = decodeDnsName(buffer, offset);
    offset = decoded.offset;
    const type = buffer.readUInt16BE(offset);
    const klass = buffer.readUInt16BE(offset + 2);
    offset += 4;
    questions.push({
      name: decoded.name,
      type,
      unicastResponse: (klass & UNICAST_RESPONSE_BIT) !== 0,
    });
  }

  const answers: DnsRecord[] = [];
  const additionals: DnsRecord[] = [];
  const total = answerCount + authorityCount + additionalCount;
  for (let index = 0; index < total; index += 1) {
    const decoded = decodeDnsName(buffer, offset);
    offset = decoded.offset;
    const type = buffer.readUInt16BE(offset);
    const ttl = buffer.readUInt32BE(offset + 4);
    const length = buffer.readUInt16BE(offset + 8);
    const start = offset + 10;
    const end = start + length;
    if (end > buffer.length) throw new DnsFormatError('a record runs past the end of the message');

    const record = decodeRecordData(decoded.name, type, buffer, start, length, ttl);
    if (record) {
      if (index < answerCount + authorityCount) answers.push(record);
      else additionals.push(record);
    }
    offset = end;
  }

  return {
    id,
    response: (flags & FLAG_RESPONSE) !== 0,
    authoritative: (flags & FLAG_AUTHORITATIVE) !== 0,
    questions,
    answers,
    additionals,
  };
}

function encodeDnsRecord(record: DnsRecord): Buffer {
  const rdata = encodeRecordData(record.data);
  const header = Buffer.alloc(10);
  header.writeUInt16BE(record.data.type, 0);
  header.writeUInt16BE(DNS_CLASS.IN, 2);
  header.writeUInt32BE(record.ttl, 4);
  header.writeUInt16BE(rdata.length, 8);
  return Buffer.concat([encodeDnsName(record.name), header, rdata]);
}

function encodeRecordData(data: DnsRecordData): Buffer {
  switch (data.type) {
    case DNS_TYPE.A:
      return Buffer.from(data.address.split('.').map((part) => Number(part)));
    case DNS_TYPE.PTR:
      return encodeDnsName(data.target);
    case DNS_TYPE.TXT: {
      const parts = data.entries.map((entry) => {
        const bytes = Buffer.from(entry, 'utf8');
        if (bytes.length > 255) throw new DnsFormatError('a TXT string is longer than 255 bytes');
        return Buffer.concat([Buffer.from([bytes.length]), bytes]);
      });
      return Buffer.concat(parts.length > 0 ? parts : [Buffer.from([0])]);
    }
    case DNS_TYPE.SRV: {
      const prefix = Buffer.alloc(6);
      prefix.writeUInt16BE(data.priority, 0);
      prefix.writeUInt16BE(data.weight, 2);
      prefix.writeUInt16BE(data.port, 4);
      return Buffer.concat([prefix, encodeDnsName(data.target)]);
    }
  }
}

/**
 * One record's data, or null for a type this decoder does not know.
 *
 * The name-bearing types read from the whole message, not from the record's own bytes, because a
 * compression pointer is an offset into the message. mDNS forbids compressing record data
 * (RFC 6762 §18.14), but other responders on the group do it anyway and a browse must not break.
 * Unknown types are skipped rather than refused for the same reason.
 */
function decodeRecordData(
  name: string,
  type: number,
  buffer: Buffer,
  start: number,
  length: number,
  ttl: number
): DnsRecord | null {
  const rdata = buffer.subarray(start, start + length);
  switch (type) {
    case DNS_TYPE.A:
      if (rdata.length !== 4) throw new DnsFormatError('an A record is not four bytes');
      return { name, ttl, data: { type, address: [...rdata].join('.') } };
    case DNS_TYPE.PTR:
      return { name, ttl, data: { type, target: decodeDnsName(buffer, start).name } };
    case DNS_TYPE.TXT: {
      const entries: string[] = [];
      let offset = 0;
      while (offset < rdata.length) {
        const entryLength = rdata[offset] ?? 0;
        offset += 1;
        entries.push(rdata.subarray(offset, offset + entryLength).toString('utf8'));
        offset += entryLength;
      }
      return { name, ttl, data: { type, entries } };
    }
    case DNS_TYPE.SRV:
      return {
        name,
        ttl,
        data: {
          type,
          priority: rdata.readUInt16BE(0),
          weight: rdata.readUInt16BE(2),
          port: rdata.readUInt16BE(4),
          target: decodeDnsName(buffer, start + 6).name,
        },
      };
    default:
      return null;
  }
}
