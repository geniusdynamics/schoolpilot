// ABOUTME: The account-linking rules of single sign-on: how a verified provider identity resolves to
// ABOUTME: a hub user, and every reason it is refused. This is the boundary that keeps a stranger's
// ABOUTME: Google account from becoming anything at all in a school's hub.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import type { Repository, RepositoryRow } from '@/data/repository';
import { asId, generateUuidv7 } from '@/domain/ids';

import type { OidcErrorCode } from './errors';
import type { OidcProviderConfig } from './providerConfig';

/** A provider identity, once the ID token that carried it has been verified. */
export interface SsoIdentity {
  readonly providerId: string;
  readonly issuer: string;
  /** The provider's stable subject for the person; the same account always has the same one. */
  readonly subject: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string | null;
}

/** What resolving an identity produced. */
export type SsoLinkResult =
  | {
      readonly status: 'linked';
      readonly userId: string;
      readonly email: string;
      /** True when this sign-in is what created the link, rather than using one already there. */
      readonly created: boolean;
    }
  | { readonly status: 'refused'; readonly code: OidcErrorCode; readonly message: string };

export interface SsoAccountLinkerOptions {
  readonly adapter: SqliteAdapter;
  readonly repository: Repository;
  readonly provider: OidcProviderConfig;
  readonly now?: () => Date;
}

interface IdentityRow {
  readonly id: string;
  readonly user_id: string;
  readonly provider: string;
  readonly issuer: string;
  readonly subject: string;
  readonly email: string;
}

/**
 * Resolves a verified provider identity to a hub user.
 *
 * The rules, in the order they are applied:
 *
 * 1. The provider must say the email is verified. An unverified address proves nothing, and the
 *    address is the only thing that can tie the identity to a school's own record.
 * 2. When the provider is configured with allowed domains, the address must be in one of them.
 * 3. An identity already linked resolves to the user it is linked to, and no further matching is
 *    attempted — a person who has signed in before is never re-matched to somebody else.
 * 4. Otherwise the address is matched against the school's own records: a staff member's recorded
 *    email, or an account whose username is the address. A match to more than one account, or to
 *    accounts of more than one institution, is refused as ambiguous.
 * 5. An account that is not active, or that belongs to a guardian or a learner rather than to
 *    staff, is refused.
 * 6. An account that already holds an identity at this provider is refused a second one.
 *
 * There is deliberately no rule that creates an account. A hub with no matching account refuses
 * the sign-in, so an SSO login can never bring an account — let alone the first administrator —
 * into existence. Staff accounts are made by an administrator, and SSO is how those people sign
 * in afterwards.
 */
export class SsoAccountLinker {
  private readonly adapter: SqliteAdapter;
  private readonly repository: Repository;
  private readonly provider: OidcProviderConfig;
  private readonly clock: () => Date;

  constructor(options: SsoAccountLinkerOptions) {
    this.adapter = options.adapter;
    this.repository = options.repository;
    this.provider = options.provider;
    this.clock = options.now ?? (() => new Date());
  }

  async resolve(identity: SsoIdentity): Promise<SsoLinkResult> {
    if (!identity.emailVerified) {
      return refused('email_unverified', 'the identity provider has not verified that email address');
    }

    const email = identity.email.trim().toLowerCase();
    if (email.length === 0) {
      return refused('email_missing', 'the identity provider returned no email address');
    }

    const domains = this.provider.allowedDomains;
    if (domains.length > 0) {
      const domain = email.slice(email.lastIndexOf('@') + 1);
      if (!domains.includes(domain)) {
        return refused(
          'domain_not_allowed',
          `sign-in is restricted to ${domains.join(', ')}; ${domain} is not one of them`
        );
      }
    }

    const linked = await this.linkFor(identity.issuer, identity.subject);
    if (linked !== null) {
      return this.useExistingLink(linked);
    }

    const match = await this.accountFor(identity);
    if (match.status !== 'matched') return match;

    const existing = await this.linkForUser(match.user.id, identity.providerId);
    if (existing !== null) {
      return refused(
        'identity_conflict',
        'this account already signs in with a different account at that provider'
      );
    }

    return this.createLink(match.user, identity, email);
  }

  private async useExistingLink(linked: IdentityRow): Promise<SsoLinkResult> {
    const user = await this.repository.get('user', asId<'user'>(linked.user_id));
    if (user === null || user.deleted_at) {
      return refused('no_account', 'the account this identity was linked to no longer exists');
    }
    const refusal = refuseUnlessStaff(user);
    if (refusal !== null) return refusal;

    await this.adapter.run('UPDATE "auth_identity" SET "last_login_at" = ? WHERE "id" = ?', [
      this.clock().toISOString(),
      linked.id,
    ]);
    return { status: 'linked', userId: user.id, email: linked.email, created: false };
  }

