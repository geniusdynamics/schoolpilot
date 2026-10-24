// ABOUTME: A test double for the delivery seam: it keeps every message it was asked to send, so a
// ABOUTME: test can read the one-time code or the reset token the hub would have handed a gateway.

import type {
  AuthNotifier,
  GuardianOtpMessage,
  PasswordResetMessage,
} from '../../auth';

/** A notifier that delivers nothing and remembers everything. */
export class CaptureNotifier implements AuthNotifier {
  readonly available = true;
  readonly guardianOtps: GuardianOtpMessage[] = [];
  readonly passwordResets: PasswordResetMessage[] = [];

  async sendGuardianOtp(message: GuardianOtpMessage): Promise<void> {
    this.guardianOtps.push(message);
  }

  async sendPasswordReset(message: PasswordResetMessage): Promise<void> {
    this.passwordResets.push(message);
  }

  /** The most recent one-time code, refusing when there is none. */
  lastOtp(): GuardianOtpMessage {
    const message = this.guardianOtps.at(-1);
    if (!message) throw new Error('no guardian one-time code was sent');
    return message;
  }

  /** The most recent password-reset link, refusing when there is none. */
  lastReset(): PasswordResetMessage {
    const message = this.passwordResets.at(-1);
    if (!message) throw new Error('no password-reset link was sent');
    return message;
  }
}

/** A notifier for a deployment that has no channel at all. */
export class SilentNotifier implements AuthNotifier {
  readonly available = false;
  readonly guardianOtps: GuardianOtpMessage[] = [];
  readonly passwordResets: PasswordResetMessage[] = [];

  async sendGuardianOtp(message: GuardianOtpMessage): Promise<void> {
    this.guardianOtps.push(message);
  }

  async sendPasswordReset(message: PasswordResetMessage): Promise<void> {
    this.passwordResets.push(message);
  }
}
