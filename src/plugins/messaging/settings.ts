// ABOUTME: The messaging plug-in's typed settings and the factory that turns them plus the deployment
// ABOUTME: credentials into the adapter the school has selected.

import { createAfricasTalkingProvider } from './providers/africas-talking';
import { createSmtpProvider, type SmtpTransport } from './providers/smtp';
import { createTwilioProvider } from './providers/twilio';
import { createFetchTransport, type HttpTransport } from './providers/transport';
import { createWhatsAppProvider } from './providers/whatsapp';
import { MessagingError, type MessagingProvider } from './types';

/** The adapters this plug-in ships. The manifest offers exactly these. */
export const MESSAGING_PROVIDERS = ['africas-talking', 'twilio', 'whatsapp', 'smtp'] as const;

export type MessagingProviderName = (typeof MESSAGING_PROVIDERS)[number];

/**
 * The non-secret configuration, as the manifest declares it.
 *
 * Every field is a setting: it lives in the institution's database row and is readable through the
 * app. Credentials are deliberately absent - they come from `MessagingSecrets`, which the host
 * reads from the deployment configuration.
 */
export interface MessagingSettings {
  readonly provider: MessagingProviderName;
  readonly senderId?: string;
  readonly atUsername?: string;
  readonly atBaseUrl: string;
  readonly atDeliveryReportIpAllowlist?: string;
  readonly twilioAccountSid?: string;
  readonly twilioFrom?: string;
  readonly twilioMessagingServiceSid?: string;
  readonly twilioStatusCallbackUrl?: string;
  readonly whatsappPhoneNumberId?: string;
  readonly whatsappApiVersion: string;
  readonly whatsappDefaultLanguage: string;
  readonly smtpFromAddress?: string;
  readonly smtpFromName?: string;
  readonly smtpMessageIdDomain?: string;
}

/** The credentials, read from the deployment configuration rather than from a setting. */
export interface MessagingSecrets {
  readonly africastalkingApiKey?: string;
  readonly twilioAuthToken?: string;
  readonly whatsappAccessToken?: string;
  readonly whatsappAppSecret?: string;
}

/** The values the manifest declares as defaults. */
export const MESSAGING_SETTING_DEFAULTS = {
  provider: 'africas-talking',
  atBaseUrl: 'https://api.africastalking.com',
  whatsappApiVersion: 'v23.0',
  whatsappDefaultLanguage: 'en',
} as const;

function optionalString(
  raw: Readonly<Record<string, unknown>>,
  key: string
): string | undefined {
  const value = raw[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** Reads the settings the host hands the plug-in, applying the manifest's defaults. */
export function readMessagingSettings(
  raw: Readonly<Record<string, unknown>>
): MessagingSettings {
  const provider = optionalString(raw, 'provider') ?? MESSAGING_SETTING_DEFAULTS.provider;
  if (!(MESSAGING_PROVIDERS as readonly string[]).includes(provider)) {
    throw new MessagingError(
      'payload_invalid',
      `"${provider}" is not a messaging provider; use one of ${MESSAGING_PROVIDERS.join(', ')}`
    );
  }

  return {
    provider: provider as MessagingProviderName,
    senderId: optionalString(raw, 'senderId'),
    atUsername: optionalString(raw, 'atUsername'),
    atBaseUrl: optionalString(raw, 'atBaseUrl') ?? MESSAGING_SETTING_DEFAULTS.atBaseUrl,
    atDeliveryReportIpAllowlist: optionalString(raw, 'atDeliveryReportIpAllowlist'),
    twilioAccountSid: optionalString(raw, 'twilioAccountSid'),
    twilioFrom: optionalString(raw, 'twilioFrom'),
    twilioMessagingServiceSid: optionalString(raw, 'twilioMessagingServiceSid'),
    twilioStatusCallbackUrl: optionalString(raw, 'twilioStatusCallbackUrl'),
    whatsappPhoneNumberId: optionalString(raw, 'whatsappPhoneNumberId'),
    whatsappApiVersion:
      optionalString(raw, 'whatsappApiVersion') ?? MESSAGING_SETTING_DEFAULTS.whatsappApiVersion,
    whatsappDefaultLanguage:
      optionalString(raw, 'whatsappDefaultLanguage') ??
      MESSAGING_SETTING_DEFAULTS.whatsappDefaultLanguage,
    smtpFromAddress: optionalString(raw, 'smtpFromAddress'),
    smtpFromName: optionalString(raw, 'smtpFromName'),
    smtpMessageIdDomain: optionalString(raw, 'smtpMessageIdDomain'),
  };
}

/** What the factory needs. The transports are injected, so a test never opens a socket. */
export interface CreateMessagingProviderOptions {
  readonly settings: MessagingSettings;
  readonly secrets: MessagingSecrets;
  readonly http?: HttpTransport;
  readonly smtp?: SmtpTransport;
  readonly now?: () => Date;
}

/**
 * Builds the adapter the settings name.
 *
 * One plug-in with a provider setting, rather than one plug-in per provider: a school swaps
 * providers at the settings, the outbox and the template renderer are written once, and the
 * dead-letter view is one view. The credentials stay out of the settings, so switching provider is
 * a settings change plus a deployment secret.
 */
export function createMessagingProvider(
  options: CreateMessagingProviderOptions
): MessagingProvider {
  const { settings, secrets } = options;
  const http = options.http ?? createFetchTransport();

  switch (settings.provider) {
    case 'africas-talking':
      return createAfricasTalkingProvider({
        config: {
          username: settings.atUsername ?? '',
          apiKey: secrets.africastalkingApiKey ?? '',
          senderId: settings.senderId,
          baseUrl: settings.atBaseUrl,
          deliveryReportIpAllowlist: settings.atDeliveryReportIpAllowlist
            ?.split(',')
            .map((address) => address.trim())
            .filter((address) => address !== ''),
        },
        transport: http,
      });

    case 'twilio':
      return createTwilioProvider({
        config: {
          accountSid: settings.twilioAccountSid ?? '',
          authToken: secrets.twilioAuthToken ?? '',
          from: settings.twilioFrom,
          messagingServiceSid: settings.twilioMessagingServiceSid,
          statusCallbackUrl: settings.twilioStatusCallbackUrl,
        },
        transport: http,
      });

    case 'whatsapp':
      return createWhatsAppProvider({
        config: {
          phoneNumberId: settings.whatsappPhoneNumberId ?? '',
          accessToken: secrets.whatsappAccessToken ?? '',
          appSecret: secrets.whatsappAppSecret,
          apiVersion: settings.whatsappApiVersion,
          defaultLanguage: settings.whatsappDefaultLanguage,
        },
        transport: http,
      });

    case 'smtp': {
      if (!options.smtp) {
        throw new MessagingError(
          'config_missing',
          'the SMTP provider needs an injected SMTP transport, and none was given'
        );
      }
      return createSmtpProvider({
        config: {
          fromAddress: settings.smtpFromAddress ?? '',
          fromName: settings.smtpFromName,
          messageIdDomain: settings.smtpMessageIdDomain,
        },
        transport: options.smtp,
        now: options.now,
      });
    }
  }
}
