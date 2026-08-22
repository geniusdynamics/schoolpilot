import { logger } from '@/utils/logging';

/**
 * Payment Gateway Mock Plugin
 * 
 * Mock implementation of the PaymentPlugin interface for development and testing.
 * Simulates payment flow with configurable success rates and generates fake
 * transaction IDs. No real payment processing occurs.
 */

import type {
  PaymentPlugin,
  PaymentParams,
  PaymentResult,
  PluginManifest,
  PluginModule,
  PluginContext,
} from '../../types';

// ============================================================================
// Helpers
// ============================================================================

/** Generate a fake transaction ID in the format TXN-XXXXXXXX */
function generateTransactionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TXN-';
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
function simulateDelay(minMs: number = 200, maxMs: number = 800): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ============================================================================
// Mock Payment Plugin Implementation
// ============================================================================

const SUCCESS_RATE = 0.9; // 90% success rate

const SUPPORTED_METHODS = ['M-Pesa', 'Card', 'Bank Transfer', 'Cash'];

/** In-memory store of simulated transactions for verification */
const transactionStore: Map<string, PaymentResult> = new Map();

export const paymentMockPlugin: PaymentPlugin = {
  /**
   * Initiate a mock payment. Simulates processing with 90% success rate.
   */
  async initiatePayment(params: PaymentParams): Promise<PaymentResult> {
    logger.info('[Payment Mock] initiatePayment called:', {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      studentId: params.studentId,
      invoiceId: params.invoiceId,
    });

    await simulateDelay();

    const transactionId = generateTransactionId();
    const success = simulateSuccess(SUCCESS_RATE);

    let status: PaymentResult['status'];
    let message: string;
    let redirectUrl: string | undefined;

    if (success) {
      status = 'completed';
      message = `Mock payment of ${params.currency} ${params.amount} completed successfully.`;
      logger.info(`[Payment Mock] Transaction ${transactionId} COMPLETED`);
    } else {
      // Randomly choose failure reason
      const failureReasons = [
        'Insufficient funds',
        'Payment declined by provider',
        'Network timeout',
        'Transaction cancelled by user',
      ] as const;
      const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
      message = `Mock payment failed: ${reason}`;

      if (reason === 'Transaction cancelled by user') {
        status = 'cancelled';
      } else {
        status = 'failed';
      }
      logger.info(`[Payment Mock] Transaction ${transactionId} FAILED: ${reason}`);
    }

    // Simulate redirect-based payment for card payments
    if (params.metadata?.method === 'Card') {
      redirectUrl = `https://mock-payment.example.com/pay/${transactionId}`;
      status = status === 'completed' ? 'completed' : 'pending';
    }

    const result: PaymentResult = {
      success,
      transactionId,
      status,
      provider: 'payment-mock',
      message,
      redirectUrl,
    };

    // Store for later verification
    transactionStore.set(transactionId, result);

    return result;
  },

  /**
   * Verify a mock payment by checking the in-memory transaction store.
   */
  async verifyPayment(transactionId: string): Promise<boolean> {
    logger.info(`[Payment Mock] verifyPayment called: ${transactionId}`);
    await simulateDelay(100, 300);

    const transaction = transactionStore.get(transactionId);
    if (!transaction) {
      logger.info(`[Payment Mock] Transaction ${transactionId} NOT FOUND`);
      return false;
    }

    const verified = transaction.status === 'completed';
    logger.info(`[Payment Mock] Transaction ${transactionId} verification: ${verified ? 'VERIFIED' : 'NOT VERIFIED'} (status: ${transaction.status})`);
    return verified;
  },

  /**
   * Handle a mock payment callback. Logs the callback data.
   */
  handleCallback(data: any): void {
    logger.info('[Payment Mock] handleCallback received:', JSON.stringify(data, null, 2));

    if (data?.transactionId && transactionStore.has(data.transactionId)) {
      const existing = transactionStore.get(data.transactionId)!;
      if (data.status) {
        existing.status = data.status as PaymentResult['status'];
        logger.info(`[Payment Mock] Updated transaction ${data.transactionId} status to: ${data.status}`);
      }
    }
  },

  /**
   * Return the list of supported payment methods.
   */
  getSupportedMethods(): string[] {
    return [...SUPPORTED_METHODS];
  },
};

// ============================================================================
// Plugin Manifest
// ============================================================================

export const paymentMockManifest: PluginManifest = {
  id: 'com.schoolpilot.payment-mock',
  name: 'Payment Gateway (Mock)',
  version: '1.0.0',
  type: 'integration',
  category: 'builtin',
  entry: './index.ts',
  description: 'Mock payment provider for development and testing. Simulates payment flows with configurable success rates without processing real transactions.',
  author: 'SchoolPilot3 Team',
  license: 'MIT',

  provides: [
    'payment.initiate',
    'payment.verify',
    'payment.callback',
    'payment.methods',
  ],

  settings: [
    {
      key: 'successRate',
      label: 'Mock Success Rate',
      type: 'number',
      defaultValue: 0.9,
      description: 'Probability of a mock payment succeeding (0.0 - 1.0)',
      validation: { min: 0, max: 1 },
    },
    {
      key: 'supportedMethods',
      label: 'Supported Payment Methods',
      type: 'multiselect',
      defaultValue: ['M-Pesa', 'Card', 'Bank Transfer', 'Cash'],
      description: 'Payment methods to simulate support for',
      options: [
        { label: 'M-Pesa', value: 'M-Pesa' },
        { label: 'Card', value: 'Card' },
        { label: 'Bank Transfer', value: 'Bank Transfer' },
        { label: 'Cash', value: 'Cash' },
      ],
    },
  ],

  privileges: {
    dataRead: ['students', 'invoices', 'payments'],
    dataWrite: ['payments'],
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
    logger.info('[Payment Mock Plugin] Activating...');
    logger.info('[Payment Mock Plugin] Supported methods:', paymentMockPlugin.getSupportedMethods().join(', '));
    logger.info('[Payment Mock Plugin] This is a MOCK provider â€” no real payments will be processed.');
  },

  async deactivate() {
    logger.info('[Payment Mock Plugin] Deactivated.');
    transactionStore.clear();
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  manifest: paymentMockManifest,
  module,
  plugin: paymentMockPlugin,
};
