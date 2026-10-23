// ABOUTME: The channel adapters a reminder goes out through. The `sms` channel wraps the app's
// ABOUTME: existing SMS plugin, so a reminder uses the messaging stack that is already there rather
// ABOUTME: than a second one. A test injects its own recorder instead of a real channel.

import type { ReminderChannelPort, ReminderDelivery, ReminderMessage, SmsSender } from './types';

/**
 * The `sms` channel over the app's existing SMS plugin.
 *
 * The plugin interface is `SMSPlugin` in `@/plugins/types` (`send`, `bulkSend`, `sendTemplate`,
 * `getDeliveryStatus`); `SmsSender` is its `send` half, which both the built-in `sms-gateway` and
 * `sms-mock` plugins satisfy. Nothing about the SMS stack is re-implemented here.
 */
export function smsChannelFrom(sender: SmsSender): ReminderChannelPort {
  return {
    channel: 'sms',
    async send(message: ReminderMessage): Promise<ReminderDelivery> {
      const result = await sender.send(message.to, message.body);
      return {
        success: result.success,
        messageId: result.messageId,
        status: result.status,
        ...(result.message === undefined ? {} : { detail: result.message }),
      };
    },
  };
}
