// ABOUTME: The M-Pesa Daraja plug-in: its manifest, its lifecycle module and the provider the seam
// ABOUTME: registers, assembled the way this repo's integration plug-ins are (a default export of
// ABOUTME: `{ manifest, module, plugin }`).

import type { PluginContext, PluginManifest, PluginModule } from '@/plugins/types';

import { loadDarajaCredentials, redactDarajaCredentials } from './credentials';
import { createMpesaProvider, MPESA_PROVIDER_ID, type MpesaProvider } from './provider';

export * from './credentials';
export * from './daraja';
export * from './payloads';
export * from './provider';

/**
 * The plug-in manifest.
 *
 * The settings are the **non-secret** ones: which Daraja deployment to talk to and where the
 * callbacks are mounted. The consumer key, the consumer secret, the passkey and the B2C security
 * credential are deliberately not settings: a setting lives in the institution's database row and
 * would be readable through the app, so the credentials are read from the deployment configuration
 * instead (see `credentials.ts`).
 */
export const mpesaManifest: PluginManifest = {
  id: `com.schoolpilot.${MPESA_PROVIDER_ID}`,
  name: 'M-Pesa (Safaricom Daraja)',
  version: '1.0.0',
  type: 'integration',
  category: 'builtin',
  entry: './index.ts',
  description:
    'Takes M-Pesa payments through Safaricom Daraja: STK push, C2B confirmation and validation callbacks, B2C refunds, and a status query for a device that was offline when a callback fired.',
  author: 'SchoolPilot3 Team',
  license: 'MIT',

  provides: [
    'payment.collection.mpesa',
    'payment.notification.mpesa',
    'payment.refund.mpesa',
    'payment.query.mpesa',
  ],

  settings: [
    {
      key: 'environment',
      label: 'Daraja deployment',
      type: 'select',
      defaultValue: 'sandbox',
      description: 'Which Daraja deployment the integration talks to.',
      options: [
        { label: 'Sandbox', value: 'sandbox' },
        { label: 'Production', value: 'production' },
      ],
    },
    {
      key: 'shortCode',
      label: 'Paybill / till number',
      type: 'string',
      required: true,
      description: 'The short code the money is collected into.',
    },
    {
      key: 'callbackBaseUrl',
      label: 'Callback base URL',
      type: 'string',
      description:
        'The public base URL the hub or server is reachable at; the callback routes are mounted under it.',
    },
  ],

  privileges: {
    dataRead: ['payments', 'learners', 'invoices'],
    dataWrite: ['payments'],
    uiInject: false,
    menuModify: false,
    settingsAccess: true,
    networkAccess: true,
    fileSystemAccess: false,
    executeCode: false,
  },
};

/** What the plug-in builds when it activates. */
export interface MpesaPluginApi {
  readonly provider: MpesaProvider;
  readonly callbackRoutes: readonly string[];
}

/**
 * The plug-in module.
 *
 * Activation reads the credentials from the deployment configuration and builds the provider. It
 * logs the **redacted** credentials only: the shape of the configuration, never a secret.
 */
const module: PluginModule = {
  activate(context: PluginContext): void {
    const credentials = loadDarajaCredentials(readDeploymentEnv());
    const provider = createMpesaProvider({ credentials });
    context.api.setSetting('providerId', provider.describe().id);
    context.api.setSetting('credentialShape', redactDarajaCredentials(credentials));
  },
};

/**
 * The deployment environment the credentials are read from.
 *
 * The hub/server passes its own environment in; in a browser bundle there is no such environment,
 * which is the point: a browser has no business holding a Daraja consumer secret.
 */
function readDeploymentEnv(): Readonly<Record<string, string | undefined>> {
  const globalEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  return globalEnv ?? {};
}

/** The plug-in, in the shape the builtin loader expects. */
export default {
  manifest: mpesaManifest,
  module,
};
