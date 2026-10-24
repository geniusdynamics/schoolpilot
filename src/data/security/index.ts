// ABOUTME: Public surface of the restricted-data layer: the classification, the redaction the
// ABOUTME: audit trail applies, and the cipher contract the row codec seals values through.

export {
  REDACTED_MARKER,
  RESTRICTED_FIELDS,
  redactRestricted,
  restrictedFieldsIn,
  restrictedFieldsOf,
} from './restrictedData';

export {
  RestrictedDataError,
  SEALED_PREFIX,
  type FieldCipher,
  type RestrictedDataErrorCode,
} from './fieldCipher';
