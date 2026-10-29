// ABOUTME: The recorded provider payloads the messaging tests read, each with the documentation page it
// ABOUTME: was transcribed from and which values this repo substituted, so no test claims a live capture.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Vitest runs with the repository root as its working directory.
const FIXTURES = resolve(process.cwd(), 'src/plugins/messaging/__tests__/fixtures');

/** How a fixture was obtained. */
export type PayloadSource = 'provider-documentation';

/** What a recorded payload is, and where it came from. */
export interface RecordedPayload {
  readonly name: string;
  readonly file: string;
  readonly source: PayloadSource;
  readonly provider: string;
  /** The API the payload belongs to, as the documentation names it. */
  readonly api: string;
  /** The documentation page the shape was transcribed from. */
  readonly recordedFrom: string;
  /** The field names and shapes that are documented and were left unchanged. */
  readonly documented: string;
  /** The values that are this repo\'s own rather than the documentation's sample, and why. */
  readonly substituted: readonly string[];
  /** Anything not in the documentation at all and inferred from it. */
  readonly inferred: readonly string[];
}

const AT_DOCS = 'https://developers.africastalking.com/docs/sms/sending/bulk';
const AT_REPORTS = 'https://developers.africastalking.com/docs/sms/notifications';
const TWILIO_MESSAGES = 'https://www.twilio.com/docs/messaging/api/message-resource';
const TWILIO_WEBHOOKS = 'https://www.twilio.com/docs/messaging/guides/webhook-request';
const WHATSAPP_SEND = 'https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages';
const WHATSAPP_WEBHOOKS =
  'https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples';

/**
 * Every fixture the messaging tests read.
 *
 * **No payload here was captured from a live provider**: a test may not call the network, and this
 * environment holds no provider credentials. Each JSON body is the sample the provider publishes,
 * transcribed field for field; each form-encoded body is built from the provider's documented field
 * table because the provider publishes no complete sample body. `substituted` names every value
 * this repo chose, and `inferred` names anything that is not in the documentation at all.
 */
