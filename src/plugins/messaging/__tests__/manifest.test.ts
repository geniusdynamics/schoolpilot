// ABOUTME: Tests for the messaging plug-in manifest: it validates against the SDK schema, the code and
// ABOUTME: the plugin.json agree, no secret is declared as a setting, and the factory selects the
// ABOUTME: adapter the settings name.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SDK_VERSION, isCompatible, validateManifest } from '@/plugins/sdk';

import defaultExport, { messagingManifest } from '../index';
import { createMessagingProvider, readMessagingSettings } from '../settings';

import { createRecorderTransport, createSmtpRecorder } from './recorder';

const PLUGIN_JSON = resolve(process.cwd(), 'src/plugins/messaging/plugin.json');

function pluginJson(): Record<string, unknown> {
  return JSON.parse(readFileSync(PLUGIN_JSON, 'utf8')) as Record<string, unknown>;
}

describe('the messaging manifest', () => {
  it('validates against the SDK schema and is compatible with the running SDK', () => {
    const result = validateManifest(pluginJson());
    if (!result.success) throw new Error(JSON.stringify(result.issues));

    expect(result.manifest.id).toBe('builtin-messaging');
    expect(result.manifest.type).toBe('integration');
    expect(isCompatible(result.manifest, SDK_VERSION)).toBe(true);
  });

  it('is the same manifest the loader receives', () => {
    expect(defaultExport.manifest).toBe(messagingManifest);
    expect(messagingManifest).toEqual(pluginJson());
  });

  it('offers the four adapters as one provider setting', () => {
    const setting = messagingManifest.settings?.find((entry) => entry.key === 'provider');
    expect(setting?.type).toBe('select');
    expect(setting?.defaultValue).toBe('africas-talking');
    expect(setting?.options?.map((option) => option.value)).toEqual([
      'africas-talking',
      'twilio',
      'whatsapp',
      'smtp',
    ]);
  });

  it('declares configuration, never a credential', () => {
    const keys = (messagingManifest.settings ?? []).map((setting) => setting.key);
    for (const key of keys) {
      expect(key).not.toMatch(/apikey|api_key|token|secret|password/i);
    }
    expect(keys).toEqual(
      expect.arrayContaining([
        'provider',
        'senderId',
        'atUsername',
        'twilioAccountSid',
        'whatsappPhoneNumberId',
        'smtpFromAddress',
      ])
    );
  });
});

describe('settings and provider selection', () => {
  it('reads the settings the host hands the plug-in', () => {
    const settings = readMessagingSettings({ provider: 'twilio', twilioAccountSid: 'AC123' });
    expect(settings.provider).toBe('twilio');
    expect(settings.twilioAccountSid).toBe('AC123');
  });

  it('defaults the provider and the provider-specific defaults', () => {
    const settings = readMessagingSettings({});
    expect(settings.provider).toBe('africas-talking');
    expect(settings.atBaseUrl).toBe('https://api.africastalking.com');
    expect(settings.whatsappApiVersion).toBe('v23.0');
    expect(settings.whatsappDefaultLanguage).toBe('en');
  });

  it('refuses a provider name that is not one of the four', () => {
    expect(() => readMessagingSettings({ provider: 'carrier-pigeon' })).toThrow(/carrier-pigeon/);
  });

  it('builds the adapter the settings name', () => {
    const http = createRecorderTransport();
    const smtp = createSmtpRecorder();

    expect(
      createMessagingProvider({
        settings: readMessagingSettings({
          provider: 'africas-talking',
          atUsername: 'schoolpilot',
          senderId: 'GREENACRES',
        }),
        secrets: { africastalkingApiKey: 'key' },
        http,
      })
    ).toMatchObject({ id: 'africas-talking', channel: 'sms' });

    expect(
      createMessagingProvider({
        settings: readMessagingSettings({
          provider: 'twilio',
          twilioAccountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          twilioFrom: '+14155552345',
        }),
        secrets: { twilioAuthToken: 'token' },
        http,
      })
    ).toMatchObject({ id: 'twilio', channel: 'sms' });

    expect(
      createMessagingProvider({
        settings: readMessagingSettings({
          provider: 'whatsapp',
          whatsappPhoneNumberId: '106540352242922',
        }),
        secrets: { whatsappAccessToken: 'token', whatsappAppSecret: 'secret' },
        http,
      })
    ).toMatchObject({ id: 'whatsapp', channel: 'whatsapp' });

    expect(
      createMessagingProvider({
        settings: readMessagingSettings({
          provider: 'smtp',
          smtpFromAddress: 'office@greenacres.example',
        }),
        secrets: {},
        smtp,
      })
    ).toMatchObject({ id: 'smtp', channel: 'email' });
  });

  it('names the setting it needs rather than failing at the first send', () => {
    expect(() =>
      createMessagingProvider({
        settings: readMessagingSettings({ provider: 'africas-talking' }),
        secrets: {},
        http: createRecorderTransport(),
      })
    ).toThrow(/atUsername/);
  });
});
