// ABOUTME: The seam through which a one-time code or a password-reset link leaves the hub, and the
// ABOUTME: default notifier that says it has no channel rather than pretending the message was sent.

import { AuthError } from './errors';

/** What a guardian needs to receive to sign in. */
export interface GuardianOtpMessage {
  readonly phone: string;
  readonly code: string;
  readonly challengeToken: string;
  readonly expiresAt: Date;
  readonly guardianId: string;
  readonly institutionId: string;
}

/** What a user needs to receive to choose a new password. */
export interface PasswordResetMessage {
  readonly username: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly userId: string;
  readonly institutionId: string;
}

/**
 * Delivers the two messages the hub cannot show on screen.
 *
 * A deployment fills this in with its SMS or WhatsApp gateway and its mail relay. The hub owns
 * the secret and the expiry; the notifier only carries them out, so nothing about the
 * authentication policy lives in a transport.
 */
export interface AuthNotifier {
  /**
   * False when this deployment has no channel at all.
   *
   * It is a property of the deployment, not of a recipient, so refusing on it tells a caller
   * nothing about which phone numbers or usernames exist. The service checks it before it
   * looks anything up.
   */
  readonly available: boolean;
  sendGuardianOtp(message: GuardianOtpMessage): Promise<void>;
  sendPasswordReset(message: PasswordResetMessage): Promise<void>;
}

/**
 * The notifier of a hub that has no SMS or mail channel configured.
 *
 * It refuses loudly instead of accepting a code that nobody can receive: a guardian staring
 * at a "code sent" screen forever is worse than an operator being told to configure a gateway.
 */
export class UndeliverableNotifier implements AuthNotifier {
  readonly available = false;

  async sendGuardianOtp(): Promise<void> {
    throw new AuthError(
      'delivery_unavailable',
      'this hub has no channel that can deliver a one-time code'
    );
  }

  async sendPasswordReset(): Promise<void> {
    throw new AuthError(
      'delivery_unavailable',
      'this hub has no channel that can deliver a password-reset link'
    );
  }
}