export const RECORDED_PAYLOADS: readonly RecordedPayload[] = [
  {
    name: 'africas-talking-send-response',
    file: 'africas-talking-send-response.json',
    source: 'provider-documentation',
    provider: "Africa's Talking",
    api: 'Send Bulk SMS - response',
    recordedFrom: `${AT_DOCS} - the published example response body`,
    documented:
      'SMSMessageData.Message, SMSMessageData.Recipients[].statusCode, number, status, cost, messageId',
    substituted: [],
    inferred: [],
  },
  {
    name: 'africas-talking-send-refused',
    file: 'africas-talking-send-refused.json',
    source: 'provider-documentation',
    provider: "Africa's Talking",
    api: 'Send Bulk SMS - response, a refused recipient',
    recordedFrom: `${AT_DOCS} - the documented statusCode 403 InvalidPhoneNumber, in the shape of the published example response`,
    documented:
      'statusCode 403 is documented as InvalidPhoneNumber; the response envelope is the published one',
    substituted: [
      'status: "InvalidPhoneNumber", statusCode: 403 and "Sent to 0/1 Total Cost: 0" - the documentation publishes no complete body for this case; the values are its documented table entries in its published envelope',
    ],
    inferred: [],
  },
  {
    name: 'africas-talking-delivery-report',
    file: 'africas-talking-delivery-report.form',
    source: 'provider-documentation',
    provider: "Africa's Talking",
    api: 'SMS Notifications - delivery report',
    recordedFrom: `${AT_REPORTS} - the "Delivery Report notification contents" field table and its status list`,
    documented:
      'id, status, phoneNumber, networkCode, failureReason, retryCount; status values Success, Sent, Submitted, Buffered, Rejected, Failed, AbsentSubscriber, Expired',
    substituted: [
      'the delivered body is this repo\'s own form-encoded assembly of the documented fields; the documentation publishes the fields but no sample body',
    ],
    inferred: [],
  },
  {
    name: 'africas-talking-delivery-report-failed',
    file: 'africas-talking-delivery-report-failed.form',
    source: 'provider-documentation',
    provider: "Africa's Talking",
    api: 'SMS Notifications - delivery report, a failure',
    recordedFrom: `${AT_REPORTS} - the documented failure status and failureReason values`,
    documented: 'status Failed; failureReason UserInBlackList; retryCount',
    substituted: ['the delivered body is this repo\'s own assembly of the documented fields'],
    inferred: [],
  },
  {
    name: 'twilio-send-response',
    file: 'twilio-send-response.json',
    source: 'provider-documentation',
    provider: 'Twilio',
    api: 'Message resource - create a Message, response',
    recordedFrom: `${TWILIO_MESSAGES} - the published Message resource example`,
    documented:
      'account_sid, api_version, body, date_created, date_sent, date_updated, direction, error_code, error_message, from, num_media, num_segments, price, price_unit, messaging_service_sid, sid, status, subresource_uris, to, uri',
    substituted: [],
    inferred: [],
  },
  {
    name: 'twilio-message-delivered',
    file: 'twilio-message-delivered.json',
    source: 'provider-documentation',
    provider: 'Twilio',
    api: 'Message resource - fetch a Message, delivered',
    recordedFrom: `${TWILIO_MESSAGES} - the published Message resource example with its documented status changed to delivered`,
    documented:
      'the whole Message resource shape; the documented status values include delivered, and date_sent and date_updated are documented properties',
    substituted: [
      'status: "delivered" and the body text - the published example shows status queued and its own sample body; every other field is the published example',
    ],
    inferred: [],
  },
  {
    name: 'twilio-status-callback',
    file: 'twilio-status-callback.form',
    source: 'provider-documentation',
    provider: 'Twilio',
    api: 'Message status callback - delivered',
    recordedFrom: `${TWILIO_MESSAGES} and ${TWILIO_WEBHOOKS} - the documented MessageStatus and standard request parameters`,
    documented: 'MessageSid, MessageStatus, AccountSid, From, To; MessageStatus delivered',
    substituted: [
      'the body is this repo\'s own form-encoded assembly of the documented parameters; Twilio publishes the parameters but no sample body in these pages',
    ],
    inferred: [],
  },
  {
    name: 'twilio-status-callback-undelivered',
    file: 'twilio-status-callback-undelivered.form',
    source: 'provider-documentation',
    provider: 'Twilio',
    api: 'Message status callback - undelivered',
    recordedFrom: `${TWILIO_MESSAGES} - the documented MessageStatus values and the ErrorCode/ErrorMessage that accompany a failure`,
    documented:
      'MessageStatus undelivered; ErrorCode and ErrorMessage accompany failed or undelivered',
    substituted: [
      'ErrorCode 30003 and its message text are the documented Twilio error example, in this repo\'s own form-encoded assembly',
    ],
    inferred: [],
  },
  {
    name: 'whatsapp-send-response',
    file: 'whatsapp-send-response.json',
    source: 'provider-documentation',
    provider: 'WhatsApp Business (Meta Cloud API)',
    api: 'Messages API - send a message, response',
    recordedFrom: `${WHATSAPP_SEND} - the response syntax body and its documented sample ids`,
    documented:
      'messaging_product, contacts[].input, contacts[].wa_id, messages[].id, messages[].message_status (template pacing only)',
    substituted: [],
    inferred: [],
  },
  {
    name: 'whatsapp-status-delivered',
    file: 'whatsapp-status-delivered.json',
    source: 'provider-documentation',
    provider: 'WhatsApp Business (Meta Cloud API)',
    api: 'Messages webhook - a delivered status',
    recordedFrom: `${WHATSAPP_WEBHOOKS} - the outgoing-messages delivered example`,
    documented:
      'object, entry[].id, entry[].changes[].field, value.messaging_product, value.metadata.display_phone_number, value.metadata.phone_number_id, value.statuses[].id, status, timestamp, recipient_id, conversation, pricing',
    substituted: [],
    inferred: [],
  },
  {
    name: 'whatsapp-status-failed',
    file: 'whatsapp-status-failed.json',
    source: 'provider-documentation',
    provider: 'WhatsApp Business (Meta Cloud API)',
    api: 'Messages webhook - a failed status',
    recordedFrom: `${WHATSAPP_WEBHOOKS} - the documented statuses[] shape and its errors section`,
    documented: 'value.statuses[].errors[].code, title, message, error_data.details; status failed',
    substituted: [
      'code 131047 and its wording are the documented example error; this repo assembled the body around it because the delivered example publishes no failed variant',
    ],
    inferred: [],
  },
];

/** The exact text of a recorded payload. */
export function readPayload(name: string): string {
  const entry = RECORDED_PAYLOADS.find((payload) => payload.name === name);
  if (!entry) throw new Error(`there is no recorded payload named "${name}"`);
  return readFileSync(resolve(FIXTURES, entry.file), 'utf8');
}

/** A recorded JSON payload as an object. */
export function payload(name: string): Record<string, unknown> {
  return JSON.parse(readPayload(name)) as Record<string, unknown>;
}
