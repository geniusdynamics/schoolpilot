import { logger } from '@/utils/logging';

/**
 * SMS Provider Mock Plugin
 * 
 * Mock implementation of the SMSPlugin interface for development and testing.
 * Simulates SMS sending with configurable success rates and generates fake
 * message IDs. No real SMS messages are sent.
 */

import type {
  SMSPlugin,
  SMSResult,
  BulkSMSResult,
  PluginManifest,
  PluginModule,
  PluginContext,
} from '../../types';

// ============================================================================
// Helpers
// ============================================================================

/** Generate a fake message ID in the format MSG-XXXXXXXX */
function generateMessageId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MSG-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Simulate a random success/failure with the given success rate (0-1) */
function simulateSuccess(successRate: number): boolean {
  return Math.random() < successRate;
}

/** Simulate async delay to mimic real network latency */
function simulateDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Replace template variables in a message string */
function applyTemplate(template: string, params: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(regex, String(value));
  }
  // Replace any remaining unresolved placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '[missing]');
  return result;
}

// ============================================================================
// Mock Data
// ============================================================================

const SUCCESS_RATE = 0.95; // 95% success rate

const MOCK_TEMPLATES: Record<string, string> = {
  'fee-reminder': 'Dear {{parentName}}, this is a reminder that the school fee of {{amount}} for {{studentName}} is due on {{dueDate}}. Please pay at your earliest convenience.',
  'attendance-alert': 'Alert: {{studentName}} was absent from school on {{date}}. Please contact the school office if you have any concerns.',
  'exam-results': 'Dear {{parentName}}, {{studentName}}\'s exam results are now available. Average score: {{averageScore}}%. Login to the portal to view the full report.',
  'event-notification': 'Dear {{parentName}}, you are invited to {{eventName}} on {{eventDate}} at {{eventTime}}. Venue: {{venue}}. We look forward to seeing you.',
  'welcome': 'Welcome to SchoolPilot, {{studentName}}! Your student account has been created. Student ID: {{studentId}}. Login details have been sent to your email.',
};

/** In-memory store of sent messages for status tracking */
const messageStore: Map<string, { status: 'sent' | 'failed' | 'pending' | 'delivered'; recipient: string; message: string }> = new Map();

// ============================================================================
// Mock SMS Plugin Implementation
// ============================================================================

export const smsMockPlugin: SMSPlugin = {
  /**
   * Send a mock SMS to a single recipient.
   */
  async send(phone: string, message: string): Promise<SMSResult> {
    logger.info('[SMS Mock] send called:', { phone, messageLength: message.length });

    await simulateDelay();

    const messageId = generateMessageId();
    const success = simulateSuccess(SUCCESS_RATE);

    const status: SMSResult['status'] = success ? 'sent' : 'failed';
    const statusMessage = success
      ? `Mock SMS sent to ${phone}`
      : `Mock SMS failed: Network error`;

    messageStore.set(messageId, {
      status: success ? 'sent' : 'failed',
      recipient: phone,
      message,
    });

    logger.info(`[SMS Mock] Message ${messageId} -> ${phone}: ${status}`);

    return {
      success,
      messageId,
      status,
      recipient: phone,
      message: statusMessage,
    };
  },

  /**
   * Send mock SMS to multiple recipients. Each send is simulated individually.
   */
  async bulkSend(recipients: string[], message: string): Promise<BulkSMSResult> {
    logger.info(`[SMS Mock] bulkSend called: ${recipients.length} recipients, message length: ${message.length}`);

    const results: SMSResult[] = [];

    for (const phone of recipients) {
      const result = await this.send(phone, message);
      results.push(result);
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    logger.info(`[SMS Mock] bulkSend complete: ${successful}/${results.length} successful, ${failed} failed`);

    return {
      total: recipients.length,
      successful,
      failed,
      results,
    };
  },

  /**
   * Send a mock SMS using a pre-defined template with variable substitution.
   */
  async sendTemplate(
    phone: string,
    templateId: string,
    params: Record<string, any>
  ): Promise<SMSResult> {
    logger.info('[SMS Mock] sendTemplate called:', { phone, templateId, params });

    const template = MOCK_TEMPLATES[templateId];
    if (!template) {
      logger.warn(`[SMS Mock] Template "${templateId}" not found. Available: ${Object.keys(MOCK_TEMPLATES).join(', ')}`);
      return {
        success: false,
        messageId: generateMessageId(),
        status: 'failed',
        recipient: phone,
        message: `Template "${templateId}" not found`,
      };
    }

    const renderedMessage = applyTemplate(template, params);
    logger.info(`[SMS Mock] Template rendered (${templateId}): "${renderedMessage.substring(0, 60)}..."`);

    return this.send(phone, renderedMessage);
  },

  /**
   * Get the delivery status of a previously sent mock SMS.
   */
  async getDeliveryStatus(messageId: string): Promise<string> {
    logger.info(`[SMS Mock] getDeliveryStatus called: ${messageId}`);

    await simulateDelay(50, 200);

    const entry = messageStore.get(messageId);
    if (!entry) {
      logger.info(`[SMS Mock] Message ${messageId} NOT FOUND`);
      return 'not_found';
    }

    // Simulate delivery progression: sent -> delivered (or stays pending)
    if (entry.status === 'sent') {
      // 80% chance of being delivered if originally sent
      if (simulateSuccess(0.8)) {
        entry.status = 'delivered';
        logger.info(`[SMS Mock] Message ${messageId}: delivered`);
        return 'delivered';
      }
      logger.info(`[SMS Mock] Message ${messageId}: still pending`);
      return 'pending';
    }

    if (entry.status === 'failed') {
      logger.info(`[SMS Mock] Message ${messageId}: failed`);
      return 'failed';
    }

    logger.info(`[SMS Mock] Message ${messageId}: ${entry.status}`);
    return entry.status;
  },
};

// ============================================================================
// Plugin Manifest
// ============================================================================

export const smsMockManifest: PluginManifest = {
  id: 'com.schoolpilot.sms-mock',
  name: 'SMS Provider (Mock)',
  version: '1.0.0',
  type: 'integration',
  category: 'builtin',
  entry: './index.ts',
  description: 'Mock SMS provider for development and testing. Simulates sending SMS messages with configurable success rates without sending real messages.',
  author: 'SchoolPilot3 Team',
  license: 'MIT',

  provides: [
    'sms.send',
    'sms.bulkSend',
    'sms.template',
    'sms.status',
  ],

  settings: [
    {
      key: 'successRate',
      label: 'Mock Success Rate',
      type: 'number',
      defaultValue: 0.95,
      description: 'Probability of a mock SMS being sent successfully (0.0 - 1.0)',
      validation: { min: 0, max: 1 },
    },
  ],

  privileges: {
    dataRead: ['students', 'parents', 'staff'],
    dataWrite: ['sms_logs'],
    uiInject: false,
    menuModify: false,
    settingsAccess: true,
    networkAccess: false,
    fileSystemAccess: false,
    executeCode: false,
  },
};

// ============================================================================
// Plugin Module
// ============================================================================

const module: PluginModule = {
  async activate(context: PluginContext) {
    logger.info('[SMS Mock Plugin] Activating...');
    logger.info('[SMS Mock Plugin] Available templates:', Object.keys(MOCK_TEMPLATES).join(', '));
    logger.info('[SMS Mock Plugin] This is a MOCK provider â€” no real SMS messages will be sent.');
  },

  async deactivate() {
    logger.info('[SMS Mock Plugin] Deactivated.');
    messageStore.clear();
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  manifest: smsMockManifest,
  module,
  plugin: smsMockPlugin,
};