  private async accountFor(
    identity: SsoIdentity
  ): Promise<{ status: 'matched'; user: RepositoryRow<'user'> } | SsoLinkResult> {
    const found = new Map<string, RepositoryRow<'user'>>();

    for (const user of await this.usersByStaffEmail(identity.email)) found.set(user.id, user);
    for (const user of await this.usersByUsername(identity.email)) found.set(user.id, user);

    if (found.size === 0) {
      return refused(
        'no_account',
        'no account at this school matches that email address; an administrator has to create one'
      );
    }

    const users = [...found.values()];
    const institutions = new Set(users.map((user) => user.institution_id));
    if (users.length > 1 || institutions.size > 1) {
      return refused(
        'identity_conflict',
        'that email address matches more than one account, so the hub cannot choose one'
      );
    }

    const user = users[0] as RepositoryRow<'user'>;
    return refuseUnlessStaff(user) ?? { status: 'matched', user };
  }

  /** The accounts of staff members whose recorded email is this address. */
  private async usersByStaffEmail(email: string): Promise<RepositoryRow<'user'>[]> {
    const page = await this.repository.list('staff', {
      conditions: { emails: { contains: email } },
      limit: 20,
    });

    const users: RepositoryRow<'user'>[] = [];
    for (const staff of page.items) {
      const matches = (staff.emails ?? []).some(
        (entry) => entry.address.trim().toLowerCase() === email
      );
      if (!matches || !staff.user_id) continue;
      const user = await this.repository.get('user', asId<'user'>(staff.user_id));
      if (user !== null) users.push(user);
    }
    return users;
  }

  /** The accounts whose username is the address, as the provider sent it and lower-cased. */
  private async usersByUsername(email: string): Promise<RepositoryRow<'user'>[]> {
    const wanted = [...new Set([email, email.toLowerCase()])];
    const users: RepositoryRow<'user'>[] = [];
    for (const username of wanted) {
      const page = await this.repository.list('user', { where: { username }, limit: 2 });
      users.push(...page.items);
    }
    return users;
  }

  private async createLink(
    user: RepositoryRow<'user'>,
    identity: SsoIdentity,
    email: string
  ): Promise<SsoLinkResult> {
    const now = this.clock().toISOString();
    try {
      await this.adapter.run(
        `INSERT INTO "auth_identity"
           ("id", "user_id", "provider", "issuer", "subject", "email", "created_at", "last_login_at")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUuidv7(),
          user.id,
          identity.providerId,
          identity.issuer,
          identity.subject,
          email,
          now,
          now,
        ]
      );
    } catch (error) {
      // Two sign-ins of the same person at once: the unique index refuses the second insert, and
      // the link the first one wrote is the one both should use.
      const raced = await this.linkFor(identity.issuer, identity.subject);
      if (raced !== null) {
        return { status: 'linked', userId: raced.user_id, email: raced.email, created: false };
      }
      throw error;
    }

    return { status: 'linked', userId: user.id, email, created: true };
  }

  private async linkFor(issuer: string, subject: string): Promise<IdentityRow | null> {
    return this.adapter.get<IdentityRow>(
      'SELECT * FROM "auth_identity" WHERE "issuer" = ? AND "subject" = ?',
      [issuer, subject]
    );
  }

  private async linkForUser(userId: string, provider: string): Promise<IdentityRow | null> {
    return this.adapter.get<IdentityRow>(
      'SELECT * FROM "auth_identity" WHERE "user_id" = ? AND "provider" = ?',
      [userId, provider]
    );
  }
}

/** A refusal unless the account may sign in, and is one SSO is for. */
function refuseUnlessStaff(user: RepositoryRow<'user'>): SsoLinkResult | null {
  if (user.status !== 'active') {
    return refused('account_disabled', 'that account is not allowed to sign in');
  }

  const type = user.person_ref?.type;
  // A guardian signs in by phone and a learner by a school-issued PIN. Neither has an email the
  // hub verified, so neither may be reached through a provider identity.
  if (type === 'guardian' || type === 'learner') {
    return refused('not_staff', 'single sign-on is for staff accounts; that account belongs to someone else');
  }
  return null;
}

function refused(code: OidcErrorCode, message: string): SsoLinkResult {
  return { status: 'refused', code, message };
}
