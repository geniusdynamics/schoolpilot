// ABOUTME: Public surface of the hub's TLS material: the certificate store on disk and the
// ABOUTME: self-signed issuer that fills it when the school has none of its own.

export {
  certificatePaths,
  DEFAULT_RENEW_BEFORE_DAYS,
  ensureHubCertificate,
  fingerprintOf,
  readHubCertificate,
  type EnsureHubCertificateOptions,
  type HubCertificate,
} from './store';

export {
  createSelfSignedCertificate,
  MAX_CERTIFICATE_DAYS,
  type IssuedCertificate,
  type SelfSignedCertificateRequest,
} from './selfSigned';
