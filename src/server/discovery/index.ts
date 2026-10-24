// ABOUTME: Public surface of the hub's LAN discovery: the mDNS responder a hub runs, the browse a
// ABOUTME: client runs, and the wire codec both use.

export {
  advertisementFor,
  ADVERTISEMENT_TTL_SECONDS,
  discoverHubs,
  HUB_PROTOCOL_VERSION,
  MDNS_ADDRESS,
  MDNS_PORT,
  MdnsAdvertiser,
  SCHOOLPILOT_SERVICE,
  type DiscoveredHub,
  type DiscoveryOptions,
  type HubAdvertisement,
  type MdnsAdvertiserOptions,
} from './mdns';

export {
  decodeDnsMessage,
  decodeDnsName,
  DNS_CLASS,
  DNS_TYPE,
  DnsFormatError,
  encodeDnsMessage,
  encodeDnsName,
  type DnsMessage,
  type DnsQuestion,
  type DnsRecord,
  type DnsRecordData,
} from './dns';
